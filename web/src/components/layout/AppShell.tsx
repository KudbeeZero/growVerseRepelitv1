import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      {/* Extra bottom padding on mobile so content clears the fixed tab bar. */}
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
