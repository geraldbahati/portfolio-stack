export const HORIZONTAL_PHASE_END = 0.6;
export const FAQ_COVER_START = 0.45;
export const PROGRESS_EPSILON = 0.0005;
export const PIXEL_EPSILON = 0.4;
export const SCRUB_TIME_CONSTANT_MS = 85;

export function clampProgress(scrolled: number, scrollableDistance: number) {
  return Math.max(0, Math.min(1, scrolled / Math.max(1, scrollableDistance)));
}

export function horizontalProgress(progress: number, phaseEnd = HORIZONTAL_PHASE_END) {
  return Math.min(1, progress / phaseEnd);
}

export function faqProgress(progress: number, phaseEnd = HORIZONTAL_PHASE_END) {
  return Math.max(0, Math.min(1, (progress - phaseEnd) / (1 - phaseEnd)));
}

export function scrubToward(
  current: number,
  target: number,
  elapsedMs: number,
  tau = SCRUB_TIME_CONSTANT_MS,
) {
  const elapsed = Math.min(64, Math.max(0, elapsedMs));
  const blend = 1 - Math.exp(-elapsed / tau);
  return current + (target - current) * blend;
}

export function trackTranslateX(progress: number, travel: number) {
  return -horizontalProgress(progress) * travel;
}

export function faqTranslateY(progress: number, offset: number) {
  return (1 - faqProgress(progress)) * offset;
}

export function faqOffsetPx(viewportHeight: number, projectsBottomFromStickyTop: number) {
  return Math.max(viewportHeight * 0.1, viewportHeight - projectsBottomFromStickyTop);
}

export function isFaqPhase(progress: number, phaseEnd = HORIZONTAL_PHASE_END) {
  return progress > phaseEnd;
}

export function isFaqCovering(
  progress: number,
  phaseEnd = HORIZONTAL_PHASE_END,
  cover = FAQ_COVER_START,
) {
  return faqProgress(progress, phaseEnd) >= cover;
}

export function shouldCommitPx(next: number, prev: number, epsilon = PIXEL_EPSILON) {
  return !Number.isFinite(prev) || Math.abs(next - prev) >= epsilon;
}
