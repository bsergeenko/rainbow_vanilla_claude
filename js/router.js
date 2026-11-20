// Einfacher clientseitiger Router auf Basis der History API

const routes = [];
let renderHandler = null;
let navigationId = 0;

export function addRoute(pattern, handler, options = {}) {
  const keys = [];
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\/$/, "")
        .replace(/:([a-zA-Z]+)/g, (_, key) => {
          keys.push(key);
          return "([^/]+)";
        }) +
      "/?$"
  );
  routes.push({ pattern, regex, keys, handler, ...options });
}

export function matchRoute(pathname) {
  for (const route of routes) {
    const match = pathname.match(route.regex);
    if (match) {
      const params = {};
      route.keys.forEach((key, index) => {
        try {
          params[key] = decodeURIComponent(match[index + 1]);
        } catch {
          params[key] = match[index + 1];
        }
      });
      return { route, params };
    }
  }
  return null;
}

export function onRender(handler) {
  renderHandler = handler;
}

export function currentNavigationId() {
  return navigationId;
}

// Prüft, ob eine asynchrone Seitenaktion noch zur aktuellen Navigation gehört
export function isCurrent(id) {
  return id === navigationId;
}

export function navigate(to, { replace = false, flash = null, scroll = true } = {}) {
  const url = new URL(to, window.location.origin);
  const target = url.pathname + url.search + url.hash;
  if (url.hash && url.pathname + url.search === lastRenderedKey && !flash) {
    // Sprung zu einem Abschnitt auf der aktuellen Seite
    window.history[replace ? "replaceState" : "pushState"]({}, "", target);
    scrollToHash(url.hash);
    return Promise.resolve();
  }
  if (replace) {
    window.history.replaceState({}, "", target);
  } else {
    window.history.pushState({}, "", target);
  }
  return render({ flash, scroll });
}

export function scrollToHash(hash) {
  let element = null;
  try {
    element = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    element = null;
  }
  if (!element) return false;
  element.scrollIntoView({ block: "start" });
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
  return true;
}

export function reload() {
  return render({ scroll: false });
}

let lastRenderedKey = null;

export async function render({ flash = null, scroll = true } = {}) {
  navigationId += 1;
  const id = navigationId;
  const url = new URL(window.location.href);
  lastRenderedKey = url.pathname + url.search;
  if (renderHandler) {
    await renderHandler({ url, id, flash, scroll });
  }
}

export function startRouter() {
  window.addEventListener("popstate", () => {
    // Reine Sprünge zu Ankern innerhalb derselben Seite lösen kein neues Rendern aus
    const key = window.location.pathname + window.location.search;
    if (key === lastRenderedKey) return;
    render();
  });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download") || link.dataset.external !== undefined) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });

  return render();
}
