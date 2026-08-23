import { enhanceContactPage } from "./enhance";

export function bootContactPage() {
  const root = document.querySelector<HTMLElement>("[data-contact-page]");
  return root ? enhanceContactPage(root) : () => undefined;
}

bootContactPage();
