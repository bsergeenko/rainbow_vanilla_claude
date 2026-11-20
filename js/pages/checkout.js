import { api } from "../api.js";
import { state, setCartItems, refreshUser, loadProducts } from "../store.js";
import { esc, unitPriceFor } from "../utils.js";
import {
  loadingHtml,
  errorHtml,
  fieldHtml,
  requiredNote,
  rules,
  attachValidation,
  setButtonBusy,
  formErrorHtml,
  setFormError
} from "../ui.js";
import { formatPrice, colorLabel, sizeLabel } from "../i18n.js";
import { productName } from "../orderView.js";

export const CONFIRMATION_KEY = "rainbow-last-order";

export async function renderCheckout({ main, isCurrent, navigate }) {
  document.title = "Kasse – Rainbow.design";
  main.innerHTML = `
    <div class="container page">
      <header class="page-header"><h1 class="page-title">Kasse</h1></header>
      <div id="checkout-content">${loadingHtml("Kasse wird geladen …")}</div>
    </div>`;
  const content = main.querySelector("#checkout-content");

  let items;
  let products;
  let shippingOptions;
  let me = null;
  try {
    [items, products, shippingOptions] = await Promise.all([api.getCart(), loadProducts(), api.getShippingOptions()]);
    if (state.user) me = await refreshUser();
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;
  setCartItems(items);

  if (!items.length) {
    navigate("/warenkorb", { replace: true });
    return;
  }

  const address = (me && me.address) || {};
  const priceOf = (item) => unitPriceFor(products.find((p) => p.id === item.productId), item.size);
  const subtotal = items.reduce((sum, item) => sum + (priceOf(item) || 0) * item.quantity, 0);

  content.innerHTML = `
    <form class="checkout" id="checkout-form" novalidate>
      <div class="checkout__main">
        <section class="form-section" aria-labelledby="customer-title">
          <h2 class="form-section__title" id="customer-title">Kundendaten</h2>
          ${requiredNote}
          <div class="form-grid">
            ${fieldHtml({ name: "firstName", label: "Vorname", required: true, autocomplete: "given-name", value: me ? me.firstName : "" })}
            ${fieldHtml({ name: "lastName", label: "Nachname", required: true, autocomplete: "family-name", value: me ? me.lastName : "" })}
            <div class="form-grid__full">${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, autocomplete: "email", value: me ? me.email : "" })}</div>
            <div class="form-grid__full">${fieldHtml({ name: "street", label: "Straße und Hausnummer", required: true, autocomplete: "street-address", value: address.street || "" })}</div>
            ${fieldHtml({ name: "postalCode", label: "Postleitzahl", required: true, autocomplete: "postal-code", inputmode: "numeric", value: address.postalCode || "" })}
            ${fieldHtml({ name: "city", label: "Ort", required: true, autocomplete: "address-level2", value: address.city || "" })}
            <div class="form-grid__full">${fieldHtml({ name: "country", label: "Land", required: true, autocomplete: "country-name", value: address.country || "" })}</div>
          </div>
          ${
            me
              ? `<label class="checkbox">
                  <input type="checkbox" name="saveAddress">
                  <span>Diese Adresse in meinem Konto speichern</span>
                </label>`
              : ""
          }
        </section>

        <section class="form-section" aria-labelledby="shipping-title">
          <h2 class="form-section__title" id="shipping-title">Versandart</h2>
          <div class="field" data-field="shippingMethod">
            <fieldset class="radio-cards">
              <legend class="visually-hidden">Versandart auswählen<span aria-hidden="true"> *</span></legend>
              ${shippingOptions
                .map(
                  (option) => `
                <label class="radio-card">
                  <input type="radio" name="shippingMethod" value="${esc(option.id)}" aria-describedby="shipping-error">
                  <span class="radio-card__body">
                    <span class="radio-card__title">${esc(option.name)}</span>
                    <span class="radio-card__price">${esc(formatPrice(option.price))}</span>
                  </span>
                </label>`
                )
                .join("")}
            </fieldset>
            <p class="field__error" id="shipping-error" hidden></p>
          </div>
        </section>

        <section class="form-section" aria-labelledby="payment-title">
          <h2 class="form-section__title" id="payment-title">Zahlung</h2>
          <p class="payment-method"><strong>Zahlungsmethode:</strong> Kartenzahlung</p>
          <div class="form-grid">
            <div class="form-grid__full">${fieldHtml({ name: "cardNumber", label: "Kartennummer", required: true, inputmode: "numeric", autocomplete: "off", placeholder: "16 Ziffern", maxlength: 19 })}</div>
            ${fieldHtml({ name: "cardExpiry", label: "Ablaufdatum (MM/JJ)", required: true, inputmode: "numeric", autocomplete: "off", placeholder: "MM/JJ", maxlength: 5 })}
            ${fieldHtml({ name: "cardCvc", label: "Sicherheitscode", required: true, inputmode: "numeric", autocomplete: "off", placeholder: "3 Ziffern", maxlength: 3 })}
          </div>
        </section>
      </div>

      <aside class="checkout__summary summary-box" aria-labelledby="order-summary-title">
        <h2 class="summary-box__title" id="order-summary-title">Bestellübersicht</h2>
        <ul class="summary-items">
          ${items
            .map((item) => {
              const product = products.find((p) => p.id === item.productId);
              const unit = priceOf(item);
              return `
              <li class="summary-items__row">
                <div>
                  <p class="summary-items__name">${esc(productName(product, item.productId))}${item.designId ? ' <span class="tag">Dein Design</span>' : ""}</p>
                  <p class="muted small">${esc(colorLabel(item.color))} · ${esc(sizeLabel(item.size))}</p>
                  <p class="muted small">${esc(item.quantity)} × ${esc(formatPrice(unit))}</p>
                </div>
                <p class="summary-items__price">${esc(formatPrice(unit * item.quantity))}</p>
              </li>`;
            })
            .join("")}
        </ul>
        <dl class="totals">
          <div><dt>Zwischensumme</dt><dd>${esc(formatPrice(subtotal))}</dd></div>
          <div><dt>Versandkosten</dt><dd id="summary-shipping">Bitte Versandart wählen</dd></div>
          <div class="totals__grand"><dt>Gesamtpreis</dt><dd id="summary-total">${esc(formatPrice(subtotal))}</dd></div>
        </dl>
        ${formErrorHtml()}
        <button type="submit" class="btn btn--primary btn--large btn--block" id="place-order">Jetzt kaufen</button>
        <a class="back-link back-link--center" href="/warenkorb">Zurück zum Warenkorb</a>
      </aside>
    </form>`;

  const form = content.querySelector("#checkout-form");
  const shippingEl = content.querySelector("#summary-shipping");
  const totalEl = content.querySelector("#summary-total");

  form.addEventListener("change", (event) => {
    if (event.target.name !== "shippingMethod") return;
    const option = shippingOptions.find((o) => o.id === event.target.value);
    if (!option) return;
    shippingEl.textContent = formatPrice(option.price);
    totalEl.textContent = formatPrice(subtotal + Number(option.price));
  });

  // Ablaufdatum: Schrägstrich automatisch ergänzen
  const expiry = form.elements.cardExpiry;
  expiry.addEventListener("input", (event) => {
    if (event.inputType && event.inputType.startsWith("delete")) return;
    const digits = expiry.value.replace(/\D/g, "").slice(0, 4);
    expiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  const req = (label) => rules.required(`Bitte gib ${label} ein.`);
  attachValidation(
    form,
    {
      firstName: [req("deinen Vornamen")],
      lastName: [req("deinen Nachnamen")],
      email: [req("deine E-Mail-Adresse"), rules.email()],
      street: [req("Straße und Hausnummer")],
      postalCode: [req("die Postleitzahl")],
      city: [req("den Ort")],
      country: [req("das Land")],
      shippingMethod: [rules.required("Bitte wähle eine Versandart aus.")],
      cardNumber: [
        req("die Kartennummer"),
        rules.custom((value) => (/^\d{16}$/.test(String(value).replace(/\s/g, "")) ? "" : "Die Kartennummer muss aus 16 Ziffern bestehen."))
      ],
      cardExpiry: [
        req("das Ablaufdatum"),
        rules.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/, "Bitte gib das Ablaufdatum im Format MM/JJ ein (z. B. 08/27).")
      ],
      cardCvc: [req("den Sicherheitscode"), rules.pattern(/^\d{3}$/, "Der Sicherheitscode muss aus 3 Ziffern bestehen.")],
      ...(me ? { saveAddress: [] } : {})
    },
    async (values) => {
      const button = form.querySelector("#place-order");
      setFormError(form, "");
      setButtonBusy(button, true, "Bestellung wird gesendet …");
      // Kartendaten werden nur im Frontend geprüft und nicht übertragen
      const payload = {
        customer: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          street: values.street.trim(),
          postalCode: values.postalCode.trim(),
          city: values.city.trim(),
          country: values.country.trim()
        },
        shippingMethod: values.shippingMethod,
        paymentMethod: "card",
        items: items.map((item) => ({
          productId: item.productId,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          designId: item.designId ?? null,
          pocketRequest: item.pocketRequest || ""
        }))
      };
      if (me) payload.saveAddress = Boolean(values.saveAddress);
      try {
        const order = await api.createOrder(payload);
        setCartItems([]);
        try {
          sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(order));
        } catch {
          /* Speicher nicht verfügbar */
        }
        if (me && payload.saveAddress) refreshUser().catch(() => {});
        navigate("/bestellbestaetigung", { replace: true, confirmationOrder: order });
      } catch (error) {
        setButtonBusy(button, false);
        setFormError(form, error.message || "Die Bestellung konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
      }
    }
  );
}
