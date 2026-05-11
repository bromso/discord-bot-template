import { upsertGuild } from "@repo/db";
import { createLogger } from "@repo/logger";
import { Events } from "discord.js";
import { defineEvent } from "../lib/defineEvent.js";

const log = createLogger("bot:guildCreate");

export default defineEvent({
  name: Events.GuildCreate,
  async execute(_client, guild) {
    await upsertGuild(guild.id);
    log.info({ id: guild.id, name: guild.name }, "joined guild");
  },
});
