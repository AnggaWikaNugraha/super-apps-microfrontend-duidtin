import type { PenggunaTerakhir, Session } from "./types.js";

/**
 * Satu kunci, bukan tiga, supaya penulisannya tidak bisa setengah jadi: token
 * tersimpan tapi data penggunanya belum.
 */
export const SESSION_KEY = "duidtin:sesi";

/**
 * Siapa yang terakhir login — dipakai modal login ulang untuk mengisi email dan
 * nama, jadi pengguna cukup mengetik password.
 *
 * Kunci TERPISAH dari sesi, karena umurnya berbeda: sesi dibuang begitu berakhir,
 * catatan ini bertahan sampai logout eksplisit. Isinya tidak sensitif — tidak ada
 * token di dalamnya.
 */
export const LAST_USER_KEY = "duidtin:pengguna-terakhir";

const isComplete = (session: Partial<Session> | null): session is Session =>
  typeof session?.accessToken === "string" &&
  typeof session.refreshToken === "string" &&
  session.pengguna !== undefined;

/** `null` kalau kosong, rusak, atau storage diblokir browser. */
export const readSession = (): Session | null => {
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);

    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    return isComplete(parsed as Partial<Session>) ? (parsed as Session) : null;
  } catch {
    return null;
  }
};

export const writeSession = (session: Session): void => {
  try {
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage diblokir: sesi tetap jalan di tab ini, cuma tidak bertahan setelah reload
  }
};

export const clearSession = (): void => {
  try {
    globalThis.localStorage?.removeItem(SESSION_KEY);
  } catch {
    // sama seperti di atas
  }
};

export const readLastUser = (): PenggunaTerakhir | null => {
  try {
    const raw = globalThis.localStorage?.getItem(LAST_USER_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PenggunaTerakhir>;

    return typeof parsed?.email === "string" && typeof parsed.nama === "string"
      ? { email: parsed.email, nama: parsed.nama }
      : null;
  } catch {
    return null;
  }
};

export const writeLastUser = (pengguna: PenggunaTerakhir): void => {
  try {
    globalThis.localStorage?.setItem(LAST_USER_KEY, JSON.stringify(pengguna));
  } catch {
    // sama seperti di atas: penyimpanan diblokir, modal tinggal minta email juga
  }
};

export const clearLastUser = (): void => {
  try {
    globalThis.localStorage?.removeItem(LAST_USER_KEY);
  } catch {
    // diabaikan
  }
};
