import { ConvexHttpClient } from "convex/browser";

const deploymentUrl = import.meta.env.VITE_CONVEX_URL;

if (!deploymentUrl) {
  throw new Error("Missing VITE_CONVEX_URL");
}

export const authStorageNamespace = deploymentUrl.replace(/[^a-zA-Z0-9]/g, "");
export const jwtStorageKey = `__convexAuthJWT_${authStorageNamespace}`;
export const refreshStorageKey = `__convexAuthRefreshToken_${authStorageNamespace}`;

export const getStoredToken = () => window.localStorage.getItem(jwtStorageKey);
export const getStoredRefreshToken = () => window.localStorage.getItem(refreshStorageKey);

export const storeAuthTokens = (tokens: { token: string; refreshToken: string }) => {
  window.localStorage.setItem(jwtStorageKey, tokens.token);
  window.localStorage.setItem(refreshStorageKey, tokens.refreshToken);
};

export const clearStoredAuthTokens = () => {
  window.localStorage.removeItem(jwtStorageKey);
  window.localStorage.removeItem(refreshStorageKey);
};

export const createConvexHttpClient = (authenticated = true) => {
  const client = new ConvexHttpClient(deploymentUrl);
  if (authenticated) {
    const token = getStoredToken();
    if (token) {
      client.setAuth(token);
    }
  }
  return client;
};
