// Deutsche Bezeichnungen für API-Werte und Formatierungsfunktionen

export const CATEGORY_LABELS = { women: "Damen", men: "Herren", kids: "Kinder", dogs: "Hunde" };
export const CATEGORY_PATHS = { women: "/damen", men: "/herren", kids: "/kinder", dogs: "/hunde" };
export const CATEGORY_ORDER = ["women", "men", "kids", "dogs"];

// Bezeichnungen für die Auswahl „Für wen?“ im Konfigurator
export const TARGET_LABELS = { women: "Damen", men: "Herren", kids: "Kinder", dogs: "Hund" };

export const SUBCATEGORY_LABELS = { girls: "Mädchen", boys: "Jungen" };

export const COLOR_LABELS = {
  black: "Schwarz",
  red: "Rot",
  blue: "Blau",
  aquablue: "Aquablau",
  turquoise: "Türkis",
  pink: "Rosa",
  yellow: "Gelb",
  plum: "Pflaume",
  green: "Grün",
  grey: "Grau",
  magenta: "Magenta",
  beige: "Beige",
  brown: "Braun",
  orange: "Orange",
  silver: "Silber"
};

// Darstellungsfarben der Farbfelder (rein optisch)
export const COLOR_SWATCHES = {
  black: "#1d1d1f",
  red: "#d62828",
  blue: "#2453b3",
  aquablue: "#4fc3e8",
  turquoise: "#1fb5a8",
  pink: "#f4a6c6",
  yellow: "#f7d838",
  plum: "#7b2e5f",
  green: "#3e9b4f",
  grey: "#8a8d91",
  magenta: "#c2187a",
  beige: "#d9c4a3",
  brown: "#7a4b2a",
  orange: "#f08a24",
  silver: "#c4c7cc"
};

export const STATUS_LABELS = {
  new: "Bestätigt",
  processing: "In Bearbeitung",
  shipped: "Versendet",
  delivered: "Zugestellt",
  cancelled: "Storniert"
};

export const ADMIN_STATUS_OPTIONS = ["new", "processing", "shipped", "delivered"];

export const ROLE_LABELS = { user: "Benutzer", admin: "Administrator", main_admin: "Hauptadministrator" };

const KIDS_SIZE_LABELS = { "2-3": "2–3 Jahre", "4-7": "4–7 Jahre", "8-12": "8–12 Jahre" };

export function colorLabel(code) {
  return COLOR_LABELS[code] || code || "";
}

export function categoryLabel(product) {
  if (!product) return "";
  const base = CATEGORY_LABELS[product.category] || product.category || "";
  if (product.subcategory && SUBCATEGORY_LABELS[product.subcategory]) {
    return `${base} · ${SUBCATEGORY_LABELS[product.subcategory]}`;
  }
  return base;
}

// „Für wen?“-Angabe für konfigurierte Produkte
export function targetLabel(product) {
  if (!product) return "";
  return TARGET_LABELS[product.category] || product.category || "";
}

export function subcategoryLabel(product) {
  return product && product.subcategory ? SUBCATEGORY_LABELS[product.subcategory] || "" : "";
}

export function sizeLabel(size) {
  return KIDS_SIZE_LABELS[size] || size || "";
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || "";
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || "";
}

const priceFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "–";
  return priceFormatter.format(number);
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateFormatter.format(date);
}

export function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : `${dateTimeFormatter.format(date)} Uhr`;
}

// Gruppe eines Rückenmotivs („adult“ oder „kids“)
export function designGroup(designId, designs) {
  if (designs && Array.isArray(designs.kids) && designs.kids.some((d) => d.id === designId)) return "kids";
  return "adult";
}

export function findDesign(designId, designs) {
  if (!designs || !designId) return null;
  return [...(designs.adult || []), ...(designs.kids || [])].find((d) => d.id === designId) || null;
}

// Lesbare Bezeichnung eines Rückenmotivs, z. B. „Motiv 05 (Erwachsene)“
export function designLabel(design, designs) {
  if (!design) return "";
  const group = designGroup(design.id, designs);
  const list = (designs && designs[group]) || [];
  const index = list.findIndex((d) => d.id === design.id);
  const match = String(design.id).match(/(\d+)\s*$/);
  const number = match ? match[1] : String(index + 1).padStart(2, "0");
  return `Motiv ${number} (${group === "kids" ? "Kinder" : "Erwachsene"})`;
}

export function shippingLabel(id, shippingOptions) {
  const option = (shippingOptions || []).find((o) => o.id === id);
  if (option) return option.name;
  if (id === "standard") return "Standardversand";
  if (id === "express") return "Expressversand";
  return id || "";
}

export function paymentLabel(method) {
  return method === "card" ? "Kartenzahlung" : method || "";
}
