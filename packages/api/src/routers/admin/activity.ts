import { listAdminActivity } from "@portfolio-stack/db/admin/activity";

import { adminProcedure } from "../../index";
import { adminActivityListSchema } from "../../schemas/admin/activity";

export const adminActivityRouter = {
  list: adminProcedure
    .input(adminActivityListSchema)
    .handler(async ({ input }) => listAdminActivity(input)),
};
