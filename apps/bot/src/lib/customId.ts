export function buildCustomId(module: string, action: string, ...args: string[]): string {
  const safe = args.map((a) => a.replaceAll(":", "%3A"));
  return [module, action, ...safe].join(":");
}

export function parseCustomId(id: string): { module: string; action: string; args: string[] } {
  const parts = id.split(":");
  if (parts.length < 2) throw new Error(`invalid customId: ${id}`);
  const [module, action, ...rest] = parts as [string, string, ...string[]];
  return { module, action, args: rest.map((a) => a.replaceAll("%3A", ":")) };
}
