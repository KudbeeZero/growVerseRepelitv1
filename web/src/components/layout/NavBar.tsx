"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { PlayerBadge } from "./PlayerBadge";
import { NAV_LINKS, isNavActive } from "./navLinks";

export function NavBar() {
  const pathname = usePathname();
  const { isAuthed } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-grow-300">
            <span className="text-xl">🌿</span>
            <span className="hidden sm:inline">GrowPod Empire</span>
          </Link>
          {isAuthed && (
            // Desktop only — on mobile the bottom tab bar (BottomNav) owns
            // navigation, so the wrapping link row is hidden to keep the header clean.
            <nav className="hidden flex-wrap items-center gap-1 sm:flex">
              {NAV_LINKS.map((l) => {
                const active = isNavActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-grow-700 text-white"
                        : "text-gray-300 hover:bg-ink-700 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <PlayerBadge />
      </div>
    </header>
  );
}
