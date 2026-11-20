import { loadProducts } from "../store.js";
import { esc, colorsWithImages } from "../utils.js";
import { loadingHtml, errorHtml, productCardHtml } from "../ui.js";
import { CATEGORY_LABELS } from "../i18n.js";

const KIDS_FILTERS = [
  { key: "all", label: "Alle" },
  { key: "girls", label: "Mädchen" },
  { key: "boys", label: "Jungen" }
];

// Jede Farbvariante mit eigenem Produktbild wird als eigene Karte dargestellt
function productVariants(products) {
  const cards = [];
  products.forEach((product) => {
    const colors = colorsWithImages(product);
    if (colors.length) {
      colors.forEach((color) => cards.push({ product, color }));
    } else {
      cards.push({ product, color: (product.colors || [])[0] || "" });
    }
  });
  return cards;
}

export async function renderCategory({ main, category, isCurrent }) {
  const title = CATEGORY_LABELS[category];
  document.title = `${title} – Rainbow.design`;
  const isKids = category === "kids";
  let filter = "all";

  main.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <h1 class="page-title">${esc(title)}</h1>
      </header>
      ${
        isKids
          ? `<div class="segmented" role="group" aria-label="Kinderprodukte filtern">
              ${KIDS_FILTERS.map(
                (f) =>
                  `<button type="button" class="segmented__btn" data-filter="${f.key}" aria-pressed="${f.key === filter}">${esc(f.label)}</button>`
              ).join("")}
            </div>`
          : ""
      }
      <div id="category-content">${loadingHtml("Produkte werden geladen …")}</div>
    </div>`;

  const content = main.querySelector("#category-content");
  let products;
  try {
    products = (await loadProducts()).filter((p) => p.category === category);
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;

  const renderGrid = () => {
    const visible = isKids && filter !== "all" ? products.filter((p) => p.subcategory === filter) : products;
    const cards = productVariants(visible);
    if (!cards.length) {
      content.innerHTML = '<p class="empty-state">In dieser Auswahl sind derzeit keine Produkte vorhanden.</p>';
      return;
    }
    content.innerHTML = `
      <p class="result-count">${cards.length} ${cards.length === 1 ? "Produkt" : "Produkte"}</p>
      <div class="product-grid">${cards.map(({ product, color }) => productCardHtml(product, color)).join("")}</div>`;
  };

  if (isKids) {
    main.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        filter = button.dataset.filter;
        main.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        renderGrid();
      });
    });
  }
  renderGrid();
}
