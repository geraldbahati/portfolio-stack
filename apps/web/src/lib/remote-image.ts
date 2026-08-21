import {
  detectMediaSource,
  getTransformedImageUrl,
  type ImageTransformOptions,
} from "@portfolio-stack/media";

import {
  buildPreload,
  buildSources,
  fitWidths,
  IMAGE_PRESETS,
  type ImagePreset,
  type OptimizedImage,
  srcsetFor,
} from "./image-presets";

export function r2OptimizedImage(
  url: string,
  preset: ImagePreset,
  intrinsic: { width: number; height: number },
  zone: string,
  options: { fit?: ImageTransformOptions["fit"] } = {},
): OptimizedImage | null {
  if (detectMediaSource(url) !== "r2") {
    return null;
  }

  const fit = options.fit ?? "scale-down";
  const widths = fitWidths(preset.widths, intrinsic.width);
  const avif = widths.map((width) => ({
    url: getTransformedImageUrl(url, { width, quality: preset.quality, format: "avif", fit }, zone),
    width,
  }));
  const webp = widths.map((width) => ({
    url: getTransformedImageUrl(url, { width, quality: preset.quality, format: "webp", fit }, zone),
    width,
  }));
  const fallback = webp[webp.length - 1];
  if (!fallback) {
    return null;
  }

  return {
    src: fallback.url,
    srcset: srcsetFor(webp),
    sizes: preset.sizes,
    width: intrinsic.width,
    height: intrinsic.height,
    sources: buildSources({ avif, webp }),
    preload: buildPreload(avif, preset.sizes),
  };
}

export function projectOgImage(url: string | null | undefined, zone: string) {
  if (!url || detectMediaSource(url) !== "r2") {
    return url ?? undefined;
  }

  return getTransformedImageUrl(
    url,
    {
      width: 1200,
      height: 630,
      fit: "cover",
      format: "jpeg",
      quality: 75,
    },
    zone,
  );
}

export const PROJECT_HERO_INTRINSIC = { width: 2400, height: 1021 };

export function projectHeroImage(url: string, zone: string) {
  return r2OptimizedImage(url, IMAGE_PRESETS.projectHero, PROJECT_HERO_INTRINSIC, zone, {
    fit: "cover",
  });
}
