import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { guilds, type Guild, type GuildSettings } from "../schema/guilds.js";

export async function getGuild(id: string): Promise<Guild | undefined> {
  return db.query.guilds.findFirst({ where: eq(guilds.id, id) });
}

export async function upsertGuild(id: string): Promise<Guild> {
  const [row] = await db.insert(guilds).values({ id }).onConflictDoNothing().returning();
  return row ?? (await getGuild(id))!;
}

export async function updateGuildSettings(
  id: string,
  patch: Partial<GuildSettings> & { locale?: string },
): Promise<Guild> {
  const existing = await getGuild(id);
  const { locale, ...settingsPatch } = patch;
  const nextSettings: GuildSettings = { ...(existing?.settings ?? {}), ...settingsPatch };
  const rows = await db
    .update(guilds)
    .set({
      settings: nextSettings,
      ...(locale !== undefined ? { locale } : {}),
      updatedAt: new Date(),
    })
    .where(eq(guilds.id, id))
    .returning();
  if (!rows[0]) throw new Error(`guild ${id} not found`);
  return rows[0];
}
