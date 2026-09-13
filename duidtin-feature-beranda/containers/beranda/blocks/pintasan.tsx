import { Card, CardBody, CardHeader } from "@/components/remote/design-system";
import { Icon } from "../components/icon";
const PINTASAN = [
  { label: "Transfer", icon: "transfer" },
  { label: "Payroll", icon: "payroll" },
  { label: "Mutasi", icon: "document" },
  { label: "Persetujuan", icon: "check" },
] as const;
const Pintasan = () => (
  <Card variant="outlined" className="fber-shortcuts-card">
    <CardHeader>
      <h2>Akses cepat</h2>
    </CardHeader>
    <CardBody>
      <div className="fber-shortcuts">
        {PINTASAN.map((item) => (
          <button
            key={item.label}
            type="button"
            className="fber-shortcut"
            disabled
          >
            <span className="fber-shortcut__icon">
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <p className="fber-shortcuts__note">Fitur transaksi segera tersedia.</p>
    </CardBody>
  </Card>
);
export default Pintasan;
