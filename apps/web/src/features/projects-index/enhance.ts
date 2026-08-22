import { bindProjectCards } from "../../lib/project-media/cards";
import { bindProjectMedia } from "../../lib/project-media/media";

export function enhanceProjectsIndex(root: HTMLElement) {
  bindProjectMedia(root);
  bindProjectCards(root, "projects_index");
}
