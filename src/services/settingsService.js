const SETTINGS_KEY = "financetracker_settings";
const DEFAULT_PATH = "FinanceTracker";

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : { oneDriveFolderPath: DEFAULT_PATH, geburtsjahr: "" };
  } catch {
    return { oneDriveFolderPath: DEFAULT_PATH, geburtsjahr: "" };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getFolderPath() {
  return getSettings().oneDriveFolderPath || DEFAULT_PATH;
}

export function getGeburtsjahr() {
  return parseInt(getSettings().geburtsjahr) || null;
}
