import Link from "next/link";
import { env } from "@repo/config";
import { Button } from "@repo/ui/components/button";
import { requireUser } from "@/lib/guards";
import { listAdminGuilds } from "@/lib/discord";

export default async function GuildsPage() {
  const session = await requireUser();
  const guilds = await listAdminGuilds((session.user as { id: string }).id);
  return (
    <main>
      <h1 className="text-3xl font-semibold">Your servers</h1>
      <ul className="mt-8 grid gap-3">
        {guilds.map((g) => (
          <li key={g.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded bg-zinc-800" />
              <span className="font-medium">{g.name}</span>
            </div>
            {g.botPresent ? (
              <Button asChild size="sm"><Link href={`/guilds/${g.id}/settings`}>Manage</Link></Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <a href={`https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands&guild_id=${g.id}`}>
                  Invite bot
                </a>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
