// Single source of truth for primary navigation, shared by the desktop top bar
// (NavBar) and the mobile bottom tab bar (BottomNav) so the two can never drift.

export interface NavLink {
  href: string;
  label: string;
  /** Emoji glyph for the mobile tab bar; the desktop bar shows labels only. */
  icon: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Grow", icon: "🪴" },
  { href: "/lab", label: "Lab", icon: "🧪" },
  { href: "/market", label: "Market", icon: "🏪" },
  { href: "/cup", label: "Cup", icon: "🏆" },
  { href: "/university", label: "University", icon: "🎓" },
  { href: "/leaderboards", label: "Leaderboards", icon: "📊" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

// The four anchor destinations that earn a permanent slot in the mobile thumb
// zone; everything else lives behind the bar's "More" tab. Keeping this to four
// (+ More = five cells) is what makes the bar feel native rather than crowded.
export const PRIMARY_TAB_HREFS = ["/dashboard", "/lab", "/market", "/profile"] as const;

/** A route is "active" for a link if it is the page or lives beneath it. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
