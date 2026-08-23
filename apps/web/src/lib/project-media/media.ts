import type Hls from "hls.js";

import { initHls, preloadHls } from "./hls";
import { byVisibility, nextVisible, shouldAutoplay, shouldShowPoster } from "./media-state";

type CardPlayer = {
  card: HTMLElement;
  video: HTMLVideoElement;
  poster: HTMLElement | null;
  hls: Hls | null;
  nativeHls: boolean;
  activated: boolean;
  sourceAttached: boolean;
  started: boolean;
  nearby: boolean;
  visible: boolean;
  ratio: number;
  playing: boolean;
  buffering: boolean;
  playPending: boolean;
  playAttempt: number;
  recovering: boolean;
  resumeFrame: number;
};

const FREEZE = true;

export function bindProjectMedia(root: HTMLElement) {
  const players = new Map<HTMLElement, CardPlayer>();
  const playbackSource = root.querySelector("[data-projects-scroll-root]") ?? root;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let playbackEnabled = playbackSource.getAttribute("data-playback") !== "off";
  let activating = false;
  let destroyed = false;
  let drainFrame = 0;
  const pending: CardPlayer[] = [];

  const syncPresentation = (player: CardPlayer) => {
    const actuallyPlaying = player.started && !player.video.paused && !player.video.ended;
    const showPoster = shouldShowPoster({
      activated: player.activated,
      loaded: player.started,
      freezeFrameOnPause: FREEZE,
      playbackEnabled,
      playing: actuallyPlaying,
    });

    player.poster?.classList.toggle("is-off", !showPoster);
    player.card.classList.toggle("is-playing", actuallyPlaying);
  };

  const requestPlayback = (player: CardPlayer) => {
    if (player.recovering || player.playPending || !player.video.paused) {
      syncPresentation(player);
      return;
    }

    const attempt = ++player.playAttempt;
    player.playPending = true;
    void player.video.play().then(
      () => {
        if (attempt !== player.playAttempt) {
          return;
        }
        player.playPending = false;
        if (destroyed) {
          player.video.pause();
          return;
        }
        if (!player.playing) {
          player.video.pause();
          return;
        }
        player.started = true;
        syncPresentation(player);
      },
      (error: unknown) => {
        if (attempt !== player.playAttempt) {
          return;
        }
        player.playPending = false;
        if (
          player.nativeHls &&
          error instanceof DOMException &&
          error.name === "NotSupportedError"
        ) {
          void recoverWithHlsJs(player);
          return;
        }
        if (
          !destroyed &&
          player.playing &&
          error instanceof DOMException &&
          error.name === "AbortError" &&
          player.resumeFrame === 0
        ) {
          player.resumeFrame = requestAnimationFrame(() => {
            player.resumeFrame = 0;
            if (!destroyed && player.playing) {
              requestPlayback(player);
            }
          });
        }
      },
    );
  };

  const syncPlayer = (player: CardPlayer) => {
    const playing = shouldAutoplay({
      visible: player.visible,
      pageVisible: !document.hidden,
      playbackEnabled,
      reducedMotion: reducedMotion.matches,
    });
    const shouldBuffer =
      player.nearby && !document.hidden && playbackEnabled && !reducedMotion.matches;

    player.playing = playing;
    syncPresentation(player);

    if (!player.sourceAttached) {
      return;
    }

    const preload = shouldBuffer ? (playing ? "auto" : "metadata") : "none";
    if (player.video.preload !== preload) {
      player.video.preload = preload;
    }

    if (shouldBuffer !== player.buffering) {
      player.buffering = shouldBuffer;
      if (shouldBuffer) {
        player.hls?.startLoad();
      } else {
        player.hls?.stopLoad();
      }
    }

    if (playing) {
      requestPlayback(player);
    } else {
      if (player.playPending) {
        player.playAttempt += 1;
        player.playPending = false;
      }
      if (!player.video.paused) {
        player.video.pause();
      }
      syncPresentation(player);
    }
  };

  const syncAll = () => {
    for (const player of players.values()) {
      syncPlayer(player);
    }
  };

  const attachSource = async (player: CardPlayer, forceHlsJs = false) => {
    const src = player.card.dataset.mediaSrc;
    if (!src) {
      return;
    }

    try {
      const hls = await initHls(
        player.video,
        src,
        () => {
          if (destroyed) {
            return;
          }
          syncAll();
        },
        () => {
          if (!destroyed) {
            player.card.dataset.mediaError = "true";
          }
        },
        { forceHlsJs },
      );
      if (destroyed) {
        hls?.destroy();
        return;
      }
      player.hls = hls;
      player.nativeHls = hls === null && player.video.hasAttribute("src");
      player.sourceAttached = true;
      syncAll();
    } catch {
      if (!destroyed) {
        player.card.dataset.mediaError = "true";
      }
    }
  };

  async function recoverWithHlsJs(player: CardPlayer) {
    if (destroyed || player.recovering || !player.nativeHls) {
      return;
    }

    player.recovering = true;
    player.playAttempt += 1;
    player.playPending = false;
    player.buffering = false;
    player.sourceAttached = false;
    player.nativeHls = false;
    player.video.pause();
    player.video.removeAttribute("src");
    player.video.load();
    await preloadHls().catch(() => undefined);
    await attachSource(player, true);
    player.recovering = false;
    syncAll();
  }

  const activate = async (player: CardPlayer) => {
    if (
      destroyed ||
      player.activated ||
      reducedMotion.matches ||
      document.hidden ||
      !playbackEnabled ||
      !player.nearby
    ) {
      return;
    }

    player.activated = true;
    player.video.preload = "metadata";
    syncAll();
    await attachSource(player);
  };

  const drain = () => {
    if (destroyed || activating || reducedMotion.matches || document.hidden) {
      return;
    }

    const next = pending.shift();
    if (!next) {
      return;
    }

    activating = true;
    void activate(next).finally(() => {
      activating = false;
      if (!destroyed && pending.length > 0) {
        drainFrame = requestAnimationFrame(() => {
          drainFrame = 0;
          drain();
        });
      }
    });
  };

  const enqueueNearby = () => {
    if (destroyed || !playbackEnabled || reducedMotion.matches || document.hidden) {
      return;
    }

    const waiting = [...players.values()]
      .filter((player) => player.nearby && !player.activated && !pending.includes(player))
      .sort(byVisibility);

    pending.push(...waiting);
    drain();
  };

  const cards = [...root.querySelectorAll<HTMLElement>("[data-project-card]")];

  for (const card of cards) {
    const video = card.querySelector("video");
    if (!video || card.dataset.mediaType !== "video") {
      continue;
    }

    video.disableRemotePlayback = true;
    const player: CardPlayer = {
      card,
      video,
      poster: card.querySelector("[data-project-poster]"),
      hls: null,
      nativeHls: false,
      activated: false,
      sourceAttached: false,
      started: false,
      nearby: false,
      visible: false,
      ratio: 0,
      playing: false,
      buffering: false,
      playPending: false,
      playAttempt: 0,
      recovering: false,
      resumeFrame: 0,
    };
    video.addEventListener(
      "playing",
      () => {
        player.playPending = false;
        player.started = true;
        syncPresentation(player);
      },
      { signal: events.signal },
    );
    video.addEventListener("canplay", syncAll, { signal: events.signal });
    video.addEventListener(
      "pause",
      () => {
        if (
          destroyed ||
          player.recovering ||
          !player.playing ||
          document.hidden ||
          player.resumeFrame !== 0
        ) {
          return;
        }
        player.resumeFrame = requestAnimationFrame(() => {
          player.resumeFrame = 0;
          if (!destroyed && player.playing && player.video.paused) {
            requestPlayback(player);
          }
        });
      },
      { signal: events.signal },
    );
    players.set(card, player);
  }

  if (players.size > 0 && playbackEnabled && !reducedMotion.matches) {
    void preloadHls().catch(() => undefined);
  }

  const releaseNativeSource = (player: CardPlayer) => {
    if (!player.nativeHls || player.nearby || player.visible) {
      return;
    }

    player.playing = false;
    player.buffering = false;
    player.playPending = false;
    player.playAttempt += 1;
    player.video.pause();
    player.video.removeAttribute("src");
    player.video.load();
    player.video.preload = "none";
    player.nativeHls = false;
    player.activated = false;
    player.sourceAttached = false;
    player.started = false;
    syncPresentation(player);
  };

  const proximity = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const player = players.get(entry.target as HTMLElement);
        if (player) {
          player.nearby = entry.isIntersecting;
          releaseNativeSource(player);
        }
      }
      syncAll();
      enqueueNearby();
    },
    { rootMargin: "50% 25%", threshold: 0 },
  );

  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        const player = players.get(card);
        const ratio = entry.intersectionRatio;

        if (ratio > 0 && !card.dataset.viewed) {
          card.dataset.viewed = "true";
          card.dispatchEvent(new CustomEvent("project-card-viewed", { bubbles: true }));
        }

        if (!player) {
          continue;
        }

        player.ratio = ratio;
        player.visible = nextVisible(player.visible, ratio);
        card.dataset.visible = player.visible ? "true" : "false";
        releaseNativeSource(player);
      }

      syncAll();
      enqueueNearby();
    },
    {
      threshold: [0, 0.1, 0.2, 0.5, 1],
    },
  );

  for (const card of cards) {
    proximity.observe(card);
    visibility.observe(card);
  }

  const syncEnvironment = () => {
    if (document.hidden || reducedMotion.matches) {
      pending.length = 0;
    }
    syncAll();
    enqueueNearby();
  };

  document.addEventListener("visibilitychange", syncEnvironment, { signal: events.signal });
  reducedMotion.addEventListener("change", syncEnvironment, { signal: events.signal });

  return {
    setPlaybackEnabled(enabled: boolean) {
      if (destroyed) {
        return;
      }
      playbackEnabled = enabled;
      if (!enabled) {
        pending.length = 0;
      }
      syncAll();
      enqueueNearby();
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      events.abort();
      proximity.disconnect();
      visibility.disconnect();
      pending.length = 0;
      if (drainFrame !== 0) {
        cancelAnimationFrame(drainFrame);
      }
      for (const player of players.values()) {
        player.playing = false;
        player.playAttempt += 1;
        if (player.resumeFrame !== 0) {
          cancelAnimationFrame(player.resumeFrame);
        }
        player.video.pause();
        player.hls?.destroy();
      }
      players.clear();
    },
  };
}
