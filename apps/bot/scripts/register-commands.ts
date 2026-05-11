import { REST, Routes } from "discord.js";
import { env } from "@repo/config";
import { createLogger } from "@repo/logger";
import { loadCommands } from "../src/loaders/commands.js";

const log = createLogger("bot:register");
const args = process.argv.slice(2);
const gIdx = args.findIndex((a) => a === "--guild");
const guildId = gIdx >= 0 ? args[gIdx + 1] : env.DEV_GUILD_ID;

const commands = await loadCommands();
const body = [...commands.values()].map((c) => c.data.toJSON());
const rest = new REST().setToken(env.DISCORD_TOKEN);

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId), { body });
  log.info({ count: body.length, guildId }, "registered (guild)");
} else {
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
  log.info({ count: body.length }, "registered (global)");
}
process.exit(0);
