import { useIsFetching, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";

import { berandaKeys } from "@/services/api/beranda";

/** Logika kepala halaman: sapaan dari sesi + tombol "Perbarui" untuk semua blok. */
export const usePageHeading = () => {
  const queryClient = useQueryClient();
  const jumlahBerjalan = useIsFetching({ queryKey: berandaKeys.semua });

  return {
    isFetching: computed(() => jumlahBerjalan.value > 0),
    perbarui: () => {
      void queryClient.invalidateQueries({ queryKey: berandaKeys.semua });
    },
  };
};
