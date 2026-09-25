import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { tujuanSetelahLogin } from "@/utils/rute";

import type { ComponentType } from "react";

interface LoginRemoteProps {
  onSuccess?: () => void;
}

/**
 * FASE 3 untuk route `/login` — di sinilah remote auth benar-benar dirender.
 *
 * `ssr: false` wajib: modulnya di-fetch runtime dari origin lain, jadi tidak ada
 * wujudnya saat Next prerender di server.
 */
const LoginRemote = dynamic<LoginRemoteProps>(
  () =>
    loadRemote("duidtin_feature_auth/login").then((mod) => ({
      default: (mod as { default: ComponentType<LoginRemoteProps> }).default,
    })),
  { ssr: false },
);

/**
 * Halaman login SENGAJA tanpa `getLayout`: header/footer butuh sesi, dan di sini
 * pengguna justru belum punya sesi.
 *
 * Pengalihan setelah berhasil dikerjakan DI SINI, bukan di remote — route `/login`
 * dan `/` milik host. Remote hanya memanggil `onSuccess`.
 */
const LoginPage = () => {
  const router = useRouter();

  return <LoginRemote onSuccess={() => void router.replace(tujuanSetelahLogin(router.query.dari))} />;
};

export default LoginPage;
