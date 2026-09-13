import {
  Badge,
  Card,
  CardBody,
  DataState,
  Skeleton,
  SkeletonLines,
} from "@/components/remote/design-system";
import { useRingkasanSaldo } from "@/hooks/use-ringkasan-saldo";

import { rupiah } from "../components/format";

const RingkasanSaldo = () => {
  const { isEmpty, isError, isLoading, jumlahRekening, retry, total } = useRingkasanSaldo();

  return (
    <Card variant="elevated">
      <CardBody>
        <DataState
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={
            <div className="fber-saldo__loading">
              <Skeleton variant="text" />
              <Skeleton variant="heading" />
              <SkeletonLines lines={1} />
            </div>
          }
          onRetry={retry}
        >
          <p className="fber-saldo__label">Total saldo seluruh rekening</p>
          <p className="fber-saldo__value">{rupiah(total)}</p>
          <div className="fber-saldo__meta">
            <Badge color="info" variant="soft">
              data contoh
            </Badge>
            <Badge color="success" variant="soft">
              {jumlahRekening} rekening
            </Badge>
          </div>
        </DataState>
      </CardBody>
    </Card>
  );
};

export default RingkasanSaldo;
