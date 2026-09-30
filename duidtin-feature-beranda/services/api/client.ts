import { AuthError, http, type ApiResponse } from "@duidtin/auth";

/**
 * Transport ke `duidtin-api`.
 *
 * Instance axios-nya datang dari `@duidtin/auth`, bukan dibuat di sini — itu
 * satu-satunya cara memanggil API dengan sesi. Yang dibawa instance itu:
 * header `Bearer`, refresh proaktif saat access token hampir mati, penahanan
 * request saat sesi kedaluwarsa lalu diulang setelah login ulang, dan penolakan
 * di klien kalau tidak ada sesi sama sekali.
 *
 * Empat sakelar dev di bawah tetap dipertahankan walau datanya sudah sungguhan:
 * keadaan gagal, lambat, dan kosong susah dimunculkan dari API sungguhan tanpa
 * merusak datanya.
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

const tunggu = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const param = (nama: string): string | null =>
  globalThis.window ? new URLSearchParams(globalThis.window.location.search).get(nama) : null;

const daftar = (nama: string): string[] => {
  const nilai = param(nama);

  return nilai ? nilai.split(",").map((s) => s.trim()) : [];
};

/**
 * Endpoint mana yang dipaksa gagal, dibaca dari query string:
 *   localhost:3000/?gagal=aktivitas
 *   localhost:3000/?gagal=aktivitas,rekening
 *
 * Sengaja deterministik lewat URL, BUKAN gagal acak — gagal acak bikin frustrasi
 * waktu development dan susah didemokan.
 */
const dipaksaGagal = (endpoint: string) => daftar("gagal").includes(endpoint);

/**
 * Endpoint mana yang dipaksa mengembalikan kosong:
 *   localhost:3000/?kosong=rekening
 *
 * Satu-satunya cara melihat keadaan KOSONG tanpa menghapus data di database.
 */
const dipaksaKosong = (endpoint: string) => daftar("kosong").includes(endpoint);

/**
 * Perlambat semua endpoint supaya keadaan MEMUAT sempat terlihat:
 *   localhost:3000/?lambat=1     → tambah 1,5 detik
 *   localhost:3000/?lambat=12    → tambah 12 × 300ms
 *
 * API lokal menjawab dalam puluhan milidetik — terlalu cepat buat diperiksa mata.
 */
const jedaTambahan = (): number => {
  const nilai = param("lambat");

  if (nilai === null) return 0;

  const angka = Number(nilai);

  return (Number.isFinite(angka) && angka > 1 ? angka : 5) * 300;
};

/**
 * Semua akses data lewat sini. Endpoint-nya cukup nama blok (`"rekening"`),
 * bukan path penuh — namanya sama dengan `queryKey` dan nilai `?gagal=`, jadi
 * ketiganya tidak bisa melenceng satu dari yang lain.
 */
export const apiGet = async <TData>(endpoint: string): Promise<TData> => {
  const jeda = jedaTambahan();

  if (jeda > 0) await tunggu(jeda);

  if (dipaksaGagal(endpoint)) {
    throw new ApiError(endpoint, 503, `Endpoint "${endpoint}" sedang tidak bisa diakses`);
  }

  if (dipaksaKosong(endpoint)) return [] as TData;

  try {
    const { data } = await http.get<ApiResponse<TData>>(`/beranda/${endpoint}`);

    return data.data;
  } catch (kesalahan) {
    /**
     * `http` selalu melempar `AuthError`, bukan `AxiosError`. Diubah jadi
     * `ApiError` di sini supaya sisa repo ini cuma mengenal satu jenis error —
     * dan `QueryCache.onError` bisa menyebut endpoint mana yang gagal.
     */
    if (kesalahan instanceof AuthError) {
      throw new ApiError(endpoint, kesalahan.status, kesalahan.message);
    }

    throw kesalahan;
  }
};
