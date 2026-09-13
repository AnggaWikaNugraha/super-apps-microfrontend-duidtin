import { useQuery } from "@tanstack/react-query";

import { ambilRekening, berandaKeys } from "@/services/api/beranda";

/**
 * Logika blok "Rekening perusahaan".
 *
 * Sengaja memakai queryKey yang SAMA dengan `useRingkasanSaldo` — TanStack
 * mendedup-nya jadi satu request, walaupun dipakai dua komponen berbeda.
 */
export const useRekeningPerusahaan = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.rekening,
    queryFn: ambilRekening,
  });

  const rekening = data ?? [];

  return {
    isEmpty: rekening.length === 0,
    isError,
    isLoading: isPending,
    rekening,
    retry: () => void refetch(),
  };
};
