import React, { useState, useEffect } from "react";
import { CATEGORY_CONFIG } from "./EntryList";
import { uploadDocument } from "../services/oneDriveService";
import { extractTextFromFile, isPDF } from "../services/ocrService";
import { mapTextToFields, mapPDFToFields, getClaudeApiKey, detectDocumentType, buildDocumentName } from "../services/claudeService";

const FIELD_LABELS = {
  name: "Bezeichnung *", anbieter: "Anbieter", bank: "Bank", typ: "Typ",
  beitrag: "Beitrag (€)", rate: "Rate (€)", betrag: "Betrag (€)", intervall: "Intervall",
  faelligkeit: "Fälligkeit", polizzennummer: "Policennummer", isin: "ISIN",
  depot: "Depot / Broker", startdatum: "Startdatum", laufzeit: "Laufzeit (Monate)",
  restwert: "Restwert (€)", iban: "IBAN", kontonummer: "Kontonummer",
  rueckkaufswert: "Rückkaufswert (€)", monatsrenteJetzt: "Monatliche Rente jetzt (€)",
  monatsrenteMit67: "Monatliche Rente mit 67 (€)", depotwert: "Aktueller Depotwert (€)",
  kontostand: "Kontostand (€)", notiz: "Notiz",
};

const NUMBER_FIELDS = ["beitrag","rate","betrag","restwert","rueckkaufswert","monatsrenteJetzt","monatsrenteMit67","depotwert","kontostand"];
const DECIMAL_FIELDS = ["beitrag","rate","betrag","restwert","rueckkaufswert","monatsrenteJetzt","monatsrenteMit67","depotwert","kontostand"];
const INTERVALL_OPTIONS = ["monatlich", "quartalsweise", "halbjährlich", "jährlich", "einmalig"];
const BESTAND_FIRST = ["rueckkaufswert", "depotwert", "kontostand"];

export default function AddEntry({ category, entry, onSave, onClose, instance, accounts, pendingFile }) {
  const config = CATEGORY_CONFIG[category];
  const [form, setForm] = useState(() => {
    const base = entry || {};
    // Normalize legacy single-dokument to dokumente array
    if (base.dokument && !base.dokumente?.length) {
      return { ...base, dokumente: [{ url: base.dokument, name: "Dokument", typ: "Sonstiges", datum: "" }] };
    }
    return { ...base, dokumente: base.dokumente || [] };
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrState, setOcrState] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const hasApiKey = !!getClaudeApiKey();
  const isFromSmartUpload = !!pendingFile;

  const filledFieldCount = Object.entries(form)
    .filter(([k, v]) => !["dokument", "dokumente", "notiz"].includes(k) && v && String(v).trim() !== "").length;

  const addDoc = (doc) => setForm((prev) => {
    const dokumente = [doc, ...(prev.dokumente || [])];
    return { ...prev, dokument: doc.url, dokumente };
  });

  const removeDoc = (idx) => setForm((prev) => {
    const dokumente = (prev.dokumente || []).filter((_, i) => i !== idx);
    return { ...prev, dokument: dokumente[0]?.url || "", dokumente };
  });

  const doUpload = async (file, currentForm) => {
    const typ = await detectDocumentType(file);
    const anbieter = currentForm.anbieter || currentForm.bank || "";
    const subfolder = currentForm.polizzennummer || currentForm.isin || currentForm.id || "neu";
    const name = buildDocumentName(typ, anbieter);
    const url = await uploadDocument(instance, accounts, file, category, subfolder, { customName: name, subfolder });
    return { url, name, typ, datum: new Date().toISOString().slice(0, 10) };
  };

  useEffect(() => {
    if (!pendingFile) return;
    setUploading(true);
    doUpload(pendingFile, form)
      .then((doc) => addDoc(doc))
      .catch(() => {})
      .finally(() => setUploading(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (entry) {
      const base = entry;
      if (base.dokument && !base.dokumente?.length) {
        setForm({ ...base, dokumente: [{ url: base.dokument, name: "Dokument", typ: "Sonstiges", datum: "" }] });
      } else {
        setForm({ ...base, dokumente: base.dokumente || [] });
      }
    }
  }, [entry]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleFileUpload = async (file) => {
    setOcrState(null);
    setOcrError("");
    setUploading(true);
    try {
      const doc = await doUpload(file, form);
      addDoc(doc);
    } catch { alert("Upload fehlgeschlagen."); }
    finally { setUploading(false); }
  };

  const handleExtract = async (file) => {
    if (!file) return;
    setOcrError("");
    try {
      let extracted;
      if (isPDF(file)) {
        setOcrState("ai");
        extracted = await mapPDFToFields(file, category, config.fields);
      } else {
        setOcrState("ocr");
        setOcrProgress(0);
        const text = await extractTextFromFile(file, (p) => setOcrProgress(p));
        setOcrState("ai");
        extracted = await mapTextToFields(text, category, config.fields);
      }
      setForm((prev) => ({ ...prev, ...extracted }));
      setOcrState("done");
    } catch (e) {
      setOcrState("error");
      setOcrError(e.message === "NO_KEY" ? "Kein API-Key (→ ⚙️ Einstellungen)" : e.message);
    }
  };

  const handleSave = async () => {
    if (!form.name) { alert("Bitte eine Bezeichnung eingeben."); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const dokumente = form.dokumente || [];
  const latestFile = dokumente[0] || null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg2)", borderRadius: "20px 20px 0 0", padding: "24px 20px", maxHeight: "88vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{entry && Object.keys(entry).length > 0 ? "Eintrag prüfen" : "Neuer Eintrag"}</div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="scroll" style={{ flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>

            {/* Dokumentenbereich */}
            <div>
              <label>Dokumente</label>
              <div style={{ background: "var(--bg3)", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: 16 }}>
                {uploading && (
                  <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", marginBottom: 8 }}>⏳ Wird hochgeladen…</div>
                )}

                {isFromSmartUpload && !uploading && filledFieldCount > 0 && (
                  <div style={{ fontSize: 12, color: "var(--green)", textAlign: "center", marginBottom: 8 }}>
                    ✓ {filledFieldCount} Felder von KI erkannt — bitte prüfen!
                  </div>
                )}

                {/* Dokumentenliste */}
                {dokumente.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {dokumente.map((doc, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg2)", borderRadius: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>
                            {doc.typ}{doc.datum ? ` · ${doc.datum}` : ""}
                            {i === 0 && <span style={{ color: "var(--green)", marginLeft: 6, fontWeight: 600 }}>● Aktuell</span>}
                          </div>
                        </div>
                        <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--blue)", flexShrink: 0 }}>Öffnen</a>
                        <button className="btn-ghost" style={{ fontSize: 11, color: "var(--red)", padding: "2px 6px", flexShrink: 0 }} onClick={() => removeDoc(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* KI auslesen für aktuellstes Dokument */}
                {!isFromSmartUpload && hasApiKey && latestFile && ocrState !== "done" && (
                  <button className="btn-secondary" onClick={() => handleExtract(dokumente[0]?.file)}
                    disabled={ocrState === "ocr" || ocrState === "ai"}
                    style={{ fontSize: 13, width: "100%", marginBottom: 8 }}>
                    {ocrState === "ocr" && `🔍 OCR läuft… ${ocrProgress}%`}
                    {ocrState === "ai" && "🤖 KI analysiert…"}
                    {(ocrState === null || ocrState === "error") && "🤖 Aktuelles Dokument mit KI auslesen"}
                  </button>
                )}
                {ocrState === "done" && (
                  <div style={{ fontSize: 12, color: "var(--green)", textAlign: "center", marginBottom: 8 }}>
                    ✓ {filledFieldCount} Felder befüllt — bitte prüfen!
                  </div>
                )}
                {ocrState === "error" && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>❌ {ocrError}</div>}

                {/* Upload-Button */}
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--surface2)", padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 13, border: "1px solid var(--border)", color: "var(--text2)" }}>
                  {uploading ? "⏳ Wird hochgeladen…" : dokumente.length > 0 ? "+ Weiteres Dokument" : "📄 Dokument auswählen"}
                  <input type="file" accept=".pdf,image/*" style={{ display: "none" }} disabled={uploading}
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                </label>
              </div>
            </div>

            {/* Felder */}
            {config.fields.map((field) => {
              if (field === "typ") return (
                <div key={field}>
                  <label style={{ color: form[field] ? "var(--accent)" : undefined }}>
                    {FIELD_LABELS[field]}{form[field] ? " ✓" : ""}
                  </label>
                  <select value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}>
                    <option value="">– Bitte wählen –</option>
                    {config.typen.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              );
              if (field === "intervall") return (
                <div key={field}>
                  <label style={{ color: form[field] ? "var(--accent)" : undefined }}>
                    {FIELD_LABELS[field]}{form[field] ? " ✓" : ""}
                  </label>
                  <select value={form[field] || "monatlich"} onChange={(e) => handleChange(field, e.target.value)}>
                    {INTERVALL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
              if (field === "notiz") return (
                <div key={field}><label>{FIELD_LABELS[field]}</label>
                  <textarea rows={3} value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}
                    placeholder="Zusätzliche Informationen..." style={{ resize: "none" }} /></div>
              );
              const isBestandFirst = BESTAND_FIRST.includes(field);
              return (
                <div key={field}>
                  {isBestandFirst && (
                    <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 4 }}>
                      Bestand / Wert (optional — wird aus Dokumenten ausgelesen)
                    </div>
                  )}
                  {field === "monatsrenteJetzt" && (
                    <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 4 }}>
                      Rentenvorschau (aus Standmitteilung)
                    </div>
                  )}
                  <label style={{ color: form[field] ? "var(--accent)" : undefined }}>
                    {FIELD_LABELS[field] || field}{form[field] ? " ✓" : ""}
                  </label>
                  <input
                    type={NUMBER_FIELDS.includes(field) ? "number" : "text"}
                    value={form[field] || ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={field === "name" ? "z.B. Haftpflichtversicherung" : ""}
                    step={DECIMAL_FIELDS.includes(field) ? "0.01" : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, paddingTop: 16, flexShrink: 0, borderTop: "1px solid var(--border)" }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
          <button className="btn-primary" onClick={handleSave} style={{ flex: 2 }} disabled={saving}>
            {saving ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
