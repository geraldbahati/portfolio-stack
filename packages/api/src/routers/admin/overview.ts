import { getAdminOverview } from "@portfolio-stack/db/admin";

import { adminProcedure } from "../../index";

export const adminOverviewProcedure = adminProcedure.handler(async () => getAdminOverview());
