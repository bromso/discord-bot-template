import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../lib/defineCommand.js";

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with bot latency.")
    .setNameLocalizations({ "sv-SE": "ping" })
    .setDescriptionLocalizations({ "sv-SE": "Svarar med botens latens." }),
  async execute(i, ctx) {
    const latency = i.client.ws.ping;
    await i.reply({ content: ctx.t("ping.reply", { latency }), flags: MessageFlags.Ephemeral });
  },
});
