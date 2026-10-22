import { useAuth } from "@duidtin/auth/react";
import { useRouter } from "next/router";

import RemoteMount from "@/components/federation/remote-mount";
import { DefaultLayout } from "@/components/remote";

import type { ReactElement, ReactNode } from "react";

/**
 * FASE 3 — route "/rekening/[id]".
 *
 * `id` dibaca DI SINI dari router Next, lalu dikirim ke remote lewat props. Itu
 * pembagian tugasnya: host memiliki URL, remote memiliki isi. Kalau remote yang
 * membaca `location`, dia harus tahu bentuk route host — dan bentuk itu bisa
 * berubah tanpa remote tahu.
 *
 * Saat render pertama `router.query` masih kosong (Next belum hidrasi), jadi
 * remote baru dipasang setelah `id` ada. Tanpa jaga-jaga ini, remote sempat
 * dipasang dengan `id: undefined` lalu dibongkar lagi sedetik kemudian.
 */
const AccountDetailPage = () => {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : undefined;

  if (!id) return null;

  return <RemoteMount remote="duidtin_feature_rekening/detail" props={{ id }} />;
};

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

AccountDetailPage.getLayout = (page: ReactElement) => <AccountLayout>{page}</AccountLayout>;

export default AccountDetailPage;
