const fetch = require("node-fetch");

const NORDIGEN_BASE = "https://bankaccountdata.gocardless.com/api/v2";
const ALLOWED_ORIGIN = "https://hjolmes.github.io";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function getToken() {
  const res = await fetch(`${NORDIGEN_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      secret_id: process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  });
  if (!res.ok) throw new Error(`Token-Fehler: ${res.status}`);
  const data = await res.json();
  return data.access;
}

async function nordigen(token, path, method = "GET", body = null) {
  const res = await fetch(`${NORDIGEN_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { status: res.status, data };
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 200, headers: CORS, body: "" };
    return;
  }

  try {
    const token = await getToken();
    const action = req.query.action;
    let result;

    switch (action) {
      case "institutions": {
        const country = req.query.country || "DE";
        result = await nordigen(token, `/institutions/?country=${country}`);
        break;
      }
      case "create_requisition": {
        result = await nordigen(token, "/requisitions/", "POST", req.body);
        break;
      }
      case "get_requisition": {
        result = await nordigen(token, `/requisitions/${req.query.id}/`);
        break;
      }
      case "balances": {
        result = await nordigen(token, `/accounts/${req.query.account_id}/balances/`);
        break;
      }
      case "transactions": {
        result = await nordigen(token, `/accounts/${req.query.account_id}/transactions/`);
        break;
      }
      default:
        context.res = { status: 400, headers: CORS, body: JSON.stringify({ error: "Unbekannte Aktion" }) };
        return;
    }

    context.res = {
      status: result.status,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
