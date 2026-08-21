/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";

import { hydrateDeferredPicture } from "./deferred-media";

describe("hydrateDeferredPicture", () => {
  it("promotes data-srcset / data-src on first open and is idempotent", () => {
    document.body.innerHTML = `
      <picture>
        <source type="image/avif" data-srcset="/a.avif 800w" sizes="320px" />
        <source type="image/webp" data-srcset="/a.webp 800w" sizes="320px" />
        <img data-deferred-image data-src="/a.webp" data-srcset="/a.webp 800w" data-sizes="320px" alt="" />
      </picture>
    `;

    const image = document.querySelector("img");
    if (!image) {
      throw new Error("missing img");
    }

    hydrateDeferredPicture(image);
    expect(image.getAttribute("src")).toBe("/a.webp");
    expect(image.getAttribute("srcset")).toBe("/a.webp 800w");
    expect(image.getAttribute("sizes")).toBe("320px");
    expect(
      [...document.querySelectorAll("source")].map((source) => source.getAttribute("srcset")),
    ).toEqual(["/a.avif 800w", "/a.webp 800w"]);

    image.dataset.src = "/other.webp";
    hydrateDeferredPicture(image);
    expect(image.getAttribute("src")).toBe("/a.webp");
  });
});
