/**
 * Transport API PALSU.
 *
 * Semua akses data lewat sini, jadi begitu backend siap yang diganti cuma isi
 * fungsi ini — `services/api/beranda.ts` dan komponennya nggak perlu disentuh.
 */

/** Error yang dilempar transport. Punya tipe sendiri supaya bisa dibedakan dari bug program. */
export class ApiError extends Error {
  readonly endpoint: string;
  readonly status: number;

  constructor(endpoint: string, status = 500, message = "Gagal menghubungi server") {
    super(message);
    this.name = "ApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

const acak = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const tunggu = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Endpoint mana yang dipaksa gagal, dibaca dari query string:
 *   localhost:3000/?gagal=aktivitas
 *   localhost:3000/?gagal=aktivitas,rekening
 *
 * Sengaja deterministik lewat URL, BUKAN gagal acak — gagal acak bikin frustrasi
 * waktu development dan susah didemokan.
 */
const endpointYangDipaksaGagal = (): string[] => {
  if (!globalThis.window) return [];

  const nilai = new URLSearchParams(globalThis.window.location.search).get("gagal");

  return nilai ? nilai.split(",").map((s) => s.trim()) : [];
};

/**
 * Perlambat semua endpoint supaya keadaan MEMUAT sempat terlihat:
 *   localhost:3000/?lambat=1     → 5x lebih lambat
 *   localhost:3000/?lambat=12    → 12x lebih lambat
 *
 * Jendela loading normal cuma 500-1100ms, terlalu cepat buat diperiksa mata.
 */
const pengaliLambat = (): number => {
  if (!globalThis.window) return 1;

  const nilai = new URLSearchParams(globalThis.window.location.search).get("lambat");

  if (nilai === null) return 1;

  const angka = Number(nilai);

  return Number.isFinite(angka) && angka > 1 ? angka : 5;
};

export const apiGet = async <TData>(endpoint: string, data: TData): Promise<TData> => {
  await tunggu(acak(500, 1100) * pengaliLambat());

  if (endpointYangDipaksaGagal().includes(endpoint)) {
    throw new ApiError(endpoint, 503, `Endpoint "${endpoint}" sedang tidak bisa diakses`);
  }

  return data;
};
