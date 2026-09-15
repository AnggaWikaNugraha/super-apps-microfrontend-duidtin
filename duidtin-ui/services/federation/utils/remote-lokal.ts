/**
 * Lapis B `getModuleEntry` — padanan override port lokal di `qcash-ui`.
 *
 * Membuat host (termasuk host produksi) mengambil remote tertentu dari laptop,
 * sementara remote lain tetap dari environment-nya:
 *
 *   ?remote-lokal=duidtin_feature_beranda@3003
 *   ?remote-lokal=duidtin_feature_beranda@3003,duidtin_ui_layout@3002
 *   ?remote-lokal=hapus
 *
 * Param dipakai sekali: isinya disimpan di localStorage (MENGGANTI daftar
 * sebelumnya) lalu dibuang dari address bar. Berlaku hanya di browser itu.
 *
 * Tujuan override DIBATASI ke http://localhost:<port> dan http://127.0.0.1:<port>.
 * Kode ini ikut ke produksi, jadi batasan inilah yang mencegah override dipakai
 * untuk memuat script dari server orang lain.
 */
const KUNCI_STORAGE = "duidtin:remote-lokal";
const NAMA_PARAM = "remote-lokal";
const ORIGIN_LOKAL = /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}$/;

/** `{ duidtin_feature_beranda: "http://localhost:3003" }` */
export type RemoteLokal = Record<string, string>;

export const bacaRemoteLokal = (): RemoteLokal => {
  try {
    const mentah = globalThis.window?.localStorage.getItem(KUNCI_STORAGE);

    if (!mentah) return {};

    const data: unknown = JSON.parse(mentah);

    if (typeof data !== "object" || data === null) return {};

    return Object.fromEntries(
      Object.entries(data).filter(
        (entri): entri is [string, string] => typeof entri[1] === "string" && ORIGIN_LOKAL.test(entri[1]),
      ),
    );
  } catch {
    // storage diblokir browser atau isinya rusak → anggap tidak ada override
    return {};
  }
};

/** `"a@3003, b@3002"` → `{ a: "http://localhost:3003", b: "http://localhost:3002" }`. Entri rusak dilewati. */
const parseParam = (nilai: string, namaTerdaftar: string[]): RemoteLokal => {
  const hasil: RemoteLokal = {};

  for (const bagian of nilai.split(",")) {
    const cocok = /^([\w-]+)@(\d{1,5})$/.exec(bagian.trim());
    const nama = cocok?.[1];
    const port = Number(cocok?.[2]);

    if (nama && namaTerdaftar.includes(nama) && port > 0 && port <= 65535) {
      hasil[nama] = `http://localhost:${port}`;
    }
  }

  return hasil;
};

/** Dipanggil sekali di awal federationInit(), sebelum URL remote di-resolve. */
export const terapkanParamRemoteLokal = (namaTerdaftar: string[]): void => {
  const url = new URL(globalThis.window.location.href);
  const nilai = url.searchParams.get(NAMA_PARAM);

  if (nilai === null) return;

  try {
    if (nilai === "hapus") {
      globalThis.window.localStorage.removeItem(KUNCI_STORAGE);
    } else {
      globalThis.window.localStorage.setItem(KUNCI_STORAGE, JSON.stringify(parseParam(nilai, namaTerdaftar)));
    }
  } catch {
    // storage diblokir: override tidak bisa disimpan, host jalan seperti biasa
  }

  url.searchParams.delete(NAMA_PARAM);
  globalThis.window.history.replaceState(globalThis.window.history.state, "", url);
};
