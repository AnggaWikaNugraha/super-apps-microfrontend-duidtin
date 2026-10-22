import { createStore } from "zustand/vanilla";

import { readStore } from "@/utils/zustand-vue";

interface ErrorGlobalState {
  message: string | null;
  clear: () => void;
  setMessage: (message: string | null) => void;
}

/**
 * State banner error global.
 *
 * Ditaruh di store, bukan `ref` di komponen banner — sesuai aturan repo feature.
 * Selain konsisten, ada alasan praktis di sini: `QueryCache.onError` hidup di
 * luar komponen (di `services/query-client.ts`), jadi dia butuh cara menulis
 * state tanpa lewat composable. Dengan store, dia cukup memanggil
 * `storeErrorGlobal.getState().setMessage(...)`.
 *
 * `zustand/vanilla`, bukan `zustand` — paket utamanya membawa hook React. Yang
 * dibutuhkan di sini cuma store-nya; pengikatan ke Vue ada di `readStore`.
 */
export const storeErrorGlobal = createStore<ErrorGlobalState>((set) => ({
  message: null,
  setMessage: (message) => set({ message }),
  clear: () => set({ message: null }),
}));

/** Dipakai komponen. Dari luar komponen pakai `storeErrorGlobal.getState()`. */
export const useErrorGlobal = () => ({
  message: readStore(storeErrorGlobal, (state) => state.message),
  clear: storeErrorGlobal.getState().clear,
});
