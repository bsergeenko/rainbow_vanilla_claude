# Rainbow.design – Frontend (HTML, CSS, Vanilla JavaScript)

## Starten

1. Backend starten (Ordner `rainbow_backend`): `node server.js` → läuft auf `http://localhost:3000`
2. Frontend starten (dieser Ordner): `npm start` bzw. `node serve.js`
3. Im Browser öffnen: **http://localhost:5500**

Wichtig: Das Frontend immer über `localhost` aufrufen (nicht `127.0.0.1`), damit die
Session-Cookies des Backends mitgesendet werden. Aufrufe über `127.0.0.1` werden automatisch umgeleitet.

`serve.js` ist ein kleiner statischer Server ohne Abhängigkeiten. Er liefert `index.html` für alle
Seitenpfade aus, damit die Adressen der Single-Page-Anwendung (z. B. `/damen`, `/produkt/…`) direkt
aufrufbar sind.

## Aufbau

- `index.html` – Einstiegspunkt
- `css/styles.css` – gesamtes Styling (responsive)
- `js/app.js` – Routen, Zugriffsregeln, globale Interaktionen
- `js/router.js` – Router auf Basis der History API
- `js/api.js` – REST-Anbindung (`credentials: "include"`)
- `js/store.js` – Login-Status, Warenkorb-Anzahl, Wunschliste
- `js/layout.js` – Navigation, Suche, Footer, Admin-Kopfbereich
- `js/ui.js`, `js/orderView.js`, `js/i18n.js`, `js/utils.js`, `js/icons.js` – gemeinsame Bausteine
- `js/pages/*` – einzelne Seiten (Startseite, Kategorien, Produkt, Dein Design, Warenkorb, Kasse,
  Anmeldung, Konto, Wunschliste, Kontakt, Adminbereich, 404)
