import { db, guilds } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";
import { saveGuildSettings } from "./settings.js";

describe("saveGuildSettings", () => {
  beforeEach(async () => {
    await db.delete(guilds);
  });

  it("persists locale and welcome message", async () => {
    const fd = new FormData();
    fd.set("guildId", "g1");
    fd.set("locale", "sv");
    fd.set("welcomeMessage", "Welcome friend");
    await saveGuildSettings(fd);
    const row = await db.query.guilds.findFirst({ where: (g, { eq }) => eq(g.id, "g1") });
    expect(row?.locale).toBe("sv");
    expect(row?.settings).toMatchObject({ welcomeMessage: "Welcome friend" });
  });

  it("rejects invalid locale via Zod", async () => {
    const fd = new FormData();
    fd.set("guildId", "g2");
    fd.set("locale", "fr");
    fd.set("welcomeMessage", "x");
    await expect(saveGuildSettings(fd)).rejects.toThrow();
  });
});
