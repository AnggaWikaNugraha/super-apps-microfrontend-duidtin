import { configureAuth } from "@duidtin/auth";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, type App, type Component } from "vue";

import { setupDesignSystem } from "@/services/federation";
import { createQueryClient } from "@/services/query-client";

/**
 * Base URL `duidtin-api` untuk bundle REPO INI.
 *
 * Host memanggil `configureAuth()` juga, tapi nilainya tidak sampai ke sini:
 * `baseUrl` variabel modul, dan `@duidtin/auth` sengaja tidak di-share lewat MF —
 * tiap remote mem-bundle salinan paketnya sendiri. Yang dibagi lintas remote cuma
 * STORE-nya, lewat `window.__DUIDTIN_AUTH__`.
 *
 * `PUBLIC_API_URL`, bukan `NEXT_PUBLIC_API_URL`: Rsbuild hanya meneruskan env
 * berawalan `PUBLIC_`.
 */
configureAuth({ baseUrl: import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000" });

/**
 * Inti bersama dua expose repo ini.
 *
 * Beranda cuma punya satu halaman, jadi logika pemasangannya boleh tinggal di
 * `expose/base.ts`. Di sini ada DUA halaman dengan pemasangan yang identik dan
 * cuma beda komponen akarnya — jadi diangkat ke sini, dan tiap expose tinggal
 * satu baris.
 *
 * `props` diteruskan jadi ROOT PROPS app Vue. Itu yang membawa `id` dari host ke
 * halaman detail: host yang memiliki route `/rekening/[id]`, dan remote tidak
 * pernah membaca `location` sendiri.
 */
export const createMount =
  (Root: Component) =>
  (el: HTMLElement, props?: Record<string, unknown>): (() => void) => {
    let app: App | undefined;
    let cancelled = false;

    void setupDesignSystem().then(() => {
      if (cancelled) return;

      app = createApp(Root, props);
      // QueryClient baru tiap mount: host melepas dan memasang ulang remote saat
      // pindah halaman, dan cache lama tidak boleh ikut terbawa.
      app.use(VueQueryPlugin, { queryClient: createQueryClient() });
      app.mount(el);
    });

    return () => {
      cancelled = true;
      app?.unmount();
      app = undefined;
    };
  };
