import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile?.("../../.env");
} catch {
  // .env optional; rely on ambient process.env otherwise
}

export default defineConfig({
  schema: [
    "./src/schema/guilds.ts",
    "./src/schema/users.ts",
    "./src/schema/auth.ts",
  ],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",
});
