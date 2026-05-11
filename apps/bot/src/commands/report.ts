import { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } from "discord.js";
import { defineCommand } from "../lib/defineCommand.js";

export default defineCommand({
  contextMenu: true,
  data: new ContextMenuCommandBuilder()
    .setName("Report message")
    .setType(ApplicationCommandType.Message),
  async execute(i) {
    if (!i.isMessageContextMenuCommand()) return;
    await i.reply({
      content: `Thanks — moderators have been notified about [this message](${i.targetMessage.url}).`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
