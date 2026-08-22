import { enhanceProjectDetail } from "./enhance";

export function bootProjectDetail() {
  const root = document.querySelector<HTMLElement>("[data-project-detail]");
  if (root) {
    enhanceProjectDetail(root);
  }
}

bootProjectDetail();
