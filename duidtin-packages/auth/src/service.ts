import { apiLogin, apiLogout, apiLogoutAll, apiProfile } from "./api.js";
import { getAuthStore } from "./store.js";
import type { Session, User } from "./types.js";

/** Melempar `AuthError` kalau ditolak — halaman login membaca `message` dan `kode`-nya. */
export const login = async (email: string, password: string): Promise<Session> => {
  const session = await apiLogin(email, password);

  getAuthStore().getState().setSession(session);

  return session;
};

/**
 * Sesi di sisi client SELALU dihapus, walau request-nya gagal (jaringan putus).
 * Refresh token-nya tetap dicabut server saat request berhasil.
 */
export const logout = async (): Promise<void> => {
  const store = getAuthStore();
  const session = store.getState().session;

  store.getState().setSession(null);

  if (!session) return;

  try {
    await apiLogout(session.refreshToken);
  } catch {
    // diabaikan: sesi lokal sudah dibersihkan
  }
};

/** Cabut sesi di semua perangkat. */
export const logoutAll = async (): Promise<void> => {
  const store = getAuthStore();
  const session = store.getState().session;

  store.getState().setSession(null);

  if (!session) return;

  try {
    await apiLogoutAll(session.accessToken);
  } catch {
    // diabaikan, sama seperti logout()
  }
};

/** Ambil ulang nama, peran, dan perusahaan dari server tanpa login ulang. */
export const refreshProfile = async (): Promise<User | null> => {
  const store = getAuthStore();
  const session = store.getState().session;

  if (!session) return null;

  const { pengguna } = await apiProfile(session.accessToken);

  store.getState().setSession({ ...session, pengguna });

  return pengguna;
};
