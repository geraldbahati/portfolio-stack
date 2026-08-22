import { enhanceProjectsIndex } from "./enhance";

export function bootProjectsIndex() {
  const root = document.querySelector<HTMLElement>("[data-projects-index]");
  if (root) {
    enhanceProjectsIndex(root);
  }
}

bootProjectsIndex();
