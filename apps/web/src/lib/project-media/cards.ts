import {
  type Surface,
  trackProjectCardViewed,
  trackProjectOpened,
} from "@portfolio-stack/analytics/events";

export function bindProjectCards(root: HTMLElement, surface: Surface) {
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  for (const card of root.querySelectorAll<HTMLElement>("[data-project-card]")) {
    if (finePointer) {
      let mx = 0;
      let my = 0;
      let cursorFrame = 0;
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        mx = event.clientX - rect.left;
        my = event.clientY - rect.top;
        if (cursorFrame !== 0) {
          return;
        }
        cursorFrame = requestAnimationFrame(() => {
          cursorFrame = 0;
          card.style.setProperty("--mx", `${mx}px`);
          card.style.setProperty("--my", `${my}px`);
        });
      });
    }

    card.addEventListener("project-card-viewed", () => {
      trackProjectCardViewed({
        project_slug: card.dataset.projectId ?? "",
        project_title: card.dataset.projectTitle,
        surface,
      });
    });

    card.querySelector<HTMLAnchorElement>("[data-project-hit]")?.addEventListener("click", () => {
      trackProjectOpened({
        project_slug: card.dataset.projectId ?? "",
        project_title: card.dataset.projectTitle,
        surface,
      });
    });
  }
}
