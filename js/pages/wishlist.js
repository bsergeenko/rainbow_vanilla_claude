import { state, refreshWishlist, subscribe } from "../store.js";
import { esc, firstImage } from "../utils.js";
import { loadingHtml, errorHtml, imageHtml, heartButtonHtml, productPriceHtml, productUrl } from "../ui.js";
import { colorLabel, categoryLabel } from "../i18n.js";

export async function renderWishlist({ main, query, isCurrent }) {
  document.title = "Meine Wunschliste – Rainbow.design";
  const fromAccount = query.get("von") === "konto";

  main.innerHTML = `
    <div class="container page">
      ${fromAccount ? '<a class="back-link" href="/konto">← Zurück zum Benutzerkonto</a>' : ""}
      <header class="page-header"><h1 class="page-title">Meine Wunschliste</h1></header>
      <div id="wishlist-content">${loadingHtml("Wunschliste wird geladen …")}</div>
    </div>`;
  const content = main.querySelector("#wishlist-content");

  const render = () => {
    const items = state.wishlist;
    if (!items.length) {
      content.innerHTML = '<p class="empty-state">Deine Wunschliste ist leer.</p>';
      return;
    }
    content.innerHTML = `
      <div class="product-grid">
        ${items
          .map((item) => {
            const product = item.product;
            const url = productUrl(item.productId, item.color);
            const colorText = colorLabel(item.color);
            return `
            <article class="product-card">
              <div class="product-card__media">
                <a href="${esc(url)}" class="product-card__image-link" tabindex="-1" aria-hidden="true">
                  ${imageHtml(firstImage(product, item.color), `${product.name} in ${colorText}`, { className: "product-card__image" })}
                </a>
                ${heartButtonHtml(item.productId, item.color, { className: "product-card__heart" })}
              </div>
              <div class="product-card__body">
                <p class="product-card__category">${esc(categoryLabel(product))}</p>
                <h2 class="product-card__title"><a href="${esc(url)}">${esc(product.name)}</a></h2>
                <p class="product-card__color">Farbe: ${esc(colorText)}</p>
                <p class="product-card__price">${esc(productPriceHtml(product))}</p>
                <a class="btn btn--secondary btn--small btn--block" href="${esc(url)}">Größe wählen</a>
              </div>
            </article>`;
          })
          .join("")}
      </div>`;
  };

  try {
    await refreshWishlist();
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;
  render();

  // Nach dem Entfernen eines Eintrags neu darstellen
  const unsubscribe = subscribe((type) => {
    if (!isCurrent()) {
      unsubscribe();
      return;
    }
    if (type === "wishlist") render();
  });
}
