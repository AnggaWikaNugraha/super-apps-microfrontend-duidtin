import { createStore, type StoreApi } from "zustand/vanilla";

import { clearLastUser, clearSession, readLastUser, readSession, SESSION_KEY, writeLastUser, writeSession } from "./storage.js";
import type { AuthStatus, PenggunaTerakhir, Session } from "./types.js";

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** Siapa yang terakhir login — bertahan saat sesi kedaluwarsa, dibuang saat logout. */
  penggunaTerakhir: PenggunaTerakhir | null;
  /** Ganti sesi DAN tulis ke penyimpanan. Dipakai login, refresh, logout. */
  setSession: (session: Session | null) => void;
  /** Sesi berakhir tapi penggunanya masih diingat → modal login ulang. */
  tandaiKedaluwarsa: () => void;
  /** Baca ulang dari penyimpanan TANPA menulis. Dipakai saat hydrate dan saat tab lain berubah. */
  loadFromStorage: () => void;
}

export type AuthStore = StoreApi<AuthState>;

const GLOBAL_NAME = "__DUIDTIN_AUTH__";

interface DuidtinWindow {
  [GLOBAL_NAME]?: AuthStore;
}

const sudahLewat = (waktuIso: string): boolean => Date.parse(waktuIso) <= Date.now();

const createAuthStore = (): AuthStore => {
  /**
   * Penghitung waktu ke `sesiBerlakuSampai`. Tanpa ini sesi yang berakhir tidak
   * terdeteksi sampai ada request — halaman yang dibiarkan terbuka tetap tampak
   * login padahal tokennya mati.
   */
  let timer: ReturnType<typeof setTimeout> | undefined;

  const store = createStore<AuthState>((set, get) => {
    const batalkanTimer = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const jadwalkanKedaluwarsa = (session: Session) => {
      batalkanTimer();

      const sisa = Date.parse(session.sesiBerlakuSampai) - Date.now();

      // setTimeout meluap di atas ~24,8 hari; sesi kita 1 hari, jadi aman.
      timer = setTimeout(() => get().tandaiKedaluwarsa(), Math.max(sisa, 0));
    };

    return {
      status: "loading",
      session: null,
      penggunaTerakhir: null,

      setSession: (session) => {
        if (session) {
          writeSession(session);
          writeLastUser({ email: session.pengguna.email, nama: session.pengguna.nama });
          jadwalkanKedaluwarsa(session);

          set({
            session,
            status: "authenticated",
            penggunaTerakhir: { email: session.pengguna.email, nama: session.pengguna.nama },
          });

          return;
        }

        // logout eksplisit: lupakan penggunanya juga, jangan tinggalkan email di
        // komputer bersama
        batalkanTimer();
        clearSession();
        clearLastUser();

        set({ session: null, status: "unauthenticated", penggunaTerakhir: null });
      },

      tandaiKedaluwarsa: () => {
        batalkanTimer();
        clearSession();

        const penggunaTerakhir = get().penggunaTerakhir ?? readLastUser();

        // Tanpa catatan penggunanya, modal login ulang tidak ada gunanya — perlakukan
        // seperti belum login supaya guard mengarahkan ke halaman login biasa.
        set(
          penggunaTerakhir
            ? { session: null, status: "kedaluwarsa", penggunaTerakhir }
            : { session: null, status: "unauthenticated", penggunaTerakhir: null },
        );
      },

      loadFromStorage: () => {
        const session = readSession();
        const penggunaTerakhir = readLastUser();

        if (!session) {
          batalkanTimer();

          set({ session: null, status: "unauthenticated", penggunaTerakhir });

          return;
        }

        // Sesi di penyimpanan bisa sudah berakhir (tab ditutup semalam).
        if (sudahLewat(session.sesiBerlakuSampai)) {
          set({ penggunaTerakhir: penggunaTerakhir ?? { email: session.pengguna.email, nama: session.pengguna.nama } });
          get().tandaiKedaluwarsa();

          return;
        }

        jadwalkanKedaluwarsa(session);

        set({
          session,
          status: "authenticated",
          penggunaTerakhir: penggunaTerakhir ?? { email: session.pengguna.email, nama: session.pengguna.nama },
        });
      },
    };
  });

  return store;
};

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
