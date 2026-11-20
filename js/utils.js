// Allgemeine Hilfsfunktionen

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Maskiert Text für die sichere Ausgabe in HTML-Templates
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

let idCounter = 0;
export function uid(prefix = "id") {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// Normalisiert Text für die Suche (Kleinschreibung, Umlaute)
export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .trim();
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

// Wandelt deutsche Zahleneingaben („12,50“) in Zahlen um
export function parseDecimal(value) {
  const text = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (text === "" || !/^\d+(\.\d{1,2})?$/.test(text)) return NaN;
  return Number(text);
}

export function formatDecimalInput(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toFixed(2).replace(".", ",");
}

// Preis eines Produkts für eine bestimmte Größe
export function unitPriceFor(product, size) {
  if (!product) return NaN;
  if (product.pricesBySize && typeof product.pricesBySize === "object") {
    const value = product.pricesBySize[size];
    return value === undefined ? NaN : Number(value);
  }
  return Number(product.price);
}

export function lowestPrice(product) {
  if (product && product.pricesBySize && typeof product.pricesBySize === "object") {
    const values = Object.values(product.pricesBySize).map(Number).filter(Number.isFinite);
    return values.length ? Math.min(...values) : NaN;
  }
  return Number(product ? product.price : NaN);
}

export function hasSizePrices(product) {
  return Boolean(product && (product.category === "kids" || product.pricesBySize));
}

// Farben eines Produkts, für die Produktbilder vorhanden sind (in Reihenfolge von „colors“)
export function colorsWithImages(product) {
  if (!product || !product.imagesByColor) return [];
  const ordered = (product.colors || []).filter((c) => (product.imagesByColor[c] || []).length > 0);
  Object.keys(product.imagesByColor).forEach((c) => {
    if (!ordered.includes(c) && product.imagesByColor[c].length > 0) ordered.push(c);
  });
  return ordered;
}

export function firstImage(product, color) {
  if (!product || !product.imagesByColor) return "";
  const list = product.imagesByColor[color];
  return list && list.length ? list[0] : "";
}
