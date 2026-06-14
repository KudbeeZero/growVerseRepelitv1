import { describe, it, expect } from "vitest";
import {
  ALL_NAV_LINKS,
  visibleNavLinks,
  isActiveLink,
} from "@/components/layout/navLinks";

describe("navLinks config", () => {
  it("every link has an href, label, and icon", () => {
    for (const l of ALL_NAV_LINKS) {
      expect(l.href).toMatch(/^\//);
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.icon.length).toBeGreaterThan(0);
    }
  });

  it("hrefs are unique", () => {
    const hrefs = ALL_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps the mobile bottom bar to ≤4 primary tabs (+ a More slot = ≤5)", () => {
    // The bottom tab bar renders the primary links plus a fixed "More" button.
    // Native-app convention caps the bar at 5 destinations.
    const primary = ALL_NAV_LINKS.filter((l) => l.primary);
    expect(primary.length).toBeGreaterThan(0);
    expect(primary.length).toBeLessThanOrEqual(4);
  });
});

describe("visibleNavLinks (runtime flag gating)", () => {
  it("optimistic-ON while flags load: shows every link (undefined map)", () => {
    expect(visibleNavLinks(undefined).length).toBe(ALL_NAV_LINKS.length);
  });

  it("drops a link whose backend-mapped flag is OFF", () => {
    // marketplace → backend `marketplace`; cup → backend `cup_competitions`.
    const links = visibleNavLinks({ marketplace: false, cup_competitions: true });
    const hrefs = links.map((l) => l.href);
    expect(hrefs).not.toContain("/market");
    expect(hrefs).toContain("/cup");
    expect(hrefs).toContain("/dashboard"); // ungated links always shown
  });

  it("keeps a mapped link ON, and drops university when its flag is OFF", () => {
    const links = visibleNavLinks({ university: false });
    expect(links.map((l) => l.href)).not.toContain("/university");
    expect(links.map((l) => l.href)).toContain("/market"); // not in map → optimistic-ON
  });
});

describe("isActiveLink", () => {
  it("matches the exact route", () => {
    expect(isActiveLink("/lab", "/lab")).toBe(true);
  });

  it("matches sub-routes", () => {
    expect(isActiveLink("/lab/strains/abc", "/lab")).toBe(true);
    expect(isActiveLink("/dashboard/plants/1/chamber", "/dashboard")).toBe(true);
  });

  it("does not match unrelated routes or prefixes that aren't path segments", () => {
    expect(isActiveLink("/market", "/lab")).toBe(false);
    // "/laboratory" must not be treated as a sub-route of "/lab".
    expect(isActiveLink("/laboratory", "/lab")).toBe(false);
  });
});
