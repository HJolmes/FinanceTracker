import { loadSettings } from "./settingsService";

const CACHE_KEY = "financetracker_data_cache";

const DEFAULT_DATA = {
  versicherungen: [],
  sparplaene: [],
  leasing: [],
  bankkonten: [],
  steuerbelege: [],
  einnahmen: [],
  ausgaben: [],
  vermoegensVerlauf: [],
  lastUpdated: new Date().toISOString(),
};

function getPath() {
  return loadSettings().oneDriveFolderPath || "FinanceTracker";
}

async function graphGet(token, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}`);
  return res;
}

export async function loadData(token) {
  const path = getPath();
  try {
    const res = await graphGet(
      token,
      `https://graph.microsoft.com/v1.0/me/drive/root:/${path}/data.json:/content`
    );
    const data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return { ...DEFAULT_DATA, ...data };
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...DEFAULT_DATA, ...JSON.parse(cached) };
    } catch {}
    return { ...DEFAULT_DATA };
  }
}

export async function forceReloadData(token) {
  const path = getPath();
  const res = await graphGet(
    token,
    `https://graph.microsoft.com/v1.0/me/drive/root:/${path}/data.json:/content`
  );
  if (!res.ok) throw new Error("OneDrive 404");
  const data = await res.json();
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  return { ...DEFAULT_DATA, ...data };
}

export async function saveData(token, data) {
  const updated = { ...data, lastUpdated: new Date().toISOString() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  const path = getPath();
  try {
    await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${path}/data.json:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      }
    );
  } catch {}
  return updated;
}

export async function uploadDocument(token, file, category, subfolder) {
  const path = getPath();
  const fileName = file.renamedName || file.name;
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${path}/Dokumente/${category}/${subfolder}/${fileName}:/content`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}`);
  const json = await res.json();
  return json.webUrl;
}
