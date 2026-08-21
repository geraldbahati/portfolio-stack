export const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/login",
  "/signup",
  "/dashboard",
  "/gbx",
  "/monitoring",
] as const;

export const PRIVATE_CACHE_CONTROL = "private, no-store";
export const PUBLIC_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=600";
export const PROJECT_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";
export const IMMUTABLE_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const IMMUTABLE_ASSET = /\.(?:avif|webp|png|jpe?g|gif|svg|woff2)$/i;

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isImmutableAsset(pathname: string): boolean {
  return pathname.startsWith("/_astro/") || IMMUTABLE_ASSET.test(pathname);
}

export function cacheControlForPath(pathname: string): string {
  if (isPrivatePath(pathname)) {
    return PRIVATE_CACHE_CONTROL;
  }
  if (isImmutableAsset(pathname)) {
    return IMMUTABLE_ASSET_CACHE_CONTROL;
  }
  if (
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/sitemap.xml"
  ) {
    return PROJECT_CACHE_CONTROL;
  }
  return PUBLIC_CACHE_CONTROL;
}
