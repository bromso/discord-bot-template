import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  locale: text("locale"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type User = typeof users.$inferSelect;
