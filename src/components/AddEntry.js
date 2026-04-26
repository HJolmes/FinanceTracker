import React, { useState, useRef } from "react";
import { extractFromPDF, extractFromImage, buildDocumentName, hasApiKey } from "../services/claudeService";
import { lookupTicker } from "../services/marketDataService";
import { uploadDocument } from "../services/oneDriveService";

const CATEGORIES = [
  { id: "einnahmen", label: "Einnahmen 💰" },
  { id: "versicherungen", label: "Versicherungen 🛡️" },
  { id: "sparplaene", label: "Sparpläne 📈" },
  { id: "leasing", label: "Leasing & Kredite 🚗" },
  { id: "bankkonten", label: "Bankkonten 🏦" },
  { id: "steuerbelege", label: "Steuerbelege 🧾" },
];

const INTERVALL_OPTS = ["monatlich", "quartalsweise", "halbjährlich", "jährlich", "einmalig"];

const TYP_OPTS = {
  versicherungen: ["Krankenversicherung", "Haftpflicht", "Kfz", "Berufsunfähigkeit", "Risikoleben", "Hausrat", "Gebäude", "Rechtsschutz", "Unfallversicherung", "Reiseversicherung", "Lebensversicherung", "Rentenversicherung", "Sonstige"],
  sparplaene: ["ETF", "Fonds", "Aktienplan", "Festgeld", "Tagesgeld", "Bausparvertrag", "Sonstiges"],
  leasing: ["Kfz-Leasing", "Immobilienkredit", "Ratenkredit", "Dispositionskredit", "Sonstiges"],
  bankkonten: ["Girokonto", "Tagesgeld", "Festgeld", "Depot", "Gemeinschaftskonto", "Sonstiges"],
  steuerbelege: ["Bewirtung", "Fahrtkosten", "Arbeitsmittel", "Fortbildung", "Bürobedarf", "Sonstiges"],
  einnahmen: ["Gehalt", "Mieteinnahmen", "Nebeneinkommen", "Rente", "Sonstiges"],
};

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

function DocViewerModal({ file, url, onClose }) {
  const objUrl = file ? URL.createObjectURL(file) : url;
  const isImage = file ? file.type?.startsWith("image/") : /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url || "");
  return (
    <div className="modal-overlay center" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 720, width: "95%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px" }}>
          <button className="btn-ghost" onClick={onClose}>✕ Schließen</button>
        </div>
        {isImage
          ? <img src={objUrl} alt="Dokument" style={{ width: "100%", display: "block" }} />
          : <iframe src={objUrl} title="Dokument" style={{ width: "100%", height: "70vh", border: "none" }} />}
      </div>
    </div>
  );
}

function FieldGroup({ label, children, required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && " *"}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function AddEntry({ category: initCategory, editEntry, data, token, onSave, onClose }) {
  const [category, setCategory] = useState(initCategory || (editEntry ? detectCategory(editEntry, data) : ""));
  const [fields, setFields] = useState(editEntry ? { ...editEntry } : {});
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [tickerStatus, setTickerStatus] = useState("");
  const [duplicateHint, setDuplicateHint] = useState(null);
  const [viewDoc, setViewDoc] = useState(false);
  const [error, setError] = useState("");
  const tickerTimer = useRef(null);

  function detectCategory(entry, d) {
    for (const cat of ["versicherungen", "sparplaene", "leasing", "bankkonten", "steuerbelege", "einnahmen"]) {
      if ((d[cat] || []).find((e) => e.id === entry.id)) return cat;
    }
    return "";
  }

  function set(key, val) {
    setFields((f) => ({ ...f, [key]: val }));
  }

  async function handleFile(f) {
    setFile(f);
    setError("");
    if (!category || category === "einnahmen" || !hasApiKey()) return;
    setExtracting(true);
    try {
      const isPDF = f.type === "application/pdf" || f.name.endsWith(".pdf");
      const extracted = isPDF ? await extractFromPDF(f, category) : await extractFromImage(f, category);
      setFields((prev) => ({ ...prev, ...extracted }));
      const docName = await buildDocumentName(f, category);
      f.renamedName = docName;
      checkDuplicate({ ...fields, ...extracted });
    } catch (e) {
      setError(`KI-Extraktion fehlgeschlagen: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  function checkDuplicate(f) {
    if (!category || !data) return;
    const existing = data[category] || [];
    const matchField = category === "versicherungen" ? "policennummer"
      : category === "sparplaene" ? "isin"
      : category === "bankkonten" ? "iban"
      : null;
    if (!matchField || !f[matchField]) return;
    const match = existing.find((e) => e[matchField] && e[matchField] === f[matchField] && e.id !== fields.id);
    setDuplicateHint(match || null);
  }

  function handleIsinChange(val) {
    set("isin", val);
    if (tickerTimer.current) clearTimeout(tickerTimer.current);
    if (val.length >= 12) {
      setTickerStatus("wird gesucht…");
      tickerTimer.current = setTimeout(async () => {
        try {
          const t = await lookupTicker(val);
          set("ticker", t);
          setTickerStatus("✓ erkannt: " + t);
        } catch {
          setTickerStatus("Ticker nicht gefunden");
        }
      }, 500);
    } else {
      setTickerStatus("");
    }
  }

  async function handleSave() {
    setError("");
    if (!validateRequired()) return;
    setUploading(true);
    try {
      let docUrl = fields.dokument;
      if (file && token) {
        const subfolder = fields.policennummer || fields.isin || fields.id || newId();
        docUrl = await uploadDocument(token, file, category, subfolder);
      }
      const entry = {
        ...fields,
        id: fields.id || newId(),
        aufgaben: fields.aufgaben || [],
        ...(docUrl ? { dokument: docUrl } : {}),
      };
      onSave(category, entry);
    } catch (e) {
      setError(`Speichern fehlgeschlagen: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  function validateRequired() {
    if (category === "einnahmen") {
      if (!fields.name || !fields.betrag) { setError("Name und Betrag sind Pflichtfelder."); return false; }
    } else if (category === "steuerbelege") {
      if (!fields.betrag) { setError("Betrag ist Pflichtfeld."); return false; }
      if (fields.kategorie === "Bewirtung" && (!fields.teilnehmer || !fields.zweck)) {
        setError("Bei Bewirtung sind Teilnehmer und Zweck Pflichtfelder."); return false;
      }
    } else {
      if (!fields.name) { setError("Name ist Pflichtfeld."); return false; }
    }
    return true;
  }

  const isBewirtung = category === "steuerbelege" && fields.kategorie === "Bewirtung";

  if (!category) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">Kategorie wählen</span>
            <button className="btn-ghost" onClick={onClose}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} className="btn-secondary" style={{ padding: 16, fontSize: 15 }}
                onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewDoc && file && <DocViewerModal file={file} onClose={() => setViewDoc(false)} />}
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" style={{ maxHeight: "95dvh" }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">{editEntry ? "Bearbeiten" : "Neuer Eintrag"} – {CATEGORIES.find((c) => c.id === category)?.label}</span>
            <button className="btn-ghost" onClick={onClose}>✕</button>
          </div>

          {category !== "einnahmen" && (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Dokument hochladen (optional)</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input type="file" accept=".pdf,image/*" style={{ flex: 1, minWidth: 0 }}
                  onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
                {file && (
                  <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setViewDoc(true)}>👁 Vorschau</button>
                )}
              </div>
              {extracting && (
                <div style={{ color: "var(--accent)", fontSize: 13, marginTop: 6 }}>🤖 KI liest Dokument…</div>
              )}
              {!hasApiKey() && (
                <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>Kein API-Key → keine KI-Extraktion</div>
              )}
            </div>
          )}

          {duplicateHint && (
            <div className="alert alert-gold" style={{ marginBottom: 12, fontSize: 13 }}>
              ⚠️ Möglicher Duplikat: «{duplicateHint.name}» existiert bereits. Felder werden überschrieben.
            </div>
          )}

          {error && <div className="alert alert-red" style={{ marginBottom: 12 }}>{error}</div>}

          {category === "einnahmen" && <EinnahmenFields fields={fields} set={set} />}
          {category === "versicherungen" && <VersicherungFields fields={fields} set={set} />}
          {category === "sparplaene" && <SparplanFields fields={fields} set={set} onIsinChange={handleIsinChange} tickerStatus={tickerStatus} />}
          {category === "leasing" && <LeasingFields fields={fields} set={set} />}
          {category === "bankkonten" && <BankkontoFields fields={fields} set={set} />}
          {category === "steuerbelege" && <SteuerbelegFields fields={fields} set={set} isBewirtung={isBewirtung} />}

          <div className="divider" />

          <TaskListInline tasks={fields.aufgaben || []} onChange={(t) => set("aufgaben", t)} />

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Abbrechen</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={uploading || extracting}>
              {uploading ? "Speichern…" : "💾 Speichern"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TaskListInline({ tasks, onChange }) {
  const [newText, setNewText] = useState("");
  function add() {
    if (!newText.trim()) return;
    onChange([...tasks, { id: newId(), text: newText.trim(), erledigt: false }]);
    setNewText("");
  }
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--text2)" }}>Aufgaben (optional)</div>
      {tasks.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <input type="checkbox" checked={t.erledigt} onChange={() => onChange(tasks.map((x) => x.id === t.id ? { ...x, erledigt: !x.erledigt } : x))} style={{ width: "auto", accentColor: "var(--accent)" }} />
          <span style={{ flex: 1, fontSize: 14, textDecoration: t.erledigt ? "line-through" : "none", color: t.erledigt ? "var(--text3)" : "var(--text)" }}>{t.text}</span>
          <button className="btn-ghost" style={{ padding: "2px 6px", color: "var(--red)" }} onClick={() => onChange(tasks.filter((x) => x.id !== t.id))}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Neue Aufgabe…" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
        <button className="btn-secondary" onClick={add} style={{ flexShrink: 0 }}>+</button>
      </div>
    </div>
  );
}

function EinnahmenFields({ fields, set }) {
  return <>
    <FieldGroup label="Name" required><input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="z.B. Gehalt" /></FieldGroup>
    <div className="form-row">
      <FieldGroup label="Betrag (€)" required><input type="number" value={fields.betrag || ""} onChange={(e) => set("betrag", e.target.value)} /></FieldGroup>
      <FieldGroup label="Intervall"><Select value={fields.intervall} onChange={(v) => set("intervall", v)} options={INTERVALL_OPTS} placeholder="Wählen…" /></FieldGroup>
    </div>
    <FieldGroup label="Kategorie"><Select value={fields.kategorie} onChange={(v) => set("kategorie", v)} options={TYP_OPTS.einnahmen} placeholder="Wählen…" /></FieldGroup>
    <FieldGroup label="Notiz"><textarea rows={2} value={fields.notiz || ""} onChange={(e) => set("notiz", e.target.value)} /></FieldGroup>
  </>;
}

function VersicherungFields({ fields, set }) {
  return <>
    <div className="form-row">
      <FieldGroup label="Name" required><input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} /></FieldGroup>
      <FieldGroup label="Anbieter"><input value={fields.anbieter || ""} onChange={(e) => set("anbieter", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Typ"><Select value={fields.typ} onChange={(v) => set("typ", v)} options={TYP_OPTS.versicherungen} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="Policennummer"><input value={fields.policennummer || ""} onChange={(e) => set("policennummer", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Beitrag (€)"><input type="number" value={fields.beitrag || ""} onChange={(e) => set("beitrag", e.target.value)} /></FieldGroup>
      <FieldGroup label="Intervall"><Select value={fields.intervall} onChange={(v) => set("intervall", v)} options={INTERVALL_OPTS} placeholder="Wählen…" /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Fälligkeit"><input type="date" value={fields.faelligkeit || ""} onChange={(e) => set("faelligkeit", e.target.value)} /></FieldGroup>
      <FieldGroup label="Rückkaufswert (€)"><input type="number" value={fields.rueckkaufswert || ""} onChange={(e) => set("rueckkaufswert", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Monatsrente jetzt (€)"><input type="number" value={fields.monatsrenteJetzt || ""} onChange={(e) => set("monatsrenteJetzt", e.target.value)} /></FieldGroup>
      <FieldGroup label="Rente mit 67 (niedrig, €)"><input type="number" value={fields.renteMit67Niedrig || ""} onChange={(e) => set("renteMit67Niedrig", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Rente mit 67 (hoch, €)"><input type="number" value={fields.renteMit67Hoch || ""} onChange={(e) => set("renteMit67Hoch", e.target.value)} /></FieldGroup>
      <FieldGroup label="Rente garantiert (€)"><input type="number" value={fields.renteGarantiert || ""} onChange={(e) => set("renteGarantiert", e.target.value)} /></FieldGroup>
    </div>
    <FieldGroup label="Notiz"><textarea rows={2} value={fields.notiz || ""} onChange={(e) => set("notiz", e.target.value)} /></FieldGroup>
  </>;
}

function SparplanFields({ fields, set, onIsinChange, tickerStatus }) {
  return <>
    <div className="form-row">
      <FieldGroup label="Name" required><input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} /></FieldGroup>
      <FieldGroup label="Anbieter"><input value={fields.anbieter || ""} onChange={(e) => set("anbieter", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Typ"><Select value={fields.typ} onChange={(v) => set("typ", v)} options={TYP_OPTS.sparplaene} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="Depot"><input value={fields.depot || ""} onChange={(e) => set("depot", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label={<>ISIN {tickerStatus && <span style={{ color: "var(--accent)", fontSize: 12 }}>{tickerStatus}</span>}</>}>
        <input value={fields.isin || ""} onChange={(e) => onIsinChange(e.target.value)} placeholder="z.B. DE0005140008" />
      </FieldGroup>
      <FieldGroup label="Ticker"><input value={fields.ticker || ""} onChange={(e) => set("ticker", e.target.value)} placeholder="z.B. DBK.DE" /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Beitrag (€)"><input type="number" value={fields.beitrag || ""} onChange={(e) => set("beitrag", e.target.value)} /></FieldGroup>
      <FieldGroup label="Intervall"><Select value={fields.intervall} onChange={(v) => set("intervall", v)} options={INTERVALL_OPTS} placeholder="Wählen…" /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Anteile"><input type="number" value={fields.anteile || ""} onChange={(e) => set("anteile", e.target.value)} /></FieldGroup>
      <FieldGroup label="Depotwert (€)"><input type="number" value={fields.depotwert || ""} onChange={(e) => set("depotwert", e.target.value)} /></FieldGroup>
    </div>
    <FieldGroup label="Startdatum"><input type="date" value={fields.startdatum || ""} onChange={(e) => set("startdatum", e.target.value)} /></FieldGroup>
    <FieldGroup label="Notiz"><textarea rows={2} value={fields.notiz || ""} onChange={(e) => set("notiz", e.target.value)} /></FieldGroup>
  </>;
}

function LeasingFields({ fields, set }) {
  return <>
    <div className="form-row">
      <FieldGroup label="Name" required><input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} /></FieldGroup>
      <FieldGroup label="Anbieter"><input value={fields.anbieter || ""} onChange={(e) => set("anbieter", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Typ"><Select value={fields.typ} onChange={(v) => set("typ", v)} options={TYP_OPTS.leasing} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="Rate (€)"><input type="number" value={fields.rate || ""} onChange={(e) => set("rate", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Intervall"><Select value={fields.intervall} onChange={(v) => set("intervall", v)} options={INTERVALL_OPTS} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="Laufzeit (Monate)"><input type="number" value={fields.laufzeit || ""} onChange={(e) => set("laufzeit", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Restwert (€)"><input type="number" value={fields.restwert || ""} onChange={(e) => set("restwert", e.target.value)} /></FieldGroup>
      <FieldGroup label="Fälligkeit"><input type="date" value={fields.faelligkeit || ""} onChange={(e) => set("faelligkeit", e.target.value)} /></FieldGroup>
    </div>
    <FieldGroup label="Notiz"><textarea rows={2} value={fields.notiz || ""} onChange={(e) => set("notiz", e.target.value)} /></FieldGroup>
  </>;
}

function BankkontoFields({ fields, set }) {
  return <>
    <div className="form-row">
      <FieldGroup label="Name" required><input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} /></FieldGroup>
      <FieldGroup label="Bank"><input value={fields.bank || ""} onChange={(e) => set("bank", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Typ"><Select value={fields.typ} onChange={(v) => set("typ", v)} options={TYP_OPTS.bankkonten} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="Kontostand (€)"><input type="number" value={fields.kontostand || ""} onChange={(e) => set("kontostand", e.target.value)} /></FieldGroup>
    </div>
    <FieldGroup label="IBAN"><input value={fields.iban || ""} onChange={(e) => set("iban", e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" /></FieldGroup>
    <FieldGroup label="Kontonummer"><input value={fields.kontonummer || ""} onChange={(e) => set("kontonummer", e.target.value)} /></FieldGroup>
    <FieldGroup label="Notiz"><textarea rows={2} value={fields.notiz || ""} onChange={(e) => set("notiz", e.target.value)} /></FieldGroup>
  </>;
}

function SteuerbelegFields({ fields, set, isBewirtung }) {
  return <>
    <div className="form-row">
      <FieldGroup label="Datum (YYYY-MM-DD)"><input type="date" value={fields.datum || ""} onChange={(e) => set("datum", e.target.value)} /></FieldGroup>
      <FieldGroup label="Betrag (€)" required><input type="number" value={fields.betrag || ""} onChange={(e) => set("betrag", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Kategorie"><Select value={fields.kategorie} onChange={(v) => set("kategorie", v)} options={TYP_OPTS.steuerbelege} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="Partner"><input value={fields.partner || ""} onChange={(e) => set("partner", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="MwSt (€)"><input type="number" value={fields.mwst || ""} onChange={(e) => set("mwst", e.target.value)} /></FieldGroup>
      <FieldGroup label="Netto 7% (€)"><input type="number" value={fields.netto7 || ""} onChange={(e) => set("netto7", e.target.value)} /></FieldGroup>
    </div>
    <FieldGroup label="Netto 19% (€)"><input type="number" value={fields.netto19 || ""} onChange={(e) => set("netto19", e.target.value)} /></FieldGroup>
    {isBewirtung && <>
      <FieldGroup label="Teilnehmer" required><input value={fields.teilnehmer || ""} onChange={(e) => set("teilnehmer", e.target.value)} placeholder="Namen der Teilnehmer" /></FieldGroup>
      <FieldGroup label="Zweck" required><input value={fields.zweck || ""} onChange={(e) => set("zweck", e.target.value)} placeholder="Geschäftlicher Zweck" /></FieldGroup>
    </>}
    <FieldGroup label="Beschreibung"><textarea rows={2} value={fields.beschreibung || ""} onChange={(e) => set("beschreibung", e.target.value)} /></FieldGroup>
  </>;
}
