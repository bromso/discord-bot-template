import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import type { Locale } from "@repo/i18n";

export interface Ctx {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export type ChatCmdInteraction = ChatInputCommandInteraction;
export type AnyContextMenuInteraction =
  | UserContextMenuCommandInteraction
  | MessageContextMenuCommandInteraction;
export type ComponentInteraction = MessageComponentInteraction | ModalSubmitInteraction;
export type { AutocompleteInteraction };
