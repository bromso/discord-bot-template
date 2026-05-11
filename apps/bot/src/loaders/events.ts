import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BotClient } from "../client.js";
import type { EventDef } from "../lib/defineEvent.js";
import { handleError } from "../lib/errorHandler.js";

export async function loadEvents(client: BotClient): Promise<void> {
  const dir = fileURLToPath(new URL("../events/", import.meta.url));
  const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
  for (const f of files) {
    const mod = (await import(join(dir, f))) as { default: EventDef };
    const handler = async (...args: unknown[]) => {
      try { await mod.default.execute(client, ...(args as never)); }
      catch (err) { await handleError(err, { client, where: `event:${String(mod.default.name)}` }); }
    };
    if (mod.default.once) client.once(mod.default.name, handler);
    else client.on(mod.default.name, handler);
  }
}
