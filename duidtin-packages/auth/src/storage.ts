import type { Session } from "./types.js";

/**
 * Satu kunci, bukan tiga, supaya penulisannya tidak bisa setengah jadi: token
 * tersimpan tapi data penggunanya belum.
 */
export const SESSION_KEY = "duidtin:sesi";

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
