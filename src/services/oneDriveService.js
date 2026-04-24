// src/services/oneDriveService.js
import { loginRequest, graphConfig } from "./authConfig";
import { getFolderPath } from "./settingsService";

const DATA_FILE = "data.json";

async function getAccessToken(instance, accounts) {
  const response = await instance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0],
  });
  return response.accessToken;
}

async function callGraph(token, url, method = "GET", body = null) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok && response.status !== 404) throw new Error(`Graph API error: ${response.status}`);
  if (response.status === 404) return null;
  if (response.status === 204) return null;
  return response.json();
}

export async function loadData(instance, accounts) {
  try {
    const token = await getAccessToken(instance, accounts);
    const folderPath = getFolderPath();
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}/${DATA_FILE}:/content`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return getDefaultData();
    const text = await response.text();
    return JSON.parse(text);
  } catch (e) {
    console.warn("OneDrive load failed, using local fallback", e);
    const local = localStorage.getItem("financetracker_data");
    return local ? JSON.parse(local) : getDefaultData();
  }
}

export async function saveData(instance, accounts, data) {
  // Always save locally as backup
  localStorage.setItem("financetracker_data", JSON.stringify(data));
  try {
    const token = await getAccessToken(instance, accounts);
    const folderPath = getFolderPath();
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}/${DATA_FILE}:/content`;
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("OneDrive save failed, data stored locally", e);
  }
}

export async function uploadDocument(instance, accounts, file, category, entryId) {
  const token = await getAccessToken(instance, accounts);
  const folderPath = getFolderPath();
  const fileName = `${entryId}_${file.name}`;
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}/Dokumente/${category}/${fileName}:/content`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  const result = await response.json();
  return result.webUrl;
}

function getDefaultData() {
  return {
    versicherungen: [],
    sparplaene: [],
    leasing: [],
    kredite: [],
    bankkonten: [],
    lastUpdated: new Date().toISOString(),
  };
}
