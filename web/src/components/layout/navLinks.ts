/**
 * Single source of truth for the app's primary navigation.
 *
 * Consumed by both the desktop header (`NavBar`, shown ≥ lg) and the mobile
 * bottom tab bar (`MobileTabBar`, shown < lg). Keeping one list means the two
 * surfaces can never drift out of sync.
 *
 * `primary: true` links earn a slot in the mobile bottom bar (thumb-reach,
 * ≤ 4 + a "More" sheet — the native-app convention). The rest live behind
 * "More" on mobile but stay first-class on desktop.
 */
export type NavLink = {
  href: string;
  label: string;
  /** Emoji glyph — matches the codebase's dependency-free, CSP-safe icon voice. */
  icon: string;
  /** Surfaced in the mobile bottom tab bar (vs. tucked into the "More" sheet). */
  primary?: boolean;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Grow", icon: "🌱", primary: true },
  { href: "/lab", label: "Lab", icon: "🧬", primary: true },
  { href: "/market", label: "Market", icon: "🛒", primary: true },
  { href: "/cup", label: "Cup", icon: "🏆", primary: true },
  { href: "/university", label: "University", icon: "🎓" },
  { href: "/leaderboards", label: "Leaderboards", icon: "📊" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

/** True when `pathname` is on `href` or one of its sub-routes. */
export function isActiveLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export const PRIMARY_LINKS = NAV_LINKS.filter((l) => l.primary);
export const SECONDARY_LINKS = NAV_LINKS.filter((l) => !l.primary);
