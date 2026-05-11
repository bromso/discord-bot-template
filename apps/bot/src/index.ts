import { env } from "@repo/config";
import { createLogger } from "@repo/logger";
import { createClient } from "./client.js";
import { registries } from "./events/interactionCreate.js";
import { handleError } from "./lib/errorHandler.js";
import { loadCommands } from "./loaders/commands.js";
import { loadComponents } from "./loaders/components.js";
import { loadEvents } from "./loaders/events.js";
import { loadJobs } from "./loaders/jobs.js";

const log = createLogger("bot:main");

async function main() {
  const client = createClient();
  registries.commands = await loadCommands();
  registries.components = await loadComponents();
  await loadEvents(client);
  registries.jobs = await loadJobs();
  process.on(
    "unhandledRejection",
    (err) => void handleError(err, { client, where: "unhandledRejection" }),
  );
  process.on(
    "uncaughtException",
    (err) => void handleError(err, { client, where: "uncaughtException" }),
  );
  await client.login(env.DISCORD_TOKEN);
  log.info("logged in");
}

void main();
