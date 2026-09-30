import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { ambilRekening, berandaKeys } from "@/services/api/beranda";
import { useTampilanBeranda } from "@/stores/tampilan-beranda";

/**
 * Logika blok "Ringkasan saldo".
 *
 * Komponennya cuma merender — perhitungan total, penentuan keadaan, dan aksi
 * retry semuanya di sini. Waktu sumber datanya nanti diganti API sungguhan,
 * yang berubah cuma berkas ini; template-nya nggak disentuh.
 *
 * Semua nilai turunan `computed`, bukan variabel biasa: `data` dari vue-query
 * itu ref, jadi hitungan yang dibaca satu kali akan beku di nilai pertama
 * (biasanya `undefined`).
 */
export const useRingkasanSaldo = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.rekening,
    queryFn: ambilRekening,
  });

  const rekening = computed(() => data.value ?? []);
  const rupiahSaja = computed(() => rekening.value.filter((item) => item.mataUang === "IDR"));
  const valasSaja = computed(() => rekening.value.filter((item) => item.mataUang === "USD"));

  const { saldoTerlihat, toggleSaldo } = useTampilanBeranda();

  return {
    terlihat: saldoTerlihat,
    toggleSaldo,
    isEmpty: computed(() => rekening.value.length === 0),
    isError,
    isLoading: isPending,
    jumlahRekening: computed(() => rekening.value.length),
    retry: () => void refetch(),
    jumlahRekeningRupiah: computed(() => rupiahSaja.value.length),
    total: computed(() => rupiahSaja.value.reduce((jumlah, item) => jumlah + item.saldo, 0)),
    totalValas: computed(() => valasSaja.value.reduce((jumlah, item) => jumlah + item.saldo, 0)),
    jumlahRekeningValas: computed(() => valasSaja.value.length),
  };
};
