export const HERO_NAME = "Gerald Bahati";
export const HERO_TITLE_LEFT = "Product";
export const HERO_TITLE_RIGHT = "Software Engineer";
export const HERO_DESCRIPTION =
  "Building edge-first e-commerce and real-time systems with multi-layer caching, AI recommendations, and M-Pesa payment integrations.";
export const HERO_CTA = "Request a project";

export const BIO_TAGLINE = "Shipping Production Impact";
export const BIO_NUMBER = "(01)";
export const BIO_BODY =
  "Gerald Bahati is a full-stack software engineer based in Nairobi, Kenya, building fast web products, e-commerce platforms, and real-time systems with React, Next.js, TypeScript, Go, and Java.";
export const BIO_CTA = "View Selected Work";

export function splitWords(text: string) {
  const words = text.split(" ");
  const offsets = words.map((_, index) =>
    words.slice(0, index).reduce((total, word) => total + word.length + 1, 0),
  );

  return { words, offsets, charCount: text.length };
}
