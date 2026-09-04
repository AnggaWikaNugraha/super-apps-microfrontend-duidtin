import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DefaultLayout,
} from "@/components/remote";

import type { ReactElement } from "react";

/**
 * FASE 3 — halaman pertama yang beneran naruh remote ke layar.
 *
 * Konten halaman ini masih milik host sendiri (belum ada feature remote), tapi
 * yang membungkusnya dan komponen di dalamnya sudah remote sungguhan:
 *   - <DefaultLayout>       → duidtin_ui_layout
 *   - <Card>, <Button>      → duidtin_ui_design_system, LANGSUNG dari host
 * ditambah Badge & Button di header yang ditarik layout dari design-system.
 *
 * Kalau ketiganya kerender lengkap dengan style-nya, artinya react singleton
 * lintas host + 2 remote sudah benar.
 */
const HomePage = () => (
  <div className="app-page">
    <div>
      <h1 className="app-page__title">Beranda</h1>
      <p className="app-page__lead">
        Halaman ini dirender host <code>duidtin-ui</code>. Header &amp; footer di sekelilingnya
        datang dari remote <code>duidtin_ui_layout</code>, sedangkan kartu dan tombol di bawah
        ditarik host langsung dari <code>duidtin_ui_design_system</code>.
      </p>
    </div>

    <div className="app-page__grid">
      <Card variant="elevated">
        <CardHeader>Total Saldo</CardHeader>
        <CardBody>
          <p className="app-page__stat-label">Per hari ini</p>
          <p className="app-page__stat-value">Rp 42.500.000</p>
        </CardBody>
      </Card>

      <Card variant="outlined">
        <CardHeader>Transaksi Tertunda</CardHeader>
        <CardBody>
          <p className="app-page__stat-label">Menunggu persetujuan</p>
          <p className="app-page__stat-value">3</p>
        </CardBody>
      </Card>
    </div>

    <div>
      <Button color="primary" variant="solid">
        Buat Transaksi
      </Button>
    </div>
  </div>
);

HomePage.getLayout = (page: ReactElement) => (
  <DefaultLayout
    activePath="/"
    onLogout={() => window.alert("logout ditekan")}
    userName="Angga"
  >
    {page}
  </DefaultLayout>
);

export default HomePage;
