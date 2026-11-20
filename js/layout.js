import { esc, qs, debounce, firstImage } from "./utils.js";
import { LOGO_URL, INSTAGRAM_URL, FACEBOOK_URL } from "./config.js";
import { icons } from "./icons.js";
import { state, loadProducts, subscribe } from "./store.js";
import { searchProducts } from "./search.js";
import { imageHtml, loadingHtml, productPriceHtml, productUrl } from "./ui.js";
import { colorLabel, categoryLabel, roleLabel } from "./i18n.js";
import { navigate } from "./router.js";

export const SHOP_LINKS = [
  { href: "/damen", label: "Damen", key: "damen" },
  { href: "/herren", label: "Herren", key: "herren" },
  { href: "/kinder", label: "Kinder", key: "kinder" },
  { href: "/hunde", label: "Hunde", key: "hunde" },
  { href: "/dein-design", label: "Dein Design", key: "dein-design" },
  { href: "/#ueber-uns", label: "Über uns", key: "ueber-uns" },
  { href: "/kontakt", label: "Kontakt", key: "kontakt" }
];

export const ADMIN_LINKS = [
  { href: "/admin/produkte", label: "Produkte", key: "produkte" },
  { href: "/admin/benutzer", label: "Benutzer", key: "benutzer" },
  { href: "/admin/bestellungen", label: "Bestellungen", key: "bestellungen" },
  { href: "/admin/administratoren", label: "Administratoren", key: "administratoren" }
];

let currentLayout = null;
let searchCleanup = null;

function socialLinksHtml(className = "") {
  return `
    <ul class="social-links ${className}">
      <li><a href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">${icons.instagram}<span>Instagram</span><span class="visually-hidden"> (öffnet in neuem Tab)</span></a></li>
      <li><a href="${esc(FACEBOOK_URL)}" target="_blank" rel="noopener noreferrer">${icons.facebook}<span>Facebook</span><span class="visually-hidden"> (öffnet in neuem Tab)</span></a></li>
    </ul>`;
}

export { socialLinksHtml };

function shopShellHtml() {
  const navItems = SHOP_LINKS.map(
    (link) => `<li><a class="main-nav__link" href="${link.href}" data-nav="${link.key}">${esc(link.label)}</a></li>`
  ).join("");
  const footerItems = SHOP_LINKS.map((link) => `<li><a href="${link.href}">${esc(link.label)}</a></li>`).join("");
  return `
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-logo" href="/" aria-label="Rainbow.design – zur Startseite">
          <img src="${esc(LOGO_URL)}" alt="Rainbow.design" width="96" height="70">
        </a>
        <nav class="main-nav" id="main-nav" aria-label="Hauptnavigation">
          <ul class="main-nav__list">${navItems}</ul>
        </nav>
        <div class="header-actions">
          <button type="button" class="icon-btn" id="search-toggle" aria-label="Suche" aria-expanded="false" aria-controls="search-panel">${icons.search}</button>
          <a class="icon-btn" href="/konto" id="account-link" aria-label="Benutzerkonto" data-nav="konto">${icons.user}</a>
          <a class="icon-btn" href="/wunschliste" aria-label="Wunschliste" data-nav="wunschliste">${icons.heart}</a>
          <a class="icon-btn icon-btn--cart" href="/warenkorb" id="cart-link" aria-label="Warenkorb" data-nav="warenkorb">
            ${icons.cart}<span class="cart-badge" id="cart-badge" hidden></span>
          </a>
          <button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menü öffnen" aria-expanded="false" aria-controls="main-nav">${icons.menu}</button>
        </div>
      </div>
      <div class="search-panel" id="search-panel" hidden>
        <div class="container">
          <form class="search-form" role="search" id="search-form">
            <label class="search-form__label" for="search-input">Produkte suchen</label>
            <div class="search-form__row">
              <div class="search-form__field">
                <span class="search-form__icon">${icons.search}</span>
                <input class="input search-form__input" type="search" id="search-input" name="q" autocomplete="off"
                  placeholder="z. B. Damen oder Rot" aria-controls="search-results">
              </div>
              <button type="button" class="icon-btn search-form__close" id="search-close" aria-label="Suche schließen">${icons.close}</button>
            </div>
          </form>
          <div class="search-results" id="search-results" aria-live="polite"></div>
        </div>
      </div>
    </header>
    <main id="main" class="site-main" tabindex="-1"></main>
    <footer class="site-footer">
      <div class="container site-footer__inner">
        <div class="site-footer__brand">
          <a href="/" class="site-footer__logo" aria-label="Rainbow.design – zur Startseite">
            <img src="${esc(LOGO_URL)}" alt="Rainbow.design" width="110" height="80">
          </a>
          <p>Handgefertigte Regenmäntel mit individuellen Details.</p>
        </div>
        <nav class="site-footer__nav" aria-label="Footer-Navigation">
          <ul>${footerItems}</ul>
        </nav>
        <div class="site-footer__social">
          <p class="site-footer__heading">Folge uns</p>
          ${socialLinksHtml()}
        </div>
      </div>
      <div class="container site-footer__bottom">
        <p>© Rainbow.design</p>
      </div>
    </footer>`;
}

function adminShellHtml() {
  const navItems = ADMIN_LINKS.map(
    (link) => `<li><a class="admin-nav__link" href="${link.href}" data-nav="${link.key}">${esc(link.label)}</a></li>`
  ).join("");
  return `
    <header class="admin-header">
      <div class="container admin-header__inner">
        <a class="site-logo site-logo--admin" href="/admin/produkte" aria-label="Adminbereich – Produkte">
          <img src="${esc(LOGO_URL)}" alt="Rainbow.design" width="80" height="58">
          <span class="admin-header__title">Adminbereich</span>
        </a>
        <button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menü öffnen" aria-expanded="false" aria-controls="admin-nav">${icons.menu}</button>
        <nav class="admin-nav" id="admin-nav" aria-label="Adminnavigation">
          <ul class="admin-nav__list">
            ${navItems}
            <li><button type="button" class="admin-nav__link admin-nav__logout" id="admin-logout">Abmelden</button></li>
          </ul>
        </nav>
      </div>
      <div class="container admin-header__user" id="admin-user"></div>
    </header>
    <main id="main" class="site-main admin-main" tabindex="-1"></main>`;
}

export function ensureLayout(type, { onLogout } = {}) {
  const app = document.getElementById("app");
  if (currentLayout === type && qs("#main", app)) return qs("#main", app);
  if (searchCleanup) {
    searchCleanup();
    searchCleanup = null;
  }
  currentLayout = type;
  if (type === "admin") {
    app.innerHTML = adminShellHtml();
    qs("#admin-logout", app).addEventListener("click", () => onLogout && onLogout());
    setupMenuToggle(qs("#admin-nav", app));
    updateAdminUser();
  } else {
    app.innerHTML = shopShellHtml();
    setupMenuToggle(qs("#main-nav", app));
    searchCleanup = setupSearch();
    updateCartBadge();
  }
  return qs("#main", app);
}

function setupMenuToggle(nav) {
  const toggle = qs("#menu-toggle");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    if (open) closeSearch({ restoreFocus: false });
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    toggle.innerHTML = open ? icons.close : icons.menu;
  });
}

function closeMobileMenu() {
  const toggle = qs("#menu-toggle");
  const nav = qs("#main-nav") || qs("#admin-nav");
  if (nav) nav.classList.remove("is-open");
  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menü öffnen");
    toggle.innerHTML = icons.menu;
  }
}

export function closeMenus() {
  closeMobileMenu();
  closeSearch({ restoreFocus: false });
}

export function setActiveNav(key) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === key) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

export function updateCartBadge() {
  const badge = qs("#cart-badge");
  const link = qs("#cart-link");
  if (!badge || !link) return;
  const count = state.cartCount;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = false;
    link.setAttribute("aria-label", `Warenkorb, ${count} ${count === 1 ? "Artikel" : "Artikel"}`);
  } else {
    badge.textContent = "";
    badge.hidden = true;
    link.setAttribute("aria-label", "Warenkorb");
  }
}

export function updateAdminUser() {
  const box = qs("#admin-user");
  if (!box) return;
  const user = state.user;
  box.innerHTML = user
    ? `<p>Angemeldet als <strong>${esc(user.firstName)} ${esc(user.lastName)}</strong> · ${esc(roleLabel(user.role))}</p>`
    : "";
}

subscribe((type) => {
  if (type === "cart") updateCartBadge();
  if (type === "user") updateAdminUser();
});

/* ---------- Suche ---------- */

function closeSearch({ restoreFocus = true } = {}) {
  const panel = qs("#search-panel");
  const toggle = qs("#search-toggle");
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  }
}

function setupSearch() {
  const panel = qs("#search-panel");
  const toggle = qs("#search-toggle");
  const input = qs("#search-input");
  const results = qs("#search-results");
  const form = qs("#search-form");
  let requestToken = 0;

  const renderResults = async () => {
    const query = input.value.trim();
    const token = ++requestToken;
    if (!query) {
      results.innerHTML = "";
      return;
    }
    let products = state.productsCache;
    if (!products) {
      results.innerHTML = loadingHtml("Produkte werden geladen …");
      try {
        products = await loadProducts({ fresh: false });
      } catch (error) {
        if (token !== requestToken) return;
        results.innerHTML = `<p class="search-results__empty" role="alert">${esc(error.message)}</p>`;
        return;
      }
    }
    if (token !== requestToken) return;
    const matches = searchProducts(products, query);
    if (!matches.length) {
      results.innerHTML = '<p class="search-results__empty">Keine Produkte gefunden.</p>';
      return;
    }
    results.innerHTML = `
      <p class="visually-hidden">${matches.length} ${matches.length === 1 ? "Produkt" : "Produkte"} gefunden</p>
      <ul class="search-results__list">
        ${matches
          .map(({ product, color }) => {
            const colorText = colorLabel(color);
            return `
            <li>
              <a class="search-result" href="${esc(productUrl(product.id, color))}">
                <span class="search-result__media">${imageHtml(firstImage(product, color), `${product.name}${colorText ? ` in ${colorText}` : ""}`, { className: "search-result__image" })}</span>
                <span class="search-result__body">
                  <span class="search-result__name">${esc(product.name)}</span>
                  <span class="search-result__meta">${esc(categoryLabel(product))}${colorText ? ` · ${esc(colorText)}` : ""}</span>
                  <span class="search-result__price">${esc(productPriceHtml(product))}</span>
                </span>
              </a>
            </li>`;
          })
          .join("")}
      </ul>`;
  };

  const debounced = debounce(renderResults, 150);

  const open = () => {
    closeMobileMenu();
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    input.focus();
    // Produktdaten für die Suche aktuell halten
    loadProducts({ fresh: true })
      .then(() => {
        if (input.value.trim()) renderResults();
      })
      .catch(() => {});
  };

  toggle.addEventListener("click", () => {
    if (panel.hidden) open();
    else closeSearch();
  });
  qs("#search-close").addEventListener("click", () => closeSearch());
  input.addEventListener("input", debounced);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResults();
  });

  const onKeydown = (event) => {
    if (event.key === "Escape" && !panel.hidden) closeSearch();
  };
  document.addEventListener("keydown", onKeydown);

  results.addEventListener("click", (event) => {
    const link = event.target.closest("a.search-result");
    if (!link) return;
    event.preventDefault();
    closeSearch({ restoreFocus: false });
    navigate(link.getAttribute("href"));
  });

  return () => document.removeEventListener("keydown", onKeydown);
}

export function isAdminLayout() {
  return currentLayout === "admin";
}

