import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { DevModeBanner } from "./DevModeBanner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DevModeBanner />
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
