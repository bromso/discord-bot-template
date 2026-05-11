import { defineJob } from "../lib/defineJob.js";
import { createLogger } from "@repo/logger";

const log = createLogger("bot:job:cleanup");

export default defineJob({
  cron: "0 4 * * *",
  shardZeroOnly: true,
  async run() {
    log.info("cleanup job ran (no-op)");
  },
});
