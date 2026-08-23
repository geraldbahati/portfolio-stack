function isMobile() {
  return window.matchMedia("(max-width: 768px)").matches;
}

let hlsModule: Promise<typeof import("hls.js")> | undefined;

export function preloadHls() {
  hlsModule ??= import("hls.js").catch((error) => {
    hlsModule = undefined;
    throw error;
  });
  return hlsModule;
}

export async function initHls(
  video: HTMLVideoElement,
  hlsUrl: string,
  onReady: () => void,
  onError: () => void,
  options: { forceHlsJs?: boolean } = {},
) {
  if (!options.forceHlsJs && video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = hlsUrl;
    video.addEventListener("canplay", onReady, { once: true });
    return null;
  }

  const { default: HlsCtor } = await preloadHls();
  if (!HlsCtor.isSupported()) {
    onError();
    return null;
  }

  const hls = new HlsCtor({
    enableWorker: true,
    autoStartLoad: true,
    lowLatencyMode: false,
    capLevelToPlayerSize: true,
    startLevel: 0,
    maxBufferLength: isMobile() ? 6 : 8,
    maxMaxBufferLength: isMobile() ? 10 : 16,
    maxBufferSize: 6_000_000,
    backBufferLength: 0,
  });

  hls.on(HlsCtor.Events.MANIFEST_PARSED, onReady);
  hls.on(HlsCtor.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      onError();
    }
  });
  hls.on(HlsCtor.Events.MEDIA_ATTACHED, () => hls.loadSource(hlsUrl));
  hls.attachMedia(video);

  return hls;
}
