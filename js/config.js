// Basisadresse des Backends (REST-API und Assets)
export const API_BASE = "http://localhost:3000";

// Wandelt einen Pfad wie "/assets/logo.svg" in eine vollständige Backend-URL um.
export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const LOGO_URL = assetUrl("/assets/logo.svg");

export const INSTAGRAM_URL = "https://www.instagram.com/rainbow.georgiandesign?stkn=dGE4M3drcmIxYndu";
export const FACEBOOK_URL = "https://www.facebook.com/rainbow.georgiandesign";
