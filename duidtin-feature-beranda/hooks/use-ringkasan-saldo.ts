import { useTampilanBeranda } from "@/stores/tampilan-beranda";
import { useQuery } from "@tanstack/react-query";

import { ambilRekening, berandaKeys } from "@/services/api/beranda";

/**
 * Logika blok "Ringkasan saldo".
 *
 * Komponennya cuma merender — perhitungan total, penentuan keadaan, dan aksi
 * retry semuanya di sini. Waktu sumber datanya nanti diganti API sungguhan,
 * yang berubah cuma berkas ini; JSX-nya nggak disentuh.
 */
export const useRingkasanSaldo = () => {
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: berandaKeys.rekening,
    queryFn: ambilRekening,
  });

  const rekening = data ?? [];
  const terlihat = useTampilanBeranda((state) => state.saldoTerlihat);
  const toggleSaldo = useTampilanBeranda((state) => state.toggleSaldo);

  return {
    terlihat,
    toggleSaldo,
    isEmpty: rekening.length === 0,
    isError,
    isLoading: isPending,
    jumlahRekening: rekening.length,
    retry: () => void refetch(),
    jumlahRekeningRupiah: rekening.filter((item) => item.mataUang === "IDR")
      .length,
    total: rekening
      .filter((item) => item.mataUang === "IDR")
      .reduce((jumlah, item) => jumlah + item.saldo, 0),
    totalValas: rekening
      .filter((item) => item.mataUang === "USD")
      .reduce((jumlah, item) => jumlah + item.saldo, 0),
    jumlahRekeningValas: rekening.filter((item) => item.mataUang === "USD")
      .length,
  };
};
