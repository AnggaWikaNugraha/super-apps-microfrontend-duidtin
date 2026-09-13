import { create } from "zustand";

interface ErrorGlobalState {
  pesan: string | null;
  bersihkan: () => void;
  setPesan: (pesan: string | null) => void;
}

/**
 * State banner error global.
 *
 * Ditaruh di store, bukan `useState` di komponen banner — sesuai aturan repo
 * feature. Selain konsisten, ada alasan praktis di sini: `QueryCache.onError`
 * hidup di luar React (di `services/query-client.ts`), jadi dia butuh cara
 * menulis state tanpa lewat hook. Dengan store, dia cukup memanggil
 * `useErrorGlobal.getState().setPesan(...)` — nggak perlu lagi mekanisme
 * pendaftaran pendengar yang sebelumnya dipakai.
 */
export const useErrorGlobal = create<ErrorGlobalState>((set) => ({
  pesan: null,
  setPesan: (pesan) => set({ pesan }),
  bersihkan: () => set({ pesan: null }),
}));
