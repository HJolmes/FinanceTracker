export const msalConfig = {
  auth: {
    clientId: "8139f388-161f-4ee1-bcb2-edec7150cd37",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://HJolmes.github.io/FinanceTracker/",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read", "Files.ReadWrite"],
};
