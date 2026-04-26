import React, { useState, useEffect, useCallback } from "react";
import {
  searchInstitutions, createRequisition, getBalances,
  getConnectedAccounts, saveConnectedAccount, removeConnectedAccount, setPendingRequisition,
} from "../services/bankingService";
import { getSettings } from "../services/settingsService";

function fmt(amount, currency = "EUR") {
  return parseFloat(amount).toLocaleString("de-DE", { style: "currency", currency });
}

export default function BankingConnect() {
  const [accounts, setAccounts] = useState(getConnectedAccounts());
  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState("");

  const hasFunctionUrl = !!getSettings().bankingFunctionUrl;

  const loadBalances = useCallback(async () => {
    if (accounts.length === 0) return;
    setLoadingBalances(true);
    const newBalances = {};
    for (const account of accounts) {
      for (const accountId of account.accountIds || []) {
        try {
          const data = await getBalances(accountId);
          const b = (data.balances || []).find((b) => b.balanceType === "closingBooked") || data.balances?.[0];
          if (b) newBalances[accountId] = { amount: b.balanceAmount.amount, currency: b.balanceAmount.currency };
        } catch { /* ignorieren */ }
      }
    }
    setBalances(newBalances);
    setLoadingBalances(false);
  }, [accounts]);

  useEffect(() => { loadBalances(); }, [loadBalances]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setInstitutions([]); return; }
    setSearching(true);
    setError("");
    try {
      const results = await searchInstitutions(q);
      setInstitutions(results);
    } catch (e) {
      setError(e.message === "NO_FUNCTION_URL" ? "Azure Function URL fehlt (unten eintragen)" : e.message);
    } finally { setSearching(false); }
  };

  const handleConnect = async (institution) => {
    setConnecting(institution.id);
    setError("");
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const req = await createRequisition(institution.id, redirectUrl);
      setPendingRequisition(req.id);
      window.location.href = req.link;
    } catch (e) {
      setError(e.message === "NO_FUNCTION_URL" ? "Azure Function URL fehlt" : e.message);
      setConnecting(null);
    }
  };

  const handleDisconnect = (requisitionId) => {
    removeConnectedAccount(requisitionId);
    setAccounts(getConnectedAccounts());
  };

  const refresh = () => {
    setAccounts(getConnectedAccounts());
    loadBalances();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Verbundene Konten */}
      {accounts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Verbundene Konten</div>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={refresh} disabled={loadingBalances}>
              {loadingBalances ? "⟳ Lädt…" : "⟳ Aktualisieren"}
            </button>
          </div>
          {accounts.map((account) => (
            <div key={account.requisitionId} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{account.institutionName || account.institutionId}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    Verbunden: {new Date(account.createdAt).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <button className="btn-ghost" style={{ fontSize: 11, color: "var(--red)", padding: "4px 8px" }}
                  onClick={() => handleDisconnect(account.requisitionId)}>
                  Trennen
                </button>
              </div>
              {(account.accountIds || []).map((accountId) => (
                <div key={accountId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "monospace" }}>
                    {accountId.slice(0, 8)}…
                  </div>
                  <div style={{ fontSize: 14, fontFamily: "var(--font-display)", color: "var(--green)" }}>
                    {balances[accountId]
                      ? fmt(balances[accountId].amount, balances[accountId].currency)
                      : loadingBalances ? "…" : "–"}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "12px 0" }}>
          Noch keine Bankverbindung — Bank unten suchen und verbinden.
        </div>
      )}

      {/* Bank suchen */}
      {hasFunctionUrl && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>Bank verbinden</div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Bankname suchen (z.B. Sparkasse, ING…)"
          />
          {searching && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>Suche…</div>}
          {institutions.length > 0 && (
            <div style={{ background: "var(--bg3)", borderRadius: 10, marginTop: 8, overflow: "hidden" }}>
              {institutions.map((inst, i) => (
                <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  {inst.logo && <img src={inst.logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain", background: "#fff" }} />}
                  <div style={{ flex: 1, fontSize: 13 }}>{inst.name}</div>
                  <button className="btn-primary"
                    style={{ fontSize: 12, padding: "6px 12px", minWidth: 80 }}
                    onClick={() => handleConnect(inst)}
                    disabled={!!connecting}>
                    {connecting === inst.id ? "⟳ …" : "Verbinden"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasFunctionUrl && (
        <div style={{ fontSize: 12, color: "var(--text3)", background: "var(--bg3)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.6 }}>
          ⚠️ Azure Function URL noch nicht konfiguriert. Bitte unten eintragen.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "var(--red)" }}>❌ {error}</div>}
    </div>
  );
}
