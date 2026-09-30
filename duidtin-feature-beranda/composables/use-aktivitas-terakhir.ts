import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { ambilAktivitas, berandaKeys } from "@/services/api/beranda";
import { useTampilanBeranda } from "@/stores/tampilan-beranda";

import type { Aktivitas } from "@/mocks/beranda";

/** Pemetaan status → warna badge ditaruh di composable, bukan di komponen. */
const WARNA_STATUS: Record<Aktivitas["status"], "success" | "warning" | "danger"> = {
  berhasil: "success",
  diproses: "warning",
  gagal: "danger",
};

const LABEL_STATUS: Record<Aktivitas["status"], string> = {
  berhasil: "Berhasil",
  diproses: "Diproses",
  gagal: "Gagal",
};

/** Logika blok "Aktivitas terakhir". */
export const useAktivitasTerakhir = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.aktivitas,
    queryFn: ambilAktivitas,
  });

  const aktivitas = computed(() => data.value ?? []);

  const { filterAktivitas, pilihFilterAktivitas } = useTampilanBeranda();

  const ditampilkan = computed(() =>
    aktivitas.value.filter((item) => filterAktivitas.value === "semua" || item.arah === filterAktivitas.value),
  );

  return {
    filter: filterAktivitas,
    setFilter: pilihFilterAktivitas,
    ditampilkan,
    aktivitas,
    isEmpty: computed(() => aktivitas.value.length === 0),
    isError,
    isLoading: isPending,
    retry: () => void refetch(),
    warnaStatus: (status: Aktivitas["status"]) => WARNA_STATUS[status],
    labelStatus: (status: Aktivitas["status"]) => LABEL_STATUS[status],
  };
};
