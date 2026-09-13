import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataState,
  SkeletonLines,
} from "@/components/remote/design-system";
import { useAktivitasTerakhir } from "@/hooks/use-aktivitas-terakhir";
import { rupiah, waktuSingkat } from "../components/format";
import { Icon } from "../components/icon";
const FILTER = [
  { id: "semua", label: "Semua" },
  { id: "masuk", label: "Uang masuk" },
  { id: "keluar", label: "Uang keluar" },
] as const;
const AktivitasTerakhir = () => {
  const {
    filter,
    setFilter,
    ditampilkan,
    aktivitas,
    isEmpty,
    isError,
    isLoading,
    retry,
    warnaStatus,
  } = useAktivitasTerakhir();
  return (
    <Card variant="outlined">
      <CardHeader>
        <div className="fber-section-heading">
          <div>
            <h2>Aktivitas terakhir</h2>
            <p>Jejak transaksi masuk dan keluar rekening Anda.</p>
          </div>
          <div
            className="fber-filters"
            role="group"
            aria-label="Filter aktivitas"
          >
            {FILTER.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <DataState
          emptyMessage="Belum ada aktivitas rekening."
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={<SkeletonLines lines={5} />}
          onRetry={retry}
        >
          <div
            className="fber-table-scroll"
            role="region"
            aria-label="Tabel aktivitas rekening"
            tabIndex={0}
          >
            <table className="fber-transactions">
              <caption className="fber-sr-only">
                Aktivitas terakhir —{" "}
                {FILTER.find((item) => item.id === filter)?.label}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Transaksi</th>
                  <th scope="col">Waktu</th>
                  <th scope="col" className="fber-transactions__amount">
                    Nominal
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {ditampilkan.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      <div className="fber-transaction">
                        <span
                          className={`fber-transaction__icon fber-transaction__icon--${item.arah}`}
                        >
                          <Icon
                            name={
                              item.arah === "masuk" ? "incoming" : "outgoing"
                            }
                          />
                        </span>
                        <div>
                          <span className="fber-list__title">
                            {item.keterangan}
                          </span>
                          <span className="fber-list__meta">
                            {item.arah === "masuk"
                              ? "Uang masuk"
                              : "Uang keluar"}
                          </span>
                        </div>
                      </div>
                    </th>
                    <td>
                      <time dateTime={item.waktu}>
                        {waktuSingkat(item.waktu)}
                      </time>
                    </td>
                    <td
                      className={`fber-transactions__amount${item.arah === "masuk" ? " fber-transactions__amount--masuk" : ""}`}
                    >
                      {item.arah === "masuk" ? "+" : "−"} {rupiah(item.nominal)}
                    </td>
                    <td>
                      <Badge color={warnaStatus(item.status)} variant="soft">
                        {
                          {
                            berhasil: "Berhasil",
                            diproses: "Diproses",
                            gagal: "Gagal",
                          }[item.status]
                        }
                      </Badge>
                    </td>
                  </tr>
                ))}
                {ditampilkan.length === 0 && (
                  <tr>
                    <td colSpan={4} className="fber-transactions__empty">
                      Tidak ada aktivitas untuk filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="fber-transactions__count" aria-live="polite">
            Menampilkan {ditampilkan.length} dari {aktivitas.length} transaksi
            terbaru
          </p>
        </DataState>
      </CardBody>
    </Card>
  );
};
export default AktivitasTerakhir;
