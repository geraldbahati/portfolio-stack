import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

import {
  buildPreload,
  buildSources,
  fitWidths,
  IMAGE_FORMATS,
  IMAGE_PRESETS,
  type ImageFormat,
  type ImagePresetName,
  type OptimizedImage,
} from "./src/lib/images/image-presets";

const PUBLIC_PREFIX = "/img/";

interface SiteImageSource {
  source: string;
  preset: ImagePresetName;
}

/**
 * Every local image the site renders is encoded here at build time.
 *
 * The Cloudflare adapter hardwires Astro's image service to `passthrough`
 * (workerd cannot run sharp), so `<Image>`/`getImage()` emit `/_image?w=...`
 * URLs that all return the untouched original. Anything routed through this
 * plugin instead gets real AVIF/WebP variants written to `/img` under a
 * content-hashed name, served straight from the static asset handler.
 */
export const SITE_IMAGE_SOURCES = {
  bio: { source: "src/assets/images/man-sitting.webp", preset: "bio" },
  logo: { source: "src/assets/images/logo.webp", preset: "logo" },
  overlay: { source: "src/assets/images/man-sitting.webp", preset: "overlay" },
  hero: { source: "src/assets/images/hero-image.webp", preset: "hero" },
  consultation: { source: "src/assets/images/consultation.webp", preset: "consultation" },
  serviceFrontend: { source: "src/assets/images/web-design.webp", preset: "service" },
  serviceBackend: { source: "src/assets/images/backend.webp", preset: "service" },
  serviceInfrastructure: { source: "src/assets/images/devops-engineer.webp", preset: "service" },
  serviceAi: { source: "src/assets/images/ai.webp", preset: "service" },
  serviceFrontendBackdrop: {
    source: "src/assets/images/web-design.webp",
    preset: "serviceBackdrop",
  },
  serviceBackendBackdrop: { source: "src/assets/images/backend.webp", preset: "serviceBackdrop" },
  serviceInfrastructureBackdrop: {
    source: "src/assets/images/devops-engineer.webp",
    preset: "serviceBackdrop",
  },
  serviceAiBackdrop: { source: "src/assets/images/ai.webp", preset: "serviceBackdrop" },
} as const satisfies Record<string, SiteImageSource>;

export type SiteImageName = keyof typeof SITE_IMAGE_SOURCES;

const SITE_IMAGE_NAMES = Object.keys(SITE_IMAGE_SOURCES) as SiteImageName[];

function avifQuality(webpQuality: number): number {
  return Math.max(30, webpQuality - 15);
}

function cacheName(parts: string[]): string {
  return createHash("sha1").update(parts.join(":")).digest("hex").slice(0, 16);
}

async function encodePreset(
  filePath: string,
  preset: ImagePresetName,
  outDir: string,
): Promise<OptimizedImage> {
  const spec = IMAGE_PRESETS[preset];
  const input = await readFile(filePath);
  const metadata = await sharp(input, { failOn: "none" }).rotate().metadata();
  const width = metadata.width ?? spec.widths[spec.widths.length - 1] ?? 1;
  const height = metadata.height ?? width;
  const mtime = String((await stat(filePath)).mtimeMs);
  const stem = basename(filePath, extname(filePath));
  const widths = fitWidths(spec.widths, width);

  await mkdir(outDir, { recursive: true });

  const encoded: Record<ImageFormat, Array<{ url: string; width: number }>> = {
    avif: [],
    webp: [],
  };
  const bytesByWidth: Record<ImageFormat, Map<number, number>> = {
    avif: new Map(),
    webp: new Map(),
  };

  for (const format of IMAGE_FORMATS) {
    // AVIF needs a lower quality number than WebP to land at comparable
    // perceived quality; matching them makes AVIF the larger file on noisy
    // photographs, which is the opposite of the point.
    const quality = format === "avif" ? avifQuality(spec.quality) : spec.quality;

    for (const targetWidth of widths) {
      const key = cacheName([
        filePath,
        mtime,
        preset,
        String(targetWidth),
        format,
        String(quality),
        "v4",
      ]);
      const fileName = `${stem}-${preset}-${targetWidth}.${key}.${format}`;
      const dest = join(outDir, fileName);
      let bytes: number;
      try {
        bytes = (await stat(dest)).size;
      } catch {
        const pipeline = sharp(input, { failOn: "none" })
          .rotate()
          .resize({ width: targetWidth, withoutEnlargement: true });
        const source =
          format === "avif"
            ? await pipeline.avif({ quality, effort: 4 }).toBuffer()
            : await pipeline.webp({ quality }).toBuffer();
        const tmp = `${dest}.${process.pid}.tmp`;
        await writeFile(tmp, source);
        await rename(tmp, dest);
        bytes = source.length;
      }

      bytesByWidth[format].set(targetWidth, bytes);
      encoded[format].push({
        url: `${PUBLIC_PREFIX}${fileName}`,
        width: targetWidth,
      });
    }
  }

  // `<picture>` takes the first source it can decode, so an AVIF that is
  // heavier than its WebP twin would be actively harmful. Drop the whole AVIF
  // set when it does not win, rather than leaving a ragged srcset.
  const avifWins = encoded.avif.every(({ width: w }) => {
    const avifBytes = bytesByWidth.avif.get(w) ?? Infinity;
    const webpBytes = bytesByWidth.webp.get(w) ?? 0;
    return avifBytes < webpBytes;
  });
  if (!avifWins) {
    encoded.avif = [];
  }

  const fallback = encoded.webp[encoded.webp.length - 1];
  if (!fallback) {
    throw new Error(`Failed to encode ${filePath} (${preset})`);
  }

  let lqip: string | undefined;
  if (spec.lqip) {
    const placeholder = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: 24 })
      .webp({ quality: 30 })
      .toBuffer();
    lqip = `data:image/webp;base64,${placeholder.toString("base64")}`;
  }

  return {
    src: fallback.url,
    srcset: encoded.webp.map(({ url, width: w }) => `${url} ${w}w`).join(", "),
    sizes: spec.sizes,
    width,
    height,
    sources: buildSources(encoded),
    preload: buildPreload(
      encoded.avif.length > 0 ? encoded.avif : encoded.webp,
      encoded.avif.length > 0 ? "image/avif" : "image/webp",
      spec.sizes,
    ),
    lqip,
  };
}

function generatedModule(images: Record<SiteImageName, OptimizedImage>): string {
  const exports = SITE_IMAGE_NAMES.map(
    (name) => `export const ${name}: OptimizedImage = ${JSON.stringify(images[name])};`,
  ).join("\n");

  return `import type { OptimizedImage } from "./image-presets";\n\n${exports}\n`;
}

export async function buildSiteImages(root: string, publicDir = join(root, "public")) {
  const outDir = join(publicDir, "img");
  const generatedPath = join(root, "src", "lib", "images", "site-images.generated.ts");
  const images = {} as Record<SiteImageName, OptimizedImage>;
  await Promise.all(
    SITE_IMAGE_NAMES.map(async (name) => {
      const { source, preset } = SITE_IMAGE_SOURCES[name];
      images[name] = await encodePreset(resolve(root, source), preset, outDir);
    }),
  );

  const contents = generatedModule(images);
  await mkdir(join(root, "src", "lib"), { recursive: true });
  const tmp = `${generatedPath}.${process.pid}.tmp`;
  await writeFile(tmp, contents);
  await rename(tmp, generatedPath);
}

export function siteImages(): Plugin {
  let root = process.cwd();
  let publicDir = join(root, "public");
  let generating: Promise<void> | undefined;

  const generateOnce = () => {
    generating ??= buildSiteImages(root, publicDir).finally(() => {
      generating = undefined;
    });
    return generating;
  };

  return {
    name: "site-images",
    enforce: "pre",
    config() {
      return {
        server: {
          watch: {
            ignored: ["**/public/img/**", "**/site-images.generated.ts"],
          },
        },
      };
    },
    async configResolved(config: ResolvedConfig) {
      root = config.root;
      publicDir = config.publicDir;
      await generateOnce();
    },
    configureServer(server: ViteDevServer) {
      for (const { source } of Object.values(SITE_IMAGE_SOURCES)) {
        void server.watcher.add(resolve(root, source));
      }

      server.watcher.on("change", (file) => {
        const touched = Object.values(SITE_IMAGE_SOURCES).some(
          ({ source }) => resolve(root, source) === file,
        );
        if (touched) {
          void generateOnce();
        }
      });
    },
  };
}
