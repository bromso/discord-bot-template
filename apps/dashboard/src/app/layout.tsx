import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Bot Dashboard" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-50 min-h-dvh">{children}</body>
    </html>
  );
}
