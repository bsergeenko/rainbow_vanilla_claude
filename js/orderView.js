// Gemeinsame Darstellung von Warenkorb- und Bestellpositionen sowie Bestelldetails
import { esc, firstImage } from "./utils.js";
import { imageHtml } from "./ui.js";
import {
  colorLabel,
  sizeLabel,
  formatPrice,
  formatDateTime,
  statusLabel,
  designLabel,
  findDesign,
  targetLabel,
  subcategoryLabel,
  shippingLabel,
  paymentLabel,
  categoryLabel
} from "./i18n.js";

export function productName(product, fallbackId) {
  return product ? product.name : `Produkt ${fallbackId || ""}`.trim();
}

// Bild einer Position: Produktbild der Farbe, sonst Rückenmotiv
export function itemImageHtml(item, product, designs) {
  const image = firstImage(product, item.color);
  const name = productName(product, item.productId);
  if (image) return imageHtml(image, `${name} in ${colorLabel(item.color)}`, { className: "line-item__image" });
  const design = findDesign(item.designId, designs);
  if (design) return imageHtml(design.image, `Rückenmotiv ${designLabel(design, designs)}`, { className: "line-item__image" });
  return imageHtml("", name, { className: "line-item__image" });
}

// Eigenschaften einer Position (Farbe, Größe, ggf. Konfiguration aus „Dein Design“)
export function itemAttributeRows(item, product, designs) {
  const rows = [];
  if (product) rows.push(["Kategorie", categoryLabel(product)]);
  rows.push(["Farbe", colorLabel(item.color)]);
  rows.push(["Größe", sizeLabel(item.size)]);
  if (item.designId) {
    const design = findDesign(item.designId, designs);
    const target = targetLabel(product);
    const sub = subcategoryLabel(product);
    rows.push(["Für wen?", sub ? `${target} (${sub})` : target || "–"]);
    rows.push(["Rückenmotiv", design ? designLabel(design, designs) : "Motiv nicht mehr verfügbar"]);
    rows.push(["Taschenwunsch", item.pocketRequest && item.pocketRequest.trim() ? item.pocketRequest.trim() : "Keine Angabe"]);
  }
  return rows;
}

export function attributeListHtml(rows) {
  return `<dl class="attr-list">${rows
    .map(([label, value]) => `<div class="attr-list__row"><dt>${esc(label)}:</dt><dd>${esc(value)}</dd></div>`)
    .join("")}</dl>`;
}

export function statusBadgeHtml(status) {
  return `<span class="status-badge status-badge--${esc(status)}">${esc(statusLabel(status))}</span>`;
}

function addressLines(customer) {
  return [
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
    customer.street,
    `${customer.postalCode || ""} ${customer.city || ""}`.trim(),
    customer.country
  ].filter((line) => line && String(line).trim());
}

/**
 * Vollständige Bestelldetails (Produkte, Preise, Versand, Kundendaten).
 * Wird im Benutzerkonto, auf der Bestätigungsseite und im Adminbereich verwendet.
 */
export function orderDetailsHtml(order, { products = [], designs = null, shippingOptions = [], accountInfoHtml = "" } = {}) {
  const customer = order.customer || {};
  const items = order.items || [];
  const itemsHtml = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = Number(item.unitPrice);
      const quantity = Number(item.quantity) || 1;
      const itemTotal = Number.isFinite(Number(item.itemTotal)) ? Number(item.itemTotal) : unitPrice * quantity;
      return `
        <li class="line-item line-item--compact">
          <div class="line-item__media">${itemImageHtml(item, product, designs)}</div>
          <div class="line-item__info">
            <p class="line-item__name">${esc(productName(product, item.productId))}</p>
            ${attributeListHtml(itemAttributeRows(item, product, designs))}
          </div>
          <div class="line-item__prices">
            <p><span class="muted">Einzelpreis:</span> ${esc(formatPrice(unitPrice))}</p>
            <p><span class="muted">Menge:</span> ${esc(quantity)}</p>
            <p class="line-item__total"><span class="muted">Summe:</span> ${esc(formatPrice(itemTotal))}</p>
          </div>
        </li>`;
    })
    .join("");

  return `
    <div class="order-details">
      <dl class="order-meta">
        <div><dt>Bestellnummer</dt><dd>${esc(order.id)}</dd></div>
        <div><dt>Bestelldatum</dt><dd>${esc(formatDateTime(order.createdAt))}</dd></div>
        <div><dt>Status</dt><dd>${statusBadgeHtml(order.status)}</dd></div>
      </dl>
      ${accountInfoHtml}
      <h3 class="order-details__heading">Produkte</h3>
      <ul class="line-items">${itemsHtml}</ul>
      <div class="order-details__columns">
        <section>
          <h3 class="order-details__heading">Preise</h3>
          <dl class="totals">
            <div><dt>Zwischensumme</dt><dd>${esc(formatPrice(order.subtotal))}</dd></div>
            <div><dt>Versandkosten</dt><dd>${esc(formatPrice(order.shippingCost))}</dd></div>
            <div class="totals__grand"><dt>Gesamtpreis</dt><dd>${esc(formatPrice(order.total))}</dd></div>
          </dl>
        </section>
        <section>
          <h3 class="order-details__heading">Versand und Zahlung</h3>
          <dl class="attr-list attr-list--stacked">
            <div class="attr-list__row"><dt>Versandart:</dt><dd>${esc(shippingLabel(order.shippingMethod, shippingOptions))}</dd></div>
            <div class="attr-list__row"><dt>Versandkosten:</dt><dd>${esc(formatPrice(order.shippingCost))}</dd></div>
            <div class="attr-list__row"><dt>Zahlungsmethode:</dt><dd>${esc(paymentLabel(order.paymentMethod))}</dd></div>
          </dl>
        </section>
        <section>
          <h3 class="order-details__heading">Kundendaten und Lieferadresse</h3>
          <address class="address">
            ${addressLines(customer).map((line) => `${esc(line)}<br>`).join("")}
            ${customer.email ? `<span class="muted">E-Mail-Adresse:</span> ${esc(customer.email)}` : ""}
          </address>
        </section>
      </div>
    </div>`;
}

export function refundNoticeHtml(order) {
  return `<p class="refund-note">Die Bestellung wurde storniert. Der Gesamtbetrag von ${esc(
    formatPrice(order.total)
  )} (inklusive Versandkosten) wird auf die ursprünglich verwendete Zahlungsmethode zurückerstattet.</p>`;
}
