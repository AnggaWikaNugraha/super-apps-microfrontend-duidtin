import { createStore } from "zustand/vanilla";

import { bacaStore } from "@/utils/zustand-vue";

interface ErrorGlobalState {
  pesan: string | null;
  bersihkan: () => void;
  setPesan: (pesan: string | null) => void;
}

/**
 * State banner error global.
 *
 * Ditaruh di store, bukan `ref` di komponen banner — sesuai aturan repo feature.
 * Selain konsisten, ada alasan praktis di sini: `QueryCache.onError` hidup di
 * luar komponen (di `services/query-client.ts`), jadi dia butuh cara menulis
 * state tanpa lewat composable. Dengan store, dia cukup memanggil
 * `storeErrorGlobal.getState().setPesan(...)`.
 *
 * `zustand/vanilla`, bukan `zustand` — paket utamanya membawa hook React. Yang
 * dibutuhkan di sini cuma store-nya; pengikatan ke Vue ada di `bacaStore`.
 */
export const storeErrorGlobal = createStore<ErrorGlobalState>((set) => ({
  pesan: null,
  setPesan: (pesan) => set({ pesan }),
  bersihkan: () => set({ pesan: null }),
}));

/** Dipakai komponen. Dari luar komponen pakai `storeErrorGlobal.getState()`. */
export const useErrorGlobal = () => ({
  pesan: bacaStore(storeErrorGlobal, (state) => state.pesan),
  bersihkan: storeErrorGlobal.getState().bersihkan,
});
