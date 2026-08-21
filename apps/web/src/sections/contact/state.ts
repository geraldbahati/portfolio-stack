export function shouldRevealMedia(active: boolean, reducedMotion: boolean) {
  return active && !reducedMotion;
}

export function applyContactPlayback(video: HTMLVideoElement, reveal: boolean) {
  if (reveal) {
    void video.play().catch(() => undefined);
    return;
  }

  if (!video.paused) {
    video.pause();
  }
  try {
    video.currentTime = 0;
  } catch {
    // No frame yet.
  }
}

export function createContactVideo(src: string) {
  const video = document.createElement("video");
  video.dataset.contactVideo = "true";
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.disableRemotePlayback = true;
  video.setAttribute("aria-hidden", "true");
  video.className = "contact-cta__video";
  video.src = src;
  return video;
}
