import { createStore } from "zustand/vanilla";

import { bacaStore } from "@/utils/zustand-vue";

export type FilterAktivitas = "semua" | "masuk" | "keluar";

interface TampilanBeranda {
  saldoTerlihat: boolean;
  filterAktivitas: FilterAktivitas;
  toggleSaldo: () => void;
  pilihFilterAktivitas: (filter: FilterAktivitas) => void;
}

/** Keadaan tampilan yang dipilih pengguna — bukan data server, jadi bukan query. */
export const storeTampilanBeranda = createStore<TampilanBeranda>((set) => ({
  saldoTerlihat: true,
  filterAktivitas: "semua",
  toggleSaldo: () => set((state) => ({ saldoTerlihat: !state.saldoTerlihat })),
  pilihFilterAktivitas: (filterAktivitas) => set({ filterAktivitas }),
}));

export const useTampilanBeranda = () => ({
  saldoTerlihat: bacaStore(storeTampilanBeranda, (state) => state.saldoTerlihat),
  filterAktivitas: bacaStore(storeTampilanBeranda, (state) => state.filterAktivitas),
  toggleSaldo: storeTampilanBeranda.getState().toggleSaldo,
  pilihFilterAktivitas: storeTampilanBeranda.getState().pilihFilterAktivitas,
});
