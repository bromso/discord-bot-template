import { Cron } from "croner";
import type { BotClient } from "../client.js";
import type { Job } from "./defineJob.js";
import { handleError } from "./errorHandler.js";
import { createLogger } from "@repo/logger";

const log = createLogger("bot:scheduler");

export function startScheduler(client: BotClient, jobs: Array<{ name: string; job: Job }>) {
  const shardId = client.shard?.ids[0] ?? 0;
  const handles: Cron[] = [];
  for (const { name, job } of jobs) {
    if ((job.shardZeroOnly ?? true) && shardId !== 0) {
      log.info({ name }, "skipping job (not shard 0)");
      continue;
    }
    const cron = new Cron(job.cron, async () => {
      try {
        await job.run(client);
        log.info({ name }, "job done");
      } catch (err) {
        await handleError(err, { client, where: `job:${name}` });
      }
    });
    handles.push(cron);
    log.info({ name, cron: job.cron, next: cron.nextRun()?.toISOString() }, "job scheduled");
  }
  return () => handles.forEach((h) => h.stop());
}
