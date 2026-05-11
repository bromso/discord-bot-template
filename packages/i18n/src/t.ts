import en from "./locales/en.js";
import sv from "./locales/sv.js";
import type { Key, Locale } from "./types.js";

const dicts = { en, sv } as const;

function lookup(obj: unknown, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in acc) return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj) as string | undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function t(locale: Locale, key: Key, vars?: Record<string, string | number>): string {
  const primary = lookup(dicts[locale] ?? dicts.en, key as string);
  const fallback = primary ?? lookup(dicts.en, key as string);
  if (typeof fallback !== "string") return key as string;
  return interpolate(fallback, vars);
}
