import { enhanceProjectDetail } from "./enhance";

export function bootProjectDetail() {
  const root = document.querySelector<HTMLElement>("[data-project-detail]");
  return root ? enhanceProjectDetail(root) : () => undefined;
}

bootProjectDetail();
