import ModuleFederationProvider from "@/components/federation/provider";
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

  return <ModuleFederationProvider>{getLayout(<Component {...pageProps} />)}</ModuleFederationProvider>;
};

export default App;
