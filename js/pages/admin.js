import { api } from "../api.js";
import { state, setUser, isMainAdmin, invalidateProducts } from "../store.js";
import { esc, firstImage, colorsWithImages, parseDecimal, formatDecimalInput } from "../utils.js";
import {
  loadingHtml,
  errorHtml,
  imageHtml,
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
import {
  formatPrice,
  formatDate,
  formatDateTime,
  categoryLabel,
  sizeLabel,
  statusLabel,
  roleLabel,
  ADMIN_STATUS_OPTIONS
} from "../i18n.js";
import { orderDetailsHtml, statusBadgeHtml } from "../orderView.js";

function pageShell(main, title, intro = "") {
  main.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <h1 class="page-title">${esc(title)}</h1>
        ${intro ? `<p class="page-intro">${esc(intro)}</p>` : ""}
      </header>
      <div id="admin-content">${loadingHtml()}</div>
    </div>`;
  return main.querySelector("#admin-content");
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addressText(address) {
  if (!address) return [];
  return [address.street, `${address.postalCode || ""} ${address.city || ""}`.trim(), address.country].filter(
    (line) => line && String(line).trim()
  );
}

/* ====================== Produkte ====================== */

export async function renderAdminProducts({ main, isCurrent }) {
  document.title = "Produkte – Adminbereich – Rainbow.design";
  const content = pageShell(main, "Produkte", "Alle Produkte des Shops. Produktname, Beschreibung und Preise können bearbeitet werden.");
  let products;
  const editing = new Set();

  const load = async () => {
    invalidateProducts();
    products = await api.getProducts();
  };

  try {
    await load();
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;

  const priceSummary = (product) => {
    if (product.category === "kids" || product.pricesBySize) {
      return (product.sizes || [])
        .map((size) => `${sizeLabel(size)}: ${formatPrice((product.pricesBySize || {})[size])}`)
        .join(" · ");
    }
    return formatPrice(product.price);
  };

  const viewHtml = (product) => {
    const color = colorsWithImages(product)[0];
    return `
      <div class="admin-product__media">${imageHtml(firstImage(product, color), product.name, { className: "admin-product__image" })}</div>
      <div class="admin-product__info">
        <p class="product-card__category">${esc(categoryLabel(product))}</p>
        <h2 class="admin-product__name">${esc(product.name)}</h2>
        <p class="admin-product__description">${esc(product.description)}</p>
        <p class="admin-product__price"><span class="muted">Preis:</span> ${esc(priceSummary(product))}</p>
        <button type="button" class="btn btn--secondary btn--small" data-product-action="edit">Bearbeiten</button>
      </div>`;
  };

  const formHtml = (product) => {
    const isKids = product.category === "kids";
    return `
      <form class="admin-product__form" novalidate>
        <h2 class="admin-product__name">${esc(product.name)} bearbeiten <span class="muted small">(${esc(categoryLabel(product))})</span></h2>
        ${requiredNote}
        ${fieldHtml({ name: "name", label: "Produktname", required: true, value: product.name })}
        ${fieldHtml({ name: "description", label: "Beschreibung", required: true, textarea: true, rows: 4, value: product.description })}
        ${
          isKids
            ? `<fieldset class="form-fieldset">
                <legend class="form-fieldset__legend">Preise nach Größe (€)</legend>
                <div class="form-grid form-grid--three">
                  ${(product.sizes || [])
                    .map((size) =>
                      fieldHtml({
                        name: `price-${size}`,
                        label: `Preis ${sizeLabel(size)}`,
                        required: true,
                        inputmode: "decimal",
                        value: formatDecimalInput((product.pricesBySize || {})[size])
                      })
                    )
                    .join("")}
                </div>
              </fieldset>`
            : fieldHtml({ name: "price", label: "Preis (€)", required: true, inputmode: "decimal", value: formatDecimalInput(product.price) })
        }
        ${formErrorHtml()}
        <div class="form-actions">
          <button type="submit" class="btn btn--primary">Speichern</button>
          <button type="button" class="btn btn--secondary" data-product-action="cancel">Abbrechen</button>
        </div>
      </form>`;
  };

  const priceRule = rules.custom((value) => {
    if (!String(value ?? "").trim()) return "Bitte gib einen Preis ein.";
    return Number.isFinite(parseDecimal(value)) ? "" : "Bitte gib einen gültigen Preis ein (z. B. 49,90).";
  });

  const attachForm = (article, product) => {
    const form = article.querySelector("form");
    const isKids = product.category === "kids";
    const fieldRules = {
      name: [rules.required("Bitte gib einen Produktnamen ein.")],
      description: [rules.required("Bitte gib eine Beschreibung ein.")]
    };
    if (isKids) (product.sizes || []).forEach((size) => (fieldRules[`price-${size}`] = [priceRule]));
    else fieldRules.price = [priceRule];

    attachValidation(form, fieldRules, async (values) => {
      const button = form.querySelector('button[type="submit"]');
      setFormError(form, "");
      setButtonBusy(button, true, "Wird gespeichert …");
      const payload = { name: values.name.trim(), description: values.description.trim() };
      if (isKids) {
        payload.pricesBySize = {};
        (product.sizes || []).forEach((size) => {
          payload.pricesBySize[size] = parseDecimal(values[`price-${size}`]);
        });
      } else {
        payload.price = parseDecimal(values.price);
      }
      try {
        await api.updateProduct(product.id, payload);
        await load();
        if (!isCurrent()) return;
        editing.delete(product.id);
        render();
        showToast("Das Produkt wurde gespeichert.");
        const updated = content.querySelector(`[data-product="${CSS.escape(product.id)}"] [data-product-action="edit"]`);
        if (updated) updated.focus();
      } catch (error) {
        setButtonBusy(button, false);
        setFormError(form, error.message || "Das Produkt konnte nicht gespeichert werden.");
      }
    });
  };

  const render = () => {
    content.innerHTML = `
      <ul class="admin-products">
        ${products
          .map(
            (product) => `
          <li class="card admin-product ${editing.has(product.id) ? "is-editing" : ""}" data-product="${esc(product.id)}">
            ${editing.has(product.id) ? formHtml(product) : viewHtml(product)}
          </li>`
          )
          .join("")}
      </ul>`;
    products.forEach((product) => {
      if (!editing.has(product.id)) return;
      const article = content.querySelector(`[data-product="${CSS.escape(product.id)}"]`);
      attachForm(article, product);
    });
  };

  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-action]");
    if (!button) return;
    const id = button.closest("[data-product]").dataset.product;
    if (button.dataset.productAction === "edit") {
      editing.add(id);
      render();
      const input = content.querySelector(`[data-product="${CSS.escape(id)}"] input`);
      if (input) input.focus();
    } else if (button.dataset.productAction === "cancel") {
      editing.delete(id);
      render();
      const edit = content.querySelector(`[data-product="${CSS.escape(id)}"] [data-product-action="edit"]`);
      if (edit) edit.focus();
    }
  });

  render();
}

/* ====================== Benutzer ====================== */

export async function renderAdminUsers({ main, isCurrent }) {
  document.title = "Benutzer – Adminbereich – Rainbow.design";
  const content = pageShell(main, "Benutzer", "Registrierte Benutzer mit ihren Kontodaten und Bestellungen.");
  let users;
  let orders;
  try {
    [users, orders] = await Promise.all([api.getUsers(), api.getOrders()]);
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;

  if (!users.length) {
    content.innerHTML = '<p class="empty-state">Es sind noch keine Benutzer registriert.</p>';
    return;
  }

  orders = sortOrders(orders);
  content.innerHTML = `
    <p class="result-count">${users.length} ${users.length === 1 ? "Benutzer" : "Benutzer"}</p>
    <ul class="admin-users">
      ${users
        .map((user) => {
          const userOrders = orders.filter((order) => order.userId === user.id);
          const address = addressText(user.address);
          return `
          <li class="card admin-user">
            <div class="admin-user__head">
              <h2 class="card__title">${esc(user.firstName)} ${esc(user.lastName)}</h2>
              <span class="tag">${esc(roleLabel(user.role))}</span>
            </div>
            <dl class="profile-list">
              <div><dt>Vorname</dt><dd>${esc(user.firstName)}</dd></div>
              <div><dt>Nachname</dt><dd>${esc(user.lastName)}</dd></div>
              <div><dt>E-Mail-Adresse</dt><dd>${esc(user.email)}</dd></div>
              <div><dt>Gespeicherte Adresse</dt><dd>${
                address.length ? `<address class="address">${address.map(esc).join("<br>")}</address>` : '<span class="muted">Keine Adresse gespeichert</span>'
              }</dd></div>
            </dl>
            <h3 class="order-details__heading">Bestellungen</h3>
            ${
              userOrders.length
                ? `<div class="table-wrap">
                    <table class="table">
                      <thead><tr><th scope="col">Bestellnummer</th><th scope="col">Bestelldatum</th><th scope="col">Gesamtpreis</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Aktion</span></th></tr></thead>
                      <tbody>
                        ${userOrders
                          .map(
                            (order) => `
                          <tr>
                            <td data-label="Bestellnummer">${esc(order.id)}</td>
                            <td data-label="Bestelldatum">${esc(formatDate(order.createdAt))}</td>
                            <td data-label="Gesamtpreis">${esc(formatPrice(order.total))}</td>
                            <td data-label="Status">${statusBadgeHtml(order.status)}</td>
                            <td><a class="btn btn--secondary btn--small" href="/admin/bestellungen/${encodeURIComponent(order.id)}?von=benutzer">Details</a></td>
                          </tr>`
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>`
                : '<p class="muted">Für diesen Benutzer sind keine Bestellungen vorhanden.</p>'
            }
          </li>`;
        })
        .join("")}
    </ul>`;
}

/* ====================== Bestellungen ====================== */

function customerName(order) {
  const customer = order.customer || {};
  return `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "–";
}

export async function renderAdminOrders({ main, isCurrent }) {
  document.title = "Bestellungen – Adminbereich – Rainbow.design";
  const content = pageShell(main, "Bestellungen", "Alle Bestellungen, die neueste zuerst.");
  let orders;
  try {
    orders = sortOrders(await api.getOrders());
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;

  if (!orders.length) {
    content.innerHTML = '<p class="empty-state">Es sind noch keine Bestellungen vorhanden.</p>';
    return;
  }

  content.innerHTML = `
    <p class="result-count">${orders.length} ${orders.length === 1 ? "Bestellung" : "Bestellungen"}</p>
    <div class="table-wrap">
      <table class="table table--responsive">
        <thead>
          <tr>
            <th scope="col">Bestellnummer</th>
            <th scope="col">Bestelldatum</th>
            <th scope="col">Kunde</th>
            <th scope="col">Gesamtpreis</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="visually-hidden">Aktion</span></th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map(
              (order) => `
            <tr>
              <td data-label="Bestellnummer">${esc(order.id)}</td>
              <td data-label="Bestelldatum">${esc(formatDateTime(order.createdAt))}</td>
              <td data-label="Kunde">${esc(customerName(order))}<br><span class="muted small">${order.userId ? "Registrierter Benutzer" : "Gastbestellung"}</span></td>
              <td data-label="Gesamtpreis">${esc(formatPrice(order.total))}</td>
              <td data-label="Status">${statusBadgeHtml(order.status)}</td>
              <td><a class="btn btn--secondary btn--small" href="/admin/bestellungen/${encodeURIComponent(order.id)}">Details</a></td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

export async function renderAdminOrderDetail({ main, params, query, isCurrent, renderNotFound }) {
  document.title = "Bestelldetails – Adminbereich – Rainbow.design";
  const fromUsers = query.get("von") === "benutzer";
  const backHref = fromUsers ? "/admin/benutzer" : "/admin/bestellungen";
  const backLabel = fromUsers ? "Zurück zu Benutzer" : "Zurück zu Bestellungen";
  main.innerHTML = `<div class="container page">${loadingHtml("Bestellung wird geladen …")}</div>`;

  let orders;
  let users;
  let products;
  let designs;
  let shippingOptions;
  try {
    [orders, users, products, designs, shippingOptions] = await Promise.all([
      api.getOrders(),
      api.getUsers(),
      api.getProducts(),
      api.getDesigns(),
      api.getShippingOptions()
    ]);
  } catch (error) {
    if (!isCurrent()) return;
    main.innerHTML = `<div class="container page"><a class="back-link" href="${backHref}">← ${esc(backLabel)}</a>${errorHtml(error.message)}</div>`;
    return;
  }
  if (!isCurrent()) return;

  let order = orders.find((o) => o.id === params.id);
  if (!order) {
    renderNotFound("Diese Bestellung wurde nicht gefunden.");
    return;
  }

  const render = () => {
    const user = order.userId ? users.find((u) => u.id === order.userId) : null;
    let accountInfo;
    if (!order.userId) {
      accountInfo = "Gastbestellung – die Kundendaten stammen aus dem Checkout.";
    } else if (user) {
      accountInfo = `Registrierter Benutzer: ${user.firstName} ${user.lastName} (${user.email})`;
    } else {
      accountInfo = "Registrierter Benutzer – das zugehörige Benutzerkonto wurde gelöscht.";
    }
    const accountInfoHtml = `<p class="account-info"><strong>Zuordnung:</strong> ${esc(accountInfo)}</p>`;
    const cancelled = order.status === "cancelled";

    main.innerHTML = `
      <div class="container page">
        <a class="back-link" href="${backHref}">← ${esc(backLabel)}</a>
        <header class="page-header">
          <h1 class="page-title">Bestellung ${esc(order.id)}</h1>
        </header>
        <div class="admin-order-layout">
          <section class="card" aria-labelledby="order-detail-title">
            <h2 class="card__title" id="order-detail-title">Bestelldetails</h2>
            ${orderDetailsHtml(order, { products, designs, shippingOptions, accountInfoHtml })}
          </section>
          <aside class="card admin-status" aria-labelledby="status-title">
            <h2 class="card__title" id="status-title">Bestellstatus</h2>
            <p>Aktueller Status: ${statusBadgeHtml(order.status)}</p>
            ${
              cancelled
                ? '<p class="muted">Diese Bestellung wurde storniert. Der Status kann nicht mehr geändert werden.</p>'
                : `<form id="status-form" novalidate>
                    <div class="field">
                      <label class="field__label" for="status-select">Neuer Status</label>
                      <select class="input" id="status-select" name="status">
                        ${ADMIN_STATUS_OPTIONS.map(
                          (status) =>
                            `<option value="${status}" ${status === order.status ? "selected" : ""}>${esc(statusLabel(status))}</option>`
                        ).join("")}
                      </select>
                    </div>
                    ${formErrorHtml()}
                    <button type="submit" class="btn btn--primary btn--block">Status speichern</button>
                  </form>`
            }
          </aside>
        </div>
      </div>`;

    const form = main.querySelector("#status-form");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.elements.status.value;
      const button = form.querySelector('button[type="submit"]');
      setFormError(form, "");
      if (status === order.status) {
        showToast(`Der Status ist bereits „${statusLabel(status)}“.`, { type: "info" });
        return;
      }
      setButtonBusy(button, true, "Wird gespeichert …");
      try {
        const updated = await api.updateOrderStatus(order.id, status);
        if (!isCurrent()) return;
        order = { ...order, ...updated };
        render();
        showToast(`Der Bestellstatus wurde auf „${statusLabel(order.status)}“ gesetzt.`);
        const select = main.querySelector("#status-select");
        if (select) select.focus();
      } catch (error) {
        setButtonBusy(button, false);
        setFormError(form, error.message || "Der Status konnte nicht gespeichert werden.");
      }
    });
  };

  render();
}

/* ====================== Administratoren ====================== */

export async function renderAdminAdmins({ main, isCurrent }) {
  document.title = "Administratoren – Adminbereich – Rainbow.design";
  const content = pageShell(main, "Administratoren");
  let admins;
  try {
    [admins] = await Promise.all([api.getAdmins()]);
  } catch (error) {
    if (!isCurrent()) return;
    content.innerHTML = errorHtml(error.message);
    return;
  }
  if (!isCurrent()) return;

  const me = state.user;
  const mainAdmin = isMainAdmin(me);
  let editingId = null;

  const sortAdmins = (list) =>
    [...list].sort((a, b) => {
      if (a.role === "main_admin" && b.role !== "main_admin") return -1;
      if (b.role === "main_admin" && a.role !== "main_admin") return 1;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

  const reloadAdmins = async () => {
    admins = sortAdmins(await api.getAdmins());
  };
  admins = sortAdmins(admins);

  const adminEditFormHtml = (admin) => `
    <form class="admin-edit-form" data-edit-form="${esc(admin.id)}" novalidate>
      ${requiredNote}
      <div class="form-grid">
        ${fieldHtml({ name: "firstName", label: "Vorname", required: true, value: admin.firstName, autocomplete: "off" })}
        ${fieldHtml({ name: "lastName", label: "Nachname", required: true, value: admin.lastName, autocomplete: "off" })}
        <div class="form-grid__full">${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, value: admin.email, autocomplete: "off" })}</div>
      </div>
      ${formErrorHtml()}
      <div class="form-actions">
        <button type="submit" class="btn btn--primary">Speichern</button>
        <button type="button" class="btn btn--secondary" data-admin-action="cancel">Abbrechen</button>
      </div>
    </form>`;

  const render = () => {
    const own = admins.find((a) => a.id === me.id) || me;
    content.innerHTML = `
      <div class="admin-admins">
        <section class="card" aria-labelledby="own-title">
          <h2 class="card__title" id="own-title">Meine Daten</h2>
          <div data-admin="${esc(own.id)}">
            ${
              editingId === own.id
                ? adminEditFormHtml(own)
                : `<dl class="profile-list">
                    <div><dt>Name</dt><dd>${esc(own.firstName)} ${esc(own.lastName)}</dd></div>
                    <div><dt>E-Mail-Adresse</dt><dd>${esc(own.email)}</dd></div>
                    <div><dt>Rolle</dt><dd>${esc(roleLabel(own.role))}</dd></div>
                  </dl>
                  <button type="button" class="btn btn--secondary btn--small" data-admin-action="edit">Bearbeiten</button>`
            }
          </div>
          <h3 class="order-details__heading">Passwort ändern</h3>
          <form id="admin-password-form" novalidate>
            ${requiredNote}
            ${fieldHtml({ name: "currentPassword", label: "Aktuelles Passwort", type: "password", required: true, autocomplete: "current-password" })}
            ${fieldHtml({ name: "newPassword", label: "Neues Passwort", type: "password", required: true, autocomplete: "new-password" })}
            ${fieldHtml({ name: "newPasswordConfirm", label: "Neues Passwort bestätigen", type: "password", required: true, autocomplete: "new-password" })}
            ${formErrorHtml()}
            <button type="submit" class="btn btn--primary">Passwort ändern</button>
          </form>
        </section>

        <section class="card" aria-labelledby="admins-title">
          <h2 class="card__title" id="admins-title">Alle Administratoren</h2>
          <ul class="admin-list">
            ${admins
              .map((admin) => {
                const isSelf = admin.id === me.id;
                const canManage = mainAdmin && !isSelf;
                return `
                <li class="admin-list__item" data-admin="${esc(admin.id)}">
                  ${
                    editingId === admin.id && !isSelf
                      ? adminEditFormHtml(admin)
                      : `<div class="admin-list__info">
                          <p class="admin-list__name">${esc(admin.firstName)} ${esc(admin.lastName)} ${isSelf ? '<span class="tag">Du</span>' : ""}</p>
                          <p class="muted small">${esc(admin.email)}</p>
                          <p class="small"><span class="tag ${admin.role === "main_admin" ? "tag--accent" : ""}">${esc(roleLabel(admin.role))}</span>${
                            admin.createdAt ? ` <span class="muted">· angelegt am ${esc(formatDate(admin.createdAt))}</span>` : ""
                          }</p>
                        </div>
                        ${
                          canManage
                            ? `<div class="admin-list__actions">
                                <button type="button" class="btn btn--secondary btn--small" data-admin-action="edit">Bearbeiten</button>
                                <button type="button" class="btn btn--danger btn--small" data-admin-action="delete">Löschen</button>
                              </div>`
                            : ""
                        }`
                  }
                </li>`;
              })
              .join("")}
          </ul>
        </section>

        ${
          mainAdmin
            ? `<section class="card" aria-labelledby="new-admin-title">
                <h2 class="card__title" id="new-admin-title">Neuen Administrator anlegen</h2>
                <form id="new-admin-form" novalidate>
                  ${requiredNote}
                  <div class="form-grid">
                    ${fieldHtml({ name: "firstName", label: "Vorname", required: true, autocomplete: "off" })}
                    ${fieldHtml({ name: "lastName", label: "Nachname", required: true, autocomplete: "off" })}
                    <div class="form-grid__full">${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, autocomplete: "off" })}</div>
                    <div class="form-grid__full">${fieldHtml({ name: "password", label: "Passwort", type: "password", required: true, autocomplete: "new-password" })}</div>
                  </div>
                  ${formErrorHtml()}
                  <button type="submit" class="btn btn--primary">Administrator anlegen</button>
                </form>
              </section>`
            : ""
        }
      </div>`;

    attachForms();
  };

  const attachForms = () => {
    // Bearbeitungsformular (eigene Daten oder – als Hauptadministrator – andere Administratoren)
    const editForm = content.querySelector("[data-edit-form]");
    if (editForm) {
      const adminId = editForm.dataset.editForm;
      attachValidation(
        editForm,
        {
          firstName: [rules.required("Bitte gib den Vornamen ein.")],
          lastName: [rules.required("Bitte gib den Nachnamen ein.")],
          email: [rules.required("Bitte gib die E-Mail-Adresse ein."), rules.email()]
        },
        async (values) => {
          const button = editForm.querySelector('button[type="submit"]');
          setFormError(editForm, "");
          setButtonBusy(button, true, "Wird gespeichert …");
          try {
            const updated = await api.updateAdmin(adminId, {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              email: values.email.trim()
            });
            if (adminId === me.id) setUser({ ...state.user, ...updated });
            await reloadAdmins();
            if (!isCurrent()) return;
            editingId = null;
            render();
            showToast("Die Daten wurden gespeichert.");
          } catch (error) {
            setButtonBusy(button, false);
            setFormError(editForm, error.message || "Die Daten konnten nicht gespeichert werden.");
          }
        }
      );
    }

    // Eigenes Passwort ändern
    const passwordForm = content.querySelector("#admin-password-form");
    const passwordValidation = attachValidation(
      passwordForm,
      {
        currentPassword: [rules.required("Bitte gib dein aktuelles Passwort ein.")],
        newPassword: [rules.required("Bitte gib ein neues Passwort ein.")],
        newPasswordConfirm: [
          rules.required("Bitte bestätige das neue Passwort."),
          rules.matches("newPassword", "Die neuen Passwörter stimmen nicht überein.")
        ]
      },
      async (values) => {
        const button = passwordForm.querySelector('button[type="submit"]');
        setFormError(passwordForm, "");
        setButtonBusy(button, true, "Wird gespeichert …");
        try {
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

    // Neuen Administrator anlegen
    const newForm = content.querySelector("#new-admin-form");
    if (newForm) {
      attachValidation(
        newForm,
        {
          firstName: [rules.required("Bitte gib den Vornamen ein.")],
          lastName: [rules.required("Bitte gib den Nachnamen ein.")],
          email: [rules.required("Bitte gib die E-Mail-Adresse ein."), rules.email()],
          password: [rules.required("Bitte gib ein Passwort ein.")]
        },
        async (values) => {
          const button = newForm.querySelector('button[type="submit"]');
          setFormError(newForm, "");
          setButtonBusy(button, true, "Wird angelegt …");
          try {
            const created = await api.createAdmin({
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              email: values.email.trim(),
              password: values.password
            });
            await reloadAdmins();
            if (!isCurrent()) return;
            render();
            showToast(`${created.firstName} ${created.lastName} wurde als Administrator angelegt.`);
          } catch (error) {
            setButtonBusy(button, false);
            setFormError(newForm, error.message || "Der Administrator konnte nicht angelegt werden.");
          }
        }
      );
    }
  };

  content.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    const id = button.closest("[data-admin]").dataset.admin;
    const action = button.dataset.adminAction;
    if (action === "edit") {
      editingId = id;
      render();
      const input = content.querySelector(`[data-edit-form="${CSS.escape(id)}"] input`);
      if (input) input.focus();
    } else if (action === "cancel") {
      editingId = null;
      render();
    } else if (action === "delete") {
      const admin = admins.find((a) => a.id === id);
      if (!admin || id === me.id) return;
      const confirmed = await confirmDialog({
        title: "Administrator löschen?",
        message: `Möchtest du ${admin.firstName} ${admin.lastName} (${admin.email}) wirklich als Administrator löschen?`,
        confirmLabel: "Löschen",
        danger: true
      });
      if (!confirmed) return;
      try {
        await api.deleteAdmin(id);
        await reloadAdmins();
        if (!isCurrent()) return;
        if (editingId === id) editingId = null;
        render();
        showToast("Der Administrator wurde gelöscht.");
      } catch (error) {
        showToast(error.message || "Der Administrator konnte nicht gelöscht werden.", { type: "error" });
      }
    }
  });

  render();
}
