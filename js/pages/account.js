import { api } from "../api.js";
import { setUser, clearSession, refreshCart, loadProducts } from "../store.js";
import { esc } from "../utils.js";
import {
  loadingHtml,
  errorHtml,
  fieldHtml,
  requiredNote,
  rules,
  attachValidation,
  setButtonBusy,
  formErrorHtml,
  setFormError,
  showToast,
  confirmDialog
} from "../ui.js";
import { formatDate, formatPrice } from "../i18n.js";
import { orderDetailsHtml, statusBadgeHtml, refundNoticeHtml } from "../orderView.js";

const CANCELLABLE = ["new", "processing"];

export async function renderAccount({ main, isCurrent, navigate, logout }) {
  document.title = "Mein Konto – Rainbow.design";
  main.innerHTML = `<div class="container page">${loadingHtml("Benutzerkonto wird geladen …")}</div>`;

  let me;
  try {
    me = await api.getMe();
  } catch (error) {
    if (!isCurrent()) return;
    if (error.status === 401 || error.status === 404) {
      clearSession();
      navigate("/anmelden", { replace: true });
      return;
    }
    main.innerHTML = `<div class="container page">${errorHtml(error.message)}</div>`;
    return;
  }
  if (!isCurrent()) return;
  setUser(me);

  main.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <h1 class="page-title">Mein Konto</h1>
        <p class="page-intro">Hallo ${esc(me.firstName)}, hier findest du deine Kontodaten und Bestellungen.</p>
      </header>
      <nav class="account-nav" aria-label="Kontoübersicht">
        <ul>
          <li><a href="#persoenliche-daten">Persönliche Daten</a></li>
          <li><a href="#bestellungen">Meine Bestellungen</a></li>
          <li><a href="/wunschliste?von=konto">Meine Wunschliste</a></li>
          <li><a href="#passwort">Passwort ändern</a></li>
          <li><button type="button" class="link-btn" data-account-action="logout">Abmelden</button></li>
          <li><button type="button" class="link-btn link-btn--danger" data-account-action="delete">Konto löschen</button></li>
        </ul>
      </nav>

      <div class="account-grid">
        <section class="card" id="persoenliche-daten" aria-labelledby="profile-title" tabindex="-1">
          <div class="card__header">
            <h2 class="card__title" id="profile-title">Persönliche Daten</h2>
          </div>
          <div id="profile-content"></div>
        </section>

        <section class="card" id="passwort" aria-labelledby="password-title" tabindex="-1">
          <h2 class="card__title" id="password-title">Passwort ändern</h2>
          <form id="password-form" novalidate>
            ${requiredNote}
            ${fieldHtml({ name: "currentPassword", label: "Aktuelles Passwort", type: "password", required: true, autocomplete: "current-password" })}
            ${fieldHtml({ name: "newPassword", label: "Neues Passwort", type: "password", required: true, autocomplete: "new-password" })}
            ${fieldHtml({ name: "newPasswordConfirm", label: "Neues Passwort bestätigen", type: "password", required: true, autocomplete: "new-password" })}
            ${formErrorHtml()}
            <button type="submit" class="btn btn--primary">Passwort ändern</button>
          </form>
        </section>

        <section class="card card--wide" id="bestellungen" aria-labelledby="orders-title" tabindex="-1">
          <h2 class="card__title" id="orders-title">Meine Bestellungen</h2>
          <div id="orders-content">${loadingHtml("Bestellungen werden geladen …")}</div>
        </section>

        <section class="card card--wide" aria-labelledby="wishlist-title">
          <h2 class="card__title" id="wishlist-title">Meine Wunschliste</h2>
          <p>Hier findest du alle Produkte, die du dir gemerkt hast.</p>
          <a class="btn btn--secondary" href="/wunschliste?von=konto">Meine Wunschliste</a>
        </section>

        <section class="card card--wide account-actions" aria-labelledby="actions-title">
          <h2 class="card__title" id="actions-title">Abmelden und Konto löschen</h2>
          <div class="account-actions__buttons">
            <button type="button" class="btn btn--secondary" data-account-action="logout">Abmelden</button>
            <button type="button" class="btn btn--danger" data-account-action="delete">Konto löschen</button>
          </div>
          <p class="muted small">Beim Löschen deines Kontos bleiben bereits aufgegebene Bestellungen erhalten, sind aber nicht mehr über ein Benutzerkonto abrufbar.</p>
        </section>
      </div>
    </div>`;

  /* ---------- Persönliche Daten ---------- */

  const profileBox = main.querySelector("#profile-content");

  const renderProfileView = () => {
    const address = me.address || {};
    const addressLines = [
      address.street,
      `${address.postalCode || ""} ${address.city || ""}`.trim(),
      address.country
    ].filter((line) => line && line.trim());
    profileBox.innerHTML = `
      <dl class="profile-list">
        <div><dt>Name</dt><dd>${esc(me.firstName)} ${esc(me.lastName)}</dd></div>
        <div><dt>E-Mail-Adresse</dt><dd>${esc(me.email)}</dd></div>
        ${
          addressLines.length
            ? `<div><dt>Adresse</dt><dd><address class="address">${addressLines.map((l) => esc(l)).join("<br>")}</address></dd></div>`
            : ""
        }
      </dl>
      <button type="button" class="btn btn--secondary" id="edit-profile">Bearbeiten</button>`;
    profileBox.querySelector("#edit-profile").addEventListener("click", renderProfileForm);
  };

  const renderProfileForm = () => {
    const address = me.address || {};
    profileBox.innerHTML = `
      <form id="profile-form" novalidate>
        ${requiredNote}
        <div class="form-grid">
          ${fieldHtml({ name: "firstName", label: "Vorname", required: true, autocomplete: "given-name", value: me.firstName })}
          ${fieldHtml({ name: "lastName", label: "Nachname", required: true, autocomplete: "family-name", value: me.lastName })}
          <div class="form-grid__full">${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, autocomplete: "email", value: me.email })}</div>
          <div class="form-grid__full">${fieldHtml({ name: "street", label: "Straße und Hausnummer", autocomplete: "street-address", value: address.street || "" })}</div>
          ${fieldHtml({ name: "postalCode", label: "Postleitzahl", autocomplete: "postal-code", inputmode: "numeric", value: address.postalCode || "" })}
          ${fieldHtml({ name: "city", label: "Ort", autocomplete: "address-level2", value: address.city || "" })}
          <div class="form-grid__full">${fieldHtml({ name: "country", label: "Land", autocomplete: "country-name", value: address.country || "" })}</div>
        </div>
        ${formErrorHtml()}
        <div class="form-actions">
          <button type="submit" class="btn btn--primary">Speichern</button>
          <button type="button" class="btn btn--secondary" id="cancel-profile">Abbrechen</button>
        </div>
      </form>`;
    const form = profileBox.querySelector("#profile-form");
    form.querySelector("input").focus();
    form.querySelector("#cancel-profile").addEventListener("click", () => {
      renderProfileView();
      profileBox.querySelector("#edit-profile").focus();
    });
    attachValidation(
      form,
      {
        firstName: [rules.required("Bitte gib deinen Vornamen ein.")],
        lastName: [rules.required("Bitte gib deinen Nachnamen ein.")],
        email: [rules.required("Bitte gib deine E-Mail-Adresse ein."), rules.email()],
        street: [],
        postalCode: [],
        city: [],
        country: []
      },
      async (values) => {
        const button = form.querySelector('button[type="submit"]');
        setFormError(form, "");
        setButtonBusy(button, true, "Wird gespeichert …");
        try {
          me = await api.updateMe({
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            email: values.email.trim(),
            street: values.street.trim(),
            postalCode: values.postalCode.trim(),
            city: values.city.trim(),
            country: values.country.trim()
          });
          setUser(me);
          renderProfileView();
          showToast("Deine persönlichen Daten wurden gespeichert.");
          profileBox.querySelector("#edit-profile").focus();
        } catch (error) {
          setButtonBusy(button, false);
          setFormError(form, error.message || "Die Daten konnten nicht gespeichert werden.");
        }
      }
    );
  };

  renderProfileView();

  /* ---------- Passwort ändern ---------- */

  const passwordForm = main.querySelector("#password-form");
  const passwordValidation = attachValidation(
    passwordForm,
    {
      currentPassword: [rules.required("Bitte gib dein aktuelles Passwort ein.")],
      newPassword: [rules.required("Bitte gib ein neues Passwort ein.")],
      newPasswordConfirm: [
        rules.required("Bitte bestätige dein neues Passwort."),
        rules.matches("newPassword", "Die neuen Passwörter stimmen nicht überein.")
      ]
    },
    async (values) => {
      const button = passwordForm.querySelector('button[type="submit"]');
      setFormError(passwordForm, "");
      setButtonBusy(button, true, "Wird gespeichert …");
      try {
        // Nur aktuelles und neues Passwort werden gesendet
        await api.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        passwordForm.reset();
        passwordValidation.reset();
        showToast("Dein Passwort wurde geändert.");
      } catch (error) {
        setFormError(passwordForm, error.message || "Das Passwort konnte nicht geändert werden.");
      } finally {
        setButtonBusy(button, false);
      }
    }
  );

  /* ---------- Abmelden / Konto löschen ---------- */

  main.querySelectorAll("[data-account-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.accountAction === "logout") {
        logout();
        return;
      }
      const confirmed = await confirmDialog({
        title: "Konto löschen?",
        message:
          "Möchtest du dein Benutzerkonto wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden. Bereits aufgegebene Bestellungen bleiben erhalten.",
        confirmLabel: "Konto löschen",
        danger: true
      });
      if (!confirmed) return;
      try {
        await api.deleteMe();
        clearSession();
        await refreshCart();
        navigate("/", { flash: { message: "Dein Konto wurde gelöscht." } });
      } catch (error) {
        showToast(error.message || "Das Konto konnte nicht gelöscht werden.", { type: "error" });
      }
    });
  });

  /* ---------- Meine Bestellungen ---------- */

  const ordersBox = main.querySelector("#orders-content");
  let orders = [];
  let products = [];
  let designs = null;
  let shippingOptions = [];
  const expanded = new Set();
  const refunded = new Set();

  const renderOrders = () => {
    if (!orders.length) {
      ordersBox.innerHTML = '<p class="empty-state">Du hast noch keine Bestellungen.</p>';
      return;
    }
    ordersBox.innerHTML = `
      <ul class="order-list">
        ${orders
          .map((order) => {
            const open = expanded.has(order.id);
            const detailsId = `order-details-${order.id}`;
            return `
            <li class="order-entry" data-order="${esc(order.id)}">
              <div class="order-entry__summary">
                <dl class="order-entry__meta">
                  <div><dt>Bestellnummer</dt><dd>${esc(order.id)}</dd></div>
                  <div><dt>Bestelldatum</dt><dd>${esc(formatDate(order.createdAt))}</dd></div>
                  <div><dt>Status</dt><dd>${statusBadgeHtml(order.status)}</dd></div>
                  <div><dt>Gesamtpreis</dt><dd>${esc(formatPrice(order.total))}</dd></div>
                </dl>
                <div class="order-entry__actions">
                  <button type="button" class="btn btn--secondary btn--small" data-order-action="toggle" aria-expanded="${open}" aria-controls="${esc(detailsId)}">${open ? "Details ausblenden" : "Details anzeigen"}</button>
                  ${
                    CANCELLABLE.includes(order.status)
                      ? '<button type="button" class="btn btn--danger btn--small" data-order-action="cancel">Bestellung stornieren</button>'
                      : ""
                  }
                </div>
              </div>
              ${order.status === "cancelled" ? refundNoticeHtml(order) : ""}
              <div class="order-entry__details" id="${esc(detailsId)}" ${open ? "" : "hidden"}>
                ${open ? orderDetailsHtml(order, { products, designs, shippingOptions }) : ""}
              </div>
            </li>`;
          })
          .join("")}
      </ul>`;
  };

  ordersBox.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-order-action]");
    if (!button) return;
    const entry = button.closest("[data-order]");
    const order = orders.find((o) => o.id === entry.dataset.order);
    if (!order) return;
    if (button.dataset.orderAction === "toggle") {
      if (expanded.has(order.id)) expanded.delete(order.id);
      else expanded.add(order.id);
      renderOrders();
      ordersBox.querySelector(`[data-order="${CSS.escape(order.id)}"] [data-order-action="toggle"]`).focus();
      return;
    }
    const confirmed = await confirmDialog({
      title: "Bestellung stornieren?",
      message: `Möchtest du die Bestellung ${order.id} wirklich stornieren? Der Gesamtbetrag von ${formatPrice(
        order.total
      )} inklusive Versandkosten wird auf die ursprünglich verwendete Zahlungsmethode zurückerstattet.`,
      confirmLabel: "Bestellung stornieren",
      cancelLabel: "Nicht stornieren",
      danger: true
    });
    if (!confirmed) return;
    setButtonBusy(button, true, "Wird storniert …");
    try {
      const updated = await api.cancelOrder(order.id);
      orders = orders.map((o) => (o.id === order.id ? { ...o, ...updated } : o));
      refunded.add(order.id);
      renderOrders();
      showToast(
        `Die Bestellung wurde storniert. Der Gesamtbetrag von ${formatPrice(order.total)} wird auf die ursprünglich verwendete Zahlungsmethode zurückerstattet.`
      );
      const toggle = ordersBox.querySelector(`[data-order="${CSS.escape(order.id)}"] [data-order-action="toggle"]`);
      if (toggle) toggle.focus();
    } catch (error) {
      setButtonBusy(button, false);
      showToast(error.message || "Die Bestellung konnte nicht storniert werden.", { type: "error" });
    }
  });

  try {
    [orders, products, designs, shippingOptions] = await Promise.all([
      api.getOrders(),
      loadProducts(),
      api.getDesigns(),
      api.getShippingOptions()
    ]);
    orders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    if (!isCurrent()) return;
    ordersBox.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;
  renderOrders();

  // Direkter Sprung zu einem Abschnitt (z. B. /konto#bestellungen)
  if (window.location.hash) {
    const target = main.querySelector(window.location.hash.replace(/[^#\w-]/g, ""));
    if (target) target.scrollIntoView();
  }
}
