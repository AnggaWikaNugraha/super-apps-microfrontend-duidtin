import { useAuth } from "@duidtin/auth/react";
import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { DefaultLayout } from "@/components/remote";

import type { ComponentType, ReactElement, ReactNode } from "react";

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

/**
 * `getLayout` dijadikan komponen supaya boleh memakai hook — `userName` dan
 * `onLogout` sekarang datang dari sesi, bukan hardcode.
 */
const LayoutBeranda = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const router = useRouter();

  return (
    <DefaultLayout
      activePath="/"
      onLogout={async () => {
        await logout();
        void router.replace("/login");
      }}
      userName={user?.nama}
    >
      {children}
    </DefaultLayout>
  );
};

HomePage.getLayout = (page: ReactElement) => <LayoutBeranda>{page}</LayoutBeranda>;

export default HomePage;
