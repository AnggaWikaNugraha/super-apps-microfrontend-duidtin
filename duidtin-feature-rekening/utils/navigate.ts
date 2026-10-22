/**
 * Navigasi dari remote ke HOST, lewat DOM.
 *
 * Remote React bisa dikirimi objek `router` host apa adanya sebagai props —
 * sama-sama satu pohon React, jadi fungsi seperti `router.push` ikut menyeberang
 * utuh. Ke Vue itu tidak berlaku: serah-terimanya cuma sekali di `mount(el, props)`,
 * dan `RemoteMount` membandingkan props dengan `JSON.stringify` — nilai fungsi
 * hilang tanpa bersuara dari perbandingan itu. Jadi arahnya dibalik: host TIDAK
 * mengirim fungsi masuk, remote yang mengirim NIAT keluar, dan host memutuskan.
 *
 * Peristiwanya `bubbles` supaya naik sampai `<div>` milik `RemoteMount`, dan
 * `cancelable` supaya remote bisa tahu apakah ada yang mendengarkan:
 *
 *   dispatchEvent() → false  berarti ada yang memanggil preventDefault() —
 *                            host mengklaim navigasi ini, selesai.
 *   dispatchEvent() → true   tidak ada yang peduli → jatuh ke navigasi biasa,
 *                            persis seperti `<a href>` tanpa JavaScript.
 *
 * Lapis terakhir itu yang membuat repo ini tetap bisa dibuka sendiri di :3005,
 * dan tetap benar kalau suatu hari dirender host yang belum tahu peristiwa ini.
 *
 * Nama peristiwanya KONTRAK LINTAS REPO yang digandakan dengan tangan di host dan
 * di tiap remote, satu kategori dengan `SESSION_KEY`, `DESIGN_SYSTEM_REMOTE`, dan
 * nama peristiwa `dtn-change`/`dtn-close` milik design-system — mengganti namanya
 * berarti mengubah semua repo itu sekaligus.
 */
export const NAVIGATE_EVENT = "duidtin:navigate";

export interface NavigateDetail {
  /** Path tujuan di host, mis. `"/rekening/6abc…"`. Milik host, bukan remote. */
  to: string;
  /** `true` → `router.replace`, tidak menambah entri history. */
  replace?: boolean;
}

/** Bukan `NavigateEvent` — nama itu sudah dipakai Navigation API milik browser. */
export type NavigateRequestEvent = CustomEvent<NavigateDetail>;

/**
 * Minta host pindah halaman. `from` menentukan titik awal bubbling — pakai elemen
 * yang diklik, bukan `window`, supaya peristiwanya melewati `<div>` RemoteMount
 * yang benar kalau nanti ada dua remote di satu halaman.
 */
export const requestNavigate = (from: HTMLElement, to: string, replace = false): void => {
  const event: NavigateRequestEvent = new CustomEvent(NAVIGATE_EVENT, {
    bubbles: true,
    cancelable: true,
    // Elemen `<dtn-*>` memakai light DOM, tapi `composed` tetap benar: kalau
    // suatu hari ada yang pindah ke Shadow DOM, peristiwa ini tidak ikut terkurung.
    composed: true,
    detail: { replace, to },
  });

  if (from.dispatchEvent(event)) globalThis.location.assign(to);
};
