/** Cerminan kontrak `duidtin-api`. Nama field mengikuti JSON server, jadi tetap Indonesia. */
export type Role = "maker" | "checker" | "admin";

export interface User {
  id: string;
  nama: string;
  email: string;
  peran: Role[];
  perusahaan: { id: string; nama: string };
}

export interface Session {
  accessToken: string;
  accessTokenBerlakuSampai: string;
  refreshToken: string;
  sesiBerlakuSampai: string;
  pengguna: User;
}

export type ErrorCode =
  | "VALIDASI_GAGAL"
  | "KREDENSIAL_SALAH"
  | "AKUN_TERKUNCI"
  | "TERLALU_BANYAK_PERCOBAAN"
  | "TOKEN_TIDAK_ADA"
  | "TOKEN_KEDALUWARSA"
  | "TOKEN_TIDAK_VALID"
  | "REFRESH_TOKEN_TIDAK_VALID"
  | "AKSES_DITOLAK"
  | "TIDAK_DITEMUKAN"
  | "KESALAHAN_SERVER";

export interface ValidationDetail {
  field: string;
  pesan: string;
}

export interface FailureData {
  kode: ErrorCode;
  detail?: ValidationDetail[];
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

/** Error dari API. `message` sudah siap ditampilkan; keputusan diambil dari `kode`. */
export class AuthError extends Error {
  readonly status: number;
  readonly kode?: ErrorCode;
  readonly detail?: ValidationDetail[];

  constructor(status: number, message: string, kode?: ErrorCode, detail?: ValidationDetail[]) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.kode = kode;
    this.detail = detail;
  }
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
