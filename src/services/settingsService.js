const SETTINGS_KEY = "financetracker_settings";

const defaults = {
  oneDriveFolderPath: "FinanceTracker",
  geburtsjahr: "",
  steuerklasse: "1",
  kirchensteuer: false,
  kinderlos: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
