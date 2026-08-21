import { enhanceContact } from "./enhance";

export function bootContact() {
  const root = document.querySelector<HTMLElement>("[data-contact]");
  if (root) {
    enhanceContact(root);
  }
}

bootContact();
