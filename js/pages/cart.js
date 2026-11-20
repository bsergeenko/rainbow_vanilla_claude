import { api } from "../api.js";
import { state, setCartItems, loadProducts } from "../store.js";
import { esc, unitPriceFor } from "../utils.js";
import { loadingHtml, errorHtml, showToast, productUrl } from "../ui.js";
import { formatPrice } from "../i18n.js";
import { icons } from "../icons.js";
import { itemImageHtml, itemAttributeRows, attributeListHtml, productName } from "../orderView.js";

export async function renderCart({ main, isCurrent }) {
  document.title = "Warenkorb – Rainbow.design";
  main.innerHTML = `
    <div class="container page">
      <header class="page-header"><h1 class="page-title">Warenkorb</h1></header>
      <div id="cart-content">${loadingHtml("Warenkorb wird geladen …")}</div>
    </div>`;
  const content = main.querySelector("#cart-content");

  let items;
  let products;
  let designs;
  try {
    [items, products, designs] = await Promise.all([api.getCart(), loadProducts(), api.getDesigns()]);
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;
  setCartItems(items);

  const priceOf = (item) => unitPriceFor(products.find((p) => p.id === item.productId), item.size);

  const render = () => {
    if (!items.length) {
      content.innerHTML = '<p class="empty-state">Dein Warenkorb ist leer.</p>';
      return;
    }
    const subtotal = items.reduce((sum, item) => sum + (priceOf(item) || 0) * item.quantity, 0);
    content.innerHTML = `
      <div class="cart-layout">
        <ul class="line-items" aria-label="Produkte im Warenkorb">
          ${items
            .map((item) => {
              const product = products.find((p) => p.id === item.productId);
              const unit = priceOf(item);
              const name = productName(product, item.productId);
              const nameHtml =
                product && !item.designId
                  ? `<a href="${esc(productUrl(product.id, item.color))}">${esc(name)}</a>`
                  : esc(name);
              return `
              <li class="line-item" data-item="${esc(item.itemId)}">
                <div class="line-item__media">${itemImageHtml(item, product, designs)}</div>
                <div class="line-item__info">
                  <h2 class="line-item__name">${nameHtml}${item.designId ? ' <span class="tag">Dein Design</span>' : ""}</h2>
                  ${attributeListHtml(itemAttributeRows(item, product, designs))}
                  <p class="line-item__unit"><span class="muted">Einzelpreis:</span> ${esc(formatPrice(unit))}</p>
                </div>
                <div class="line-item__controls">
                  <div class="qty" role="group" aria-label="Menge für ${esc(name)}">
                    <button type="button" class="qty__btn" data-action="decrease" aria-label="Menge verringern" ${item.quantity <= 1 ? "disabled" : ""}>${icons.minus}</button>
                    <span class="qty__value" aria-live="polite"><span class="visually-hidden">Menge: </span>${esc(item.quantity)}</span>
                    <button type="button" class="qty__btn" data-action="increase" aria-label="Menge erhöhen">${icons.plus}</button>
                  </div>
                  <p class="line-item__total"><span class="muted">Positionspreis:</span> ${esc(formatPrice(unit * item.quantity))}</p>
                  <button type="button" class="link-btn link-btn--danger" data-action="remove">${icons.trash}<span>Löschen</span></button>
                </div>
              </li>`;
            })
            .join("")}
        </ul>
        <aside class="cart-summary" aria-labelledby="cart-summary-title">
          <h2 class="summary-box__title" id="cart-summary-title">Übersicht</h2>
          <dl class="totals">
            <div class="totals__grand"><dt>Zwischensumme</dt><dd>${esc(formatPrice(subtotal))}</dd></div>
          </dl>
          <p class="muted small">Versandkosten werden im Checkout berechnet.</p>
          <a class="btn btn--primary btn--large btn--block" href="/kasse">Zur Kasse</a>
          ${
            state.user
              ? ""
              : `<div class="cart-login">
                  <p><strong>Du hast ein Kundenkonto?</strong> Melde dich an oder registriere dich, damit dein Warenkorb in deinem Konto gespeichert wird. Du kannst auch ohne Anmeldung bestellen.</p>
                  <div class="cart-login__actions">
                    <a class="btn btn--secondary" href="/anmelden?weiter=warenkorb">Anmelden</a>
                    <a class="btn btn--secondary" href="/registrieren?weiter=warenkorb">Registrieren</a>
                  </div>
                </div>`
          }
        </aside>
      </div>`;
  };

  const reloadItems = async () => {
    items = await api.getCart();
    setCartItems(items);
  };

  content.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.dataset.action === "reload") return;
    const row = button.closest("[data-item]");
    if (!row) return;
    const item = items.find((i) => i.itemId === row.dataset.item);
    if (!item) return;
    const action = button.dataset.action;
    row.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      if (action === "increase") {
        await api.updateCartItem(item.itemId, item.quantity + 1);
      } else if (action === "decrease") {
        if (item.quantity <= 1) return;
        await api.updateCartItem(item.itemId, item.quantity - 1);
      } else if (action === "remove") {
        await api.removeCartItem(item.itemId);
        showToast("Das Produkt wurde aus dem Warenkorb entfernt.");
      }
      await reloadItems();
    } catch (error) {
      showToast(error.message || "Der Warenkorb konnte nicht aktualisiert werden.", { type: "error" });
      try {
        await reloadItems();
      } catch {
        /* Anzeige bleibt beim letzten Stand */
      }
    }
    if (!isCurrent()) return;
    render();
    // Fokus nach der Aktualisierung sinnvoll wiederherstellen
    const sameRow = content.querySelector(`[data-item="${CSS.escape(item.itemId)}"]`);
    const focusTarget = sameRow
      ? sameRow.querySelector(`[data-action="${action}"]:not([disabled])`) || sameRow.querySelector("[data-action]:not([disabled])")
      : content.querySelector(".line-item [data-action]") || content.querySelector(".empty-state");
    if (focusTarget) {
      if (focusTarget.classList.contains("empty-state")) focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus();
    }
  });

  render();
}
