import {
  type Surface,
  trackProjectCardViewed,
  trackProjectOpened,
} from "@portfolio-stack/analytics/events";

export function bindProjectCards(root: HTMLElement, surface: Surface) {
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const events = new AbortController();
  const cursorFrames = new Set<number>();

  for (const card of root.querySelectorAll<HTMLElement>("[data-project-card]")) {
    if (finePointer) {
      let clientX = 0;
      let clientY = 0;
      let cursorFrame = 0;
      card.addEventListener(
        "pointermove",
        (event) => {
          clientX = event.clientX;
          clientY = event.clientY;
          if (cursorFrame !== 0) {
            return;
          }
          cursorFrame = requestAnimationFrame(() => {
            cursorFrames.delete(cursorFrame);
            cursorFrame = 0;
            const rect = card.getBoundingClientRect();
            card.style.setProperty("--mx", `${clientX - rect.left}px`);
            card.style.setProperty("--my", `${clientY - rect.top}px`);
          });
          cursorFrames.add(cursorFrame);
        },
        { signal: events.signal },
      );
    }

    card.addEventListener(
      "project-card-viewed",
      () => {
        trackProjectCardViewed({
          project_slug: card.dataset.projectId ?? "",
          project_title: card.dataset.projectTitle,
          surface,
        });
      },
      { signal: events.signal },
    );

    card.querySelector<HTMLAnchorElement>("[data-project-hit]")?.addEventListener(
      "click",
      () => {
        trackProjectOpened({
          project_slug: card.dataset.projectId ?? "",
          project_title: card.dataset.projectTitle,
          surface,
        });
      },
      { signal: events.signal },
    );
  }

  return () => {
    events.abort();
    for (const frame of cursorFrames) {
      cancelAnimationFrame(frame);
    }
    cursorFrames.clear();
  };
}
