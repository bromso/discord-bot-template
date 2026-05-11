import type en from "./locales/en.js";

export type Dict = typeof en;
export type Locale = "en" | "sv";

type Leaves<T> = T extends object
  ? { [K in keyof T & string]: `${K}` | `${K}.${Leaves<T[K]>}` }[keyof T & string]
  : never;
export type Key = Leaves<Dict>;
