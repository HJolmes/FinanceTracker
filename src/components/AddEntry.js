// src/components/AddEntry.js
import React, { useState, useEffect } from "react";
import { CATEGORY_CONFIG } from "./EntryList";
import { uploadDocument } from "../services/oneDriveService";

const FIELD_LABELS = {
  name: "Bezeichnung *",
  anbieter: "Anbieter",
  bank: "Bank",
  typ: "Typ",
  beitrag: "Beitrag (€)",
  rate: "Rate (€)",
  betrag: "Betrag (€)",
  intervall: "Intervall",
  faelligkeit: "Fälligkeit",
  polizzennummer: "Polizzennummer",
  isin: "ISIN",
  depot: "Depot / Broker",
  ticker: "Börsen-Ticker (z.B. IWDA.AS)",
  anteile: "Anteile im Besitz (Stück)",
  startdatum: "Startdatum",
  laufzeit: "Laufzeit (Monate)",
  restwert: "Restwert (€)",
  iban: "IBAN",
  kontonummer: "Kontonummer",
  notiz: "Notiz",
};

const NUMBER_FIELDS = ["beitrag", "rate", "betrag", "restwert", "laufzeit", "anteile"];
const DECIMAL_FIELDS = ["beitrag", "rate", "betrag", "restwert"];
const INTERVALL_OPTIONS = ["monatlich", "quartalsweise", "halbjährlich", "jährlich", "einmalig"];

export default function AddEntry({ category, entry, onSave, onClose, instance, accounts }) {
  const config = CATEGORY_CONFIG[category];
  const [form, setForm] = useState(entry || {});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) setForm(entry);
  }, [entry]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadDocument(instance, accounts, file, category, form.id || "new_" + Date.now());
      setForm((prev) => ({ ...prev, dokument: url }));
    } catch (e) {
      alert("Datei-Upload fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) { alert("Bitte eine Bezeichnung eingeben."); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--bg2)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px", maxHeight: "88vh",
        display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>
            {entry ? "Eintrag bearbeiten" : `Neuer Eintrag`}
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="scroll" style={{ flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
            {config.fields.map((field) => {
              if (field === "typ") return (
                <div key={field}>
                  <label>{FIELD_LABELS[field] || field}</label>
                  <select value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}>
                    <option value="">– Bitte wählen –</option>
                    {config.typen.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              );

              if (field === "intervall") return (
                <div key={field}>
                  <label>{FIELD_LABELS[field]}</label>
                  <select value={form[field] || "monatlich"} onChange={(e) => handleChange(field, e.target.value)}>
                    {INTERVALL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );

              if (field === "notiz") return (
                <div key={field}>
                  <label>{FIELD_LABELS[field]}</label>
                  <textarea
                    rows={3}
                    value={form[field] || ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder="Zusätzliche Informationen..."
                    style={{ resize: "none" }}
                  />
                </div>
              );

              if (field === "ticker") return (
                <div key={field}>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, marginTop: 4 }}>
                    Kursverlauf
                  </div>
                  <label>{FIELD_LABELS.ticker}</label>
                  <input
                    type="text"
                    value={form[field] || ""}
                    onChange={(e) => handleChange(field, e.target.value.toUpperCase())}
                    placeholder="z.B. IWDA.AS, VWCE.DE, MSFT"
                  />
                </div>
              );

              return (
                <div key={field}>
                  <label>{FIELD_LABELS[field] || field}</label>
                  <input
                    type={NUMBER_FIELDS.includes(field) ? "number" : "text"}
                    value={form[field] || ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={field === "name" ? "z.B. Haftpflichtversicherung" : ""}
                    step={
                      field === "anteile" ? "0.0001" :
                      DECIMAL_FIELDS.includes(field) ? "0.01" : undefined
                    }
                    min={NUMBER_FIELDS.includes(field) ? "0" : undefined}
                  />
                </div>
              );
            })}

            <div>
              <label>Dokument (PDF)</label>
              <div style={{
                background: "var(--bg3)", border: "1px dashed var(--border)",
                borderRadius: "var(--radius-sm)", padding: 16, textAlign: "center",
              }}>
                {form.dokument ? (
                  <div>
                    <div style={{ color: "var(--green)", fontSize: 13, marginBottom: 8 }}>✅ Dokument hochgeladen</div>
                    <a href={form.dokument} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontSize: 12 }}>Öffnen</a>
                    <button className="btn-ghost" style={{ display: "block", margin: "8px auto 0", fontSize: 12 }}
                      onClick={() => handleChange("dokument", "")}>Entfernen</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>Police, Vertrag oder Nachweis hochladen</div>
                    <label style={{
                      display: "inline-block", background: "var(--surface2)",
                      padding: "8px 16px", borderRadius: "var(--radius-sm)",
                      cursor: "pointer", fontSize: 13, textTransform: "none", letterSpacing: 0,
                      color: "var(--text)", fontWeight: 500, border: "1px solid var(--border)",
                    }}>
                      {uploading ? "Wird hochgeladen…" : "Datei auswählen"}
                      <input type="file" accept=".pdf,image/*" style={{ display: "none" }}
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, paddingTop: 16, flexShrink: 0, borderTop: "1px solid var(--border)" }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
          <button className="btn-primary" onClick={handleSave} style={{ flex: 2 }} disabled={saving}>
            {saving ? "Wird gespeichert…" : entry ? "Speichern" : "Eintrag erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
