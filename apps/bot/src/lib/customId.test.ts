import { describe, expect, it } from "vitest";
import { buildCustomId, parseCustomId } from "./customId.js";

describe("customId", () => {
  it("builds module:action[:arg…]", () => {
    expect(buildCustomId("settings", "save")).toBe("settings:save");
    expect(buildCustomId("settings", "pick", "locale", "sv")).toBe("settings:pick:locale:sv");
  });
  it("parses back to {module, action, args}", () => {
    expect(parseCustomId("settings:pick:locale:sv")).toEqual({
      module: "settings", action: "pick", args: ["locale", "sv"],
    });
  });
  it("rejects missing module/action", () => {
    expect(() => parseCustomId("only-one")).toThrow();
  });
  it("escapes colons in args", () => {
    expect(buildCustomId("m", "a", "a:b")).toBe("m:a:a%3Ab");
    expect(parseCustomId("m:a:a%3Ab").args).toEqual(["a:b"]);
  });
});
