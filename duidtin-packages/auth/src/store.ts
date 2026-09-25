import { createStore, type StoreApi } from "zustand/vanilla";

import { clearSession, readSession, SESSION_KEY, writeSession } from "./storage.js";
import type { AuthStatus, Session } from "./types.js";

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** Ganti sesi DAN tulis ke penyimpanan. Dipakai login, refresh, logout. */
  setSession: (session: Session | null) => void;
  /** Baca ulang dari penyimpanan TANPA menulis. Dipakai saat hydrate dan saat tab lain berubah. */
  loadFromStorage: () => void;
}

export type AuthStore = StoreApi<AuthState>;

const GLOBAL_NAME = "__DUIDTIN_AUTH__";

interface DuidtinWindow {
  [GLOBAL_NAME]?: AuthStore;
}

const createAuthStore = (): AuthStore =>
  createStore<AuthState>((set) => ({
    status: "loading",
    session: null,

    setSession: (session) => {
      if (session) writeSession(session);
      else clearSession();

      set({ session, status: session ? "authenticated" : "unauthenticated" });
    },

    loadFromStorage: () => {
      const session = readSession();

      set({ session, status: session ? "authenticated" : "unauthenticated" });
    },
  }));

/**
 * Dipanggil HOST sekali di `_app.tsx`, sebelum federationInit().
 *
 * Store-nya ditaruh di `window.__DUIDTIN_AUTH__` supaya remote — yang bundle-nya
 * terpisah, bahkan bisa beda framework — memakai instance yang sama, bukan bikin
 * sendiri. Objeknya cuma berisi fungsi, jadi aman lintas bundler.
 */
export const installAuthStore = (): AuthStore => {
  // SSR/prerender: tidak ada window. Store sementara, tidak disimpan ke global.
  if (typeof window === "undefined") return createAuthStore();

  const host = window as unknown as DuidtinWindow;

  if (!host[GLOBAL_NAME]) {
    const store = createAuthStore();

    store.getState().loadFromStorage();

    // tab lain login/logout → store di tab ini menyesuaikan
    window.addEventListener("storage", (event) => {
      if (event.key === null || event.key === SESSION_KEY) store.getState().loadFromStorage();
    });

    host[GLOBAL_NAME] = store;
  }

  return host[GLOBAL_NAME];
};

/** Dipakai REMOTE. Kalau host belum memasang (repo dibuka sendiri saat dev), pasang di sini. */
export const getAuthStore = (): AuthStore => {
  if (typeof window === "undefined") return installAuthStore();

  return (window as unknown as DuidtinWindow)[GLOBAL_NAME] ?? installAuthStore();
};
