import {
  Card,
  CardBody,
  DataState,
  Skeleton,
  SkeletonLines,
} from "@/components/remote/design-system";
import { useRingkasanSaldo } from "@/hooks/use-ringkasan-saldo";
import { mataUang, rupiah } from "../components/format";
import { Icon } from "../components/icon";

const RingkasanSaldo = () => {
  const {
    terlihat,
    toggleSaldo,
    isEmpty,
    isError,
    isLoading,
    jumlahRekening,
    jumlahRekeningRupiah,
    jumlahRekeningValas,
    totalValas,
    retry,
    total,
  } = useRingkasanSaldo();
  return (
    <Card variant="elevated" className="fber-saldo">
      <CardBody>
        <DataState
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={
            <div className="fber-saldo__loading">
              <Skeleton variant="text" />
              <Skeleton variant="heading" />
              <SkeletonLines lines={2} />
            </div>
          }
          onRetry={retry}
        >
          <div className="fber-saldo__top">
            <span className="fber-saldo__label">
              <Icon name="wallet" />
              Saldo rekening rupiah
            </span>
            <button
              type="button"
              className="fber-saldo__visibility"
              aria-label={
                terlihat
                  ? "Sembunyikan saldo ringkasan"
                  : "Tampilkan saldo ringkasan"
              }
              aria-pressed={!terlihat}
              onClick={toggleSaldo}
            >
              <Icon name="eye" />
            </button>
          </div>
          <p className="fber-saldo__value">
            {terlihat ? rupiah(total) : "••••••••"}
          </p>
          <p className="fber-saldo__caption">
            Total dari {jumlahRekeningRupiah} rekening IDR
          </p>
          <div className="fber-saldo__bottom">
            <div>
              <span>Rekening terdaftar</span>
              <strong>{jumlahRekening} rekening</strong>
            </div>
            {jumlahRekeningValas > 0 && (
              <div>
                <span>Saldo valas · USD</span>
                <strong>
                  {terlihat ? mataUang(totalValas, "USD") : "••••••"}
                </strong>
              </div>
            )}
          </div>
        </DataState>
      </CardBody>
    </Card>
  );
};
export default RingkasanSaldo;
