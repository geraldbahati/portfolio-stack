export const ADMIN_MEDIA_FOLDERS = ["projects", "gallery", "portraits", "uploads"] as const;
export type AdminMediaFolder = (typeof ADMIN_MEDIA_FOLDERS)[number];

export const ADMIN_IMAGE_TYPES = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AdminImageType = keyof typeof ADMIN_IMAGE_TYPES;
export const ADMIN_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export function isAdminMediaFolder(value: string): value is AdminMediaFolder {
  return ADMIN_MEDIA_FOLDERS.some((folder) => folder === value);
}

export function isAdminImageType(value: string): value is AdminImageType {
  return Object.hasOwn(ADMIN_IMAGE_TYPES, value);
}

function fileStem(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "image";
}

export function createAdminMediaKey(input: {
  folder: AdminMediaFolder;
  fileName: string;
  contentType: AdminImageType;
  id?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const suffix = (input.id ?? crypto.randomUUID()).replaceAll("-", "").slice(0, 12);
  const extension = ADMIN_IMAGE_TYPES[input.contentType];
  return `${input.folder}/${year}/${month}/${fileStem(input.fileName)}-${suffix}.${extension}`;
}

export function isSafeAdminMediaKey(value: string) {
  const hasControlCharacter = [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!value || value.length > 512 || value.startsWith("/") || hasControlCharacter) {
    return false;
  }
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function publicMediaUrl(origin: string, key: string) {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return new URL(encodedKey, base).toString();
}
