import { updateGuildSettings } from "@repo/db";
import { defineComponent } from "../lib/defineComponent.js";

export default defineComponent({
  module: "settings",
  async execute(i, parts, ctx) {
    if (!i.guildId) return;
    const [action, target] = parts;
    if (action === "pick" && target === "locale" && i.isStringSelectMenu()) {
      const value = i.values[0];
      if (!value) return;
      await updateGuildSettings(i.guildId, { locale: value });
      await i.update({
        content: ctx.t("settings.localeChanged", { locale: value }),
        components: [],
      });
      return;
    }
    if (action === "clear" && target === "welcome" && i.isButton()) {
      await updateGuildSettings(i.guildId, { welcomeMessage: "" });
      await i.update({ content: "Welcome message cleared.", components: [] });
    }
  },
});
