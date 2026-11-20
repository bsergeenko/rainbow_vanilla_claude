import { api } from "../api.js";
import { state } from "../store.js";
import {
  fieldHtml,
  requiredNote,
  rules,
  attachValidation,
  setButtonBusy,
  formErrorHtml,
  setFormError,
  showToast
} from "../ui.js";
import { socialLinksHtml } from "../layout.js";

export function renderContact({ main }) {
  document.title = "Kontakt – Rainbow.design";
  const user = state.user;

  main.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <h1 class="page-title">Kontakt</h1>
        <p class="page-intro">Du hast eine Frage zu unseren Regenmänteln oder zu deiner Bestellung? Schreib uns eine Nachricht.</p>
      </header>
      <div class="contact-layout">
        <section class="card" aria-labelledby="contact-form-title">
          <h2 class="card__title" id="contact-form-title">Nachricht senden</h2>
          <form id="contact-form" novalidate>
            ${requiredNote}
            <div class="form-grid">
              ${fieldHtml({ name: "name", label: "Name", required: true, autocomplete: "name", value: user ? `${user.firstName} ${user.lastName}` : "" })}
              ${fieldHtml({ name: "email", label: "E-Mail-Adresse", type: "email", required: true, autocomplete: "email", value: user ? user.email : "" })}
              <div class="form-grid__full">${fieldHtml({ name: "subject", label: "Betreff", required: true })}</div>
              <div class="form-grid__full">${fieldHtml({ name: "message", label: "Nachricht", required: true, textarea: true, rows: 6 })}</div>
            </div>
            ${formErrorHtml()}
            <button type="submit" class="btn btn--primary">Nachricht senden</button>
          </form>
        </section>
        <aside class="card contact-aside" aria-labelledby="social-title">
          <h2 class="card__title" id="social-title">Social Media</h2>
          <p>Folge Rainbow.design auf Instagram und Facebook.</p>
          ${socialLinksHtml("social-links--stacked")}
        </aside>
      </div>
    </div>`;

  const form = main.querySelector("#contact-form");
  const validation = attachValidation(
    form,
    {
      name: [rules.required("Bitte gib deinen Namen ein.")],
      email: [rules.required("Bitte gib deine E-Mail-Adresse ein."), rules.email()],
      subject: [rules.required("Bitte gib einen Betreff ein.")],
      message: [rules.required("Bitte gib eine Nachricht ein.")]
    },
    async (values) => {
      const button = form.querySelector('button[type="submit"]');
      setFormError(form, "");
      setButtonBusy(button, true, "Nachricht wird gesendet …");
      try {
        await api.sendContact({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim()
        });
        form.reset();
        // Vorbelegte Werte ebenfalls leeren
        Array.from(form.elements).forEach((el) => {
          if (el.name && "value" in el && el.type !== "submit") el.value = "";
        });
        validation.reset();
        showToast("Vielen Dank für deine Nachricht.");
      } catch (error) {
        setFormError(form, error.message || "Die Nachricht konnte nicht gesendet werden.");
      } finally {
        setButtonBusy(button, false);
      }
    }
  );
}
