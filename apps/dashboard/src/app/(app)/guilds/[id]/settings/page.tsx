import { getGuild, upsertGuild } from "@repo/db";
import { Button } from "@repo/ui/components/button";
import { saveGuildSettings } from "@/actions/settings";
import { requireGuildAdmin } from "@/lib/guards";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireGuildAdmin(id);
  await upsertGuild(id);
  const g = await getGuild(id);

  return (
    <main>
      <h1 className="text-3xl font-semibold">Settings</h1>
      <form action={saveGuildSettings} className="mt-8 grid gap-4 max-w-lg">
        <input type="hidden" name="guildId" value={id} />
        <label className="grid gap-1">
          <span className="text-sm text-zinc-400">Locale</span>
          <select
            name="locale"
            defaultValue={g?.locale ?? "en"}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
          >
            <option value="en">English</option>
            <option value="sv">Svenska</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-zinc-400">Welcome message</span>
          <textarea
            name="welcomeMessage"
            defaultValue={g?.settings?.welcomeMessage ?? ""}
            rows={3}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
          />
        </label>
        <Button type="submit" className="justify-self-start">
          Save
        </Button>
      </form>
    </main>
  );
}
