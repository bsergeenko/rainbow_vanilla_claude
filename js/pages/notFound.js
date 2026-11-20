import { esc } from "../utils.js";

export function renderNotFound({ main, message, homeHref = "/", homeLabel = "Zur Startseite" }) {
  document.title = "Seite nicht gefunden – Rainbow.design";
  main.innerHTML = `
    <div class="container page page--narrow not-found">
      <p class="not-found__code" aria-hidden="true">404</p>
      <h1 class="page-title">Seite nicht gefunden</h1>
      <p class="page-intro">${esc(message || "Die aufgerufene Seite existiert leider nicht.")}</p>
      <a class="btn btn--primary" href="${esc(homeHref)}">${esc(homeLabel)}</a>
    </div>`;
}
