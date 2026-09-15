import { DefaultLayout } from "@/components/remote";
import BerandaSementara from "@/components/ui/BerandaSementara";

import type { ReactElement } from "react";

/**
 * FASE 3 — route "/".
 *
 * Seharusnya dilayani feature remote `duidtin_feature_beranda`, tapi remote itu
 * belum di-deploy, jadi sementara diisi halaman statis milik host. Layout tetap
 * remote (`duidtin_ui_layout`) lewat getLayout.
 *
 * Memasang beranda lagi: kembalikan entry-nya di constants/features/registry.ts,
 * lalu ganti <BerandaSementara /> dengan
 *   dynamic(() => loadRemote("duidtin_feature_beranda/base"), { ssr: false })
 */
const HomePage = () => <BerandaSementara />;

HomePage.getLayout = (page: ReactElement) => (
  <DefaultLayout activePath="/" onLogout={() => window.alert("logout ditekan")} userName="Angga">
    {page}
  </DefaultLayout>
);

export default HomePage;
