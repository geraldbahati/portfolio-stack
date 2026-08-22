import { eq } from "drizzle-orm";

import { createDb } from "./index";
import { auditLog } from "./schema/audit";
import { siteSettings } from "./schema/site-settings";

const SITE_SETTINGS_ID = "primary";
type Database = ReturnType<typeof createDb>;

export type SiteSettingsWriteInput = Omit<typeof siteSettings.$inferInsert, "id" | "updatedAt">;

export async function getSiteSettings(db: Database = createDb()) {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_SETTINGS_ID))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveSiteSettings(
  input: SiteSettingsWriteInput,
  actorEmail: string,
  db: Database = createDb(),
) {
  const current = await getSiteSettings(db);
  const changedFields = Object.entries(input)
    .filter(([key, value]) => current?.[key as keyof SiteSettingsWriteInput] !== value)
    .map(([key]) => key);
  if (changedFields.length === 0) return { changedFields, updatedAt: current?.updatedAt ?? null };

  const now = new Date();
  await db.batch([
    db
      .insert(siteSettings)
      .values({ id: SITE_SETTINGS_ID, ...input, updatedAt: now })
      .onConflictDoUpdate({
        target: siteSettings.id,
        set: { ...input, updatedAt: now },
      }),
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorEmail,
      action: "settings.update",
      entityType: "site-settings",
      entityId: SITE_SETTINGS_ID,
      metadata: { changedFields },
      createdAt: now,
    }),
  ]);
  return { changedFields, updatedAt: now };
}
