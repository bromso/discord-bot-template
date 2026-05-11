import { describe, expect, it, vi } from "vitest";
import command from "./ping.js";

function stub() {
  return {
    client: { ws: { ping: 42 } },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("/ping", () => {
  it("registers as 'ping'", () => { expect(command.data.name).toBe("ping"); });
  it("replies with latency-rendered template", async () => {
    const i = stub();
    const ctx = { locale: "en" as const, t: (_: string, v?: any) => `Pong! (${v?.latency}ms)` };
    await (command as any).execute(i, ctx);
    expect(i.reply).toHaveBeenCalledWith({ content: "Pong! (42ms)", ephemeral: true });
  });
});
