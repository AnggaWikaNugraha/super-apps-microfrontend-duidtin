import { createStore } from "zustand/vanilla";

import { readStore } from "@/utils/zustand-vue";

export type CurrencyFilter = "all" | "IDR" | "USD";

interface AccountFilterState {
  currency: CurrencyFilter;
  selectCurrency: (currency: CurrencyFilter) => void;
}

/**
 * Filter mata uang di halaman daftar.
 *
 * Ditaruh di store, bukan `ref` di komponen — dan di repo ini alasannya lebih
 * kuat daripada sekadar aturan: host memegang route, jadi pindah ke halaman
 * detail me-UNMOUNT app Vue halaman daftar sepenuhnya, lalu kembali ke daftar
 * me-MOUNT app yang baru. `ref` di komponen hilang di perjalanan itu; store
 * hidup di modul, jadi filter yang dipilih pengguna masih ada saat dia kembali.
 *
 * Catatan: store ini modul-level, jadi umurnya seumur BUNDEL, bukan seumur app.
 * Itu memang yang diinginkan di sini.
 */
export const storeAccountFilter = createStore<AccountFilterState>((set) => ({
  currency: "all",
  selectCurrency: (currency) => set({ currency }),
}));

export const useAccountFilter = () => ({
  currency: readStore(storeAccountFilter, (state) => state.currency),
  selectCurrency: storeAccountFilter.getState().selectCurrency,
});
