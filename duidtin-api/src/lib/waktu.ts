/**
 * Satu-satunya sumber waktu di aplikasi — penerbitan token, verifikasi token, dan
 * semua perbandingan tanggal di database lewat sini.
 *
 * Tes memakai `geserWaktu` untuk mensimulasikan token kedaluwarsa, jendela 30 detik,
 * dan batas sesi 1 hari tanpa benar-benar menunggu.
 */
let pergeseranMs = 0;

export const sekarang = (): Date => new Date(Date.now() + pergeseranMs);

export const geserWaktu = (ms: number): void => {
  pergeseranMs += ms;
};

export const resetWaktu = (): void => {
  pergeseranMs = 0;
};
