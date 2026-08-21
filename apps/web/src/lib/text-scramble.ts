export const DEFAULT_SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export type ScrambleOptions = {
  duration?: number;
  speed?: number;
  holdMs?: number;
};

export function scrambleText(
  text: string,
  progress: number,
  characterSet = DEFAULT_SCRAMBLE_CHARS,
) {
  let scrambled = "";

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === " ") {
      scrambled += " ";
      continue;
    }

    if (progress * text.length > i) {
      scrambled += character;
    } else {
      scrambled += characterSet[Math.floor(Math.random() * characterSet.length)];
    }
  }

  return scrambled;
}

export function playScramble(target: HTMLElement, options: ScrambleOptions = {}) {
  const duration = options.duration ?? 0.8;
  const speed = options.speed ?? 0.04;
  const original = target.dataset.original || target.textContent || "";
  target.dataset.original = original;

  let interval = 0;
  let holdTimer = 0;
  const intervalMs = Math.max(speed * 1000, 16);
  const stepCount = Math.max(Math.ceil(duration / speed), 1);
  const startedAt = performance.now();

  const stop = () => {
    window.clearInterval(interval);
    window.clearTimeout(holdTimer);
    target.textContent = original;
  };

  interval = window.setInterval(() => {
    const currentStep = Math.min(
      stepCount + 1,
      Math.floor((performance.now() - startedAt) / intervalMs),
    );
    target.textContent = scrambleText(original, currentStep / stepCount);

    if (currentStep > stepCount) {
      stop();
    }
  }, intervalMs);

  if (options.holdMs) {
    holdTimer = window.setTimeout(stop, options.holdMs);
  }

  return stop;
}

export function bindHoverScramble(root: HTMLElement, options: ScrambleOptions = {}) {
  const target = root.querySelector<HTMLElement>("[data-scramble]") ?? root;
  let stop: (() => void) | undefined;

  const start = () => {
    stop?.();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    stop = playScramble(target, { holdMs: 500, ...options });
  };

  const end = () => stop?.();

  root.addEventListener("mouseenter", start);
  root.addEventListener("focus", start);
  root.addEventListener("mouseleave", end);
  root.addEventListener("blur", end);

  return () => {
    end();
    root.removeEventListener("mouseenter", start);
    root.removeEventListener("focus", start);
    root.removeEventListener("mouseleave", end);
    root.removeEventListener("blur", end);
  };
}
