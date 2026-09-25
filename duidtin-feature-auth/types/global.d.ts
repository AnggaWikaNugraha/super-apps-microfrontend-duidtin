import type { AuthStore } from "@duidtin/auth";

declare global {
  interface Window {
    /**
     * Diisi host `duidtin-ui` di federationInit(): URL remoteEntry final tiap remote,
     * setelah override `?remote-lokal` dan environment detection. Kosong kalau repo
     * ini dibuka sendiri di :3004.
     */
    __DUIDTIN_REMOTE_ENTRY__?: Record<string, string>;

    /**
     * Store sesi milik host (`installAuthStore()` di `_app.tsx` host). Remote ini
     * meminjamnya lewat `@duidtin/auth`; kalau belum ada — repo dibuka sendiri —
     * paketnya membuat store cadangan dan memasangnya di sini.
     */
    __DUIDTIN_AUTH__?: AuthStore;
  }
}

export {};
