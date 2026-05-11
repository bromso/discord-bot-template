import { Events } from "discord.js";
import { createLogger } from "@repo/logger";
import { defineEvent } from "../lib/defineEvent.js";

const log = createLogger("bot:ready");

export default defineEvent({
  name: Events.ClientReady,
  once: true,
  execute(_client, ready) {
    log.info({ tag: ready.user.tag, guilds: ready.guilds.cache.size }, "ready");
  },
});
