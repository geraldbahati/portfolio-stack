import { bindProjectCards } from "../../lib/project-media/cards";
import { bindProjectMedia } from "../../lib/project-media/media";

export function enhanceProjectsIndex(root: HTMLElement) {
  const media = bindProjectMedia(root);
  const destroyCards = bindProjectCards(root, "projects_index");

  return () => {
    destroyCards();
    media.destroy();
  };
}
