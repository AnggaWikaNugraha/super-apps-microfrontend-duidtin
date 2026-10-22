/**
 * Halaman dev merender SALAH SATU dari dua halaman, dipilih lewat query string:
 *
 *   localhost:3005/rekening/            → daftar
 *   localhost:3005/rekening/?id=6abc…   → detail rekening itu
 *
 * Di produksi yang memilih adalah route host; di sini tidak ada router sama
 * sekali, jadi query string dipakai sebagai penggantinya. Sengaja sesederhana
 * mungkin — halaman ini alat bantu, bukan tiruan host.
 *
 * Satu hal yang memang ditirukan: peran PENDENGAR `duidtin:navigate`. Tanpa itu
 * tautan di dalam remote akan jatuh ke `location.assign("/rekening/<id>")`, dan
 * path itu tidak ada di dev server ini — yang muncul 404, bukan halaman detail.
 * Jadi di sini tujuannya diterjemahkan ke `?id=`, persis seperti host
 * menerjemahkannya ke `router.push`. Kontraknya satu, penafsirnya beda.
 *
 * Catatan: tanpa sesi, keempat bagian akan menampilkan keadaan gagal "Belum
 * login" tanpa satu pun request terbuang. Sesinya hidup di origin :3000.
 */
import "@/styles/globals.css";

import { NAVIGATE_EVENT } from "@/utils/navigate";

const container = document.querySelector<HTMLElement>("#root");

/** Pembongkar app yang sedang terpasang — dipanggil sebelum memasang yang baru. */
let unmount: (() => void) | undefined;

const mountFrom = (search: string) => {
  if (!container) return;

  unmount?.();
  unmount = undefined;

  const id = new URLSearchParams(search).get("id");

  void (id
    ? import("@/expose/detail").then((m) => {
        unmount = m.mount(container, { id });
      })
    : import("@/expose/daftar").then((m) => {
        unmount = m.mount(container);
      }));
};

window.addEventListener(NAVIGATE_EVENT, (event) => {
  const to = event.detail?.to;
  if (typeof to !== "string" || !to) return;

  // Klaim navigasinya: tanpa preventDefault, `requestNavigate` menganggap tidak
  // ada yang mendengar dan memuat ulang halaman.
  event.preventDefault();

  const match = /^\/rekening\/(.+)$/.exec(to);
  const search = match ? `?id=${encodeURIComponent(match[1])}` : "";

  // `pushState`, bukan `replaceState`: tombol Back harus tetap berarti di sini,
  // sama seperti kalau yang mengurus router host.
  history[event.detail.replace ? "replaceState" : "pushState"](null, "", `/rekening/${search}`);
  mountFrom(search);
});

window.addEventListener("popstate", () => mountFrom(location.search));

mountFrom(location.search);
