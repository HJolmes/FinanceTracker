import React, { useState, useRef } from "react";
import { extractAndName, detectAndExtract, hasApiKey } from "../services/claudeService";
import { lookupTicker } from "../services/marketDataService";
import { uploadDocument } from "../services/oneDriveService";
import { loadSettings } from "../services/settingsService";
import { calculateNet } from "../services/salaryService";

const CATEGORIES = [
  { id: "versicherungen", label: "Versicherungen 🛡️" },
  { id: "sparplaene", label: "Sparpläne 📈" },
  { id: "leasing", label: "Leasing & Kredite 🚗" },
  { id: "bankkonten", label: "Bankkonten 🏦" },
  { id: "steuerbelege", label: "Steuerbelege 🧾" },
  { id: "einnahmen", label: "Einnahmen 💰" },
  { id: "ausgaben", label: "Ausgaben 💸" },
];

const INTERVALL_OPTS = ["monatlich", "quartalsweise", "halbjährlich", "jährlich", "einmalig"];

const TYP_OPTS = {
  versicherungen: ["Krankenversicherung", "Haftpflicht", "Kfz", "Berufsunfähigkeit", "Risikoleben", "Hausrat", "Gebäude", "Rechtsschutz", "Unfallversicherung", "Reiseversicherung", "Lebensversicherung", "Rentenversicherung", "Sonstige"],
  sparplaene: ["ETF", "Fonds", "Aktienplan", "Festgeld", "Tagesgeld", "Bausparvertrag", "Sonstiges"],
  leasing: ["Kfz-Leasing", "Immobilienkredit", "Ratenkredit", "Dispositionskredit", "Sonstiges"],
  bankkonten: ["Girokonto", "Tagesgeld", "Festgeld", "Depot", "Gemeinschaftskonto", "Sonstiges"],
  steuerbelege: ["Bewirtung", "Fahrtkosten", "Arbeitsmittel", "Fortbildung", "Bürobedarf", "Sonstiges"],
  einnahmen: ["Gehalt", "Mieteinnahmen", "Nebeneinkommen", "Rente", "Sonstiges"],
  ausgaben: ["Miete", "Strom", "Internet", "Handy", "Streaming", "Software", "Verein", "Versicherung", "Sonstiges"],
};

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

function findCategory(entry, d) {
  for (const cat of ["versicherungen", "sparplaene", "leasing", "bankkonten", "steuerbelege", "einnahmen"]) {
    if ((d[cat] || []).find((e) => e.id === entry.id)) return cat;
  }
  return CATEGORIES[0].id;
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

export default function AddEntry({ category: initCategory, editEntry, data, getToken, onSave, onClose }) {
  const defaultCat = initCategory || (editEntry ? findCategory(editEntry, data) : CATEGORIES[0].id);
  const [category, setCategory] = useState(defaultCat);
  const [fields, setFields] = useState(editEntry ? { ...editEntry } : {});
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [tickerStatus, setTickerStatus] = useState("");
  const [duplicateHint, setDuplicateHint] = useState(null);
  const [viewDoc, setViewDoc] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(!editEntry && hasApiKey() ? "ki" : "manual");
  const [autoDetect, setAutoDetect] = useState(false);
  const tickerTimer = useRef(null);

  function set(key, val) {
    setFields((f) => ({ ...f, [key]: val }));
  }

  function checkDuplicate(cat, f) {
    if (!cat || !data) return;
    const existing = data[cat] || [];
    const matchField = cat === "versicherungen" ? "policennummer"
      : cat === "sparplaene" ? "isin"
      : cat === "bankkonten" ? "iban"
      : null;
    if (!matchField || !f[matchField]) return;
    const match = existing.find((e) => e[matchField] && e[matchField] === f[matchField] && e.id !== fields.id);
    setDuplicateHint(match || null);
  }

  async function runExtraction(f, cat) {
    setExtracting(true);
    setError("");
    try {
      if (cat === null) {
        const result = await detectAndExtract(f);
        const detectedCat = result.category || category;
        if (result.category) setCategory(result.category);
        setFields((prev) => ({ ...prev, ...result.fields }));
        if (result.documentName) f.renamedName = result.documentName;
        checkDuplicate(detectedCat, result.fields);
      } else {
        const result = await extractAndName(f, cat);
        setFields((prev) => ({ ...prev, ...result.fields }));
        if (result.documentName) f.renamedName = result.documentName;
        checkDuplicate(cat, result.fields);
      }
    } catch (e) {
      setError(`KI-Extraktion fehlgeschlagen: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  async function handleFile(f) {
    setFile(f);
    setError("");
    if (mode !== "ki" || category === "einnahmen" || !hasApiKey()) return;
    runExtraction(f, autoDetect ? null : category);
  }

  function handleCategoryChange(newCat) {
    if (newCat === category) return;
    setCategory(newCat);
    if (!editEntry) setFields({});
    setDuplicateHint(null);
    if (mode === "ki" && file && !autoDetect && newCat !== "einnahmen" && hasApiKey()) {
      runExtraction(file, newCat);
    }
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
      if (file && getToken) {
        const token = await getToken();
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
  const showKiToggle = category !== "einnahmen";
  const apiKey = hasApiKey();

  return (
    <>
      {viewDoc && file && <DocViewerModal file={file} onClose={() => setViewDoc(false)} />}
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" style={{ maxHeight: "95dvh" }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">{editEntry ? "Bearbeiten" : "Neuer Eintrag"}</span>
            <button className="btn-ghost" onClick={onClose}>✕</button>
          </div>

          {/* Category dropdown – always visible and changeable */}
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Kategorie</label>
            <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* KI / Manuell toggle */}
          {showKiToggle && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                className={mode === "ki" ? "btn-primary" : "btn-secondary"}
                style={{ flex: 1, padding: "8px 4px", fontSize: 13 }}
                onClick={() => setMode("ki")}
                disabled={!apiKey}
                title={!apiKey ? "Bitte zuerst Claude API-Key in den Einstellungen hinterlegen" : undefined}
              >
                🤖 Mit KI ausfüllen
              </button>
              <button
                className={mode === "manual" ? "btn-primary" : "btn-secondary"}
                style={{ flex: 1, padding: "8px 4px", fontSize: 13 }}
                onClick={() => setMode("manual")}
              >
                ✏️ Manuell
              </button>
            </div>
          )}

          {/* Auto-detect checkbox – only in KI mode */}
          {mode === "ki" && showKiToggle && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                style={{ width: "auto", accentColor: "var(--accent)" }}
              />
              Kategorie automatisch erkennen
            </label>
          )}

          {/* File upload */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">
              {mode === "ki" && showKiToggle ? "Dokument hochladen" : "Dokument hochladen (optional, empfohlen)"}
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ flex: 1, minWidth: 0 }}
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              />
              {file && (
                <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setViewDoc(true)}>
                  👁 Vorschau
                </button>
              )}
            </div>
            {extracting && (
              <div style={{ color: "var(--accent)", fontSize: 13, marginTop: 6 }}>🤖 KI liest Dokument…</div>
            )}
            {!apiKey && showKiToggle && (
              <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>
                Kein API-Key konfiguriert – bitte in Einstellungen hinterlegen
              </div>
            )}
          </div>

          {duplicateHint && (
            <div className="alert alert-gold" style={{ marginBottom: 12, fontSize: 13 }}>
              ⚠️ Möglicher Duplikat: «{duplicateHint.name}» existiert bereits. Felder werden überschrieben.
            </div>
          )}

          {error && <div className="alert alert-red" style={{ marginBottom: 12 }}>{error}</div>}

          {category === "einnahmen" && <EinnahmenFields fields={fields} set={set} />}
          {category === "ausgaben" && <AusgabenFields fields={fields} set={set} />}
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

function fmtEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

function KuendigungsweckerSection({ fields, set }) {
  return (
    <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={Boolean(fields.kuendigungswecker)}
          onChange={(e) => { set("kuendigungswecker", e.target.checked); if (!e.target.checked) set("kuendigungsfrist", ""); }}
          style={{ width: "auto", accentColor: "var(--accent)" }}
        />
        <span style={{ fontWeight: 500, fontSize: 14 }}>🔔 Kündigungswecker</span>
      </label>
      {fields.kuendigungswecker && (
        <div style={{ marginTop: 8 }}>
          <FieldGroup label="Kündigungsfrist">
            <input type="date" value={fields.kuendigungsfrist || ""} onChange={(e) => set("kuendigungsfrist", e.target.value)} />
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

function EinnahmenFields({ fields, set }) {
  const settings = loadSettings();
  const [showDetail, setShowDetail] = useState(false);
  const methode = fields.eingabemethode || (fields.bruttoGehalt ? "brutto" : "netto");

  function doCalc(override = {}) {
    const result = calculateNet({
      brutto: parseFloat(override.bruttoGehalt ?? fields.bruttoGehalt) || 0,
      steuerklasse: parseInt(override.steuerklasse ?? fields.steuerklasse ?? settings.steuerklasse) || 1,
      kirchensteuer: override.kirchensteuer ?? fields.kirchensteuer ?? settings.kirchensteuer ?? false,
      bav: parseFloat(override.bav ?? fields.bav) || 0,
      sachbezug: parseFloat(override.sachbezug ?? fields.sachbezug) || 0,
      kinderlos: override.kinderlos ?? fields.kinderlos ?? settings.kinderlos ?? false,
    });
    if (result) set("betrag", result.netto.toString());
  }

  function switchMethode(m) {
    set("eingabemethode", m);
    if (m === "brutto") {
      if (!fields.steuerklasse) set("steuerklasse", settings.steuerklasse || "1");
      if (fields.kirchensteuer === undefined) set("kirchensteuer", settings.kirchensteuer || false);
      if (fields.kinderlos === undefined) set("kinderlos", settings.kinderlos || false);
      if (fields.bruttoGehalt) doCalc({});
    }
  }

  const sk = fields.steuerklasse || settings.steuerklasse || "1";
  const berechnet = methode === "brutto" && fields.bruttoGehalt ? calculateNet({
    brutto: parseFloat(fields.bruttoGehalt) || 0,
    steuerklasse: parseInt(sk) || 1,
    kirchensteuer: fields.kirchensteuer ?? settings.kirchensteuer ?? false,
    bav: parseFloat(fields.bav) || 0,
    sachbezug: parseFloat(fields.sachbezug) || 0,
    kinderlos: fields.kinderlos ?? settings.kinderlos ?? false,
  }) : null;

  return <>
    <FieldGroup label="Name" required>
      <input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="z.B. Gehalt" />
    </FieldGroup>

    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button className={methode === "netto" ? "btn-primary" : "btn-secondary"} style={{ flex: 1, fontSize: 13, padding: "7px 4px" }} onClick={() => switchMethode("netto")}>
        💶 Netto direkt
      </button>
      <button className={methode === "brutto" ? "btn-primary" : "btn-secondary"} style={{ flex: 1, fontSize: 13, padding: "7px 4px" }} onClick={() => switchMethode("brutto")}>
        🧮 Brutto berechnen
      </button>
    </div>

    {methode === "brutto" && <>
      <FieldGroup label="Bruttogehalt (€)" required>
        <input type="number" value={fields.bruttoGehalt || ""} onChange={(e) => { set("bruttoGehalt", e.target.value); doCalc({ bruttoGehalt: e.target.value }); }} placeholder="z.B. 4500" />
      </FieldGroup>

      <FieldGroup label="Steuerklasse">
        <div style={{ display: "flex", gap: 6 }}>
          {["1","2","3","4","5","6"].map((s) => (
            <button key={s} className={sk === s ? "btn-primary" : "btn-secondary"} style={{ flex: 1, padding: "6px 0", fontWeight: 600 }}
              onClick={() => { set("steuerklasse", s); doCalc({ steuerklasse: parseInt(s) }); }}>
              {s}
            </button>
          ))}
        </div>
      </FieldGroup>

      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
          <input type="checkbox" checked={Boolean(fields.kirchensteuer ?? settings.kirchensteuer)}
            onChange={(e) => { set("kirchensteuer", e.target.checked); doCalc({ kirchensteuer: e.target.checked }); }}
            style={{ width: "auto", accentColor: "var(--accent)" }} />
          Kirchensteuer
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
          <input type="checkbox" checked={Boolean(fields.kinderlos ?? settings.kinderlos)}
            onChange={(e) => { set("kinderlos", e.target.checked); doCalc({ kinderlos: e.target.checked }); }}
            style={{ width: "auto", accentColor: "var(--accent)" }} />
          Kinderlos (+PV)
        </label>
      </div>

      <div className="form-row">
        <FieldGroup label="bAV (€/Monat)">
          <input type="number" value={fields.bav || ""} onChange={(e) => { set("bav", e.target.value); doCalc({ bav: e.target.value }); }} placeholder="0" />
        </FieldGroup>
        <FieldGroup label="Sachbezug/GWV (€/Monat)">
          <input type="number" value={fields.sachbezug || ""} onChange={(e) => { set("sachbezug", e.target.value); doCalc({ sachbezug: e.target.value }); }} placeholder="0" />
        </FieldGroup>
      </div>

      {berechnet && (
        <div style={{ background: "var(--bg2)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>Netto ≈ {fmtEur(berechnet.netto)}</span>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowDetail(!showDetail)}>
              {showDetail ? "▲ weniger" : "▼ Aufschlüsselung"}
            </button>
          </div>
          {showDetail && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text2)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
              <span>Rentenversicherung</span><span>{fmtEur(berechnet.aufschluesselung.rv)}</span>
              <span>Krankenversicherung</span><span>{fmtEur(berechnet.aufschluesselung.kv)}</span>
              <span>Arbeitslosenversicherung</span><span>{fmtEur(berechnet.aufschluesselung.av)}</span>
              <span>Pflegeversicherung</span><span>{fmtEur(berechnet.aufschluesselung.pv)}</span>
              <span>Lohnsteuer</span><span>{fmtEur(berechnet.aufschluesselung.lohnsteuer)}</span>
              <span>Solidaritätszuschlag</span><span>{fmtEur(berechnet.aufschluesselung.soli)}</span>
              {berechnet.aufschluesselung.kirchensteuer > 0 && <><span>Kirchensteuer</span><span>{fmtEur(berechnet.aufschluesselung.kirchensteuer)}</span></>}
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>Näherungswert · Stand 2024/25 · kein steuerrechtlicher Rat</div>
        </div>
      )}
    </>}

    <div className="form-row">
      <FieldGroup label="Netto (€)" required>
        <input type="number" value={fields.betrag || ""} onChange={(e) => set("betrag", e.target.value)}
          placeholder={methode === "brutto" ? "🔄 berechnet" : ""} />
      </FieldGroup>
      <FieldGroup label="Intervall"><Select value={fields.intervall} onChange={(v) => set("intervall", v)} options={INTERVALL_OPTS} placeholder="Wählen…" /></FieldGroup>
    </div>
    <FieldGroup label="Kategorie"><Select value={fields.kategorie} onChange={(v) => set("kategorie", v)} options={TYP_OPTS.einnahmen} placeholder="Wählen…" /></FieldGroup>
    <FieldGroup label="Notiz"><textarea rows={2} value={fields.notiz || ""} onChange={(e) => set("notiz", e.target.value)} /></FieldGroup>
  </>;
}

function AusgabenFields({ fields, set }) {
  return <>
    <div className="form-row">
      <FieldGroup label="Name" required><input value={fields.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="z.B. Spotify" /></FieldGroup>
      <FieldGroup label="Anbieter"><input value={fields.anbieter || ""} onChange={(e) => set("anbieter", e.target.value)} /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Typ"><Select value={fields.typ} onChange={(v) => set("typ", v)} options={TYP_OPTS.ausgaben} placeholder="Wählen…" /></FieldGroup>
      <FieldGroup label="E-Mail (Kontakt)"><input type="email" value={fields.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="kuendigung@…" /></FieldGroup>
    </div>
    <div className="form-row">
      <FieldGroup label="Betrag (€)" required><input type="number" value={fields.betrag || ""} onChange={(e) => set("betrag", e.target.value)} /></FieldGroup>
      <FieldGroup label="Intervall"><Select value={fields.intervall} onChange={(v) => set("intervall", v)} options={INTERVALL_OPTS} placeholder="Wählen…" /></FieldGroup>
    </div>
    <FieldGroup label="Fälligkeit / nächste Abbuchung"><input type="date" value={fields.faelligkeit || ""} onChange={(e) => set("faelligkeit", e.target.value)} /></FieldGroup>
    <KuendigungsweckerSection fields={fields} set={set} />
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
    <KuendigungsweckerSection fields={fields} set={set} />
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
    <KuendigungsweckerSection fields={fields} set={set} />
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
