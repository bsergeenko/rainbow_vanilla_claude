import { api } from "../api.js";
import { setUser, refreshCart, refreshWishlist, isAdmin } from "../store.js";
import { fieldHtml, requiredNote, rules, attachValidation, setButtonBusy, formErrorHtml, setFormError } from "../ui.js";

// Nur bekannte Rücksprungziele zulassen
function returnTarget(query) {
  return query.get("weiter") === "warenkorb" ? "warenkorb" : "";
}

export function renderLogin({ main, query, navigate }) {
  document.title = "Anmelden – Rainbow.design";
  const weiter = returnTarget(query);
  const suffix = weiter ? `?weiter=${weiter}` : "";

  main.innerHTML = `
    <div class="container page page--narrow">
      <section class="card auth-card" aria-labelledby="login-title">
        <h1 class="page-title" id="login-title">Anmelden</h1>
        <p class="page-intro">Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.</p>
        <form id="login-form" novalidate>
          ${requiredNote}
          ${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, autocomplete: "email" })}
          ${fieldHtml({ name: "password", label: "Passwort", type: "password", required: true, autocomplete: "current-password" })}
          ${formErrorHtml()}
          <button type="submit" class="btn btn--primary btn--block">Anmelden</button>
        </form>
        <p class="auth-card__switch">Noch kein Konto? <a href="/registrieren${suffix}">Registrieren</a></p>
      </section>
    </div>`;

  const form = main.querySelector("#login-form");
  attachValidation(
    form,
    {
      email: [rules.required("Bitte gib deine E-Mail-Adresse ein."), rules.email()],
      password: [rules.required("Bitte gib dein Passwort ein.")]
    },
    async (values) => {
      const button = form.querySelector('button[type="submit"]');
      setFormError(form, "");
      setButtonBusy(button, true, "Anmeldung läuft …");
      try {
        await api.login({ email: values.email.trim(), password: values.password });
        // Login-Status über GET /me bestätigen
        const me = await api.getMe();
        setUser(me);
        await refreshCart();
        if (isAdmin(me)) {
          navigate("/admin/produkte", { replace: true, flash: { message: `Willkommen im Adminbereich, ${me.firstName}!` } });
          return;
        }
        refreshWishlist().catch(() => {});
        if (weiter === "warenkorb") {
          navigate("/warenkorb", { replace: true, flash: { message: "Du bist jetzt angemeldet. Dein Warenkorb wurde übernommen." } });
        } else {
          navigate("/konto", { replace: true, flash: { message: `Willkommen zurück, ${me.firstName}!` } });
        }
      } catch (error) {
        setButtonBusy(button, false);
        if (error.status === 401 || error.status === 400) {
          setFormError(form, "E-Mail-Adresse oder Passwort ist falsch.");
        } else {
          setFormError(form, error.message);
        }
      }
    }
  );
}

export function renderRegister({ main, query, navigate }) {
  document.title = "Registrieren – Rainbow.design";
  const weiter = returnTarget(query);
  const suffix = weiter ? `?weiter=${weiter}` : "";

  main.innerHTML = `
    <div class="container page page--narrow">
      <section class="card auth-card" aria-labelledby="register-title">
        <h1 class="page-title" id="register-title">Registrieren</h1>
        <p class="page-intro">Lege dein Kundenkonto bei Rainbow.design an.</p>
        <form id="register-form" novalidate>
          ${requiredNote}
          <div class="form-grid">
            ${fieldHtml({ name: "firstName", label: "Vorname", required: true, autocomplete: "given-name" })}
            ${fieldHtml({ name: "lastName", label: "Nachname", required: true, autocomplete: "family-name" })}
            <div class="form-grid__full">${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, autocomplete: "email" })}</div>
            ${fieldHtml({ name: "password", label: "Passwort", type: "password", required: true, autocomplete: "new-password" })}
            ${fieldHtml({ name: "passwordConfirm", label: "Passwort bestätigen", type: "password", required: true, autocomplete: "new-password" })}
          </div>
          <fieldset class="form-fieldset">
            <legend class="form-fieldset__legend">Adresse (optional)</legend>
            <div class="form-grid">
              <div class="form-grid__full">${fieldHtml({ name: "street", label: "Straße und Hausnummer", autocomplete: "street-address" })}</div>
              ${fieldHtml({ name: "postalCode", label: "Postleitzahl", autocomplete: "postal-code", inputmode: "numeric" })}
              ${fieldHtml({ name: "city", label: "Ort", autocomplete: "address-level2" })}
              <div class="form-grid__full">${fieldHtml({ name: "country", label: "Land", autocomplete: "country-name" })}</div>
            </div>
          </fieldset>
          ${formErrorHtml()}
          <button type="submit" class="btn btn--primary btn--block">Registrieren</button>
        </form>
        <p class="auth-card__switch">Du hast bereits ein Konto? <a href="/anmelden${suffix}">Anmelden</a></p>
      </section>
    </div>`;

  const form = main.querySelector("#register-form");
  attachValidation(
    form,
    {
      firstName: [rules.required("Bitte gib deinen Vornamen ein.")],
      lastName: [rules.required("Bitte gib deinen Nachnamen ein.")],
      email: [rules.required("Bitte gib deine E-Mail-Adresse ein."), rules.email()],
      password: [rules.required("Bitte gib ein Passwort ein.")],
      passwordConfirm: [
        rules.required("Bitte bestätige dein Passwort."),
        rules.matches("password", "Die Passwörter stimmen nicht überein.")
      ],
      street: [],
      postalCode: [],
      city: [],
      country: []
    },
    async (values) => {
      const button = form.querySelector('button[type="submit"]');
      setFormError(form, "");
      setButtonBusy(button, true, "Registrierung läuft …");
      // Die Passwortbestätigung wird nicht an das Backend gesendet
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password
      };
      ["street", "postalCode", "city", "country"].forEach((key) => {
        const value = values[key].trim();
        if (value) payload[key] = value;
      });
      try {
        await api.register(payload);
        navigate(`/anmelden${suffix}`, {
          flash: { message: "Deine Registrierung war erfolgreich. Du kannst dich jetzt anmelden." }
        });
      } catch (error) {
        setButtonBusy(button, false);
        setFormError(form, error.message || "Die Registrierung ist fehlgeschlagen.");
      }
    }
  );
}
