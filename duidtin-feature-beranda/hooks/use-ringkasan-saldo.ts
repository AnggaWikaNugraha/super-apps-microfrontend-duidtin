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

  return {
    isEmpty: rekening.length === 0,
    isError,
    isLoading: isPending,
    jumlahRekening: rekening.length,
    retry: () => void refetch(),
    total: rekening.reduce((jumlah, item) => jumlah + item.saldo, 0),
  };
};
