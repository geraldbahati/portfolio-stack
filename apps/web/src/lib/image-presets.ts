export const IMAGE_FORMATS = ["avif", "webp"] as const;

export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export interface ImagePreset {
  widths: readonly number[];
  quality: number;
  sizes: string;
  lqip?: boolean;
}

export interface PictureSource {
  type: `image/${ImageFormat}`;
  srcset: string;
}

export interface ImagePreload {
  href: string;
  type: `image/${ImageFormat}` | "image/jpeg";
  imagesrcset: string;
  imagesizes: string;
}

export interface OptimizedImage {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  sources: PictureSource[];
  preload: ImagePreload;
  lqip?: string;
}

export const IMAGE_PRESETS = {
  hero: {
    widths: [640, 960, 1280, 1792],
    quality: 60,
    sizes: "100vw",
    lqip: true,
  },
  bio: {
    widths: [282, 564],
    quality: 75,
    sizes: "(max-width: 1023px) min(282px, 100vw), 210px",
  },
  logo: {
    widths: [80, 160],
    quality: 80,
    sizes: "(max-width: 640px) 48px, (max-width: 1024px) 56px, (max-width: 1280px) 64px, 80px",
  },
  overlay: {
    widths: [400, 640, 800],
    quality: 70,
    sizes: "(max-width: 640px) 256px, (max-width: 1024px) 320px, min(500px, 40vw)",
  },
  service: {
    widths: [400, 600, 900],
    quality: 80,
    sizes: "(max-width: 1023px) min(90vw, 500px), 600px",
  },
  projectCard: {
    widths: [400, 540, 800, 1080],
    quality: 75,
    sizes: "(max-width: 767px) 90vw, (max-width: 1023px) 500px, (max-width: 1600px) 540px, 666px",
  },
  projectIndex: {
    widths: [400, 540, 800, 1080],
    quality: 75,
    sizes: "(max-width: 1023px) 92vw, 640px",
  },
  consultation: {
    widths: [420, 540, 1080],
    quality: 75,
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 540px",
  },
  projectHero: {
    widths: [960, 1280, 1600, 1920],
    quality: 70,
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px",
  },
  projectGallery: {
    widths: [640, 960, 1400],
    quality: 75,
    sizes: "(max-width: 1023px) calc(100vw - 2rem), 552px",
  },
  projectAvatar: {
    widths: [128, 160, 320],
    quality: 80,
    sizes: "(max-width: 768px) 128px, 160px",
  },
} as const satisfies Record<string, ImagePreset>;

export type ImagePresetName = keyof typeof IMAGE_PRESETS;

export function mimeType(format: ImageFormat): `image/${ImageFormat}` {
  return `image/${format}`;
}

export function fitWidths(requested: readonly number[], intrinsicWidth: number): number[] {
  const fitted = [...new Set(requested.map((width) => Math.min(width, intrinsicWidth)))];
  fitted.sort((a, b) => a - b);
  return fitted;
}

export function srcsetFor(urls: ReadonlyArray<{ url: string; width: number }>): string {
  return urls.map(({ url, width }) => `${url} ${width}w`).join(", ");
}

export function buildSources(
  byFormat: Record<ImageFormat, ReadonlyArray<{ url: string; width: number }>>,
): PictureSource[] {
  return IMAGE_FORMATS.map((format) => ({
    type: mimeType(format),
    srcset: srcsetFor(byFormat[format]),
  }));
}

export function buildPreload(
  avif: ReadonlyArray<{ url: string; width: number }>,
  sizes: string,
): ImagePreload {
  const largest = avif[avif.length - 1];
  if (!largest) {
    throw new Error("preload requires at least one AVIF variant");
  }

  return {
    href: largest.url,
    type: "image/avif",
    imagesrcset: srcsetFor(avif),
    imagesizes: sizes,
  };
}
