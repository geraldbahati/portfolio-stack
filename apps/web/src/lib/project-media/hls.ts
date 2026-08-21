function isMobile() {
  return window.matchMedia("(max-width: 768px)").matches;
}

export async function initHls(
  video: HTMLVideoElement,
  hlsUrl: string,
  onReady: () => void,
  onError: () => void,
) {
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = hlsUrl;
    video.addEventListener("canplay", onReady, { once: true });
    return null;
  }

  const { default: HlsCtor } = await import("hls.js");
  if (!HlsCtor.isSupported()) {
    onError();
    return null;
  }

  const hls = new HlsCtor({
    enableWorker: true,
    lowLatencyMode: false,
    capLevelToPlayerSize: true,
    startLevel: 0,
    maxBufferLength: isMobile() ? 6 : 8,
    maxMaxBufferLength: isMobile() ? 10 : 16,
    maxBufferSize: 6_000_000,
    backBufferLength: 0,
  });

  hls.loadSource(hlsUrl);
  hls.attachMedia(video);
  hls.on(HlsCtor.Events.MANIFEST_PARSED, onReady);
  hls.on(HlsCtor.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      onError();
    }
  });

  return hls;
}
