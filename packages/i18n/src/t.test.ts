import { describe, expect, it } from "vitest";
import { t } from "./t.js";

describe("t()", () => {
  it("looks up nested keys", () => {
    expect(t("en", "settings.title")).toBe("Settings");
  });
  it("interpolates {var} placeholders", () => {
    expect(t("en", "ping.reply", { latency: 42 })).toBe("Pong! (42ms)");
  });
  it("returns the requested locale's value", () => {
    expect(t("sv", "settings.title")).toBe("Inställningar");
  });
  it("returns the key when missing in all locales", () => {
    expect(t("en", "does.not.exist" as never)).toBe("does.not.exist");
  });
});
