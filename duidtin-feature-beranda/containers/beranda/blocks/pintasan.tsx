import { Button, Card, CardBody, CardHeader } from "@/components/remote/design-system";

const PINTASAN = [
  { label: "Payroll", utama: true },
  { label: "Transfer", utama: false },
  { label: "Mutasi", utama: false },
  { label: "Persetujuan", utama: false },
];

/** Satu-satunya blok tanpa query — isinya statis, jadi nggak perlu BlockState. */
const Pintasan = () => (
  <Card variant="soft">
    <CardHeader>Pintasan</CardHeader>
    <CardBody>
      <div className="fber-shortcuts">
        {PINTASAN.map((item) => (
          <Button
            color={item.utama ? "primary" : "default"}
            isDisabled
            key={item.label}
            size="sm"
            variant={item.utama ? "solid" : "outline"}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <p className="fber-stack-note">
        Semua pintasan masih nonaktif karena remote fiturnya belum ada. Aktif satu per satu seiring
        Payroll, Transfer, Mutasi, dan Persetujuan dibangun.
      </p>
    </CardBody>
  </Card>
);

export default Pintasan;
