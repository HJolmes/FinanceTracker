import React from "react";
import { APP_VERSION, APP_CHANGELOG } from "../version";

export default function WhatsNew({ onClose }) {
  const log = APP_CHANGELOG[APP_VERSION];

  return (
    <div className="modal-overlay center" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🎉 Was ist neu? – {APP_VERSION}</span>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        {log && (
          <>
            <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 16 }}>
              Stand: {log.date}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {log.entries.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24 }}>{e.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{e.title}</div>
                    <div style={{ color: "var(--text2)", fontSize: 14 }}>{e.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button className="btn-primary" onClick={onClose}>Verstanden</button>
        </div>
      </div>
    </div>
  );
}
