import { useQuery } from "@tanstack/vue-query";
import { computed, toRef, type MaybeRefOrGetter, toValue } from "vue";

import { accountKeys, fetchAccountActivity, fetchAccountDetail } from "@/services/api/account";

/**
 * Logika halaman detail. `id` datang dari HOST lewat props `mount(el, { id })`,
 * bukan dibaca dari `location` — remote tidak pernah menebak bentuk URL, karena
 * yang memiliki route adalah host.
 *
 * Dua query terpisah dengan `queryKey` yang memuat `id`: detail rekening dan
 * aktivitas terakhirnya. Dipisah supaya satu yang gagal tidak menjatuhkan yang
 * lain — pola yang sama dengan blok-blok di beranda.
 */
export const useAccountDetail = (id: MaybeRefOrGetter<string>) => {
  const idRef = toRef(() => toValue(id));

  const detailQuery = useQuery({
    queryKey: computed(() => accountKeys.detail(idRef.value)),
    queryFn: () => fetchAccountDetail(idRef.value),
  });

  const activityQuery = useQuery({
    queryKey: computed(() => accountKeys.activity(idRef.value)),
    queryFn: () => fetchAccountActivity(idRef.value),
  });

  const activities = computed(() => activityQuery.data.value ?? []);

  return {
    account: detailQuery.data,
    isLoading: detailQuery.isPending,
    isError: detailQuery.isError,
    retry: () => void detailQuery.refetch(),

    activities,
    isActivitiesEmpty: computed(() => activities.value.length === 0),
    isActivitiesLoading: activityQuery.isPending,
    isActivitiesError: activityQuery.isError,
    retryActivities: () => void activityQuery.refetch(),
  };
};
