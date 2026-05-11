import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: "./src/test-utils.ts",
    hookTimeout: 30_000,
  },
});
