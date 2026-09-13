import { useQuery } from "@tanstack/react-query";

import { ambilPersetujuan, berandaKeys } from "@/services/api/beranda";

/** Logika blok "Menunggu persetujuan" — inti maker-checker. */
export const useAntreanPersetujuan = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.persetujuan,
    queryFn: ambilPersetujuan,
  });

  const antrean = data ?? [];

  return {
    antrean,
    isEmpty: antrean.length === 0,
    isError,
    isLoading: isPending,
    retry: () => void refetch(),
  };
};
