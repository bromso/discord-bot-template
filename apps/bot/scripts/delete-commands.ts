import { env } from "@repo/config";
import { createLogger } from "@repo/logger";
import { REST, Routes } from "discord.js";

const log = createLogger("bot:unregister");
const args = process.argv.slice(2);
const gIdx = args.findIndex((a) => a === "--guild");
const guildId = gIdx >= 0 ? args[gIdx + 1] : env.DEV_GUILD_ID;

const rest = new REST().setToken(env.DISCORD_TOKEN);
if (guildId) {
  await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId), { body: [] });
  log.info({ guildId }, "cleared guild commands");
} else {
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
  log.info("cleared global commands");
}
process.exit(0);
