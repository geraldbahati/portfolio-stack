import { enhanceProjectsIndex } from "./enhance";

export function bootProjectsIndex() {
  const root = document.querySelector<HTMLElement>("[data-projects-index]");
  if (root) {
    return enhanceProjectsIndex(root);
  }
}

bootProjectsIndex();
