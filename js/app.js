import { api } from "./api.js";
import { addRoute, matchRoute, onRender, startRouter, navigate, reload, isCurrent as isCurrentNavigation, scrollToHash } from "./router.js";
import {
  state,
  refreshUser,
  refreshCart,
  refreshWishlist,
  clearSession,
  isAdmin,
  findWishlistItem,
  subscribe
} from "./store.js";
import { ensureLayout, setActiveNav, closeMenus } from "./layout.js";
import { clearToasts, showToast, syncHeartButtons, errorHtml } from "./ui.js";
import { renderHome } from "./pages/home.js";
import { renderCategory } from "./pages/category.js";
import { renderProduct } from "./pages/product.js";
import { renderDesigner } from "./pages/designer.js";
import { renderCart } from "./pages/cart.js";
import { renderCheckout } from "./pages/checkout.js";
import { renderConfirmation } from "./pages/confirmation.js";
import { renderLogin, renderRegister } from "./pages/auth.js";
import { renderAccount } from "./pages/account.js";
import { renderWishlist } from "./pages/wishlist.js";
import { renderContact } from "./pages/contact.js";
import { renderNotFound } from "./pages/notFound.js";
import {
  renderAdminProducts,
  renderAdminUsers,
  renderAdminOrders,
  renderAdminOrderDetail,
  renderAdminAdmins
} from "./pages/admin.js";

// Session-Cookies funktionieren nur, wenn Frontend und Backend dieselbe Site („localhost“) nutzen
if (window.location.hostname === "127.0.0.1") {
  window.location.replace(window.location.href.replace("127.0.0.1", "localhost"));
}

/* ---------- Abmelden ---------- */

async function logout() {
  try {
    await api.logout();
  } catch (error) {
    showToast(error.message || "Die Abmeldung ist fehlgeschlagen.", { type: "error" });
    return;
  }
  clearSession();
  await refreshCart();
  navigate("/", { flash: { message: "Du wurdest abgemeldet." } });
}

/* ---------- Routen ---------- */
// access: "shop" (öffentlich), "user" (angemeldeter Benutzer), "guest" (nur ohne Login), "admin"

addRoute("/", (ctx) => renderHome(ctx), { nav: "home" });
addRoute("/damen", (ctx) => renderCategory({ ...ctx, category: "women" }), { nav: "damen" });
addRoute("/herren", (ctx) => renderCategory({ ...ctx, category: "men" }), { nav: "herren" });
addRoute("/kinder", (ctx) => renderCategory({ ...ctx, category: "kids" }), { nav: "kinder" });
addRoute("/hunde", (ctx) => renderCategory({ ...ctx, category: "dogs" }), { nav: "hunde" });
addRoute("/produkt/:id", (ctx) => renderProduct(ctx));
addRoute("/dein-design", (ctx) => renderDesigner(ctx), { nav: "dein-design" });
addRoute("/warenkorb", (ctx) => renderCart(ctx), { nav: "warenkorb" });
addRoute("/kasse", (ctx) => renderCheckout(ctx));
addRoute("/bestellbestaetigung", (ctx) => renderConfirmation(ctx));
addRoute("/anmelden", (ctx) => renderLogin(ctx), { access: "guest", nav: "konto" });
addRoute("/registrieren", (ctx) => renderRegister(ctx), { access: "guest", nav: "konto" });
addRoute("/konto", (ctx) => renderAccount(ctx), { access: "user", nav: "konto" });
addRoute("/wunschliste", (ctx) => renderWishlist(ctx), { access: "user", nav: "wunschliste" });
addRoute("/kontakt", (ctx) => renderContact(ctx), { nav: "kontakt" });

addRoute("/admin", (ctx) => ctx.navigate("/admin/produkte", { replace: true }), { access: "admin" });
addRoute("/admin/produkte", (ctx) => renderAdminProducts(ctx), { access: "admin", nav: "produkte" });
addRoute("/admin/benutzer", (ctx) => renderAdminUsers(ctx), { access: "admin", nav: "benutzer" });
addRoute("/admin/bestellungen", (ctx) => renderAdminOrders(ctx), { access: "admin", nav: "bestellungen" });
addRoute("/admin/bestellungen/:id", (ctx) => renderAdminOrderDetail(ctx), { access: "admin", nav: "bestellungen" });
addRoute("/admin/administratoren", (ctx) => renderAdminAdmins(ctx), { access: "admin", nav: "administratoren" });

/* ---------- Rendern einer Seite ---------- */

let initialized = false;

onRender(async ({ url, id, flash, scroll }) => {
  const isCurrent = () => isCurrentNavigation(id);
  const matched = matchRoute(url.pathname);
  const isAdminPath = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
  const user = state.user;

  // Zugriffsregeln
  if (isAdmin(user) && !isAdminPath) {
    // Administratoren arbeiten ausschließlich im Adminbereich
    navigate("/admin/produkte", { replace: true });
    return;
  }
  if (matched) {
    const access = matched.route.access || "shop";
    if (access === "user" && !user) {
      navigate("/anmelden", { replace: true });
      return;
    }
    if (access === "guest" && user) {
      navigate(isAdmin(user) ? "/admin/produkte" : "/konto", { replace: true });
      return;
    }
    if (access === "admin" && !user) {
      navigate("/anmelden", { replace: true });
      return;
    }
  }

  const adminLayout = isAdminPath && isAdmin(user);
  const main = ensureLayout(adminLayout ? "admin" : "shop", { onLogout: logout });
  closeMenus();
  clearToasts();
  document.querySelectorAll("dialog").forEach((dialog) => dialog.close());

  const ctx = {
    main,
    params: matched ? matched.params : {},
    query: url.searchParams,
    isCurrent,
    navigate,
    logout,
    flash,
    renderNotFound: (message) =>
      renderNotFound(
        adminLayout
          ? { main, message, homeHref: "/admin/produkte", homeLabel: "Zur Startseite des Adminbereichs" }
          : { main, message }
      )
  };

  if (scroll && !url.hash) window.scrollTo({ top: 0 });

  if (!matched || (isAdminPath && !isAdmin(user))) {
    // Unbekannte Seite oder Adminbereich ohne Berechtigung
    setActiveNav(null);
    ctx.renderNotFound(isAdminPath && user ? "Für diese Seite fehlt die Berechtigung." : undefined);
  } else {
    setActiveNav(matched.route.nav || null);
    const renderPromise = matched.route.handler(ctx);
    if (flash && flash.message) showToast(flash.message, { type: flash.type || "success" });
    try {
      await renderPromise;
    } catch (error) {
      console.error(error);
      if (isCurrent()) main.innerHTML = `<div class="container page">${errorHtml(error.message)}</div>`;
    }
  }

  if (!isCurrent()) return;
  if (url.hash) {
    scrollToHash(url.hash);
  } else if (initialized) {
    // Fokus für Screenreader und Tastatur auf den Seiteninhalt setzen
    const heading = main.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    } else {
      main.focus({ preventScroll: true });
    }
  }
  initialized = true;
});

/* ---------- Globale Interaktionen ---------- */

// Herzsymbol: Produkt zur Wunschliste hinzufügen oder entfernen
document.addEventListener("click", async (event) => {
  const heart = event.target.closest("[data-wish-product]");
  if (heart) {
    event.preventDefault();
    if (!state.user) {
      navigate("/anmelden");
      return;
    }
    const productId = heart.dataset.wishProduct;
    const color = heart.dataset.wishColor;
    if (heart.disabled) return;
    heart.disabled = true;
    try {
      const existing = findWishlistItem(productId, color);
      if (existing) {
        await api.removeFromWishlist(existing.itemId);
        await refreshWishlist();
        showToast("Das Produkt wurde von der Wunschliste entfernt.");
      } else {
        await api.addToWishlist({ productId, color });
        await refreshWishlist();
        showToast("Das Produkt wurde zur Wunschliste hinzugefügt.", { action: { href: "/wunschliste", label: "Zur Wunschliste" } });
      }
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        navigate("/anmelden");
        return;
      }
      showToast(error.message || "Die Wunschliste konnte nicht aktualisiert werden.", { type: "error" });
    } finally {
      heart.disabled = false;
    }
    return;
  }

  const reloadButton = event.target.closest('[data-action="reload"]');
  if (reloadButton) {
    event.preventDefault();
    reload();
  }
});

subscribe((type) => {
  if (type === "wishlist") syncHeartButtons();
});

/* ---------- Start ---------- */

async function init() {
  try {
    await refreshUser();
  } catch {
    // Backend nicht erreichbar: Seite trotzdem anzeigen, Fehler erscheinen beim Laden der Daten
    state.user = null;
  }
  await Promise.all([refreshCart(), state.user && !isAdmin() ? refreshWishlist().catch(() => {}) : null]);
  await startRouter();
}

init();
