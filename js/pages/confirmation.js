import { api } from "../api.js";
import { state, loadProducts } from "../store.js";
import { loadingHtml } from "../ui.js";
import { esc } from "../utils.js";
import { orderDetailsHtml } from "../orderView.js";
import { CONFIRMATION_KEY } from "./checkout.js";

export async function renderConfirmation({ main, isCurrent, navigate }) {
  document.title = "Bestellbestätigung – Rainbow.design";
  let order = null;
  try {
    order = JSON.parse(sessionStorage.getItem(CONFIRMATION_KEY) || "null");
  } catch {
    order = null;
  }
  if (!order || !order.id) {
    navigate("/", { replace: true });
    return;
  }

  main.innerHTML = `<div class="container page">${loadingHtml("Bestellung wird geladen …")}</div>`;

  // Zusatzdaten (Produktnamen, Motive, Versandarten) laden; die Bestellung selbst stammt vom Backend
  let products = [];
  let designs = null;
  let shippingOptions = [];
  try {
    [products, designs, shippingOptions] = await Promise.all([loadProducts(), api.getDesigns(), api.getShippingOptions()]);
  } catch {
    /* Bestätigung wird auch ohne Zusatzdaten angezeigt */
  }
  if (!isCurrent()) return;

  main.innerHTML = `
    <div class="container page page--narrow">
      <header class="page-header confirmation-header">
        <h1 class="page-title">Vielen Dank für deine Bestellung!</h1>
        <p class="page-intro">Deine Bestellung ist bei uns eingegangen. Deine Bestellnummer lautet <strong>${esc(order.id)}</strong>.</p>
        ${
          state.user
            ? '<p class="page-intro">Du findest die Bestellung jederzeit in deinem Benutzerkonto unter „Meine Bestellungen“.</p>'
            : ""
        }
      </header>
      <section class="card" aria-labelledby="confirmation-summary">
        <h2 class="card__title" id="confirmation-summary">Zusammenfassung</h2>
        ${orderDetailsHtml(order, { products, designs, shippingOptions })}
      </section>
      <div class="page-actions">
        <a class="btn btn--primary" href="/">Zur Startseite</a>
        ${state.user ? '<a class="btn btn--secondary" href="/konto#bestellungen">Meine Bestellungen</a>' : ""}
      </div>
    </div>`;
}
