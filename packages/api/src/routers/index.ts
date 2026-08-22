import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { adminRouter } from "./admin/index";
import { contactRouter } from "./contact";
import { projectsRouter } from "./projects";
import { settingsRouter } from "./settings";
import { streamRouter } from "./stream";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  stream: streamRouter,
  projects: projectsRouter,
  settings: settingsRouter,
  contact: contactRouter,
  admin: adminRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
