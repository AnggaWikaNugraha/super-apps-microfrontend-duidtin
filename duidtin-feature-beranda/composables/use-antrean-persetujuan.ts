import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { ambilPersetujuan, berandaKeys } from "@/services/api/beranda";

/** Logika blok "Menunggu persetujuan" — inti maker-checker. */
export const useAntreanPersetujuan = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.persetujuan,
    queryFn: ambilPersetujuan,
  });

  const antrean = computed(() => data.value ?? []);

  return {
    antrean,
    isEmpty: computed(() => antrean.value.length === 0),
    isError,
    isLoading: isPending,
    retry: () => void refetch(),
  };
};
