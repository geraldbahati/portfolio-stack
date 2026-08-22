import { enhanceInfo } from "./enhance";

export function bootInfo() {
  const root = document.querySelector<HTMLElement>("[data-info]");
  if (root) {
    enhanceInfo(root);
  }
}

bootInfo();
