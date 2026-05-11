import { ShardingManager } from "discord.js";
import { fileURLToPath } from "node:url";
import { env } from "@repo/config";
import { createLogger } from "@repo/logger";

const log = createLogger("bot:shard");
const file = fileURLToPath(new URL("./index.ts", import.meta.url));
const manager = new ShardingManager(file, {
  token: env.DISCORD_TOKEN,
  execArgv: ["--enable-source-maps"],
  mode: "process",
});
manager.on("shardCreate", (s) => log.info({ id: s.id }, "shard spawned"));
await manager.spawn();
