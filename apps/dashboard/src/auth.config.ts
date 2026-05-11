import { env } from "@repo/config";
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

export const authConfig = {
  providers: [
    Discord({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      (session.user as { id?: string }).id = user.id;
      return session;
    },
  },
  session: { strategy: "database" },
} satisfies NextAuthConfig;
