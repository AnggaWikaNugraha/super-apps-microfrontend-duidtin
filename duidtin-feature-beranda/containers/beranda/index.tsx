import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "@/components/remote/design-system";

/**
 * Isi beranda — yang di-expose sebagai "./base" dan dirender host di route "/".
 *
 * Semua komponen di sini (Card, Button, Badge, Alert) ditarik runtime dari
 * `duidtin_ui_design_system` lewat loadRemote. Jadi halaman ini melintasi DUA
 * batas repo sekaligus:
 *   host (MF 0.24.1) → beranda (MF 2.x) → design-system (MF 0.24.1)
 *
 * Styling pakai Tailwind v4 prefix `fber` lewat kelas BEM (`fber-page`), sama
 * pola dengan layout (`lyt`) dan host (`app`). CSS-nya nggak bisa di-import
 * biasa karena Next melarang CSS global di luar `_app.tsx` — jadi dikompilasi
 * jadi string oleh `scripts/build-styles.ts` lalu disuntik `./globals`.
 *
 * Angkanya masih contoh dan blok lain sengaja dibiarkan kosong dengan jujur —
 * tiap fitur baru nanti mengisi satu blok, bukan membongkar ulang halaman ini.
 */
const BerandaContainer = () => (
  <div className="fber-page">
    <div>
      <h1 className="fber-page__title">Beranda</h1>
      <p className="fber-page__lead">Ringkasan kas dan aktivitas perusahaan Anda.</p>
    </div>

    <Card variant="elevated">
      <CardBody>
        <p className="fber-saldo__label">Total saldo seluruh rekening</p>
        <p className="fber-saldo__value">Rp 1.284.500.000</p>
        <div className="fber-saldo__meta">
          <Badge color="info" variant="soft">
            data contoh
          </Badge>
          <Badge color="success" variant="soft">
            3 rekening
          </Badge>
        </div>
      </CardBody>
    </Card>

    <div className="fber-page__grid">
      <Card variant="outlined">
        <CardHeader>Menunggu persetujuan</CardHeader>
        <CardBody>
          <Alert variant="info">
            Belum ada transaksi yang menunggu otorisasi. Blok ini terisi begitu fitur Payroll
            aktif.
          </Alert>
        </CardBody>
      </Card>

      <Card variant="outlined">
        <CardHeader>Aktivitas terakhir</CardHeader>
        <CardBody>
          <Alert variant="info">
            Belum ada aktivitas. Blok ini terisi begitu fitur Mutasi Rekening aktif.
          </Alert>
        </CardBody>
      </Card>
    </div>

    <Card variant="soft">
      <CardHeader>Pintasan</CardHeader>
      <CardBody>
        <div className="fber-shortcuts">
          <Button color="primary" isDisabled variant="solid">
            Payroll
          </Button>
          <Button color="default" isDisabled variant="outline">
            Transfer
          </Button>
          <Button color="default" isDisabled variant="outline">
            Mutasi
          </Button>
          <Button color="default" isDisabled variant="outline">
            Persetujuan
          </Button>
        </div>
        <p className="fber-stack-note">
          Halaman ini remote <code>duidtin_feature_beranda</code> — Next 16 + Rspack + MF 2.x —
          dirender host <code>duidtin-ui</code> yang masih Next 14 + webpack + MF 0.24.1, dan
          komponennya ditarik dari <code>duidtin_ui_design_system</code> yang dibangun Rslib.
          Empat toolchain berbeda dalam satu halaman.
        </p>
      </CardBody>
    </Card>
  </div>
);

export default BerandaContainer;
