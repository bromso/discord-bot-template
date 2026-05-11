import { Events, MessageFlags } from "discord.js";
import { type Locale, t } from "@repo/i18n";
import { getGuild } from "@repo/db";
import { defineEvent } from "../lib/defineEvent.js";
import { handleError } from "../lib/errorHandler.js";
import { parseCustomId } from "../lib/customId.js";
import type { AnyCommand } from "../lib/defineCommand.js";
import type { ComponentHandler } from "../lib/defineComponent.js";

export const registries = {
  commands: new Map<string, AnyCommand>(),
  components: new Map<string, ComponentHandler>(),
};

async function resolveLocale(guildId: string | null, fallback: string): Promise<Locale> {
  if (!guildId) return (fallback as Locale) ?? "en";
  const g = await getGuild(guildId);
  return ((g?.locale ?? fallback) as Locale) ?? "en";
}

export default defineEvent({
  name: Events.InteractionCreate,
  async execute(client, i) {
    const locale = await resolveLocale(i.guildId, i.locale);
    const ctx = {
      locale,
      t: (k: string, v?: Record<string, string | number>) => t(locale, k as never, v),
    };
    try {
      if (i.isAutocomplete()) {
        const cmd = registries.commands.get(i.commandName);
        if (cmd?.kind === "chat" && cmd.autocomplete) await cmd.autocomplete(i, ctx);
        return;
      }
      if (i.isChatInputCommand() || i.isContextMenuCommand()) {
        const cmd = registries.commands.get(i.commandName);
        if (!cmd) return;
        await cmd.execute(i as never, ctx);
        return;
      }
      if (i.isMessageComponent() || i.isModalSubmit()) {
        const { module, action, args } = parseCustomId(i.customId);
        const handler = registries.components.get(module);
        if (!handler) return;
        await handler.execute(i, [action, ...args], ctx);
      }
    } catch (err) {
      await handleError(err, {
        client,
        guildId: i.guildId,
        userId: i.user?.id,
        where: `interaction:${i.type}`,
      });
      if (i.isRepliable() && !i.replied && !i.deferred) {
        await i.reply({ content: ctx.t("errors.unknown"), flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
});
