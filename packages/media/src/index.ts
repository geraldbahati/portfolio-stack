export const DEFAULT_MEDIA_HOST = "media.geraldbahati.dev";
export const DEFAULT_MEDIA_ORIGIN = `https://${DEFAULT_MEDIA_HOST}`;
export const DEFAULT_STREAM_DOMAIN = "cloudflarestream.com";
export const DEFAULT_STREAM_CUSTOMER = "customer-pdxnd9di8ybc2kur.cloudflarestream.com";
export const DEFAULT_TRANSFORM_ZONE = DEFAULT_MEDIA_HOST;

export function hostnameEndsWith(url: string, domain: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

const ALLOWED_PREVIEW_HOSTS = [
  DEFAULT_MEDIA_HOST,
  DEFAULT_STREAM_DOMAIN,
  DEFAULT_TRANSFORM_ZONE,
  "cloudinary.com",
] as const;

export function sanitizeMediaPreviewUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (url.startsWith("blob:")) {
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return null;
    }

    const isAllowed = ALLOWED_PREVIEW_HOSTS.some((domain) => hostnameEndsWith(url, domain));

    return isAllowed ? url : null;
  } catch {
    return null;
  }
}

export type MediaSource = "stream" | "r2" | "cloudinary" | "external";

export function detectMediaSource(url: string): MediaSource {
  if (!url) return "external";
  if (hostnameEndsWith(url, DEFAULT_STREAM_DOMAIN)) return "stream";
  if (hostnameEndsWith(url, DEFAULT_MEDIA_HOST)) return "r2";
  if (hostnameEndsWith(url, "cloudinary.com")) return "cloudinary";
  return "external";
}

export function isStreamUrl(url: string): boolean {
  return hostnameEndsWith(url, DEFAULT_STREAM_DOMAIN);
}

export function isR2Url(url: string): boolean {
  return hostnameEndsWith(url, DEFAULT_MEDIA_HOST);
}

export function extractStreamUid(url: string): string | null {
  const match = url.match(/cloudflarestream\.com\/([a-f0-9]+)/i);
  return match?.[1] ?? null;
}

export interface StreamThumbnailOptions {
  time?: string;
  width?: number;
  height?: number;
  fit?: "crop" | "clip" | "scale" | "fill";
}

export function getStreamThumbnail(
  uid: string,
  options: StreamThumbnailOptions = {},
  customer = DEFAULT_STREAM_CUSTOMER,
): string {
  const params = new URLSearchParams();
  if (options.time) params.set("time", options.time);
  if (options.width) params.set("width", options.width.toString());
  if (options.height) params.set("height", options.height.toString());
  if (options.fit) params.set("fit", options.fit);

  const query = params.toString();
  return `https://${customer}/${uid}/thumbnails/thumbnail.jpg${query ? `?${query}` : ""}`;
}

export function buildStreamPosterSrcset(
  uid: string,
  widths: readonly number[],
  options: Omit<StreamThumbnailOptions, "width"> = { time: "1s", fit: "crop" },
  customer = DEFAULT_STREAM_CUSTOMER,
): string {
  return widths
    .map((width) => `${getStreamThumbnail(uid, { ...options, width }, customer)} ${width}w`)
    .join(", ");
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  quality?: number;
  format?: "auto" | "webp" | "avif" | "jpeg" | "png";
  blur?: number;
  sharpen?: number;
  gravity?: "auto" | "center" | "top" | "bottom" | "left" | "right";
  dpr?: number;
}

export function getTransformedImageUrl(
  originalUrl: string,
  options: ImageTransformOptions = {},
  zone = DEFAULT_TRANSFORM_ZONE,
): string {
  const opts: ImageTransformOptions = {
    format: "auto",
    quality: 85,
    fit: "cover",
    ...options,
  };

  const optionsArray: string[] = [];
  if (opts.width) optionsArray.push(`width=${opts.width}`);
  if (opts.height) optionsArray.push(`height=${opts.height}`);
  if (opts.fit) optionsArray.push(`fit=${opts.fit}`);
  if (opts.quality) optionsArray.push(`quality=${opts.quality}`);
  if (opts.format) optionsArray.push(`format=${opts.format}`);
  if (opts.blur) optionsArray.push(`blur=${opts.blur}`);
  if (opts.sharpen) optionsArray.push(`sharpen=${opts.sharpen}`);
  if (opts.gravity) optionsArray.push(`gravity=${opts.gravity}`);
  if (opts.dpr) optionsArray.push(`dpr=${opts.dpr}`);

  return `https://${zone}/cdn-cgi/image/${optionsArray.join(",")}/${originalUrl}`;
}

export function buildCfImageSrcset(
  originalUrl: string,
  widths: readonly number[],
  options: ImageTransformOptions = {},
  zone = DEFAULT_TRANSFORM_ZONE,
): string {
  return widths
    .map((width) => `${getTransformedImageUrl(originalUrl, { ...options, width }, zone)} ${width}w`)
    .join(", ");
}

export function getCfPictureSources(
  originalUrl: string,
  widths: readonly number[],
  options: Omit<ImageTransformOptions, "width" | "format"> = {},
  zone = DEFAULT_TRANSFORM_ZONE,
): Array<{ type: "image/avif" | "image/webp"; srcset: string }> {
  return [
    {
      type: "image/avif",
      srcset: buildCfImageSrcset(originalUrl, widths, { ...options, format: "avif" }, zone),
    },
    {
      type: "image/webp",
      srcset: buildCfImageSrcset(originalUrl, widths, { ...options, format: "webp" }, zone),
    },
  ];
}

export function cloudflareImageLoader({
  src,
  width,
  quality,
  zone = DEFAULT_TRANSFORM_ZONE,
}: {
  src: string;
  width: number;
  quality?: number;
  zone?: string;
}): string {
  if (!isR2Url(src)) {
    return src;
  }

  return getTransformedImageUrl(
    src,
    {
      width,
      quality: quality ?? 80,
      format: "auto",
      fit: "cover",
    },
    zone,
  );
}

export interface StreamVideoUrls {
  hls: string;
  dash: string;
  mp4?: string;
  thumbnail: string;
  animatedThumbnail: string;
  iframe: string;
}

export function getStreamVideoUrls(
  uid: string,
  customer = DEFAULT_STREAM_CUSTOMER,
): StreamVideoUrls {
  return {
    hls: `https://${customer}/${uid}/manifest/video.m3u8`,
    dash: `https://${customer}/${uid}/manifest/video.mpd`,
    thumbnail: `https://${customer}/${uid}/thumbnails/thumbnail.jpg`,
    animatedThumbnail: `https://${customer}/${uid}/thumbnails/thumbnail.gif`,
    iframe: `https://${customer}/${uid}/iframe`,
  };
}

export function parseAspectRatio(aspectRatio: string | number): {
  width: number;
  height: number;
  ratio: number;
} {
  let ratio = 16 / 9;
  let width = 16;
  let height = 9;

  if (typeof aspectRatio === "number") {
    ratio = aspectRatio;
    if (Math.abs(ratio - 16 / 9) < 0.01) {
      width = 16;
      height = 9;
    } else if (Math.abs(ratio - 4 / 3) < 0.01) {
      width = 4;
      height = 3;
    } else if (Math.abs(ratio - 1) < 0.01) {
      width = 1;
      height = 1;
    } else {
      width = Math.round(ratio * 100);
      height = 100;
    }
  } else if (typeof aspectRatio === "string") {
    const parts = aspectRatio.split("/");
    if (parts.length === 2) {
      const w = Number.parseFloat(parts[0] ?? "");
      const h = Number.parseFloat(parts[1] ?? "");
      if (!Number.isNaN(w) && !Number.isNaN(h) && h !== 0) {
        width = w;
        height = h;
        ratio = w / h;
      }
    }
  }

  return { width, height, ratio };
}
