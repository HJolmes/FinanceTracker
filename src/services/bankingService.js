const ACCOUNTS_KEY = "financetracker_nordigen_accounts";
const PENDING_KEY = "financetracker_nordigen_pending";

function getFunctionUrl() {
  try {
    const s = JSON.parse(localStorage.getItem("financetracker_settings") || "{}");
    return (s.bankingFunctionUrl || "").replace(/\/$/, "");
  } catch { return ""; }
}

async function call(action, params = {}, body = null) {
  const base = getFunctionUrl();
  if (!base) throw new Error("NO_FUNCTION_URL");
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${base}/api/banking?${query}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function searchInstitutions(query) {
  const data = await call("institutions", { country: "DE" });
  const list = Array.isArray(data) ? data : (data.results || []);
  if (!query) return list.slice(0, 15);
  const q = query.toLowerCase();
  return list.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 10);
}

export async function createRequisition(institutionId, redirectUrl) {
  return call("create_requisition", {}, {
    redirect: redirectUrl,
    institution_id: institutionId,
    reference: `ft_${Date.now()}`,
    user_language: "DE",
  });
}

export async function getRequisition(id) {
  return call("get_requisition", { id });
}

export async function getBalances(accountId) {
  return call("balances", { account_id: accountId });
}

export async function getTransactions(accountId) {
  return call("transactions", { account_id: accountId });
}

// Gespeicherte Konten (localStorage)
export function getConnectedAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); }
  catch { return []; }
}

export function saveConnectedAccount(account) {
  const list = getConnectedAccounts();
  const idx = list.findIndex((a) => a.requisitionId === account.requisitionId);
  if (idx >= 0) list[idx] = account; else list.push(account);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export function removeConnectedAccount(requisitionId) {
  const list = getConnectedAccounts().filter((a) => a.requisitionId !== requisitionId);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export function setPendingRequisition(id) {
  localStorage.setItem(PENDING_KEY, id);
}

export function getPendingRequisition() {
  return localStorage.getItem(PENDING_KEY) || null;
}

export function clearPendingRequisition() {
  localStorage.removeItem(PENDING_KEY);
}
