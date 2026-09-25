import type { AuthStore } from "@duidtin/auth";

declare global {
  interface Window {
    /**
     * Store sesi milik host, dipasang installAuthStore() di _app.tsx sebelum
     * federationInit(). Remote meminjam objek ini lewat getAuthStore() — bukan
     * React Context, supaya tembus batas bundle antar-remote.
     */
    __DUIDTIN_AUTH__?: AuthStore;

    /**
     * Flag "MF runtime siap dipakai", di-set di akhir federationInit() (FASE 1).
     * Dipolling waitForFederation() di FASE 2 — provider nggak boleh manggil
     * loadRemote() sebelum flag ini true.
     */
    __FEDERATION_LOADED?: boolean;

    /**
     * URL remoteEntry final tiap remote (setelah override ?remote-lokal dan
     * environment detection), diisi federationInit(). Dibaca remote yang punya MF
     * runtime sendiri — beranda (MF 2.x) — supaya mendaftarkan design-system ke URL
     * yang sama dengan host.
     */
    __DUIDTIN_REMOTE_ENTRY__?: Record<string, string>;
  }
}

export {};
