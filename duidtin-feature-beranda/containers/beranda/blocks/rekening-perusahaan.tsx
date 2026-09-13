import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataState,
  SkeletonLines,
} from "@/components/remote/design-system";
import { useRekeningPerusahaan } from "@/hooks/use-rekening-perusahaan";

import { rupiah } from "../components/format";

const RekeningPerusahaan = () => {
  const { isEmpty, isError, isLoading, rekening, retry } = useRekeningPerusahaan();

  return (
    <Card variant="outlined">
      <CardHeader>Rekening perusahaan</CardHeader>
      <CardBody>
        <DataState
          emptyMessage="Belum ada rekening terdaftar."
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={<SkeletonLines lines={3} />}
          onRetry={retry}
        >
          <ul className="fber-list">
            {rekening.map((item) => (
              <li className="fber-list__item" key={item.id}>
                <div className="fber-list__main">
                  <span className="fber-list__title">{item.nama}</span>
                  <span className="fber-list__meta">{item.nomor}</span>
                </div>
                <div className="fber-list__side">
                  <span className="fber-list__amount">{rupiah(item.saldo)}</span>
                  <Badge color="default" variant="outlined">
                    {item.mataUang}
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

export default RekeningPerusahaan;
