/**
 * One-off generator for the static brand assets that live in `public/`:
 * the Open Graph card, the Apple touch icon, and the PWA icons.
 *
 * These are committed rather than built on every deploy — they change only
 * when the portrait or the wedge statement changes, and the SVG text below is
 * rasterised through fontconfig, which is not guaranteed on a CI runner.
 *
 *   bun apps/web/scripts/generate-brand-assets.ts
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(webRoot, "public");
const assets = join(webRoot, "src/assets/images");

const PRIMARY = "#d87943";
const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const PORTRAIT_WIDTH = 560;

function escapeXml(value: string) {
  return value.replace(/[<>&]/g, (char) =>
    char === "<" ? "&lt;" : char === ">" ? "&gt;" : "&amp;",
  );
}

async function buildOgCard() {
  // The source is a 1792x2400 portrait on a black field. Crop to the head and
  // upper torso at the card's portrait aspect so the face survives the
  // downscale, then let the already-black background carry the blend.
  const portrait = await sharp(join(assets, "hero-image.webp"))
    .extract({ left: 180, top: 100, width: 1422, height: 1600 })
    .resize(PORTRAIT_WIDTH, OG_HEIGHT, { fit: "cover" })
    .toBuffer();

  const headline = ["Edge-first e-commerce,", "M-Pesa payments,", "real-time systems."];

  const overlay =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <defs>
    <linearGradient id="blend" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="1"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="${OG_WIDTH - PORTRAIT_WIDTH}" y="0" width="220" height="${OG_HEIGHT}" fill="url(#blend)"/>
  <text x="72" y="132" font-family="${SANS}" font-size="21" font-weight="600"
        letter-spacing="6.5" fill="${PRIMARY}">GERALD BAHATI</text>
  ${headline
    .map(
      (line, index) =>
        `<text x="72" y="${232 + index * 70}" font-family="${SANS}" font-size="53" font-weight="600" fill="#ffffff">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
  <rect x="72" y="${232 + headline.length * 70 - 14}" width="64" height="3" fill="${PRIMARY}"/>
  <text x="72" y="${232 + headline.length * 70 + 46}" font-family="${SANS}" font-size="23" font-weight="400" fill="#a3a3a3">Full-stack software engineer, Nairobi</text>
  <text x="72" y="${OG_HEIGHT - 56}" font-family="${SANS}" font-size="22" font-weight="500" fill="#6f6f6f">www.geraldbahati.dev</text>
</svg>`);

  await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 3,
      background: "#000000",
    },
  })
    .composite([
      { input: portrait, left: OG_WIDTH - PORTRAIT_WIDTH, top: 0 },
      { input: overlay, left: 0, top: 0 },
    ])
    .jpeg({ quality: 86, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(join(publicDir, "og.jpg"));
}

async function buildIcons() {
  // The brand mark is a black glyph on transparency and these tiles are
  // black, so negate the colour channels to paint it white. `alpha: false`
  // leaves transparency untouched, which keeps the glyph's own edges instead
  // of filling the whole square.
  const glyph = await sharp(join(assets, "logo.webp")).negate({ alpha: false }).png().toBuffer();

  const tile = async (size: number, padding: number) =>
    sharp({
      create: { width: size, height: size, channels: 4, background: "#000000" },
    })
      .composite([
        {
          input: await sharp(glyph)
            .resize(size - padding * 2, size - padding * 2, {
              fit: "contain",
              background: "#00000000",
            })
            .png()
            .toBuffer(),
          left: padding,
          top: padding,
        },
      ])
      .png({ compressionLevel: 9 });

  await (await tile(180, 22)).toFile(join(publicDir, "apple-touch-icon.png"));
  await (await tile(192, 24)).toFile(join(publicDir, "icon-192.png"));
  await (await tile(512, 64)).toFile(join(publicDir, "icon-512.png"));
  // Maskable icons are cropped to a safe zone of 80% of the canvas.
  await (await tile(512, 108)).toFile(join(publicDir, "icon-512-maskable.png"));
}

await buildOgCard();
await buildIcons();
console.log(
  "wrote og.jpg, apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png",
);
