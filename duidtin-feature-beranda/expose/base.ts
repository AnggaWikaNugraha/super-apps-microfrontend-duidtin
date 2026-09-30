import { configureAuth } from "@duidtin/auth";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, type App } from "vue";

import Beranda from "@/containers/beranda/index.vue";
import { siapkanDesignSystem } from "@/services/federation";
import { buatQueryClient } from "@/services/query-client";

/**
 * KONTRAK ANTARA HOST DAN REMOTE INI.
 *
 * Host `duidtin-ui` itu aplikasi React — dia tidak bisa merender komponen Vue.
 * Jadi yang di-expose bukan komponen, tapi sebuah FUNGSI: beri dia satu elemen
 * DOM, dia yang membuat app Vue-nya sendiri di dalam elemen itu, dan
 * mengembalikan fungsi pembersih.
 *
 *   const lepas = mount(el);   // pasang
 *   lepas();                   // bongkar (host memanggilnya di cleanup useEffect)
 *
 * Pola ini yang membuat remote beda framework mungkin: host cuma perlu tahu
 * "ada elemen kosong, panggil fungsi ini" — bukan Vue, bukan React, bukan versi
 * MF siapa pun.
 *
 * PROVIDER ADA DI SINI, BUKAN DI ENTRY DEV.
 * Waktu dirender host, entry dev tidak pernah dieksekusi — host cuma mengambil
 * modul ini. Provider apa pun yang ditaruh di sana cuma jalan kalau :3003 dibuka
 * langsung. Ini pelajaran mahal dari versi React-nya: pernah bikin semua
 * komponen design-system hilang tanpa satu pun pesan error.
 */
/**
 * Base URL `duidtin-api` untuk bundle REPO INI.
 *
 * Host memanggil `configureAuth()` juga, tapi nilainya TIDAK sampai ke sini:
 * `baseUrl` itu variabel modul, dan `@duidtin/auth` sengaja tidak di-share lewat
 * Module Federation — tiap remote mem-bundle salinan paketnya sendiri. Yang
 * dibagi lintas remote cuma STORE-nya, lewat `window.__DUIDTIN_AUTH__`.
 *
 * Nama env-nya `PUBLIC_API_URL`, bukan `NEXT_PUBLIC_API_URL` seperti repo lain:
 * Rsbuild hanya meneruskan variabel berawalan `PUBLIC_`. Itu sebabnya paket auth
 * menolak membaca env sendiri — namanya berbeda tiap bundler.
 *
 * Dipanggil di modul, bukan di dalam `mount()`: sekali saja cukup, dan modul ini
 * pasti dieksekusi baik lewat host maupun lewat halaman dev.
 */
configureAuth({ baseUrl: import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000" });

export const mount = (el: HTMLElement): (() => void) => {
  let app: App | undefined;
  let dibatalkan = false;

  /**
   * Design-system disiapkan DULU, baru app-nya dipasang.
   *
   * Elemen `<dtn-*>` yang belum terdaftar akan tetap "naik kelas" sendiri begitu
   * `customElements.define` jalan, jadi merender lebih dulu pun tidak rusak —
   * cuma sekejap terlihat konten tanpa gaya. Menunggu lebih murah daripada
   * kedipan itu, apalagi container design-system biasanya sudah hangat: host
   * memuatnya di FASE 1 saat boot.
   */
  void siapkanDesignSystem().then(() => {
    if (dibatalkan) return;

    app = createApp(Beranda);

    // QueryClient baru tiap mount: kalau host melepas lalu memasang ulang remote
    // ini, cache lamanya tidak nyangkut. Setara `useState(buatQueryClient)` di
    // versi React-nya.
    app.use(VueQueryPlugin, { queryClient: buatQueryClient() });
    app.mount(el);
  });

  return () => {
    dibatalkan = true;
    app?.unmount();
    app = undefined;
  };
};

export default mount;
