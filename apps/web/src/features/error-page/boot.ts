import { enhanceErrorPage } from "./enhance";

export function bootErrorPage() {
  const root = document.querySelector<HTMLElement>("[data-error-page]");
  if (root) {
    enhanceErrorPage(root);
  }
}

bootErrorPage();
