import { Client, GatewayIntentBits, Partials } from "discord.js";

export function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.GuildMember, Partials.Message],
  });
}
export type BotClient = ReturnType<typeof createClient>;
