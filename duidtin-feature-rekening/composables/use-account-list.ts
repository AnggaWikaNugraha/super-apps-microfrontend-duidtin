import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { accountKeys, fetchAccounts } from "@/services/api/account";
import type { Currency } from "@/services/api/types";
import { useAccountFilter } from "@/stores/account-filter";

/**
 * Logika halaman daftar: data + filter mata uang + ringkasan per mata uang.
 *
 * Filternya disaring DI KLIEN, bukan lewat query ke server. Jumlah rekening satu
 * perusahaan selalu kecil — belasan, bukan ribuan — jadi memuat semuanya sekali
 * lalu menyaring di memori jauh lebih responsif daripada bolak-balik ke API tiap
 * kali tab diganti. Begitu jumlahnya bisa ratusan, ini yang pertama harus pindah
 * ke server.
 */
export const useAccountList = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: accountKeys.list,
    queryFn: fetchAccounts,
  });

  const accounts = computed(() => data.value ?? []);
  const { currency, selectCurrency } = useAccountFilter();

  const visibleAccounts = computed(() =>
    accounts.value.filter((account) => currency.value === "all" || account.mataUang === currency.value),
  );

  const totalFor = (code: Currency) =>
    accounts.value.filter((account) => account.mataUang === code).reduce((sum, account) => sum + account.saldo, 0);

  return {
    currency,
    selectCurrency,
    visibleAccounts,
    accounts,
    isEmpty: computed(() => accounts.value.length === 0),
    isError,
    isLoading: isPending,
    retry: () => void refetch(),
    totalCount: computed(() => accounts.value.length),
    totalIdr: computed(() => totalFor("IDR")),
    totalUsd: computed(() => totalFor("USD")),
    hasForeignCurrency: computed(() => accounts.value.some((account) => account.mataUang === "USD")),
  };
};
