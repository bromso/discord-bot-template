import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    globalSetup: "./src/test-globalSetup.ts",
    setupFiles: ["./src/test-setup.ts"],
    hookTimeout: 30_000,
  },
  resolve: { alias: { "@": new URL("./src/", import.meta.url).pathname } },
});
