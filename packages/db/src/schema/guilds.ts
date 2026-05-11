import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type GuildSettings = {
  welcomeMessage?: string;
  welcomeChannelId?: string;
};

export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(),
  locale: text("locale").notNull().default("en"),
  settings: jsonb("settings").$type<GuildSettings>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type Guild = typeof guilds.$inferSelect;
