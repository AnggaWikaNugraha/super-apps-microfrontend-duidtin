import { usePageHeading } from "@/hooks/use-page-heading";
import { Badge, Button } from "@/components/remote/design-system";
import { Icon } from "./icon";

const PageHeading = () => {
  const { isFetching, perbarui } = usePageHeading();
  return (
    <header className="fber-page__heading">
      <div>
        <p className="fber-page__eyebrow">RINGKASAN BISNIS</p>
        <h1 className="fber-page__title">Keuangan Anda, dalam kendali.</h1>
        <p className="fber-page__lead">
          Pantau saldo, tinjau persetujuan, dan ikuti aktivitas rekening
          perusahaan.
        </p>
      </div>
      <div className="fber-page__actions">
        <Badge color="info" variant="soft">
          Data contoh
        </Badge>
        <Button
          color="default"
          variant="outline"
          isDisabled={isFetching}
          onPress={perbarui}
        >
          <Icon name="refresh" />
          {isFetching ? "Memperbarui" : "Perbarui"}
        </Button>
      </div>
    </header>
  );
};
export default PageHeading;
