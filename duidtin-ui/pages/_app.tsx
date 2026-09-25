import { configureAuth, installAuthStore } from "@duidtin/auth";

import GuardSesi from "@/components/auth/GuardSesi";
import ModuleFederationProvider from "@/components/federation/provider";
import PenandaRemoteLokal from "@/components/ui/PenandaRemoteLokal";
import { federationInit } from "@/services/federation/init";

import "@/styles/globals.css";

import type { NextPage } from "next";
import type { AppProps } from "next/app";
import type { ReactElement, ReactNode } from "react";

/**
 * FASE 1 — client-only, top-level, jalan sebelum React render apapun.
 *
 * SENGAJA nggak di-`await`: `init()` di dalam federationInit() dipanggil SEBELUM
 * `await` pertama, jadi semua remote sudah terdaftar begitu baris ini lewat —
 * sinkron. Yang di-await di dalam cuma warm-up CSS global, dan itu nggak boleh
 * nunda eksekusi module ini. Konsekuensinya: request CSS-nya berangkat duluan
 * (di sini) sementara chunk komponen remote baru diminta pas komponennya mount,
 * jadi praktis CSS selalu sampai lebih dulu.
 */
if (globalThis.window) {
  // Base URL API: paket auth sengaja nggak baca process.env sendiri, karena nama
  // env beda tiap bundler. Tiap app yang mengisinya — termasuk tiap remote.
  configureAuth({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000" });

  // HOST SAJA. Store dibuat di sini lalu diparkir di window.__DUIDTIN_AUTH__;
  // remote cuma meminjam lewat getAuthStore(). HARUS sebelum federationInit():
  // begitu remote pertama dimuat, dia langsung memanggil getAuthStore(), dan kalau
  // global-nya belum ada dia bikin store cadangan sendiri — sesinya jadi terbelah.
  installAuthStore();

  void federationInit();
}

/**
 * Pola getLayout: tiap page nentuin sendiri layout mana yang membungkusnya.
 * Perlu di host MFE karena layout-nya sendiri remote — kalau dibungkus langsung
 * di sini, halaman yang nggak butuh layout (login, error) ikut kena.
 */
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const App = ({ Component, pageProps }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <ModuleFederationProvider>
      <GuardSesi>{getLayout(<Component {...pageProps} />)}</GuardSesi>
      <PenandaRemoteLokal />
    </ModuleFederationProvider>
  );
};

export default App;
