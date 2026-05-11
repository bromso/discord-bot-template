"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateGuildSettings, upsertGuild } from "@repo/db";
import { requireGuildAdmin } from "@/lib/guards";

const Input = z.object({
  guildId: z.string().min(1),
  locale: z.enum(["en", "sv"]),
  welcomeMessage: z.string().max(500).default(""),
});

export async function saveGuildSettings(formData: FormData) {
  const parsed = Input.parse({
    guildId: formData.get("guildId"),
    locale: formData.get("locale"),
    welcomeMessage: formData.get("welcomeMessage") ?? "",
  });
  await requireGuildAdmin(parsed.guildId);
  await upsertGuild(parsed.guildId);
  await updateGuildSettings(parsed.guildId, {
    locale: parsed.locale,
    welcomeMessage: parsed.welcomeMessage,
  });
  revalidatePath(`/guilds/${parsed.guildId}/settings`);
}
