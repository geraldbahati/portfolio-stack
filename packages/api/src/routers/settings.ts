import { getSiteSettings } from "@portfolio-stack/db/site-settings";

import { publicProcedure } from "../index";
import { resolvePublicSiteSettings } from "../site-settings";

export const settingsRouter = {
  getPublic: publicProcedure.handler(async () =>
    resolvePublicSiteSettings(await getSiteSettings()),
  ),
};
