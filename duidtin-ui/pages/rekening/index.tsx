import { useAuth } from "@duidtin/auth/react";
import { useRouter } from "next/router";

import RemoteMount from "@/components/federation/remote-mount";
import { DefaultLayout } from "@/components/remote";

import type { ReactElement, ReactNode } from "react";

/**
 * FASE 3 — route "/rekening", dilayani `duidtin_feature_rekening`.
 *
 * Remote Vue KEDUA, dan yang pertama punya lebih dari satu halaman. Host yang
 * memegang route-nya: berkas ini untuk daftar, `[id].tsx` untuk detail, dan tiap
 * halaman memanggil expose-nya sendiri. Remote tidak pernah membaca `location`.
 */
const AccountListPage = () => <RemoteMount remote="duidtin_feature_rekening/daftar" />;

const AccountLayout = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const router = useRouter();

  return (
    <DefaultLayout
      activePath="/rekening"
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

AccountListPage.getLayout = (page: ReactElement) => <AccountLayout>{page}</AccountLayout>;

export default AccountListPage;
