"use client";

// Native-feeling mobile bottom tab bar. Lives in the thumb zone, safe-area
// aware, and replaces the wrapping top-bar link row on small screens. Four
// anchor tabs plus a "More" sheet for secondary destinations. Hidden on
// desktop (sm+), where the top NavBar owns navigation. Authed players only.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { NAV_LINKS, PRIMARY_TAB_HREFS, isNavActive, type NavLink } from "./navLinks";

const PRIMARY: NavLink[] = PRIMARY_TAB_HREFS.map(
  (href) => NAV_LINKS.find((l) => l.href === href)!,
);
const MORE: NavLink[] = NAV_LINKS.filter(
  (l) => !PRIMARY_TAB_HREFS.includes(l.href as (typeof PRIMARY_TAB_HREFS)[number]),
);

// Sit the bar (and the popover above it) clear of the home indicator.
const BAR_SAFE: React.CSSProperties = {
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};
const MORE_SHEET_OFFSET: React.CSSProperties = {
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
};

function cellClass(active: boolean): string {
  return `flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
    active ? "text-grow-300" : "text-gray-400 hover:text-gray-200"
  }`;
}

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthed } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const close = useCallback(() => setMoreOpen(false), []);

  // Close the More sheet on Escape and whenever the route changes.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!isAuthed) return null;

  const moreActive = MORE.some((l) => isNavActive(pathname, l.href));

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          />
          <div
            role="menu"
            aria-label="More destinations"
            style={MORE_SHEET_OFFSET}
            className="animate-fade-up fixed right-3 z-50 w-48 overflow-hidden rounded-xl border border-ink-700 bg-ink-800 shadow-glow-soft sm:hidden"
          >
            {MORE.map((l) => {
              const active = isNavActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    active ? "bg-grow-700 text-white" : "text-gray-200 hover:bg-ink-700"
                  }`}
                >
                  <span aria-hidden className="text-base">
                    {l.icon}
                  </span>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <nav
        aria-label="Primary"
        style={BAR_SAFE}
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-ink-700 bg-ink-900/95 backdrop-blur sm:hidden"
      >
        {PRIMARY.map((l) => {
          const active = isNavActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cellClass(active)}
            >
              <span aria-hidden className="text-lg leading-none">
                {l.icon}
              </span>
              {l.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((s) => !s)}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          aria-label="More destinations"
          className={cellClass(moreActive || moreOpen)}
        >
          <span aria-hidden className="text-lg leading-none">
            ⋯
          </span>
          More
        </button>
      </nav>
    </>
  );
}
