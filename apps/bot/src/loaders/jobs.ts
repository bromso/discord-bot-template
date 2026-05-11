import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "../lib/defineJob.js";

export async function loadJobs(): Promise<Array<{ name: string; job: Job }>> {
  const dir = fileURLToPath(new URL("../jobs/", import.meta.url));
  const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
  const jobs: Array<{ name: string; job: Job }> = [];
  for (const f of files) {
    const mod = (await import(join(dir, f))) as { default: Job };
    jobs.push({ name: basename(f, extname(f)), job: mod.default });
  }
  return jobs;
}
