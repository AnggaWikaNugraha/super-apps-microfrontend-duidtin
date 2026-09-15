import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DefaultLayout } from "@/components/remote";

import type { ComponentType, ReactElement } from "react";

/**
 * FASE 3 — route "/" dilayani feature remote, bukan konten host.
 *
 * `loadRemote` fitur ditulis LANGSUNG di sini, bukan lewat `components/remote/`.
 * Berkas itu khusus remote infrastruktur (layout, design-system) yang dipakai
 * lintas halaman; remote fitur cuma dipakai satu halaman, jadi lebih jelas kalau
 * dideklarasikan di tempat dia dipakai.
 *
 * Dua stack berbeda ketemu di halaman ini:
 *   <DefaultLayout>      → duidtin_ui_layout       (Next 14 + webpack + MF 0.24.1)
 *   <BerandaContainer>   → duidtin_feature_beranda (Next 16 + Rspack  + MF 2.x)
 */
const BerandaContainer = dynamic(
  () =>
    loadRemote("duidtin_feature_beranda/base") as Promise<{
      default: ComponentType<Record<string, never>>;
    }>,
  { ssr: false },
);

const HomePage = () => <BerandaContainer />;

HomePage.getLayout = (page: ReactElement) => (
  <DefaultLayout activePath="/" onLogout={() => window.alert("logout ditekan")} userName="Angga">
    {page}
  </DefaultLayout>
);

export default HomePage;
