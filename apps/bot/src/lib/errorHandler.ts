import { env } from "@repo/config";
import { createLogger } from "@repo/logger";
import { type Client, EmbedBuilder, type TextChannel } from "discord.js";

const log = createLogger("bot:error");
const recent = new Map<string, number>();
const COOLDOWN_MS = 10_000;

function fingerprint(err: unknown): string {
  if (err instanceof Error) return `${err.name}:${err.message}`.slice(0, 200);
  return String(err).slice(0, 200);
}

export async function handleError(
  err: unknown,
  ctx: { client?: Client; guildId?: string | null; userId?: string; where?: string } = {},
) {
  log.error({ err, ...ctx }, "handled error");
  const fp = fingerprint(err);
  const now = Date.now();
  const last = recent.get(fp) ?? 0;
  if (env.ERROR_CHANNEL_ID && ctx.client && now - last > COOLDOWN_MS) {
    recent.set(fp, now);
    try {
      const ch = (await ctx.client.channels.fetch(env.ERROR_CHANNEL_ID)) as TextChannel | null;
      if (ch?.isTextBased()) {
        const e = new EmbedBuilder()
          .setTitle("Bot error")
          .setColor(0xff5555)
          .setDescription(
            "```" + String(err instanceof Error ? err.stack : err).slice(0, 1800) + "```",
          )
          .addFields(
            { name: "Where", value: ctx.where ?? "unknown", inline: true },
            { name: "Guild", value: ctx.guildId ?? "—", inline: true },
            { name: "User", value: ctx.userId ?? "—", inline: true },
          );
        await ch.send({ embeds: [e] });
      }
    } catch (postErr) {
      log.error({ err: postErr }, "failed to post error embed");
    }
  }
  if (env.SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/node" as any).catch(() => null);
      Sentry?.captureException?.(err);
    } catch {
      /* Sentry optional */
    }
  }
}
