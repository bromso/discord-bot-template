import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
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
export type ComponentInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;
export type { AutocompleteInteraction };
