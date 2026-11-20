import { api } from "../api.js";
import { loadProducts, refreshCart } from "../store.js";
import { esc, unitPriceFor, uid } from "../utils.js";
import { assetUrl } from "../config.js";
import { loadingHtml, errorHtml, showToast, setButtonBusy, noticeHtml } from "../ui.js";
import {
  colorLabel,
  sizeLabel,
  formatPrice,
  designLabel,
  findDesign,
  TARGET_LABELS,
  SUBCATEGORY_LABELS,
  COLOR_SWATCHES
} from "../i18n.js";

const TARGETS = ["women", "men", "kids", "dogs"];
const CATALOG_FILTERS = [
  { key: "all", label: "Alle" },
  { key: "adult", label: "Erwachsene" },
  { key: "kids", label: "Kinder" }
];
const POCKET_MAX = 500;

export async function renderDesigner({ main, query, isCurrent }) {
  document.title = "Dein Design – Rainbow.design";
  main.innerHTML = `<div class="container page">${loadingHtml("Dein Design wird geladen …")}</div>`;

  let products;
  let customColors;
  let designs;
  try {
    [products, customColors, designs] = await Promise.all([loadProducts(), api.getCustomColors(), api.getDesigns()]);
  } catch (error) {
    if (!isCurrent()) return;
    main.innerHTML = `<div class="container page"><h1 class="page-title">Dein Design</h1>${errorHtml(error.message)}</div>`;
    return;
  }
  if (!isCurrent()) return;

  const customizable = products.filter((p) => p.customizable);
  const allDesigns = [...(designs.adult || []), ...(designs.kids || [])];

  // Jeder Einstieg beginnt mit einem neuen Auswahlzustand
  const state = {
    view: "catalog",
    catalogFilter: "all",
    designId: null,
    target: null,
    sub: null,
    color: null,
    size: null,
    pocket: "",
    attempted: false
  };

  const preselectedDesign = findDesign(query.get("motiv"), designs);
  if (preselectedDesign) {
    state.designId = preselectedDesign.id;
    state.view = "config";
  }
  const sourceProduct = customizable.find((p) => p.id === query.get("produkt"));
  if (sourceProduct) {
    state.target = sourceProduct.category;
    state.sub = sourceProduct.category === "kids" ? sourceProduct.subcategory || null : null;
  }

  const currentProduct = () => {
    if (!state.target) return null;
    if (state.target === "kids") {
      if (!state.sub) return null;
      return customizable.find((p) => p.category === "kids" && p.subcategory === state.sub) || null;
    }
    return customizable.find((p) => p.category === state.target) || null;
  };

  const availableTargets = TARGETS.filter((t) => customizable.some((p) => p.category === t));
  const kidsSubs = ["girls", "boys"].filter((s) => customizable.some((p) => p.category === "kids" && p.subcategory === s));

  /* ---------- Motivkatalog ---------- */

  const renderCatalog = () => {
    const list =
      state.catalogFilter === "adult"
        ? designs.adult || []
        : state.catalogFilter === "kids"
          ? designs.kids || []
          : allDesigns;
    const changing = Boolean(state.designId);
    main.innerHTML = `
      <div class="container page">
        <header class="page-header">
          <h1 class="page-title">Dein Design</h1>
          <p class="page-intro">Wähle zuerst ein Rückenmotiv aus. Anschließend konfigurierst du deinen Mantel für Damen, Herren, Kinder oder Hund.</p>
        </header>
        ${
          changing
            ? `<div class="catalog-back"><button type="button" class="btn btn--secondary btn--small" id="back-to-config">Zurück zur Konfiguration</button></div>`
            : ""
        }
        <div class="segmented" role="group" aria-label="Motive filtern">
          ${CATALOG_FILTERS.map(
            (f) =>
              `<button type="button" class="segmented__btn" data-catalog-filter="${f.key}" aria-pressed="${f.key === state.catalogFilter}">${esc(f.label)}</button>`
          ).join("")}
        </div>
        <p class="result-count">${list.length} Motive</p>
        <ul class="motif-grid">
          ${list
            .map(
              (design) => `
            <li>
              <button type="button" class="motif-card ${design.id === state.designId ? "is-selected" : ""}" data-design="${esc(design.id)}" aria-pressed="${design.id === state.designId}">
                <span class="motif-card__media"><img src="${esc(assetUrl(design.image))}" alt="" loading="lazy" decoding="async"></span>
                <span class="motif-card__label">${esc(designLabel(design, designs))}</span>
              </button>
            </li>`
            )
            .join("")}
        </ul>
      </div>`;

    main.querySelectorAll("[data-catalog-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.catalogFilter = button.dataset.catalogFilter;
        renderCatalog();
        const active = main.querySelector(`[data-catalog-filter="${state.catalogFilter}"]`);
        if (active) active.focus();
      });
    });
    main.querySelectorAll("[data-design]").forEach((button) => {
      button.addEventListener("click", () => {
        state.designId = button.dataset.design;
        state.view = "config";
        renderConfig();
        window.scrollTo({ top: 0 });
        const heading = main.querySelector("#config-title");
        if (heading) heading.focus();
      });
    });
    const back = main.querySelector("#back-to-config");
    if (back) {
      back.addEventListener("click", () => {
        state.view = "config";
        renderConfig();
        window.scrollTo({ top: 0 });
      });
    }
  };

  /* ---------- Konfiguration ---------- */

  const renderConfig = () => {
    const design = findDesign(state.designId, designs);
    const pocketId = uid("pocket");
    main.innerHTML = `
      <div class="container page">
        <header class="page-header">
          <h1 class="page-title" id="config-title" tabindex="-1">Dein Design</h1>
          <p class="page-intro">Konfiguriere deinen Mantel mit dem ausgewählten Rückenmotiv.</p>
        </header>
        <div class="configurator">
          <div class="configurator__visual">
            <figure class="selected-motif">
              <figcaption class="selected-motif__caption">Dein Rückenmotiv</figcaption>
              <div class="selected-motif__media">
                <img src="${esc(assetUrl(design.image))}" alt="${esc(designLabel(design, designs))}">
              </div>
              <p class="selected-motif__name">${esc(designLabel(design, designs))}</p>
              <button type="button" class="btn btn--secondary" id="change-motif">Motiv ändern</button>
            </figure>
            <div class="color-preview" id="color-preview"></div>
          </div>

          <div class="configurator__options">
            <fieldset class="option-group" data-field="target">
              <legend class="option-group__label">Für wen?</legend>
              <div class="choice-options">
                ${availableTargets
                  .map(
                    (t) =>
                      `<button type="button" class="choice-btn" data-target="${t}" aria-pressed="${state.target === t}">${esc(TARGET_LABELS[t])}</button>`
                  )
                  .join("")}
              </div>
              <p class="field__error" data-error="target" hidden>Bitte wähle aus, für wen der Mantel ist.</p>
            </fieldset>

            <fieldset class="option-group" data-field="sub" id="sub-group" hidden>
              <legend class="option-group__label">Mädchen oder Jungen?</legend>
              <div class="choice-options">
                ${kidsSubs
                  .map(
                    (s) =>
                      `<button type="button" class="choice-btn" data-sub="${s}" aria-pressed="${state.sub === s}">${esc(SUBCATEGORY_LABELS[s])}</button>`
                  )
                  .join("")}
              </div>
              <p class="field__error" data-error="sub" hidden>Bitte wähle Mädchen oder Jungen aus.</p>
            </fieldset>

            <fieldset class="option-group" data-field="color">
              <legend class="option-group__label">Farbe: <span id="config-color-name">–</span></legend>
              <div class="swatches">
                ${customColors
                  .map(
                    (color) => `
                  <button type="button" class="swatch" data-color="${esc(color)}" aria-pressed="${state.color === color}" aria-label="${esc(colorLabel(color))}" title="${esc(colorLabel(color))}">
                    <span class="swatch__dot" style="background:${COLOR_SWATCHES[color] || "#ccc"}"></span>
                  </button>`
                  )
                  .join("")}
              </div>
              <p class="field__error" data-error="color" hidden>Bitte wähle eine Farbe aus.</p>
            </fieldset>

            <fieldset class="option-group" data-field="size">
              <legend class="option-group__label">Größe</legend>
              <div class="size-options" id="config-sizes"></div>
              <p class="field__error" data-error="size" hidden>Bitte wähle eine Größe aus.</p>
            </fieldset>

            <div class="field option-group">
              <label class="field__label option-group__label" for="${pocketId}">Taschendesign (optional)</label>
              <textarea class="input" id="${pocketId}" name="pocket" rows="3" maxlength="${POCKET_MAX}" aria-describedby="${pocketId}-hint">${esc(state.pocket)}</textarea>
              <p class="field__hint" id="${pocketId}-hint">Die Taschen werden von der Designerin passend zu Mantelfarbe und Rückenmotiv gestaltet.</p>
            </div>

            <section class="summary-box" aria-labelledby="summary-title">
              <h2 class="summary-box__title" id="summary-title">Zusammenfassung</h2>
              <dl class="summary-list" id="config-summary"></dl>
              <button type="button" class="btn btn--primary btn--large btn--block" id="config-add">In den Warenkorb</button>
            </section>
          </div>
        </div>
      </div>`;

    main.querySelector("#change-motif").addEventListener("click", () => {
      state.view = "catalog";
      renderCatalog();
      window.scrollTo({ top: 0 });
      const selected = main.querySelector(".motif-card.is-selected") || main.querySelector(".page-title");
      if (selected) selected.focus();
    });

    main.querySelectorAll("[data-target]").forEach((button) => {
      button.addEventListener("click", () => {
        state.target = button.dataset.target;
        if (state.target !== "kids") state.sub = null;
        syncSizeWithProduct();
        updateConfig();
      });
    });
    main.querySelectorAll("[data-sub]").forEach((button) => {
      button.addEventListener("click", () => {
        state.sub = button.dataset.sub;
        syncSizeWithProduct();
        updateConfig();
      });
    });
    main.querySelectorAll(".swatch").forEach((button) => {
      button.addEventListener("click", () => {
        state.color = button.dataset.color;
        updateConfig();
      });
    });
    const pocketInput = main.querySelector(`#${pocketId}`);
    pocketInput.addEventListener("input", () => {
      state.pocket = pocketInput.value;
      renderSummary();
    });

    const addButton = main.querySelector("#config-add");
    addButton.addEventListener("click", async () => {
      state.attempted = true;
      updateConfig();
      const product = currentProduct();
      const missing = firstMissing();
      if (missing || !product) {
        const group = main.querySelector(`[data-field="${missing || "target"}"]`);
        const focusTarget = group && group.querySelector("button");
        if (focusTarget) focusTarget.focus();
        return;
      }
      setButtonBusy(addButton, true, "Wird hinzugefügt …");
      try {
        await api.addToCart({
          productId: product.id,
          color: state.color,
          size: state.size,
          designId: state.designId,
          pocketRequest: state.pocket.trim(),
          quantity: 1
        });
        await refreshCart();
        if (!isCurrent()) return;
        showToast("Dein Mantel mit Rückenmotiv wurde in den Warenkorb gelegt.", {
          action: { href: "/warenkorb", label: "Zum Warenkorb" }
        });
      } catch (error) {
        showToast(error.message || "Der Mantel konnte nicht in den Warenkorb gelegt werden.", { type: "error" });
      } finally {
        setButtonBusy(addButton, false);
      }
    });

    updateConfig();
  };

  const syncSizeWithProduct = () => {
    const product = currentProduct();
    if (!product || !(product.sizes || []).includes(state.size)) state.size = null;
  };

  const firstMissing = () => {
    if (!state.target) return "target";
    if (state.target === "kids" && !state.sub) return "sub";
    if (!state.color) return "color";
    if (!state.size) return "size";
    return null;
  };

  const updateConfig = () => {
    const product = currentProduct();
    main.querySelectorAll("[data-target]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.target === state.target)));
    main.querySelectorAll("[data-sub]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sub === state.sub)));
    main.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.color === state.color)));
    main.querySelector("#sub-group").hidden = state.target !== "kids";
    main.querySelector("#config-color-name").textContent = state.color ? colorLabel(state.color) : "–";

    // Größen des passenden Produkts
    const sizeBox = main.querySelector("#config-sizes");
    if (product) {
      sizeBox.innerHTML = (product.sizes || [])
        .map(
          (size) =>
            `<button type="button" class="size-btn" data-size="${esc(size)}" aria-pressed="${size === state.size}">${esc(sizeLabel(size))}</button>`
        )
        .join("");
      sizeBox.querySelectorAll(".size-btn").forEach((button) => {
        button.addEventListener("click", () => {
          state.size = button.dataset.size;
          updateConfig();
        });
      });
    } else {
      sizeBox.innerHTML = `<p class="option-group__hint">${
        state.target === "kids" ? "Bitte wähle zuerst Mädchen oder Jungen aus." : "Bitte wähle zuerst aus, für wen der Mantel ist."
      }</p>`;
    }

    // Fehlermeldungen nach einem Absendeversuch
    const missing = state.attempted ? firstMissingAll() : [];
    ["target", "sub", "color", "size"].forEach((key) => {
      const error = main.querySelector(`[data-error="${key}"]`);
      const group = main.querySelector(`[data-field="${key}"]`);
      const show = missing.includes(key);
      if (error) error.hidden = !show;
      if (group) group.classList.toggle("field--invalid", show);
    });

    renderPreview();
    renderSummary();
  };

  const firstMissingAll = () => {
    const list = [];
    if (!state.target) list.push("target");
    if (state.target === "kids" && !state.sub) list.push("sub");
    if (!state.color) list.push("color");
    if (!state.size) list.push("size");
    return list;
  };

  const renderPreview = () => {
    const box = main.querySelector("#color-preview");
    const product = currentProduct();
    if (!product || !state.color) {
      box.innerHTML = `
        <h2 class="color-preview__title">Farbvorschau</h2>
        <p class="option-group__hint">Wähle aus, für wen der Mantel ist, und eine Farbe, um die Vorschau zu sehen.</p>`;
      return;
    }
    const images = (product.imagesByColor && product.imagesByColor[state.color]) || [];
    box.innerHTML = `
      <h2 class="color-preview__title">Farbvorschau: ${esc(colorLabel(state.color))}</h2>
      ${
        images.length
          ? `<div class="color-preview__media"><img src="${esc(assetUrl(images[0]))}" alt="${esc(`Mantel für ${TARGET_LABELS[product.category]} in ${colorLabel(state.color)}`)}"></div>`
          : noticeHtml("Für diese Farbe ist kein Vorschaubild vorhanden. Der Mantel kann trotzdem in dieser Farbe bestellt werden.")
      }`;
  };

  const renderSummary = () => {
    const product = currentProduct();
    const design = findDesign(state.designId, designs);
    const notSelected = '<span class="summary-list__missing">Noch nicht ausgewählt</span>';
    let price = notSelected;
    if (product) {
      if (product.category === "kids" || product.pricesBySize) {
        price = state.size ? esc(formatPrice(unitPriceFor(product, state.size))) : "Abhängig von der Größe";
      } else {
        price = esc(formatPrice(product.price));
      }
    }
    const rows = [
      ["Für wen?", state.target ? esc(TARGET_LABELS[state.target]) : notSelected],
      ...(state.target === "kids" ? [["Mädchen / Jungen", state.sub ? esc(SUBCATEGORY_LABELS[state.sub]) : notSelected]] : []),
      ["Farbe", state.color ? esc(colorLabel(state.color)) : notSelected],
      ["Größe", state.size ? esc(sizeLabel(state.size)) : notSelected],
      ["Rückenmotiv", esc(designLabel(design, designs))],
      ["Taschenwunsch", state.pocket.trim() ? esc(state.pocket.trim()) : "Keine Angabe"],
      ["Preis", price]
    ];
    main.querySelector("#config-summary").innerHTML = rows
      .map(([label, value]) => `<div class="summary-list__row"><dt>${esc(label)}</dt><dd>${value}</dd></div>`)
      .join("");
  };

  if (state.view === "config") renderConfig();
  else renderCatalog();
}
