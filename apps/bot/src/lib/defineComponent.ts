import type { ComponentInteraction, Ctx } from "./types.js";

export type ComponentHandler = {
  module: string;
  execute: (i: ComponentInteraction, parts: string[], ctx: Ctx) => Promise<void>;
};
export function defineComponent(c: ComponentHandler): ComponentHandler {
  return c;
}
