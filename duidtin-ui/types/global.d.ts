declare global {
  interface Window {
    /**
     * Flag "MF runtime siap dipakai", di-set di akhir federationInit() (FASE 1).
     * Dipolling waitForFederation() di FASE 2 — provider nggak boleh manggil
     * loadRemote() sebelum flag ini true.
     */
    __FEDERATION_LOADED?: boolean;
  }
}

export {};
