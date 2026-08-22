import { adminActivityRouter } from "./activity";
import { adminMediaRouter } from "./media";
import { adminMessagesRouter } from "./messages";
import { adminOverviewProcedure } from "./overview";
import { adminProjectsRouter } from "./projects";
import { adminSettingsRouter } from "./settings";

export const adminRouter = {
  overview: adminOverviewProcedure,
  activity: adminActivityRouter,
  settings: adminSettingsRouter,
  media: adminMediaRouter,
  messages: adminMessagesRouter,
  projects: adminProjectsRouter,
};
