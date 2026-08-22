import {
  buildCfImageSrcset,
  buildStreamPosterSrcset,
  detectMediaSource,
  extractStreamUid,
  getCfPictureSources,
  getStreamThumbnail,
  getStreamVideoUrls,
  getTransformedImageUrl,
} from "@portfolio-stack/media";

import { IMAGE_PRESETS } from "../images/image-presets";

export const PROJECT_CARD_WIDTHS = IMAGE_PRESETS.projectCard.widths;
export const PROJECT_CARD_SIZES = IMAGE_PRESETS.projectCard.sizes;

export type ProjectPoster = {
  hlsSrc: string;
  posterSrc: string | null;
  nativePoster: string | null;
  srcset: string;
  sizes: string;
  sources: Array<{ type: "image/avif" | "image/webp"; srcset: string }>;
  kind: "stream" | "r2" | "image" | "none";
};

export type ProjectPosterEnv = { streamCustomer: string; transformZone: string };

export type ProjectPosterOptions = {
  sizes?: string;
};

export function projectMediaAssets(
  project: { src: string; poster: string | null; type: "video" | "gif" },
  env: ProjectPosterEnv,
  options: ProjectPosterOptions = {},
): ProjectPoster {
  const sizes = options.sizes ?? PROJECT_CARD_SIZES;
  const uid = extractStreamUid(project.src);
  if (uid) {
    const urls = getStreamVideoUrls(uid, env.streamCustomer);
    const generated = getStreamThumbnail(
      uid,
      { time: "1s", fit: "crop", width: 800 },
      env.streamCustomer,
    );
    return {
      hlsSrc: urls.hls,
      posterSrc: project.poster ?? generated,
      nativePoster: getStreamThumbnail(uid, { width: 800, fit: "crop" }, env.streamCustomer),
      srcset: buildStreamPosterSrcset(
        uid,
        PROJECT_CARD_WIDTHS,
        { time: "1s", fit: "crop" },
        env.streamCustomer,
      ),
      sizes,
      sources: [],
      kind: "stream",
    };
  }

  const imageUrl = project.type === "gif" ? project.src : project.poster;
  if (imageUrl && detectMediaSource(imageUrl) === "r2") {
    const transformed = getTransformedImageUrl(
      imageUrl,
      { width: 800, quality: IMAGE_PRESETS.projectCard.quality, fit: "cover" },
      env.transformZone,
    );
    return {
      hlsSrc: project.src,
      posterSrc: transformed,
      nativePoster: transformed,
      srcset: buildCfImageSrcset(
        imageUrl,
        PROJECT_CARD_WIDTHS,
        { quality: IMAGE_PRESETS.projectCard.quality, fit: "cover" },
        env.transformZone,
      ),
      sizes,
      sources: getCfPictureSources(
        imageUrl,
        PROJECT_CARD_WIDTHS,
        { quality: IMAGE_PRESETS.projectCard.quality, fit: "cover" },
        env.transformZone,
      ),
      kind: "r2",
    };
  }

  return {
    hlsSrc: project.src,
    posterSrc: imageUrl,
    nativePoster: imageUrl,
    srcset: "",
    sizes,
    sources: [],
    kind: imageUrl ? "image" : "none",
  };
}

function firstSrcsetUrl(srcset: string) {
  return srcset.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
}

export function projectPosterPreload(assets: ProjectPoster) {
  if (!assets.posterSrc) {
    return null;
  }

  const avif = assets.sources.find((source) => source.type === "image/avif");
  const avifHref = avif ? firstSrcsetUrl(avif.srcset) : "";

  return {
    href: avifHref || assets.posterSrc,
    type: (avifHref ? "image/avif" : "image/jpeg") as "image/avif" | "image/jpeg",
    imagesrcset: avif?.srcset || assets.srcset || assets.posterSrc,
    imagesizes: assets.sizes,
  };
}

export function posterDimensions(aspectRatio: string) {
  const [width, height] = aspectRatio.split("/").map((part) => Number(part.trim()));
  if (!width || !height) {
    return { width: 800, height: 600 };
  }

  return { width: 800, height: Math.round((800 * height) / width) };
}
