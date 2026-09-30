import { useAuth } from "@duidtin/auth/react";
import { useRouter } from "next/router";

import RemoteMount from "@/components/federation/remote-mount";
import { DefaultLayout } from "@/components/remote";

import type { ReactElement, ReactNode } from "react";

/**
 * FASE 3 — route "/" dilayani feature remote, bukan konten host.
 *
 * Nama modul fiturnya ditulis LANGSUNG di sini, bukan lewat `components/remote/`.
 * Berkas itu khusus remote infrastruktur (layout, design-system) yang dipakai
 * lintas halaman; remote fitur cuma dipakai satu halaman, jadi lebih jelas kalau
 * dideklarasikan di tempat dia dipakai.
 *
 * DUA FRAMEWORK ketemu di halaman ini:
 *   <DefaultLayout>  → duidtin_ui_layout       (React, Next 14 + webpack + MF 0.24.1)
 *   <RemoteMount>    → duidtin_feature_beranda (VUE 3, Rsbuild + MF 0.24.1)
 *
 * Karena beranda bukan React, dia tidak bisa dirender sebagai komponen. Yang
 * di-expose remote itu fungsi `mount(el)`; `RemoteMount` yang menyediakan
 * elemennya dan memanggil fungsi itu. Selebihnya halaman ini tidak tahu — dan
 * tidak perlu tahu — bahwa isinya Vue.
 */
const HomePage = () => <RemoteMount modul="duidtin_feature_beranda/base" />;

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
