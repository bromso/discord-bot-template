import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";

const MANAGE_GUILD = 0x20n;

export type GuildSummary = {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
  canManage: boolean;
};

async function getDiscordToken(userId: string): Promise<string | null> {
  const row = await db.query.accounts.findFirst({
    where: eq(schema.accounts.userId, userId),
  });
  return row?.access_token ?? null;
}

export async function listAdminGuilds(userId: string): Promise<GuildSummary[]> {
  const token = await getDiscordToken(userId);
  if (!token) return [];
  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as Array<{
    id: string; name: string; icon: string | null; permissions: string;
  }>;
  const present = new Set(
    (await db.select({ id: schema.guilds.id }).from(schema.guilds)).map((g) => g.id),
  );
  return raw
    .filter((g) => (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD)
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      botPresent: present.has(g.id),
      canManage: true,
    }));
}
