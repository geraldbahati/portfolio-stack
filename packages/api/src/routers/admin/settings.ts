import { getSiteSettings, saveSiteSettings } from "@portfolio-stack/db/site-settings";

import { adminProcedure } from "../../index";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  resolvePublicSiteSettings,
  siteSettingsWriteSchema,
} from "../../site-settings";

export const adminSettingsRouter = {
  get: adminProcedure.handler(async () => {
    const settings = await getSiteSettings();
    const values = resolvePublicSiteSettings(settings ?? DEFAULT_PUBLIC_SITE_SETTINGS);
    return {
      values,
      persisted: Boolean(settings),
      updatedAt: settings?.updatedAt?.toISOString() ?? null,
    };
  }),
  update: adminProcedure.input(siteSettingsWriteSchema).handler(async ({ input, context }) =>
    saveSiteSettings(
      {
        ...input,
        instagramUrl: input.instagramUrl || null,
        linkedinUrl: input.linkedinUrl || null,
        xUrl: input.xUrl || null,
        whatsappUrl: input.whatsappUrl || null,
        githubUrl: input.githubUrl || null,
      },
      context.session.user.email,
    ),
  ),
};
