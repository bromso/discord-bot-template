import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@repo/config";
import * as schema from "./schema/index.js";

const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient, { schema, casing: "snake_case" });
export type DB = typeof db;
