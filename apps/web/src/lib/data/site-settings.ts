import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  type PublicSiteSettings,
  siteSettingsWriteSchema,
} from "@portfolio-stack/api/site-settings";

import { orpc } from "./orpc";
import { withPublicCache } from "./public-cache";

const SETTINGS_FETCH_MS = 500;
const defaults = siteSettingsWriteSchema.parse(DEFAULT_PUBLIC_SITE_SETTINGS);

async function fetchPublicSiteSettings(): Promise<PublicSiteSettings> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      orpc.settings.getPublic(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("settings timeout")), SETTINGS_FETCH_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function loadPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    return await withPublicCache("site-settings", fetchPublicSiteSettings);
  } catch {
    return defaults;
  }
}
