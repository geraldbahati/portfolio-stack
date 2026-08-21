import { enhanceContactPage } from "./enhance";

export function bootContactPage() {
  const root = document.querySelector<HTMLElement>("[data-contact-page]");
  if (root) {
    enhanceContactPage(root);
  }
}

bootContactPage();
