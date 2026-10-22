import type { NavigateRequestEvent } from "@/utils/navigate";

declare global {
  interface Window {
    /**
     * Diisi host `duidtin-ui` di federationInit(): URL remoteEntry final tiap remote,
     * setelah override `?remote-lokal` dan environment detection. Kosong kalau repo
     * ini dibuka sendiri di :3003.
     */
    __DUIDTIN_REMOTE_ENTRY__?: Record<string, string>;
  }

  /**
   * Supaya `addEventListener("duidtin:navigate", …)` dapat tipe `detail`-nya,
   * bukan `Event` telanjang. Dipakai halaman dev yang berperan sebagai host.
   */
  interface WindowEventMap {
    "duidtin:navigate": NavigateRequestEvent;
  }
}

export {};
