import { getConsent, setConsent, subscribeToConsent } from "@portfolio-stack/analytics/consent";

const labels = {
  pending: "You haven't chosen yet. Analytics are off until you do.",
  accepted: "Analytics are on. Thank you — it helps improve the site.",
  rejected: "Optional analytics are off. Essential security and error monitoring remain active.",
} as const;

export function initPrivacyPreferences(root: ParentNode = document) {
  const status = root.querySelector<HTMLElement>("#consent-status");
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-consent]")];

  const render = () => {
    const consent = getConsent();
    if (status) status.textContent = labels[consent];
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.consent === consent));
    }
  };

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const decision = button.dataset.consent === "accepted" ? "accepted" : "rejected";
      setConsent(decision);
    });
  }

  subscribeToConsent(render);
  render();
}
