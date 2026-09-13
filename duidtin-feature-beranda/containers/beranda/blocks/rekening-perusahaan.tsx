import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataState,
  SkeletonLines,
} from "@/components/remote/design-system";
import { useRekeningPerusahaan } from "@/hooks/use-rekening-perusahaan";
import { mataUang } from "../components/format";
import { Icon } from "../components/icon";
const RekeningPerusahaan = () => {
  const { isEmpty, isError, isLoading, rekening, retry } =
    useRekeningPerusahaan();
  return (
    <Card variant="outlined">
      <CardHeader>
        <div className="fber-section-heading">
          <div>
            <h2>Rekening perusahaan</h2>
            <p>Saldo terpisah untuk setiap kebutuhan.</p>
          </div>
          {!isLoading && !isError && (
            <Badge color="default" variant="soft">
              {rekening.length} rekening
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <DataState
          emptyMessage="Belum ada rekening terdaftar."
          isEmpty={isEmpty}
          isError={isError}
          isLoading={isLoading}
          loadingFallback={<SkeletonLines lines={5} />}
          onRetry={retry}
        >
          <ul className="fber-accounts">
            {rekening.map((item) => (
              <li className="fber-account" key={item.id}>
                <span className="fber-account__icon">
                  <Icon name="wallet" />
                </span>
                <div className="fber-account__detail">
                  <span className="fber-list__title">{item.nama}</span>
                  <span className="fber-list__meta">{item.nomor}</span>
                </div>
                <div className="fber-account__balance">
                  <strong>{mataUang(item.saldo, item.mataUang)}</strong>
                  <span>{item.mataUang}</span>
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
