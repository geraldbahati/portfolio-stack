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
export const PROJECT_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";
export const IMMUTABLE_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const IMMUTABLE_ASSET = /\.(?:avif|webp|png|jpe?g|gif|svg|woff2)$/i;

export const IMAGE_ENDPOINT = "/_image";

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Astro's image endpoint keys every variant on the content-hashed source plus
 * the width/quality it was asked for, so a `/_astro/` source makes the whole
 * URL content-addressed. Remote sources carry no such guarantee.
 */
export function isImmutableImageRequest(pathname: string, search?: string): boolean {
  if (pathname !== IMAGE_ENDPOINT) return false;
  const href = new URLSearchParams(search ?? "").get("href");
  return Boolean(href?.startsWith("/_astro/"));
}

export function isImmutableAsset(pathname: string, search?: string): boolean {
  return (
    pathname.startsWith("/_astro/") ||
    IMMUTABLE_ASSET.test(pathname) ||
    isImmutableImageRequest(pathname, search)
  );
}

export function cacheControlForPath(pathname: string, search?: string): string {
  if (isPrivatePath(pathname)) {
    return PRIVATE_CACHE_CONTROL;
  }
  if (isImmutableAsset(pathname, search)) {
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
