declare global {
  interface Window {
    /**
     * Diisi host `duidtin-ui` di federationInit(): URL remoteEntry final tiap remote,
     * setelah override `?remote-lokal` dan environment detection. Kosong kalau repo
     * ini dibuka sendiri di :3003.
     */
    __DUIDTIN_REMOTE_ENTRY__?: Record<string, string>;
  }
}

export {};
