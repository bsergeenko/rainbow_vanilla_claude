import { api } from "../api.js";
import { assetUrl } from "../config.js";
import { esc } from "../utils.js";
import { loadingHtml, errorHtml } from "../ui.js";
import { designLabel } from "../i18n.js";

const CATEGORY_TILES = [
  { href: "/damen", label: "Damen", image: "/assets/home/women.jpg" },
  { href: "/herren", label: "Herren", image: "/assets/home/men.jpg" },
  { href: "/kinder", label: "Kinder", image: "/assets/home/kids.jpg" },
  { href: "/hunde", label: "Hunde", image: "/assets/home/dogs.jpg" }
];

// Die vier Motive der Startseite (designe01 bis designe04 aus dem Erwachsenen-Katalog)
const HOME_DESIGN_FILES = ["designe01.jpg", "designe02.jpg", "designe03.jpg", "designe04.jpg"];

export async function renderHome({ main, isCurrent }) {
  document.title = "Rainbow.design – Regenmäntel mit Farbe";
  main.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="container hero__inner">
        <h1 class="hero__title" id="hero-title">Rainbow Design bringt Farbe in Regentage</h1>
        <div class="rainbow-bar" aria-hidden="true"></div>
      </div>
    </section>

    <section class="section" aria-labelledby="categories-title">
      <div class="container">
        <h2 class="section__title" id="categories-title">Kategorien</h2>
        <ul class="category-tiles">
          ${CATEGORY_TILES.map(
            (tile) => `
            <li>
              <a class="category-tile" href="${tile.href}">
                <img class="category-tile__image" src="${esc(assetUrl(tile.image))}" alt="" loading="lazy" decoding="async">
                <span class="category-tile__label">${esc(tile.label)}</span>
              </a>
            </li>`
          ).join("")}
        </ul>
      </div>
    </section>

    <section class="section section--tinted" aria-labelledby="design-title">
      <div class="container design-teaser">
        <div class="design-teaser__text">
          <h2 class="section__title" id="design-title">Dein Design</h2>
          <p class="design-teaser__lead"><strong>Dein Regenmantel, dein Design.</strong></p>
          <p>Finde dein Lieblingsmotiv und mach deinen Regenmantel einzigartig.</p>
          <a class="btn btn--primary" href="/dein-design">Dein Design gestalten</a>
        </div>
        <div class="design-teaser__motifs" id="home-designs">${loadingHtml("Motive werden geladen …")}</div>
      </div>
    </section>

    <section class="section" id="ueber-uns" aria-labelledby="about-title" tabindex="-1">
      <div class="container about">
        <h2 class="section__title" id="about-title">Über uns</h2>
        <p class="about__text">Rainbow.design steht für handgefertigte Regenmäntel mit individuellen Details. Farben, Rückenmotive und liebevoll gestaltete Taschen machen jedes Stück besonders.</p>
      </div>
    </section>`;

  const container = main.querySelector("#home-designs");
  const load = async () => {
    container.innerHTML = loadingHtml("Motive werden geladen …");
    try {
      const designs = await api.getDesigns();
      if (!isCurrent()) return;
      const adult = (designs && designs.adult) || [];
      const motifs = HOME_DESIGN_FILES.map((file) => adult.find((d) => d.image && d.image.endsWith(`/${file}`))).filter(
        Boolean
      );
      container.innerHTML = `
        <ul class="motif-grid motif-grid--home">
          ${motifs
            .map(
              (design) => `
            <li>
              <a class="motif-card" href="/dein-design?motiv=${encodeURIComponent(design.id)}">
                <span class="motif-card__media"><img src="${esc(assetUrl(design.image))}" alt="${esc(designLabel(design, designs))}" loading="lazy" decoding="async"></span>
                <span class="motif-card__label">${esc(designLabel(design, designs))}</span>
              </a>
            </li>`
            )
            .join("")}
        </ul>`;
    } catch (error) {
      if (!isCurrent()) return;
      container.innerHTML = errorHtml(error.message);
    }
  };
  load();
}
