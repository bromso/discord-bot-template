import { getGuild, updateGuildSettings, upsertGuild } from "@repo/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { buildCustomId } from "../lib/customId.js";
import { defineCommand } from "../lib/defineCommand.js";

const LOCALES = [
  { name: "English", value: "en" },
  { name: "Svenska", value: "sv" },
];

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure the bot for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((s) => s.setName("show").setDescription("Show current settings"))
    .addSubcommand((s) =>
      s
        .setName("locale")
        .setDescription("Set the server locale")
        .addStringOption((o) =>
          o.setName("value").setDescription("Locale").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("welcome")
        .setDescription("Set the welcome message")
        .addStringOption((o) =>
          o.setName("message").setDescription("Welcome text").setRequired(true),
        ),
    ),

  async execute(i, ctx) {
    if (!i.guildId) return;
    await upsertGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === "show") {
      const g = await getGuild(i.guildId);
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildCustomId("settings", "pick", "locale"))
          .setPlaceholder(`Locale: ${g?.locale ?? "en"}`)
          .addOptions(LOCALES.map((l) => ({ label: l.name, value: l.value }))),
      );
      const btns = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(buildCustomId("settings", "clear", "welcome"))
          .setLabel("Clear welcome message")
          .setStyle(ButtonStyle.Secondary),
      );
      await i.reply({
        flags: MessageFlags.Ephemeral,
        content: [
          `**${ctx.t("settings.title")}**`,
          `Locale: \`${g?.locale ?? "en"}\``,
          `Welcome: ${g?.settings?.welcomeMessage ? `\`${g.settings.welcomeMessage}\`` : "_(unset)_"}`,
        ].join("\n"),
        components: [row, btns],
      });
      return;
    }
    if (sub === "locale") {
      const value = i.options.getString("value", true);
      await updateGuildSettings(i.guildId, { locale: value });
      await i.reply({
        content: ctx.t("settings.localeChanged", { locale: value }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "welcome") {
      const message = i.options.getString("message", true);
      await updateGuildSettings(i.guildId, { welcomeMessage: message });
      await i.reply({ content: ctx.t("settings.welcomeUpdated"), flags: MessageFlags.Ephemeral });
    }
  },

  async autocomplete(i) {
    const focused = i.options.getFocused();
    const filtered = LOCALES.filter((l) =>
      l.name.toLowerCase().includes(focused.toLowerCase()),
    ).slice(0, 25);
    await i.respond(filtered);
  },
});
