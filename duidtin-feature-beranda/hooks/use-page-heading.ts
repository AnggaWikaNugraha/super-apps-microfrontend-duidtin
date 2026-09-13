import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { berandaKeys } from "@/services/api/beranda";
export const usePageHeading = () => {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: berandaKeys.semua }) > 0;
  return {
    isFetching,
    perbarui: () => {
      void queryClient.invalidateQueries({ queryKey: berandaKeys.semua });
    },
  };
};
