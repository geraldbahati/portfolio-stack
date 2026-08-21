import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { contactRouter } from "./contact";
import { projectsRouter } from "./projects";
import { streamRouter } from "./stream";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  stream: streamRouter,
  projects: projectsRouter,
  contact: contactRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
