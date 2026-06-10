"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  API_KEY_STORAGE,
  PLAYER_ID_STORAGE,
} from "@/lib/api/client";
import type { Player } from "@/lib/types";

interface SessionState {
  playerId: string | null;
  apiKey: string | null;
  hydrated: boolean;
  isAuthed: boolean;
  login: (playerId: string, apiKey: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

// localStorage can throw (privacy mode, disabled storage, quota) — mirror
// lib/api/client.ts and degrade to a logged-out in-memory session instead of
// crashing the app on mount.
function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Persistence is best-effort; the session still works for this tab.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPlayerId(storageGet(PLAYER_ID_STORAGE));
    setApiKey(storageGet(API_KEY_STORAGE));
    setHydrated(true);
  }, []);

  const login = useCallback((pid: string, key: string) => {
    storageSet(PLAYER_ID_STORAGE, pid);
    storageSet(API_KEY_STORAGE, key);
    setPlayerId(pid);
    setApiKey(key);
  }, []);

  const logout = useCallback(() => {
    storageSet(PLAYER_ID_STORAGE, null);
    storageSet(API_KEY_STORAGE, null);
    setPlayerId(null);
    setApiKey(null);
  }, []);

  const value: SessionState = {
    playerId,
    apiKey,
    hydrated,
    isAuthed: Boolean(playerId && apiKey),
    login,
    logout,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Convenience: the active player id, asserted non-null (for authed pages). */
export function usePlayerId(): string {
  const { playerId } = useSession();
  return playerId ?? "";
}

export type LoginFromPlayer = (player: Player) => void;
