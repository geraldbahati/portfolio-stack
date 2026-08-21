export function hydrateDeferredPicture(image: HTMLImageElement): void {
  if (image.getAttribute("src")) {
    return;
  }

  const picture = image.closest("picture");
  picture?.querySelectorAll("source[data-srcset]").forEach((source) => {
    const srcset = source.getAttribute("data-srcset");
    if (srcset) {
      source.setAttribute("srcset", srcset);
    }
  });

  const src = image.dataset.src;
  if (src) {
    image.src = src;
  }
  if (image.dataset.srcset) {
    image.srcset = image.dataset.srcset;
  }
  if (image.dataset.sizes) {
    image.sizes = image.dataset.sizes;
  }
}
