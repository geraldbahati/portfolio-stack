import { enhanceProjectsFaq } from "./enhance";

export function bootProjectsFaq() {
  const root = document.querySelector<HTMLElement>("[data-projects-faq]");
  if (root) {
    enhanceProjectsFaq(root);
  }
}

bootProjectsFaq();
