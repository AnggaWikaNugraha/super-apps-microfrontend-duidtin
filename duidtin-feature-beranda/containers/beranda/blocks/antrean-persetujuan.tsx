import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataState,
  SkeletonLines,
} from "@/components/remote/design-system";
import { useAntreanPersetujuan } from "@/hooks/use-antrean-persetujuan";

import { rupiah, waktuSingkat } from "../components/format";

/**
 * Blok paling penting di dashboard korporat: inti maker-checker. Pekerjaan
 * seorang approver sepanjang hari ada di sini.
 */
const AntreanPersetujuan = () => {
  const { antrean, isEmpty, isError, isLoading, retry } = useAntreanPersetujuan();

  return (
    <Card variant="outlined">
      <CardHeader>Menunggu persetujuan</CardHeader>
      <CardBody>
        <DataState
          emptyMessage="Tidak ada transaksi yang menunggu otorisasi."
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={<SkeletonLines lines={3} />}
          onRetry={retry}
        >
          <ul className="fber-list">
            {antrean.map((item) => (
              <li className="fber-list__item" key={item.id}>
                <div className="fber-list__main">
                  <span className="fber-list__title">{item.tujuan}</span>
                  <span className="fber-list__meta">
                    {item.dibuatOleh} · {waktuSingkat(item.dibuatPada)}
                  </span>
                </div>
                <div className="fber-list__side">
                  <span className="fber-list__amount">{rupiah(item.nominal)}</span>
                  <Badge color="warning" variant="soft">
                    {item.jenis}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </DataState>
      </CardBody>
    </Card>
  );
};

export default AntreanPersetujuan;
