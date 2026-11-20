import { esc, uid, qsa, firstImage, lowestPrice, hasSizePrices, isValidEmail } from "./utils.js";
import { assetUrl } from "./config.js";
import { icons } from "./icons.js";
import { colorLabel, formatPrice, categoryLabel } from "./i18n.js";
import { findWishlistItem } from "./store.js";

/* ---------- Statusmeldungen (Toasts) ---------- */

const TOAST_DURATION = 5000;

export function showToast(message, { type = "success", duration, action } = {}) {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  const icon = type === "error" ? icons.alert : type === "info" ? icons.info : icons.check;
  toast.innerHTML = `
    <span class="toast__icon">${icon}</span>
    <div class="toast__body">
      <p class="toast__text">${esc(message)}</p>
      ${action ? `<a class="toast__action" href="${esc(action.href)}">${esc(action.label)}</a>` : ""}
    </div>
    <button type="button" class="toast__close" aria-label="Meldung schließen">${icons.close}</button>`;
  const remove = () => {
    clearTimeout(timer);
    toast.classList.add("toast--leaving");
    setTimeout(() => toast.remove(), 200);
  };
  toast.querySelector(".toast__close").addEventListener("click", remove);
  const actionLink = toast.querySelector(".toast__action");
  if (actionLink) actionLink.addEventListener("click", () => remove());
  region.appendChild(toast);
  const timer = setTimeout(remove, duration || (type === "error" ? 8000 : TOAST_DURATION));
}

export function clearToasts() {
  const region = document.getElementById("toast-region");
  if (region) region.innerHTML = "";
}

/* ---------- Bestätigungsdialog ---------- */

export function confirmDialog({ title, message, confirmLabel = "Bestätigen", cancelLabel = "Abbrechen", danger = false }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    const titleId = uid("dialog-title");
    const textId = uid("dialog-text");
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.setAttribute("aria-describedby", textId);
    dialog.innerHTML = `
      <form method="dialog" class="dialog__inner">
        <h2 class="dialog__title" id="${titleId}">${esc(title)}</h2>
        <p class="dialog__text" id="${textId}">${esc(message)}</p>
        <div class="dialog__actions">
          <button type="submit" value="cancel" class="btn btn--secondary">${esc(cancelLabel)}</button>
          <button type="submit" value="confirm" class="btn ${danger ? "btn--danger" : "btn--primary"}">${esc(confirmLabel)}</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => {
      const result = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(result);
    });
    dialog.showModal();
    const cancelButton = dialog.querySelector('button[value="cancel"]');
    if (cancelButton) cancelButton.focus();
  });
}

/* ---------- Lade- und Fehlerzustände ---------- */

export function loadingHtml(text = "Wird geladen …") {
  return `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${esc(text)}</div>`;
}

export function errorHtml(message, { retry = true } = {}) {
  return `
    <div class="notice notice--error" role="alert">
      <span class="notice__icon">${icons.alert}</span>
      <div>
        <p>${esc(message || "Die Daten konnten nicht geladen werden. Bitte versuche es später erneut.")}</p>
        ${retry ? '<button type="button" class="btn btn--secondary btn--small" data-action="reload">Erneut versuchen</button>' : ""}
      </div>
    </div>`;
}

export function noticeHtml(message, type = "info") {
  const icon = type === "error" ? icons.alert : type === "success" ? icons.check : icons.info;
  return `<div class="notice notice--${type}" ${type === "error" ? 'role="alert"' : ""}><span class="notice__icon">${icon}</span><p>${esc(message)}</p></div>`;
}

export function setButtonBusy(button, busy, busyText = "Wird gesendet …") {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span class="spinner spinner--small" aria-hidden="true"></span>${esc(busyText)}`;
  } else {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.label !== undefined) button.innerHTML = button.dataset.label;
  }
}

/* ---------- Bilder ---------- */

export function imageHtml(src, alt, { className = "", eager = false } = {}) {
  if (!src) {
    return `<div class="img-missing ${esc(className)}" role="img" aria-label="${esc(alt)}"><span>Kein Bild vorhanden</span></div>`;
  }
  return `<img class="${esc(className)}" src="${esc(assetUrl(src))}" alt="${esc(alt)}" ${eager ? "" : 'loading="lazy"'} decoding="async">`;
}

/* ---------- Wunschliste: Herzsymbol ---------- */

export function heartButtonHtml(productId, color, { className = "" } = {}) {
  const saved = Boolean(findWishlistItem(productId, color));
  return `
    <button type="button" class="heart-btn ${saved ? "is-active" : ""} ${esc(className)}"
      data-wish-product="${esc(productId)}" data-wish-color="${esc(color || "")}"
      aria-pressed="${saved}" aria-label="${saved ? "Von der Wunschliste entfernen" : "Zur Wunschliste hinzufügen"}">
      ${saved ? icons.heartFilled : icons.heart}
    </button>`;
}

// Aktualisiert alle Herzsymbole auf der Seite nach einer Änderung der Wunschliste
export function syncHeartButtons(root = document) {
  qsa("[data-wish-product]", root).forEach((button) => {
    const saved = Boolean(findWishlistItem(button.dataset.wishProduct, button.dataset.wishColor));
    button.classList.toggle("is-active", saved);
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-label", saved ? "Von der Wunschliste entfernen" : "Zur Wunschliste hinzufügen");
    button.innerHTML = saved ? icons.heartFilled : icons.heart;
  });
}

/* ---------- Produktkarten ---------- */

export function productPriceHtml(product) {
  const price = lowestPrice(product);
  if (hasSizePrices(product)) return `ab ${formatPrice(price)}`;
  return formatPrice(price);
}

export function productUrl(productId, color) {
  return `/produkt/${encodeURIComponent(productId)}${color ? `?farbe=${encodeURIComponent(color)}` : ""}`;
}

export function productCardHtml(product, color, { showCategory = false } = {}) {
  const url = productUrl(product.id, color);
  const image = firstImage(product, color);
  const colorText = color ? colorLabel(color) : "";
  const alt = `${product.name}${colorText ? ` in ${colorText}` : ""}`;
  return `
    <article class="product-card">
      <div class="product-card__media">
        <a href="${esc(url)}" class="product-card__image-link" tabindex="-1" aria-hidden="true">
          ${imageHtml(image, alt, { className: "product-card__image" })}
        </a>
        ${heartButtonHtml(product.id, color, { className: "product-card__heart" })}
      </div>
      <div class="product-card__body">
        ${showCategory ? `<p class="product-card__category">${esc(categoryLabel(product))}</p>` : ""}
        <h3 class="product-card__title"><a href="${esc(url)}">${esc(product.name)}</a></h3>
        ${colorText ? `<p class="product-card__color">Farbe: ${esc(colorText)}</p>` : ""}
        <p class="product-card__price">${esc(productPriceHtml(product))}</p>
      </div>
    </article>`;
}

/* ---------- Formulare ---------- */

export function fieldHtml({
  name,
  label,
  type = "text",
  value = "",
  required = false,
  autocomplete,
  inputmode,
  placeholder,
  hint,
  textarea = false,
  rows = 5,
  maxlength,
  id
}) {
  const fieldId = id || uid(`f-${name}`);
  const describedBy = [hint ? `${fieldId}-hint` : "", `${fieldId}-error`].filter(Boolean).join(" ");
  const attrs = [
    `id="${fieldId}"`,
    `name="${esc(name)}"`,
    required ? 'aria-required="true"' : "",
    autocomplete ? `autocomplete="${esc(autocomplete)}"` : "",
    inputmode ? `inputmode="${esc(inputmode)}"` : "",
    placeholder ? `placeholder="${esc(placeholder)}"` : "",
    maxlength ? `maxlength="${Number(maxlength)}"` : "",
    `aria-describedby="${describedBy}"`
  ]
    .filter(Boolean)
    .join(" ");
  const control = textarea
    ? `<textarea class="input" rows="${rows}" ${attrs}>${esc(value)}</textarea>`
    : `<input class="input" type="${esc(type)}" value="${esc(value)}" ${attrs}>`;
  return `
    <div class="field" data-field="${esc(name)}">
      <label class="field__label" for="${fieldId}">${esc(label)}${required ? '<span class="field__required" aria-hidden="true"> *</span>' : ""}</label>
      ${control}
      ${hint ? `<p class="field__hint" id="${fieldId}-hint">${esc(hint)}</p>` : ""}
      <p class="field__error" id="${fieldId}-error" hidden></p>
    </div>`;
}

export const requiredNote = '<p class="form-note"><span aria-hidden="true">*</span> Pflichtfeld</p>';

// Validierungsregeln
export const rules = {
  required: (message) => (value) => (String(value ?? "").trim() ? "" : message),
  email: (message = "Bitte gib eine gültige E-Mail-Adresse ein.") => (value) =>
    !String(value ?? "").trim() || isValidEmail(value) ? "" : message,
  matches: (otherName, message) => (value, values) => (value === values[otherName] ? "" : message),
  pattern: (regex, message) => (value) => (!String(value ?? "").trim() || regex.test(String(value).trim()) ? "" : message),
  custom: (fn) => fn
};

/**
 * Verbindet ein Formular mit Validierungsregeln. Fehlermeldungen erscheinen erst
 * nach einem Absendeversuch oder nachdem das jeweilige Feld bearbeitet wurde.
 */
export function attachValidation(form, fieldRules, onValid) {
  let attempted = false;
  const touched = new Set();

  const getValues = () => {
    const values = {};
    Object.keys(fieldRules).forEach((name) => {
      const elements = form.elements[name];
      if (!elements) return;
      if (elements instanceof RadioNodeList) {
        values[name] = elements.value;
      } else if (elements.type === "radio") {
        values[name] = elements.checked ? elements.value : "";
      } else if (elements.type === "checkbox") {
        values[name] = elements.checked;
      } else {
        values[name] = elements.value;
      }
    });
    return values;
  };

  const fieldContainer = (name) => form.querySelector(`[data-field="${CSS.escape(name)}"]`);

  const showError = (name, message) => {
    const container = fieldContainer(name);
    if (!container) return;
    const errorEl = container.querySelector(".field__error");
    const controls = qsa("input, textarea, select", container);
    container.classList.toggle("field--invalid", Boolean(message));
    controls.forEach((control) => {
      if (message) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
    });
    if (errorEl) {
      errorEl.textContent = message || "";
      errorEl.hidden = !message;
    }
  };

  const validateField = (name, values = getValues()) => {
    const checks = fieldRules[name] || [];
    for (const check of checks) {
      const message = check(values[name], values);
      if (message) return message;
    }
    return "";
  };

  const refreshField = (name) => {
    if (!attempted && !touched.has(name)) return;
    showError(name, validateField(name));
  };

  const handleEdit = (event) => {
    const name = event.target.name;
    if (!name || !(name in fieldRules)) return;
    if (event.type === "change" || event.type === "focusout") {
      if (event.target.dataset.edited === "true" || event.type === "change") touched.add(name);
    }
    if (event.type === "input") event.target.dataset.edited = "true";
    refreshField(name);
    // Abhängige Felder (z. B. Passwortbestätigung) aktualisieren
    Object.keys(fieldRules).forEach((other) => {
      if (other !== name && (attempted || touched.has(other))) showError(other, validateField(other));
    });
  };

  form.addEventListener("input", handleEdit);
  form.addEventListener("change", handleEdit);
  form.addEventListener("focusout", handleEdit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    attempted = true;
    const values = getValues();
    let firstInvalid = null;
    Object.keys(fieldRules).forEach((name) => {
      const message = validateField(name, values);
      showError(name, message);
      if (message && !firstInvalid) firstInvalid = name;
    });
    if (firstInvalid) {
      const container = fieldContainer(firstInvalid);
      const control = container && container.querySelector("input, textarea, select");
      if (control) control.focus();
      return;
    }
    await onValid(values, event);
  });

  return {
    reset() {
      attempted = false;
      touched.clear();
      qsa("[data-edited]", form).forEach((el) => delete el.dataset.edited);
      Object.keys(fieldRules).forEach((name) => showError(name, ""));
    },
    setError: showError,
    getValues
  };
}

export function formErrorHtml() {
  return '<div class="form-error" role="alert" hidden></div>';
}

export function setFormError(form, message) {
  const box = form.querySelector(".form-error");
  if (!box) return;
  box.textContent = message || "";
  box.hidden = !message;
}
