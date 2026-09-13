import { create } from "zustand";
export type FilterAktivitas = "semua" | "masuk" | "keluar";
interface TampilanBeranda {
  saldoTerlihat: boolean;
  filterAktivitas: FilterAktivitas;
  toggleSaldo: () => void;
  pilihFilterAktivitas: (filter: FilterAktivitas) => void;
}
export const useTampilanBeranda = create<TampilanBeranda>((set) => ({
  saldoTerlihat: true,
  filterAktivitas: "semua",
  toggleSaldo: () => set((state) => ({ saldoTerlihat: !state.saldoTerlihat })),
  pilihFilterAktivitas: (filterAktivitas) => set({ filterAktivitas }),
}));
