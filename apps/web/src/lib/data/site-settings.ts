import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  type PublicSiteSettings,
  siteSettingsWriteSchema,
} from "@portfolio-stack/api/site-settings";

import { orpc } from "./orpc";
import { withPublicCache } from "./public-cache";
import { fetchPublicData } from "./public-request";

const SETTINGS_FETCH_MS = 500;
const defaults = siteSettingsWriteSchema.parse(DEFAULT_PUBLIC_SITE_SETTINGS);

function fetchPublicSiteSettings(): Promise<PublicSiteSettings> {
  return fetchPublicData("site-settings", SETTINGS_FETCH_MS, (signal) =>
    orpc.settings.getPublic(undefined, { signal }),
  );
}

export async function loadPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    return await withPublicCache("site-settings", fetchPublicSiteSettings);
  } catch {
    return defaults;
  }
}
