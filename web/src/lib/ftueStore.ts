"use client";

// Persists which players have finished or dismissed the Grow Guide so it never
// nags a returning grower. Keyed per player (one device can hold several keys).
// Purely client-side presentation state — no game/economy state lives here.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface FtueStoreState {
  /** playerId -> true once the guide is finished or dismissed for good. */
  done: Record<string, boolean>;
  isDone: (playerId: string) => boolean;
  finish: (playerId: string) => void;
  /** Re-arm the guide for a player (the "replay" affordance). */
  reset: (playerId: string) => void;
}

export const useFtueStore = create<FtueStoreState>()(
  persist(
    (set, get) => ({
      done: {},
      isDone: (playerId) => Boolean(get().done[playerId]),
      finish: (playerId) =>
        set((s) => (s.done[playerId] ? s : { done: { ...s.done, [playerId]: true } })),
      reset: (playerId) =>
        set((s) => {
          if (!s.done[playerId]) return s;
          const next = { ...s.done };
          delete next[playerId];
          return { done: next };
        }),
    }),
    {
      name: "gpe.ftue",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
