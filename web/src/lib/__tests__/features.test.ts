import { describe, it, expect } from "vitest";
import { computeFeatures, resolveFeature, WEB_TO_BACKEND_FLAG } from "@/lib/features";

describe("computeFeatures", () => {
  it("defaults every non-MVP feature OFF when env is empty", () => {
    expect(computeFeatures({})).toEqual({
      marketplace: false,
      chain: false,
      cup: false,
      university: false,
      contracts: false,
    });
  });

  it('treats only the exact string "true" as enabled', () => {
    const f = computeFeatures({
      NEXT_PUBLIC_ENABLE_MARKETPLACE: "true",
      NEXT_PUBLIC_ENABLE_CHAIN: "TRUE",
      NEXT_PUBLIC_ENABLE_CUP: "1",
      NEXT_PUBLIC_ENABLE_UNIVERSITY: "yes",
      NEXT_PUBLIC_ENABLE_CONTRACTS: "false",
    });
    expect(f.marketplace).toBe(true);
    expect(f.chain).toBe(false);
    expect(f.cup).toBe(false);
    expect(f.university).toBe(false);
    expect(f.contracts).toBe(false);
  });

  it("enables features independently", () => {
    const f = computeFeatures({ NEXT_PUBLIC_ENABLE_CUP: "true" });
    expect(f.cup).toBe(true);
    expect(f.marketplace).toBe(false);
  });
});

describe("resolveFeature (runtime flag resolution)", () => {
  it("maps web feature names to the backend flag keys", () => {
    expect(WEB_TO_BACKEND_FLAG.marketplace).toBe("marketplace");
    expect(WEB_TO_BACKEND_FLAG.cup).toBe("cup_competitions");
    expect(WEB_TO_BACKEND_FLAG.university).toBe("university");
  });

  it("uses the runtime backend value for a mapped flag", () => {
    expect(resolveFeature("cup", { cup_competitions: true })).toBe(true);
    expect(resolveFeature("cup", { cup_competitions: false })).toBe(false);
    expect(resolveFeature("marketplace", { marketplace: false })).toBe(false);
  });

  it("is optimistic-ON for a mapped flag while loading or when the key is absent", () => {
    expect(resolveFeature("cup", undefined)).toBe(true); // still loading
    expect(resolveFeature("cup", {})).toBe(true); // key not present yet
    expect(resolveFeature("university", { something_else: false })).toBe(true);
  });

  it("falls back to the build-time FEATURES for unmapped flags (chain/contracts)", () => {
    // chain/contracts have no backend flag → governed by build-time env, which is
    // OFF in the test environment (no NEXT_PUBLIC_ENABLE_* set).
    expect(resolveFeature("chain", { chain: true })).toBe(false);
    expect(resolveFeature("contracts", { contracts: true })).toBe(false);
  });
});
