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
const AntreanPersetujuan = () => {
  const { antrean, isEmpty, isError, isLoading, retry } =
    useAntreanPersetujuan();
  return (
    <Card variant="outlined">
      <CardHeader>
        <div className="fber-section-heading">
          <div>
            <h2>Menunggu persetujuan</h2>
            <p>Transaksi yang membutuhkan perhatian.</p>
          </div>
          {!isLoading && !isError && (
            <Badge color="warning" variant="soft">
              {antrean.length} transaksi
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <DataState
          emptyMessage="Semua beres. Tidak ada transaksi yang menunggu otorisasi."
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={<SkeletonLines lines={5} />}
          onRetry={retry}
        >
          <ul className="fber-approvals">
            {antrean.map((item) => (
              <li key={item.id} className="fber-approval">
                <div className="fber-approval__top">
                  <Badge color="warning" variant="soft">
                    {item.jenis}
                  </Badge>
                  <strong className="fber-list__amount">
                    {rupiah(item.nominal)}
                  </strong>
                </div>
                <p className="fber-list__title">{item.tujuan}</p>
                <p className="fber-list__meta">
                  Oleh {item.dibuatOleh} · {waktuSingkat(item.dibuatPada)}
                </p>
              </li>
            ))}
          </ul>
        </DataState>
      </CardBody>
    </Card>
  );
};
export default AntreanPersetujuan;
