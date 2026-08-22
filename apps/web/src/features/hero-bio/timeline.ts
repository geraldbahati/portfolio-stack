const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** 200vh pin; progress 0→1 maps to the first 100vh of document scroll. */
export const PIN_VH = 100;

export const TIMELINE = {
  heroScale: { start: 0, end: 1 },
  bioImage: { start: 0.4, end: 1 },
  bioBg: { start: 0, end: 0.5 },
  text: { start: 0.55, end: 1 },
  cta: { start: 0.7, end: 1 },
  charWindow: 3,
} as const;

export function remap(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start));
}

export function pinProgress(scrolledPx: number, pinPx: number) {
  return clamp(scrolledPx / pinPx);
}

export function charAnimationRangeVh(index: number, total: number) {
  if (total <= 0) {
    return { start: 0, end: 0 };
  }

  const { start: textStart, end: textEnd } = TIMELINE.text;
  const span = textEnd - textStart;
  const start = (textStart + (index / total) * span) * PIN_VH;
  const end = (textStart + ((index + TIMELINE.charWindow) / total) * span) * PIN_VH;
  return { start, end };
}

export function getBioCharOpacity(progress: number, index: number, total: number) {
  if (total <= 0) return 1;

  const charStart = index / total;
  const charWidth = TIMELINE.charWindow / total;
  return 0.2 + 0.8 * remap(progress, charStart, charStart + charWidth);
}

export function heroScale(progress: number) {
  return 1 - progress * 0.15;
}

export function bioImageProgress(progress: number) {
  return remap(progress, TIMELINE.bioImage.start, TIMELINE.bioImage.end);
}

export function bioBgOpacity(progress: number) {
  return 0.3 + remap(progress, TIMELINE.bioBg.start, TIMELINE.bioBg.end) * 0.7;
}

export function bioCtaProgress(textProgress: number) {
  return remap(textProgress, TIMELINE.cta.start, TIMELINE.cta.end);
}
