/**
 * Hand-drawn arrows, traced as freehand curves rather than exact geometry so
 * they read as pen strokes. Each is drawn shaft-first, then the two barbs of
 * its head, which is the order the draw animation replays them in.
 */
export interface HandArrow {
  /** Box the strokes were traced in; the render size comes from CSS. */
  readonly viewBox: string;
  readonly shaft: string;
  readonly barbs: readonly [string, string];
}

/** Sweeps down-right. Used beside the video and in the floating shortcut. */
export const SWEEP_ARROW: HandArrow = {
  viewBox: "0 0 120 120",
  shaft: "M9 5C11 26 16 45 30 63C44 81 71 97 105 109",
  barbs: ["M105 109C95 98 87 88 78 76", "M105 109C89 112 72 109 59 99"],
};

/** Loops back on itself, then points down-left into the right of the video. */
export const LOOP_ARROW: HandArrow = {
  viewBox: "0 0 120 120",
  shaft:
    "M119 5C114 21 99 31 78 43C64 53 46 61 34 51C23 41 31 25 48 23C65 21 80 29 83 40C74 57 48 70 28 83C21 88 14 92 7 97",
  barbs: ["M7 97C20 96 33 94 45 90", "M7 97C9 86 13 77 21 68"],
};

/** Straight down, for the hint that sits above the video on narrow screens. */
export const DOWN_ARROW: HandArrow = {
  viewBox: "0 0 40 64",
  shaft: "M21 2C24 19 15 37 19 57",
  barbs: ["M19 57C15 49 11 44 6 38", "M19 57C24 50 28 44 34 39"],
};
