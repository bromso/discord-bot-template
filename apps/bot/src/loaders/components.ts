import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ComponentHandler } from "../lib/defineComponent.js";

export async function loadComponents(): Promise<Map<string, ComponentHandler>> {
  const dir = fileURLToPath(new URL("../components/", import.meta.url));
  const files = (await readdir(dir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".test.ts"));
  const map = new Map<string, ComponentHandler>();
  for (const f of files) {
    const mod = (await import(join(dir, f))) as { default: ComponentHandler };
    map.set(mod.default.module, mod.default);
  }
  return map;
}
