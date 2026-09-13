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

const AktivitasTerakhir = () => {
  const { aktivitas, isEmpty, isError, isLoading, retry, warnaStatus } = useAktivitasTerakhir();

  return (
    <Card variant="outlined">
      <CardHeader>Aktivitas terakhir</CardHeader>
      <CardBody>
        <DataState
          emptyMessage="Belum ada aktivitas."
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={<SkeletonLines lines={4} />}
          onRetry={retry}
        >
          <ul className="fber-list">
            {aktivitas.map((item) => (
              <li className="fber-list__item" key={item.id}>
                <div className="fber-list__main">
                  <span className="fber-list__title">{item.keterangan}</span>
                  <span className="fber-list__meta">{waktuSingkat(item.waktu)}</span>
                </div>
                <div className="fber-list__side">
                  <span
                    className={
                      item.arah === "masuk"
                        ? "fber-list__amount fber-list__amount--masuk"
                        : "fber-list__amount"
                    }
                  >
                    {item.arah === "masuk" ? "+" : "−"} {rupiah(item.nominal)}
                  </span>
                  <Badge color={warnaStatus(item.status)} variant="soft">
                    {item.status}
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

export default AktivitasTerakhir;
