import { loginRequest } from "./authConfig";
import { getFolderPath } from "./settingsService";

const DATA_FILE = "data.json";

async function getAccessToken(instance, accounts) {
  const response = await instance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0],
  });
  return response.accessToken;
}

function dataUrl() {
  return `https://graph.microsoft.com/v1.0/me/drive/root:/${getFolderPath()}/${DATA_FILE}:/content`;
}

export async function loadData(instance, accounts) {
  try {
    const token = await getAccessToken(instance, accounts);
    const response = await fetch(dataUrl(), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      // Not found or error – try localStorage before returning empty
      const local = localStorage.getItem("financetracker_data");
      return local ? JSON.parse(local) : getDefaultData();
    }
    const data = JSON.parse(await response.text());
    localStorage.setItem("financetracker_data", JSON.stringify(data));
    return data;
  } catch (e) {
    console.warn("OneDrive load failed", e);
    const local = localStorage.getItem("financetracker_data");
    return local ? JSON.parse(local) : getDefaultData();
  }
}

// Force-reload from OneDrive using the currently configured path.
// Returns { data, path } on success, throws on failure.
export async function forceReloadData(instance, accounts) {
  const token = await getAccessToken(instance, accounts);
  const path = getFolderPath();
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${path}/${DATA_FILE}:/content`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Datei nicht gefunden (HTTP ${response.status}) in: ${path}`);
  const data = JSON.parse(await response.text());
  localStorage.setItem("financetracker_data", JSON.stringify(data));
  return { data, path };
}

export async function saveData(instance, accounts, data) {
  localStorage.setItem("financetracker_data", JSON.stringify(data));
  try {
    const token = await getAccessToken(instance, accounts);
    await fetch(dataUrl(), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("OneDrive save failed", e);
  }
}

export async function uploadDocument(instance, accounts, file, category, entryId, options = {}) {
  const token = await getAccessToken(instance, accounts);
  const { customName, subfolder } = options;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
  const fileName = customName
    ? (customName.endsWith(`.${ext}`) ? customName : `${customName}.${ext}`)
    : `${entryId}_${file.name}`;
  const subPath = subfolder ? `/${subfolder}` : "";
  const path = `/${getFolderPath()}/Dokumente/${category}${subPath}/${fileName}`;
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:${path}:/content`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const result = await response.json();
  return result.webUrl;
}

function getDefaultData() {
  return {
    versicherungen: [], sparplaene: [], leasing: [], kredite: [], bankkonten: [],
    lastUpdated: new Date().toISOString(),
  };
}
