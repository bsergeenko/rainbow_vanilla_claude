import { normalizeText, colorsWithImages } from "./utils.js";
import { CATEGORY_LABELS, COLOR_LABELS } from "./i18n.js";

// Suchbegriffe je Kategorie (inkl. gängiger Synonyme)
const CATEGORY_TERMS = {
  women: ["damen", "dame", "frau", "frauen", "damenmantel"],
  men: ["herren", "herr", "mann", "männer", "maenner", "herrenmantel"],
  kids: ["kinder", "kind", "kids", "kindermantel"],
  dogs: ["hunde", "hund", "hundemantel"]
};

const SUBCATEGORY_TERMS = {
  girls: ["mädchen", "maedchen"],
  boys: ["jungen", "junge", "jungs"]
};

function termMatches(token, terms) {
  return terms.some((term) => {
    const normalized = normalizeText(term);
    return normalized.startsWith(token) || token.startsWith(normalized);
  });
}

function productTerms(product) {
  const terms = [...(CATEGORY_TERMS[product.category] || [])];
  if (CATEGORY_LABELS[product.category]) terms.push(CATEGORY_LABELS[product.category]);
  if (product.subcategory && SUBCATEGORY_TERMS[product.subcategory]) {
    terms.push(...SUBCATEGORY_TERMS[product.subcategory]);
  }
  return terms;
}

// Liefert passende Produkte (jeweils mit Farbvariante) für eine Suchanfrage
export function searchProducts(products, query) {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const results = [];
  products.forEach((product) => {
    const name = normalizeText(product.name);
    const terms = productTerms(product);
    const variantColors = colorsWithImages(product);
    const colors = variantColors.length ? variantColors : product.colors || [];

    // Jeder Suchbegriff muss über Name, Kategorie oder Farbe passen
    const colorTokens = [];
    let allMatch = true;
    for (const token of tokens) {
      const byText = name.includes(token) || termMatches(token, terms);
      const byColor = colors.some((color) => normalizeText(COLOR_LABELS[color] || "").includes(token));
      if (!byText && !byColor) {
        allMatch = false;
        break;
      }
      if (!byText && byColor) colorTokens.push(token);
    }
    if (!allMatch) return;

    if (colorTokens.length) {
      // Treffer über eine Farbe: passende Farbvarianten mit eigenem Bild anzeigen
      colors
        .filter((color) =>
          colorTokens.every((token) => normalizeText(COLOR_LABELS[color] || "").includes(token))
        )
        .forEach((color) => results.push({ product, color }));
    } else {
      results.push({ product, color: colors[0] || "" });
    }
  });
  return results;
}
