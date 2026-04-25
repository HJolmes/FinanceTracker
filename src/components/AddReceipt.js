// src/components/AddReceipt.js
import React, { useState, useRef } from "react";
import { uploadDocument } from "../services/oneDriveService";
import { extractReceiptFields } from "../services/claudeService";

const KATEGORIEN = ["Bewirtung", "Fahrtkosten", "Arbeitsmittel", "Fortbildung", "Bürobedarf", "Sonstiges"];

export default function AddReceipt({ receipt, onSave, onClose, instance, accounts }) {
  const [form, setForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    betrag: "",
    mwst: "",
    kategorie: "Sonstiges",
    beschreibung: "",
    partner: "",
    zweck: "",
    ...(receipt || {}),
  });
  const [dokument, setDokument] = useState(receipt?.dokument || "");
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleFile = async (file) => {
    if (!file) return;
    setExtracting(true);
    try {
      const fields = await extractReceiptFields(file);
      if (fields.datum) set("datum", fields.datum);
      if (fields.betrag) set("betrag", String(fields.betrag));
      if (fields.mwst) set("mwst", String(fields.mwst));
      if (fields.kategorie && KATEGORIEN.includes(fields.kategorie)) set("kategorie", fields.kategorie);
      if (fields.beschreibung) set("beschreibung", fields.beschreibung);
      if (fields.partner) set("partner", fields.partner);
      if (fields.zweck) set("zweck", fields.zweck);
    } catch {}
    setExtracting(false);
    setUploading(true);
    try {
      const url = await uploadDocument(instance, accounts, file, "steuerbelege",
        form.datum?.slice(0, 7) || "allgemein",
        { customName: `${form.datum || new Date().toISOString().slice(0, 10)}_Beleg_${file.name}` }
      );
      setDokument(url);
    } catch {}
    setUploading(false);
  };

  const handleSave = () => {
    if (!form.betrag) return;
    onSave({ ...form, dokument, id: receipt?.id || Date.now().toString() });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg2)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", animation: "slideUp 0.3s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{receipt?.id ? "Beleg bearbeiten" : "Beleg hinzufügen"}</div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: 16, textAlign: "center", cursor: "pointer", background: "var(--bg3)" }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])} />
            {extracting ? (
              <div style={{ color: "var(--accent)", fontSize: 13 }}>⏳ Felder werden ausgelesen…</div>
            ) : uploading ? (
              <div style={{ color: "var(--accent)", fontSize: 13 }}>☁️ Wird hochgeladen…</div>
            ) : dokument ? (
              <div style={{ color: "var(--green)", fontSize: 13 }}>✓ Beleg hochgeladen · <span style={{ color: "var(--blue)" }}>Neu hochladen</span></div>
            ) : (
              <div style={{ color: "var(--text3)", fontSize: 13 }}>
                📸 Beleg hochladen (Foto / PDF)<br />
                <span style={{ fontSize: 11 }}>Felder werden automatisch ausgefüllt</span>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Datum</label>
              <input type="date" value={form.datum} onChange={(e) => set("datum", e.target.value)} />
            </div>
            <div>
              <label>Betrag (€)</label>
              <input type="number" placeholder="0.00" step="0.01" value={form.betrag} onChange={(e) => set("betrag", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label>Kategorie</label>
              <select value={form.kategorie} onChange={(e) => set("kategorie", e.target.value)}>
                {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label>MwSt. %</label>
              <input type="number" placeholder="19" value={form.mwst} onChange={(e) => set("mwst", e.target.value)} />
            </div>
          </div>

          <div>
            <label>Geschäftspartner / Lieferant</label>
            <input type="text" placeholder="Mustermann GmbH" value={form.partner} onChange={(e) => set("partner", e.target.value)} />
          </div>

          <div>
            <label>Beschreibung</label>
            <input type="text" placeholder="Mittagessen, Taxi, Fachliteratur…" value={form.beschreibung} onChange={(e) => set("beschreibung", e.target.value)} />
          </div>

          {form.kategorie === "Bewirtung" && (
            <div>
              <label>Geschäftlicher Zweck (Pflicht bei Bewirtung)</label>
              <input type="text" placeholder="Projektbesprechung mit Kunde XY" value={form.zweck} onChange={(e) => set("zweck", e.target.value)} />
            </div>
          )}

          <button className="btn-primary" onClick={handleSave}
            disabled={!form.betrag}
            style={{ marginTop: 4, opacity: !form.betrag ? 0.5 : 1 }}>
            {receipt?.id ? "Speichern" : "Beleg hinzufügen"}
          </button>
        </div>
      </div>
    </div>
  );
}
