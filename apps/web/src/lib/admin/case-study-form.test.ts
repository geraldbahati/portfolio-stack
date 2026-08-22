import { describe, expect, it } from "vitest";

import {
  formatChallengesText,
  formatColorsText,
  formatGalleryText,
  formatMetricsText,
  parseChallengesText,
  parseGalleryText,
  parseMetricsText,
  parsePresentationForm,
} from "./case-study-form";

describe("case study form formats", () => {
  it("round trips metrics", () => {
    const metrics = [{ value: "85%", label: "Faster checkout", icon: "speed" }];
    expect(parseMetricsText(formatMetricsText(metrics))).toEqual(metrics);
  });

  it("round trips markdown challenges", () => {
    const challenges = [
      { title: "Payments", content: "Added **M-Pesa** support." },
      { title: "Performance", content: "Moved caching to the edge." },
    ];
    expect(parseChallengesText(formatChallengesText(challenges))).toEqual(challenges);
  });

  it("round trips structured gallery rows", () => {
    const gallery = [
      {
        src: "https://media.geraldbahati.dev/project.webp",
        galleryType: "feature" as const,
        deviceType: "desktop" as const,
        width: 1600,
        height: 900,
        alt: "Project dashboard",
        caption: "A dashboard | with context",
      },
    ];
    expect(parseGalleryText(formatGalleryText(gallery))).toEqual(gallery);
  });

  it("parses colors and selected related projects", () => {
    const form = new FormData();
    form.set("colors", formatColorsText([{ hex: "#111111", name: "Ink" }]));
    form.append("relatedProjectIds", "related-one");
    form.append("relatedProjectIds", "related-two");
    expect(parsePresentationForm(form)).toEqual({
      colorPalette: [{ hex: "#111111", name: "Ink" }],
      relatedProjectIds: ["related-one", "related-two"],
    });
  });
});
