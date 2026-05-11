import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../client.js";
import { guilds } from "../schema/guilds.js";
import { getGuild, updateGuildSettings, upsertGuild } from "./guilds.js";

describe("guild queries", () => {
  beforeEach(async () => {
    await db.delete(guilds);
  });

  it("upserts and reads a guild", async () => {
    const row = await upsertGuild("123");
    expect(row.id).toBe("123");
    expect(row.locale).toBe("en");
    expect(row.settings).toEqual({});
    expect(await getGuild("123")).toMatchObject({ id: "123" });
  });

  it("updates settings without losing existing keys", async () => {
    await upsertGuild("456");
    await updateGuildSettings("456", { welcomeMessage: "hello" });
    await updateGuildSettings("456", { welcomeChannelId: "789" });
    const row = await getGuild("456");
    expect(row?.settings).toEqual({ welcomeMessage: "hello", welcomeChannelId: "789" });
  });

  it("updates locale separately", async () => {
    await upsertGuild("789");
    const row = await updateGuildSettings("789", { locale: "sv" });
    expect(row.locale).toBe("sv");
  });
});
