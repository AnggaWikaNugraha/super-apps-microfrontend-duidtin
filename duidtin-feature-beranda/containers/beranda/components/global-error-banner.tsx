import { Alert, Button } from "@/components/remote/design-system";
import { useErrorGlobal } from "@/stores/error-global";

/**
 * ERROR GLOBAL SAAT API HIT — lapis ketiga.
 *
 * Tiap blok sudah menampilkan error-nya sendiri lewat `DataState`. Banner ini
 * menangkap SEMUA query yang gagal di satu tempat lewat `QueryCache.onError`,
 * jadi pengguna tetap sadar ada yang tidak beres walaupun blok yang gagal
 * kebetulan sedang tidak terlihat di layar.
 *
 * Komponennya sendiri nggak punya state — semuanya di store.
 */
const GlobalErrorBanner = () => {
  const pesan = useErrorGlobal((state) => state.pesan);
  const bersihkan = useErrorGlobal((state) => state.bersihkan);

  if (!pesan) return null;

  return (
    <div className="fber-banner">
      <Alert variant="danger">
        <div className="fber-banner__inner">
          <span>
            Sebagian data belum dapat dimuat. Coba perbarui atau ulangi pada
            bagian yang bermasalah.
          </span>
          <Button
            color="default"
            onPress={bersihkan}
            size="sm"
            variant="outline"
          >
            Tutup
          </Button>
        </div>
      </Alert>
    </div>
  );
};

export default GlobalErrorBanner;
