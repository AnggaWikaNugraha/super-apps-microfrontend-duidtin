import { computed, getCurrentScope, onScopeDispose, shallowRef, type ComputedRef } from "vue";

import { login, logout, logoutAll, refreshProfile } from "./service.js";
import { getAuthStore, type AuthState } from "./store.js";
import type { AuthStatus, PenggunaTerakhir, Session, User } from "./types.js";

export interface UseAuthResult {
  /** "loading" sampai hydrate selesai — jangan pakai untuk memutuskan redirect. */
  status: ComputedRef<AuthStatus>;
  user: ComputedRef<User | null>;
  isLoggedIn: ComputedRef<boolean>;
  /** Sesi berakhir tapi penggunanya masih diingat → tampilkan modal login ulang. */
  sesiKedaluwarsa: ComputedRef<boolean>;
  /** Pengisi otomatis modal login ulang: nama + email pengguna terakhir. */
  penggunaTerakhir: ComputedRef<PenggunaTerakhir | null>;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
}

/**
 * Padanan `useAuth()` React untuk Vue — store yang dibaca PERSIS SAMA.
 *
 * Store-nya `zustand/vanilla` yang diparkir di `window.__DUIDTIN_AUTH__`, jadi
 * remote Vue memakai instance milik host: login di modal React membuat halaman
 * Vue ikut berubah tanpa jembatan apa pun.
 *
 * Nilainya dikembalikan sebagai ref, BUKAN objek `reactive`. Dengan `reactive`,
 * `const { status } = useAuth()` diam-diam memutus reaktivitasnya — bug yang
 * sulit dilacak. Dengan ref, `.value` memaksanya terlihat, dan di template
 * tetap otomatis ter-unwrap.
 */
export const useAuth = (): UseAuthResult => {
  const store = getAuthStore();

  // shallowRef: state-nya diganti utuh tiap kali store berubah, bukan diubah
  // sebagian — jadi tidak perlu proxy dalam.
  const state = shallowRef<AuthState>(store.getState());

  const berhentiLangganan = store.subscribe((berikutnya) => {
    state.value = berikutnya;
  });

  // Di luar komponen/effectScope (mis. dipanggil dari modul biasa) tidak ada
  // scope yang bisa melepas langganan; biarkan hidup daripada melempar warning.
  if (getCurrentScope()) onScopeDispose(berhentiLangganan);

  return {
    status: computed(() => state.value.status),
    user: computed(() => state.value.session?.pengguna ?? null),
    isLoggedIn: computed(() => state.value.session !== null),
    sesiKedaluwarsa: computed(() => state.value.status === "kedaluwarsa"),
    penggunaTerakhir: computed(() => state.value.penggunaTerakhir),
    login,
    logout,
    logoutAll,
    refreshProfile,
  };
};
