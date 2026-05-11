import { spawnSync } from "node:child_process";
import postgres from "postgres";

export default async function globalSetup() {
  const url =
    process.env.DATABASE_URL_TEST ??
    "postgres://postgres:postgres@localhost:5432/bot_test_dashboard";

  const admin = postgres("postgres://postgres:postgres@localhost:5432/postgres");
  const exists = await admin`SELECT 1 FROM pg_database WHERE datname = 'bot_test_dashboard'`;
  if (exists.length === 0) await admin.unsafe("CREATE DATABASE bot_test_dashboard");
  await admin.end();

  // Apply schema to the dedicated dashboard test DB so it can't race with
  // packages/db's own tests (which use bot_test). drizzle-kit lives in @repo/db.
  const r = spawnSync("bun", ["x", "drizzle-kit", "push", "--force"], {
    cwd: new URL("../../../packages/db", import.meta.url).pathname,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  if (r.status !== 0) throw new Error("drizzle-kit push failed");
  process.env.DATABASE_URL = url;
}
