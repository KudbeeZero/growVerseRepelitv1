import { describe, it, expect } from "vitest";
import { circadianLeafLift, CIRCADIAN_W, CIRCADIAN_PERIOD_S, TAU } from "../morphology";

const DEG = Math.PI / 180;
const NARROW = 0.62; // sativa leaf width (G13-like, disciplined)
const WIDE = 1.3; // indica leaf width (Purple-Diddy-Punch-like, relaxed)

const NOON = Math.PI / 2; // sin = +1  → lights-on peak
const MIDNIGHT = (3 * Math.PI) / 2; // sin = -1  → lights-off peak

describe("circadianLeafLift", () => {
  it("is deterministic for the same phase + leaf width", () => {
    expect(circadianLeafLift(NOON, WIDE)).toBe(circadianLeafLift(NOON, WIDE));
    expect(circadianLeafLift(1.234, NARROW)).toBe(circadianLeafLift(1.234, NARROW));
  });

  it("prays upward (positive lift) during the lit half of the cycle", () => {
    expect(circadianLeafLift(NOON, NARROW)).toBeGreaterThan(0);
    expect(circadianLeafLift(NOON, WIDE)).toBeGreaterThan(0);
  });

  it("relaxes downward (negative lift) during the dark half of the cycle", () => {
    expect(circadianLeafLift(MIDNIGHT, NARROW)).toBeLessThan(0);
    expect(circadianLeafLift(MIDNIGHT, WIDE)).toBeLessThan(0);
  });

  it("is neutral at the day/night crossovers (sin = 0)", () => {
    expect(circadianLeafLift(0, WIDE)).toBeCloseTo(0, 10);
    expect(circadianLeafLift(Math.PI, NARROW)).toBeCloseTo(0, 10);
  });

  it("makes wide-leaf indica strains droop more at night than narrow ones", () => {
    // Purple Diddy Punch should release further downward than disciplined G13.
    expect(Math.abs(circadianLeafLift(MIDNIGHT, WIDE))).toBeGreaterThan(
      Math.abs(circadianLeafLift(MIDNIGHT, NARROW)),
    );
  });

  it("keeps narrow disciplined strains praying at least as upright by day", () => {
    expect(circadianLeafLift(NOON, NARROW)).toBeGreaterThan(circadianLeafLift(NOON, WIDE));
  });

  it("keeps every lift inside the subtle 2°–5° design band at the peaks", () => {
    for (const w of [NARROW, WIDE, 0.9]) {
      const day = circadianLeafLift(NOON, w);
      const night = Math.abs(circadianLeafLift(MIDNIGHT, w));
      expect(day).toBeGreaterThanOrEqual(2 * DEG);
      expect(day).toBeLessThanOrEqual(5 * DEG);
      expect(night).toBeGreaterThanOrEqual(2 * DEG);
      expect(night).toBeLessThanOrEqual(5 * DEG);
    }
  });

  it("never exceeds the 5° cap across a full sweep of phases and widths", () => {
    for (let p = 0; p < TAU; p += 0.2) {
      for (const w of [0, NARROW, 0.9, WIDE, 5]) {
        expect(Math.abs(circadianLeafLift(p, w))).toBeLessThanOrEqual(5 * DEG + 1e-9);
      }
    }
  });

  it("clamps leaf width outside the [0.62, 1.3] band", () => {
    expect(circadianLeafLift(NOON, 0)).toBeCloseTo(circadianLeafLift(NOON, NARROW), 10);
    expect(circadianLeafLift(MIDNIGHT, 5)).toBeCloseTo(circadianLeafLift(MIDNIGHT, WIDE), 10);
  });

  it("exposes a slow circadian period (much slower than the ~4s airflow sway)", () => {
    expect(CIRCADIAN_PERIOD_S).toBeGreaterThan(20);
    expect(CIRCADIAN_W).toBeCloseTo(TAU / CIRCADIAN_PERIOD_S, 10);
  });
});
