import { vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guards", () => ({
  requireUser: async () => ({ user: { id: "test-user" } }),
  requireGuildAdmin: async (id: string) => ({
    session: { user: { id: "test-user" } },
    guild: { id, name: "T", icon: null, botPresent: true, canManage: true },
  }),
}));
