import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listAdminGuilds } from "./discord.js";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireGuildAdmin(guildId: string) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const guilds = await listAdminGuilds(userId);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild?.canManage) redirect("/guilds");
  return { session, guild };
}
