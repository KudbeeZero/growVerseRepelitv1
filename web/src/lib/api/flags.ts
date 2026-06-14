import { apiFetch } from "./client";

/** Resolved feature-flag map served by the backend (all flags default ON). */
export type FlagMap = Record<string, boolean>;

export const flags = {
  /**
   * Public, read-only resolved flag map. `GET /api/game/flags` wraps it as
   * `{ flags: {...} }`; we unwrap to the bare map. No auth — flags govern
   * exposure, not gameplay truth.
   */
  get: (): Promise<FlagMap> => apiFetch<{ flags: FlagMap }>("/flags").then((r) => r.flags),
};
