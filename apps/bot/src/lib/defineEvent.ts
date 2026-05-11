import type { ClientEvents } from "discord.js";
import type { BotClient } from "../client.js";

export type EventDef<K extends keyof ClientEvents = keyof ClientEvents> = {
  name: K;
  once?: boolean;
  execute: (client: BotClient, ...args: ClientEvents[K]) => Promise<void> | void;
};
export function defineEvent<K extends keyof ClientEvents>(e: EventDef<K>): EventDef<K> {
  return e;
}
