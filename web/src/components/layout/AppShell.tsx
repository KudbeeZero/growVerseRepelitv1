import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { GrowGuide } from "@/components/onboarding/GrowGuide";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <GrowGuide />
    </div>
  );
}
