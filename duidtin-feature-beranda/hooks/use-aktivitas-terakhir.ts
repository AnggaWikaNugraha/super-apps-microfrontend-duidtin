import { useQuery } from "@tanstack/react-query";

import { ambilAktivitas, berandaKeys } from "@/services/api/beranda";

import type { Aktivitas } from "@/mocks/beranda";

/** Pemetaan status → warna badge ditaruh di hook, bukan di komponen. */
const WARNA_STATUS: Record<Aktivitas["status"], "success" | "warning" | "danger"> = {
  berhasil: "success",
  diproses: "warning",
  gagal: "danger",
};

/** Logika blok "Aktivitas terakhir". */
export const useAktivitasTerakhir = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.aktivitas,
    queryFn: ambilAktivitas,
  });

  const aktivitas = data ?? [];

  return {
    aktivitas,
    isEmpty: aktivitas.length === 0,
    isError,
    isLoading: isPending,
    retry: () => void refetch(),
    warnaStatus: (status: Aktivitas["status"]) => WARNA_STATUS[status],
  };
};
