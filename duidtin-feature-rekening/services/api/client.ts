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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getParam = (name: string): string | null =>
  globalThis.window ? new URLSearchParams(globalThis.window.location.search).get(name) : null;

const getList = (name: string): string[] => {
  const value = getParam(name);

  return value ? value.split(",").map((s) => s.trim()) : [];
};

/**
 * Endpoint mana yang dipaksa gagal, dibaca dari query string:
 *   localhost:3000/?gagal=aktivitas
 *   localhost:3000/?gagal=aktivitas,rekening
 *
 * Sengaja deterministik lewat URL, BUKAN gagal acak — gagal acak bikin frustrasi
 * waktu development dan susah didemokan.
 */
const isForcedFailure = (endpoint: string) => getList("gagal").includes(endpoint);

/**
 * Endpoint mana yang dipaksa mengembalikan kosong:
 *   localhost:3000/?kosong=rekening
 *
 * Satu-satunya cara melihat keadaan KOSONG tanpa menghapus data di database.
 */
const isForcedEmpty = (endpoint: string) => getList("kosong").includes(endpoint);

/**
 * Perlambat semua endpoint supaya keadaan MEMUAT sempat terlihat:
 *   localhost:3000/?lambat=1     → tambah 1,5 detik
 *   localhost:3000/?lambat=12    → tambah 12 × 300ms
 *
 * API lokal menjawab dalam puluhan milidetik — terlalu cepat buat diperiksa mata.
 */
const getExtraDelay = (): number => {
  const value = getParam("lambat");

  if (value === null) return 0;

  const multiplier = Number(value);

  return (Number.isFinite(multiplier) && multiplier > 1 ? multiplier : 5) * 300;
};

/**
 * Semua akses data lewat sini.
 *
 * Beda dari beranda yang cukup menyebut nama blok, repo ini mengirim **path
 * penuh** — karena endpoint-nya bersarang (`/rekening/:id/aktivitas`) dan nama
 * pendek tidak cukup untuk menyusunnya. `endpoint` tetap dipakai terpisah
 * sebagai nama pendek untuk `?gagal=`, `?kosong=`, dan pesan error.
 */
export const apiGet = async <TData>(endpoint: string, path: string): Promise<TData> => {
  const delay = getExtraDelay();

  if (delay > 0) await wait(delay);

  if (isForcedFailure(endpoint)) {
    throw new ApiError(endpoint, 503, `Endpoint "${endpoint}" sedang tidak bisa diakses`);
  }

  if (isForcedEmpty(endpoint)) return [] as TData;

  try {
    const { data } = await http.get<ApiResponse<TData>>(path);

    return data.data;
  } catch (error) {
    /**
     * `http` selalu melempar `AuthError`, bukan `AxiosError`. Diubah jadi
     * `ApiError` di sini supaya sisa repo ini cuma mengenal satu jenis error —
     * dan `QueryCache.onError` bisa menyebut endpoint mana yang gagal.
     */
    if (error instanceof AuthError) {
      throw new ApiError(endpoint, error.status, error.message);
    }

    throw error;
  }
};
