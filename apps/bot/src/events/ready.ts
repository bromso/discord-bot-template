import { Events } from "discord.js";
import { createLogger } from "@repo/logger";
import { defineEvent } from "../lib/defineEvent.js";
import { startScheduler } from "../lib/scheduler.js";
import { registries } from "./interactionCreate.js";

const log = createLogger("bot:ready");

export default defineEvent({
  name: Events.ClientReady,
  once: true,
  execute(client, ready) {
    log.info({ tag: ready.user.tag, guilds: ready.guilds.cache.size }, "ready");
    startScheduler(client, registries.jobs);
  },
});
