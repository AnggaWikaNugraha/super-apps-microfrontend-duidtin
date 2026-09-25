import { useStore } from "zustand";

import { login, logout, logoutAll, refreshProfile } from "./service.js";
import { getAuthStore, type AuthState } from "./store.js";
import type { AuthStatus, Session, User } from "./types.js";

export interface UseAuthResult {
  /** "loading" sampai hydrate selesai — jangan pakai untuk memutuskan redirect. */
  status: AuthStatus;
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
}

const pickSession = (state: AuthState) => state.session;

const pickStatus = (state: AuthState) => state.status;

/**
 * Membaca store milik host. Hook ini boleh ter-bundle berkali-kali di remote yang
 * berbeda — yang penting store-nya satu, dan React-nya satu instance (`shared`
 * singleton di semua repo).
 */
export const useAuth = (): UseAuthResult => {
  const store = getAuthStore();
  const session = useStore(store, pickSession);
  const status = useStore(store, pickStatus);

  return {
    status,
    user: session?.pengguna ?? null,
    isLoggedIn: session !== null,
    login,
    logout,
    logoutAll,
    refreshProfile,
  };
};
