import type { BotClient } from "../client.js";

export type Job = {
  cron: string;
  shardZeroOnly?: boolean;
  run: (client: BotClient) => Promise<void> | void;
};
export function defineJob(j: Job): Job {
  return j;
}
