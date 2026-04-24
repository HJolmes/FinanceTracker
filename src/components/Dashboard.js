import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { extractTextFromFile, isPDF } from "../services/ocrService";
import { detectAndExtractFromText, detectAndExtractFromPDF, getClaudeApiKey } from "../services/claudeService";

const COLORS = ["#e8a838", "#4a9eff", "#3dd68c", "#a78bfa", "#f06060"];

const CATEGORIES = {
  versicherungen: { label: "Versicherungen", icon: "🛡️" },
  sparplaene: { label: "Sparäne", icon: "📈" },
  leasing: { label: "Leasing & Kredite", icon: "🚗" },
  bankkonten: { label: "Bankkonten", icon: "🏦" },
};

function sumMonthly(entries) {
  return entries.reduce((sum, e) => {
    const b = parseFloat(e.beitrag || e.rate || e.betrag || 0);
    if (e.intervall === "jährlich") return sum + b / 12;
    if (e.intervall === "quartalsweise") return sum + b / 3;
    return sum + b;
  }, 0);
}

function SmartUpload({ onSmartUpload }) {
  const [state, setState] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [error, setError] = useState("");
  const hasKey = !!getClaudeApiKey();

  const handleFile = async (file) => {
    setPendingFile(file);
    setResult(null);
    setError("");
    try {
      let extracted;
      if (isPDF(file)) {
        setState("ai");
        extracted = await detectAndExtractFromPDF(file);
      } else {
        setState("ocr");
        setProgress(0);
        const text = await extractTextFromFile(file, (p) => setProgress(p));
        setState("ai");
        extracted = await detectAndExtractFromText(text);
      }
      setResult(extracted);
      setState("done");
    } catch (e) {
      setState("error");
      setError(e.message === "NO_KEY" ? "Kein API-Key hinterlegt (→ ⚙️ Einstellungen)" : e.message);
    }
  };

  const reset = () => { setState(null); setResult(null); setPendingFile(null); setError(""); };

  const handleCreate = () => {
    if (!result) return;
    const { category, ...fields } = result;
    onSmartUpload(category, fields, pendingFile);
    reset();
  };

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🤖 Dokument hochladen & automatisch zuweisen</div>

      {!hasKey && (
        <div style={{ fontSize: 12, color: "var(--text3)", background: "var(--bg3)", borderRadius: 8, padding: "10px 12px" }}>
          ⚠️ Kein Claude API-Key — bitte in ⚙️ Einstellungen ergänzen.
        </div>
      )}

      {hasKey && state === null && (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--bg3)", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 20px", cursor: "pointer", fontSize: 13, color: "var(--text2)" }}>
          📎  PDF oder Foto auswählen
          <input type="file" accept=".pdf,image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
        </label>
      )}

      {state === "ocr" && (
        <div style={{ fontSize: 13, color: "var(--text2)" }}>
          <div style={{ marginBottom: 8 }}>🔍 Text wird erkannt… {progress}%</div>
          <div style={{ background: "var(--bg3)", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{ background: "var(--accent)", width: `${progress}%`, height: "100%", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {state === "ai" && (
        <div style={{ fontSize: 13, color: "var(--text2)" }}>🤖 KI analysiert Dokument…</div>
      )}

      {state === "done" && result && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{CATEGORIES[result.category]?.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>{CATEGORIES[result.category]?.label} erkannt</div>
              {result.name && <div style={{ fontSize: 12, color: "var(--text3)" }}>{result.name}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={handleCreate} style={{ flex: 1, fontSize: 13 }}>Eintrag erstellen →</button>
            <button className="btn-ghost" onClick={reset} style={{ fontSize: 18, padding: "8px 12px" }}>✕</button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div>
          <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>❌ {error}</div>
          <button className="btn-ghost" onClick={reset} style={{ fontSize: 12 }}>Erneut versuchen</button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ data, onSmartUpload }) {
  const monthlyKosten = {
    versicherungen: sumMonthly(data.versicherungen || []),
    sparplaene: sumMonthly(data.sparplaene || []),
    leasing: sumMonthly(data.leasing || []),
    bankkonten: 0,
  };
  const totalMonthly = Object.values(monthlyKosten).reduce((a, b) => a + b, 0);
  const totalYearly = totalMonthly * 12;
  const pieData = Object.entries(monthlyKosten).filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: CATEGORIES[key].label, value: Math.round(value * 100) / 100 }));
  const totalEntries = Object.values(data).filter(Array.isArray).flat().length;
  const lastUpdated = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "–";

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <SmartUpload onSmartUpload={onSmartUpload} />

      <div style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,168,56,0.15) 0%, transparent 70%)" }} />
        <div style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Monatliche Gesamtausgaben</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "var(--accent)", letterSpacing: "-0.02em" }}>
          {totalMonthly.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
        </div>
        <div style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>{totalYearly.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} / Jahr</div>
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <div style={{ color: "var(--text3)", fontSize: 12 }}>📋 {totalEntries} Einträge</div>
          <div style={{ color: "var(--text3)", fontSize: 12 }}>🔄 Stand: {lastUpdated}</div>
        </div>
      </div>

      {pieData.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", marginBottom: 16 }}>Verteilung monatl. Kosten</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                {d.name}: {d.value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => {
          const entries = data[key] || [];
          const monthly = monthlyKosten[key];
          return (
            <div key={key} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text)" }}>
                {monthly > 0 ? monthly.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{entries.length} Einträge</div>
            </div>
          );
        })}
      </div>

      {totalEntries === 0 && (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: "32px 0", fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          Noch keine Einträge — lade ein Dokument hoch oder wähle unten eine Kategorie!
        </div>
      )}
    </div>
  );
}
