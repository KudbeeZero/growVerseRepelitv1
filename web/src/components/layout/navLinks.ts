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
 *
 * `feature` gates a link behind an MVP feature flag, resolved at RUNTIME from
 * `GET /api/game/flags` (see `resolveFeature`). Gating happens **here**, at the
 * shared source via `visibleNavLinks`, so a flagged-off system (e.g.
 * Market/Cup/University) disappears from *both* the desktop nav and the mobile
 * tab bar in lock-step — never just one surface. This module stays pure (no
 * hooks); the consumers pass the live flag map in.
 */
import { resolveFeature, type FeatureName } from "@/lib/features";

export type NavLink = {
  href: string;
  label: string;
  /** Emoji glyph — matches the codebase's dependency-free, CSP-safe icon voice. */
  icon: string;
  /** Surfaced in the mobile bottom tab bar (vs. tucked into the "More" sheet). */
  primary?: boolean;
  /** Gate behind an MVP feature flag; links without one are always shown. */
  feature?: FeatureName;
};

export const ALL_NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Grow", icon: "🌱", primary: true },
  { href: "/lab", label: "Lab", icon: "🧬", primary: true },
  { href: "/market", label: "Market", icon: "🛒", primary: true, feature: "marketplace" },
  { href: "/cup", label: "Cup", icon: "🏆", primary: true, feature: "cup" },
  { href: "/university", label: "University", icon: "🎓", feature: "university" },
  { href: "/leaderboards", label: "Leaderboards", icon: "📊" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

/**
 * Nav links visible for the given runtime flag map — entries whose feature flag
 * resolves OFF are dropped. Pure (takes the flag map as input) so it's testable
 * and the desktop + mobile nav filter identically. `runtimeFlags` undefined =
 * still loading → optimistic-ON (see `resolveFeature`).
 */
export function visibleNavLinks(runtimeFlags?: Record<string, boolean>): NavLink[] {
  return ALL_NAV_LINKS.filter((l) => !l.feature || resolveFeature(l.feature, runtimeFlags));
}

/** True when `pathname` is on `href` or one of its sub-routes. */
export function isActiveLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
