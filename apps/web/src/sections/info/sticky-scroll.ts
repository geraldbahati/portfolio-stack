export const COLOR_GRAY_400 = "oklch(0.702 0 0)";

export type Oklch = { l: number; c: number; h: number };

export const GRAY_400: Oklch = { l: 0.702, c: 0, h: 0 };
export const TEXT_PRIMARY: Oklch = { l: 0, c: 0, h: 0 };
export const GRAY_700: Oklch = { l: 0.3725, c: 0.0168, h: 264.5 };

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Section progress 0→1 as the block scrolls through viewport center. */
export function sectionProgress(rect: { top: number; height: number }, viewportHeight: number) {
  const start = rect.top + rect.height;
  const end = rect.top;
  const center = viewportHeight / 2;
  return clamp01((center - end) / (start - end));
}

/** Clip progress for stacked image panels (section center vs viewport). */
export function clipProgress(rect: { top: number; height: number }, viewportHeight: number) {
  const sectionCenter = rect.top + rect.height / 2;
  const start = viewportHeight;
  const end = viewportHeight / 2;
  return clamp01((start - sectionCenter) / (start - end));
}

export function clipPathFor(progress: number) {
  return `inset(${((1 - progress) * 100).toFixed(2)}% 0 0 0)`;
}

export function lerpOklch(a: Oklch, b: Oklch, t: number): string {
  const l = a.l + (b.l - a.l) * t;
  const c = a.c + (b.c - a.c) * t;
  const h = a.h + (b.h - a.h) * t;
  return `oklch(${l} ${c} ${h})`;
}

/** Multi-stop interpolation: maps progress through keyframes [0, 0.1, 0.9, 1] */
export function interpolateColor(progress: number, dim: Oklch, active: Oklch): string {
  if (progress <= 0.1) {
    return lerpOklch(dim, active, progress / 0.1);
  }
  if (progress <= 0.9) {
    return lerpOklch(active, active, 1);
  }
  return lerpOklch(active, dim, (progress - 0.9) / 0.1);
}

/** Multi-stop opacity: [0, 0.1, 0.9, 1] → [0.3, 1, 1, 0.3] */
export function interpolateOpacity(progress: number): number {
  if (progress <= 0.1) {
    return 0.3 + 0.7 * (progress / 0.1);
  }
  if (progress <= 0.9) {
    return 1;
  }
  return 1 - 0.7 * ((progress - 0.9) / 0.1);
}

/** Skip DOM writes when the scroll delta is below a frame of visible change. */
export const PAINT_EPSILON = 0.002;
