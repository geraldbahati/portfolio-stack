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
} from "./src/lib/image-presets";

const PUBLIC_PREFIX = "/img/";

export const SITE_IMAGE_SOURCES = {
  bio: "src/assets/images/man-sitting.webp",
  logo: "src/assets/images/logo.webp",
  overlay: "src/assets/images/man-sitting.webp",
} as const satisfies Partial<Record<ImagePresetName, string>>;

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

  for (const format of IMAGE_FORMATS) {
    for (const targetWidth of widths) {
      const key = cacheName([
        filePath,
        mtime,
        preset,
        String(targetWidth),
        format,
        String(spec.quality),
        "v3",
      ]);
      const fileName = `${stem}-${preset}-${targetWidth}.${key}.${format}`;
      const dest = join(outDir, fileName);
      try {
        await stat(dest);
      } catch {
        const pipeline = sharp(input, { failOn: "none" })
          .rotate()
          .resize({ width: targetWidth, withoutEnlargement: true });
        const source =
          format === "avif"
            ? await pipeline.avif({ quality: spec.quality, effort: 4 }).toBuffer()
            : await pipeline.webp({ quality: spec.quality }).toBuffer();
        const tmp = `${dest}.${process.pid}.tmp`;
        await writeFile(tmp, source);
        await rename(tmp, dest);
      }

      encoded[format].push({
        url: `${PUBLIC_PREFIX}${fileName}`,
        width: targetWidth,
      });
    }
  }

  const fallback = encoded.webp[encoded.webp.length - 1];
  if (!fallback || encoded.avif.length === 0) {
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
    preload: buildPreload(encoded.avif, spec.sizes),
    lqip,
  };
}

function generatedModule(images: Record<keyof typeof SITE_IMAGE_SOURCES, OptimizedImage>): string {
  const exports = (Object.keys(SITE_IMAGE_SOURCES) as Array<keyof typeof SITE_IMAGE_SOURCES>)
    .map((name) => `export const ${name}: OptimizedImage = ${JSON.stringify(images[name])};`)
    .join("\n");

  return `import type { OptimizedImage } from "./image-presets";\n\n${exports}\n`;
}

export async function buildSiteImages(root: string, publicDir = join(root, "public")) {
  const outDir = join(publicDir, "img");
  const generatedPath = join(root, "src", "lib", "site-images.generated.ts");
  const images = {} as Record<keyof typeof SITE_IMAGE_SOURCES, OptimizedImage>;
  for (const preset of Object.keys(SITE_IMAGE_SOURCES) as Array<keyof typeof SITE_IMAGE_SOURCES>) {
    images[preset] = await encodePreset(resolve(root, SITE_IMAGE_SOURCES[preset]), preset, outDir);
  }

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
      for (const relative of Object.values(SITE_IMAGE_SOURCES)) {
        void server.watcher.add(resolve(root, relative));
      }

      server.watcher.on("change", (file) => {
        const touched = Object.values(SITE_IMAGE_SOURCES).some(
          (relative) => resolve(root, relative) === file,
        );
        if (touched) {
          void generateOnce();
        }
      });
    },
  };
}
