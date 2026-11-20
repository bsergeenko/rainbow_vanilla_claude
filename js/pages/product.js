import { api } from "../api.js";
import { refreshCart } from "../store.js";
import { esc, colorsWithImages, unitPriceFor, hasSizePrices } from "../utils.js";
import { assetUrl } from "../config.js";
import { loadingHtml, errorHtml, heartButtonHtml, productPriceHtml, showToast, setButtonBusy } from "../ui.js";
import { colorLabel, sizeLabel, formatPrice, CATEGORY_LABELS, CATEGORY_PATHS, COLOR_SWATCHES, categoryLabel } from "../i18n.js";

export async function renderProduct({ main, params, query, isCurrent, renderNotFound }) {
  main.innerHTML = `<div class="container page">${loadingHtml("Produkt wird geladen …")}</div>`;

  let product;
  try {
    product = await api.getProduct(params.id);
  } catch (error) {
    if (!isCurrent()) return;
    if (error.status === 404) {
      renderNotFound("Dieses Produkt wurde nicht gefunden.");
      return;
    }
    main.innerHTML = `<div class="container page">${errorHtml(error.message)}</div>`;
    return;
  }
  if (!isCurrent()) return;

  document.title = `${product.name} (${categoryLabel(product)}) – Rainbow.design`;
  const colors = colorsWithImages(product);
  const requestedColor = query.get("farbe");
  const state = {
    color: colors.includes(requestedColor) ? requestedColor : colors[0] || "",
    size: "",
    imageIndex: 0,
    attempted: false
  };
  const sizePriced = hasSizePrices(product);
  const categoryPath = CATEGORY_PATHS[product.category];

  main.innerHTML = `
    <div class="container page">
      ${
        categoryPath
          ? `<a class="back-link" href="${categoryPath}">← Zurück zu ${esc(CATEGORY_LABELS[product.category])}</a>`
          : ""
      }
      <div class="product-detail">
        <div class="gallery" id="gallery"></div>
        <div class="product-info">
          <p class="product-info__category">${esc(categoryLabel(product))}</p>
          <div class="product-info__head">
            <h1 class="page-title product-info__title">${esc(product.name)}</h1>
            <div id="detail-heart"></div>
          </div>
          <p class="product-info__price" id="detail-price" aria-live="polite"></p>
          <p class="product-info__description">${esc(product.description)}</p>

          <fieldset class="option-group">
            <legend class="option-group__label">Farbe: <span id="selected-color-name"></span></legend>
            <div class="swatches" id="color-options">
              ${colors
                .map(
                  (color) => `
                <button type="button" class="swatch" data-color="${esc(color)}" aria-pressed="false" aria-label="${esc(colorLabel(color))}" title="${esc(colorLabel(color))}">
                  <span class="swatch__dot" style="background:${COLOR_SWATCHES[color] || "#ccc"}"></span>
                </button>`
                )
                .join("")}
            </div>
          </fieldset>

          <fieldset class="option-group" data-field="size">
            <legend class="option-group__label">Größe</legend>
            <div class="size-options" id="size-options">
              ${(product.sizes || [])
                .map(
                  (size) =>
                    `<button type="button" class="size-btn" data-size="${esc(size)}" aria-pressed="false">${esc(sizeLabel(size))}</button>`
                )
                .join("")}
            </div>
            <p class="field__error" id="size-error" hidden>Bitte wähle eine Größe aus.</p>
          </fieldset>
          <p class="field__error" id="color-error" hidden>Bitte wähle eine Farbe aus.</p>

          <div class="product-info__actions">
            <button type="button" class="btn btn--primary btn--large" id="add-to-cart">In den Warenkorb</button>
          </div>

          ${
            product.customizable
              ? `<div class="custom-hint">
                  <p>Gestalte diesen Mantel mit deiner Wunschfarbe und deinem Lieblingsmotiv.</p>
                  <a class="btn btn--secondary" href="/dein-design?produkt=${encodeURIComponent(product.id)}">Dein Design</a>
                </div>`
              : ""
          }
        </div>
      </div>
    </div>`;

  const gallery = main.querySelector("#gallery");
  const priceEl = main.querySelector("#detail-price");
  const heartBox = main.querySelector("#detail-heart");
  const sizeError = main.querySelector("#size-error");
  const colorError = main.querySelector("#color-error");

  const renderGallery = () => {
    const images = (product.imagesByColor && product.imagesByColor[state.color]) || [];
    const colorText = colorLabel(state.color);
    if (!images.length) {
      gallery.innerHTML = '<div class="img-missing gallery__main"><span>Kein Bild vorhanden</span></div>';
      return;
    }
    const index = Math.min(state.imageIndex, images.length - 1);
    gallery.innerHTML = `
      <div class="gallery__main">
        <img src="${esc(assetUrl(images[index]))}" alt="${esc(`${product.name} in ${colorText}, Ansicht ${index + 1} von ${images.length}`)}">
      </div>
      ${
        images.length > 1
          ? `<ul class="gallery__thumbs" aria-label="Weitere Bilder">
              ${images
                .map(
                  (src, i) => `
                <li>
                  <button type="button" class="gallery__thumb" data-index="${i}" aria-pressed="${i === index}" aria-label="Bild ${i + 1} von ${images.length} anzeigen">
                    <img src="${esc(assetUrl(src))}" alt="" loading="lazy">
                  </button>
                </li>`
                )
                .join("")}
            </ul>`
          : ""
      }`;
    gallery.querySelectorAll(".gallery__thumb").forEach((button) => {
      button.addEventListener("click", () => {
        state.imageIndex = Number(button.dataset.index);
        renderGallery();
        const active = gallery.querySelector(`.gallery__thumb[data-index="${state.imageIndex}"]`);
        if (active) active.focus();
      });
    });
  };

  const renderPrice = () => {
    if (sizePriced && state.size) {
      priceEl.textContent = formatPrice(unitPriceFor(product, state.size));
    } else {
      priceEl.textContent = productPriceHtml(product);
    }
  };

  const renderSelections = () => {
    main.querySelector("#selected-color-name").textContent = state.color ? colorLabel(state.color) : "–";
    main.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.color === state.color)));
    main.querySelectorAll(".size-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === state.size)));
    heartBox.innerHTML = heartButtonHtml(product.id, state.color, { className: "heart-btn--large" });
    const showSizeError = state.attempted && !state.size;
    sizeError.hidden = !showSizeError;
    main.querySelector('[data-field="size"]').classList.toggle("field--invalid", showSizeError);
    colorError.hidden = !(state.attempted && !state.color);
    renderPrice();
  };

  main.querySelectorAll(".swatch").forEach((button) => {
    button.addEventListener("click", () => {
      state.color = button.dataset.color;
      state.imageIndex = 0;
      renderGallery();
      renderSelections();
      const url = new URL(window.location.href);
      url.searchParams.set("farbe", state.color);
      window.history.replaceState({}, "", url.pathname + url.search);
    });
  });

  main.querySelectorAll(".size-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.size = button.dataset.size;
      renderSelections();
    });
  });

  const addButton = main.querySelector("#add-to-cart");
  addButton.addEventListener("click", async () => {
    state.attempted = true;
    renderSelections();
    if (!state.color || !state.size) {
      const target = !state.color ? main.querySelector(".swatch") : main.querySelector(".size-btn");
      if (target) target.focus();
      return;
    }
    setButtonBusy(addButton, true, "Wird hinzugefügt …");
    try {
      await api.addToCart({ productId: product.id, color: state.color, size: state.size, quantity: 1 });
      await refreshCart();
      if (!isCurrent()) return;
      showToast(`${product.name} (${colorLabel(state.color)}, ${sizeLabel(state.size)}) wurde in den Warenkorb gelegt.`, {
        action: { href: "/warenkorb", label: "Zum Warenkorb" }
      });
    } catch (error) {
      showToast(error.message || "Das Produkt konnte nicht in den Warenkorb gelegt werden.", { type: "error" });
    } finally {
      setButtonBusy(addButton, false);
    }
  });

  renderGallery();
  renderSelections();
}
