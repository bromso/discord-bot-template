import type {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  ContextMenuCommandBuilder,
} from "discord.js";
import type {
  AnyContextMenuInteraction,
  AutocompleteInteraction,
  ChatCmdInteraction,
  Ctx,
} from "./types.js";

export type ChatCommand = {
  kind: "chat";
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;
  execute: (i: ChatCmdInteraction, ctx: Ctx) => Promise<void>;
  autocomplete?: (i: AutocompleteInteraction, ctx: Ctx) => Promise<void>;
};
export type ContextMenuCommand = {
  kind: "context";
  data: ContextMenuCommandBuilder;
  execute: (i: AnyContextMenuInteraction, ctx: Ctx) => Promise<void>;
};
export type AnyCommand = ChatCommand | ContextMenuCommand;

export function defineCommand<T extends Omit<ChatCommand, "kind">>(cmd: T): ChatCommand;
export function defineCommand<T extends Omit<ContextMenuCommand, "kind">>(
  cmd: T & { contextMenu: true },
): ContextMenuCommand;
export function defineCommand(cmd: any): AnyCommand {
  return { kind: cmd.contextMenu ? "context" : "chat", ...cmd };
}
