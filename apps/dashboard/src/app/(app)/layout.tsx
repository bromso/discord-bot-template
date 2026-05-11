import type { ReactNode } from "react";
import { requireUser } from "@/lib/guards";
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>;
}
