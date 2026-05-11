import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnyCommand } from "../lib/defineCommand.js";

export async function loadCommands(): Promise<Map<string, AnyCommand>> {
  const dir = fileURLToPath(new URL("../commands/", import.meta.url));
  const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
  const map = new Map<string, AnyCommand>();
  for (const f of files) {
    const mod = (await import(join(dir, f))) as { default: AnyCommand };
    map.set(mod.default.data.name, mod.default);
  }
  return map;
}
