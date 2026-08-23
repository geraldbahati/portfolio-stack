export type PlaybackGate = {
  visible: boolean;
  pageVisible: boolean;
  playbackEnabled: boolean;
  reducedMotion: boolean;
};

export const ENTER_RATIO = 0.2;
export const EXIT_RATIO = 0.1;

export function nextVisible(currentlyVisible: boolean, ratio: number) {
  return currentlyVisible ? ratio >= EXIT_RATIO : ratio >= ENTER_RATIO;
}

export function shouldAutoplay(gate: PlaybackGate) {
  return gate.visible && gate.pageVisible && gate.playbackEnabled && !gate.reducedMotion;
}

export function shouldShowPoster(options: {
  activated: boolean;
  loaded: boolean;
  freezeFrameOnPause: boolean;
  playbackEnabled: boolean;
  playing: boolean;
}) {
  if (!options.activated || !options.loaded) {
    return true;
  }

  const showWhenPaused = !options.freezeFrameOnPause || !options.playbackEnabled;
  return showWhenPaused && !options.playing;
}

export function byVisibility(a: { ratio: number }, b: { ratio: number }) {
  return b.ratio - a.ratio;
}
