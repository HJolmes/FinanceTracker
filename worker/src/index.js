const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://hjolmes.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];

const ROUTES = new Set([
  "/api/extract-and-name",
  "/api/detect-and-extract",
  "/api/generate-cancellation",
]);

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(env).includes(origin)) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-financetracker-secret",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function requireSharedSecret(request, env) {
  const configured = env.FINANCETRACKER_PROXY_SECRET;
  const provided = request.headers.get("x-financetracker-secret");
  return Boolean(configured && provided && provided === configured);
}

async function callAnthropic(env, messages, maxTokens) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: Number(maxTokens) || 1024,
      messages,
    }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {}

  if (!res.ok) {
    const message = payload?.error?.message || `Anthropic API ${res.status}`;
    return { ok: false, status: res.status, error: message };
  }

  const text = payload?.content?.find((part) => part.type === "text")?.text;
  if (!text) return { ok: false, status: 502, error: "Anthropic response did not include text content" };
  return { ok: true, text };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, cors);
    }

    if (!ROUTES.has(url.pathname)) {
      return jsonResponse({ error: "Not found" }, 404, cors);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, cors);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY is not configured" }, 500, cors);
    }

    if (!requireSharedSecret(request, env)) {
      return jsonResponse({ error: "Unauthorized" }, 401, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, cors);
    }

    if (!Array.isArray(body.messages)) {
      return jsonResponse({ error: "messages must be an array" }, 400, cors);
    }

    const result = await callAnthropic(env, body.messages, body.maxTokens);
    if (!result.ok) {
      return jsonResponse({ error: result.error }, result.status, cors);
    }

    return jsonResponse({ text: result.text }, 200, cors);
  },
};
