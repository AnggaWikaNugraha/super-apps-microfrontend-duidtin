import axios, { type AxiosInstance } from "axios";

import { apiRefresh } from "./api.js";
import { getBaseUrl } from "./config.js";
import { getAuthStore } from "./store.js";
import { AuthError, type ApiResponse, type FailureData, type Session } from "./types.js";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Endpoint auth sendiri: tanpa Bearer, tanpa refresh — kalau tidak, refresh bisa memicu dirinya sendiri. */
    skipAuth?: boolean;
    /** Penanda internal supaya satu request tidak diulang lebih dari sekali per sebab. */
    retried?: boolean;
    /** Sudah pernah diulang setelah login ulang — jangan diulang lagi. */
    retriedAfterRelogin?: boolean;
  }
}

/** Satu-satunya instance untuk semua repo. Endpoint bisnis memakai ini juga. */
export const http: AxiosInstance = axios.create({ headers: { "Content-Type": "application/json" } });

/** Refresh duluan kalau access token tinggal segini, supaya request tidak perlu gagal dulu. */
const REFRESH_THRESHOLD_MS = 30_000;

const LOCK_NAME = "duidtin:refresh";

let fallbackLock: Promise<unknown> = Promise.resolve();

/**
 * Web Locks berlaku lintas tab dalam satu origin. Di tab yang sama store-nya memang
 * cuma satu (milik host), jadi tugas kunci ini menjaga balapan ANTAR-TAB.
 *
 * `navigator.locks` tidak ada di semua lingkungan (Safari lama, DOM tiruan saat tes),
 * jadi ada antrean sederhana sebagai cadangan.
 */
const withLock = <T>(run: () => Promise<T>): Promise<T> => {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, run) as Promise<T>;
  }

  const result = fallbackLock.then(run, run);

  fallbackLock = result.catch(() => undefined);

  return result;
};

/**
 * Satu janji bersama untuk SEMUA request yang tertahan menunggu login ulang.
 *
 * Kenapa ditahan, bukan ditolak: begitu sesi berakhir, host memunculkan modal
 * yang cuma meminta password. Kalau request-nya ditolak, pengguna kehilangan
 * data yang sedang dimuat dan harus memuat ulang sendiri. Dengan ditahan, satu
 * kali isi password membuat semua request berjalan lagi seolah tidak terjadi apa-apa.
 */
let menunggu: Promise<boolean> | null = null;

const tungguLoginUlang = (): Promise<boolean> => {
  menunggu ??= new Promise<boolean>((selesai) => {
    const store = getAuthStore();

    const berhenti = store.subscribe((state) => {
      if (state.status === "authenticated") {
        berhenti();
        menunggu = null;
        selesai(true);
      }

      // logout dari modal, atau pengguna tidak dikenali → percuma menunggu
      if (state.status === "unauthenticated") {
        berhenti();
        menunggu = null;
        selesai(false);
      }
    });
  });

  return menunggu;
};

const isNearlyExpired = (session: Session): boolean =>
  Date.parse(session.accessTokenBerlakuSampai) - Date.now() < REFRESH_THRESHOLD_MS;

/** Semua kegagalan keluar sebagai `AuthError`, tidak pernah `AxiosError`. */
export const toAuthError = (error: unknown): AuthError => {
  if (error instanceof AuthError) return error;

  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<FailureData> | undefined;
    const failure = body?.data;

    return new AuthError(
      error.response?.status ?? 0,
      body?.message ?? "Gagal menghubungi server.",
      failure?.kode,
      failure?.detail,
    );
  }

  return new AuthError(0, "Gagal menghubungi server.");
};

/**
 * Tukar refresh token. Dijalankan di dalam kunci, jadi kalau beberapa request
 * bersamaan butuh refresh, hanya satu yang benar-benar memanggil server.
 */
const refreshSession = (requested: Session | null): Promise<Session | null> =>
  withLock(async () => {
    const store = getAuthStore();
    const current = store.getState().session;

    if (!current) return null;

    // tab lain sudah refresh duluan → pakai hasilnya, jangan panggil server lagi
    if (requested && current.refreshToken !== requested.refreshToken) return current;

    try {
      const renewed = await apiRefresh(current.refreshToken);
      const next: Session = { ...renewed, pengguna: current.pengguna };

      store.getState().setSession(next);

      return next;
    } catch {
      // Refresh ditolak = sesi benar-benar berakhir. Token dibuang, tapi identitas
      // penggunanya disimpan supaya host bisa memunculkan modal login ulang.
      store.getState().tandaiKedaluwarsa();

      return null;
    }
  });

/** REQUEST: baseUrl terbaru + Bearer, dan refresh duluan kalau token hampir habis. */
http.interceptors.request.use(async (config) => {
  config.baseURL = getBaseUrl();

  if (config.skipAuth) return config;

  const store = getAuthStore();

  let session = store.getState().session;

  if (session && isNearlyExpired(session)) session = await refreshSession(session);

  /**
   * Dua keadaan bertemu di sini, dua-duanya harus DITAHAN, bukan dikirim tanpa token:
   *   1. request baru berangkat saat modal login ulang masih terbuka;
   *   2. refresh proaktif di atas baru saja ditolak → sesi jadi "kedaluwarsa".
   * Tanpa penjaga ini, request-nya lolos tanpa Bearer dan gagal 401 di server —
   * pengguna melihat blok error padahal modal login ulang sedang terbuka.
   */
  if (!session && store.getState().status === "kedaluwarsa") {
    const pulih = await tungguLoginUlang();

    if (!pulih) throw new AuthError(401, "Sesi berakhir, silakan login ulang.", "REFRESH_TOKEN_TIDAK_VALID");

    session = store.getState().session;
  }

  // Tidak ada sesi dan tidak ada yang bisa ditunggu: tolak di sini, jangan buang
  // satu perjalanan ke server yang pasti dijawab 401. Guard host yang mengarahkan
  // pengguna ke /login.
  if (!session && store.getState().status !== "loading") {
    throw new AuthError(401, "Belum login.", "TOKEN_TIDAK_ADA");
  }

  if (session) config.headers.Authorization = `Bearer ${session.accessToken}`;

  return config;
});

/** RESPONSE: 401 TOKEN_KEDALUWARSA → refresh → ulangi SEKALI. Sisanya jadi `AuthError`. */
http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw toAuthError(error);

  const config = error.config;
  const body = error.response?.data as ApiResponse<FailureData> | undefined;
  const kedaluwarsa = error.response?.status === 401 && body?.data?.kode === "TOKEN_KEDALUWARSA";

  if (!kedaluwarsa || !config || config.skipAuth || config.retried) throw toAuthError(error);

  config.retried = true;

  const renewed = await refreshSession(getAuthStore().getState().session);

  // Refresh berhasil → ulangi seperti biasa (Bearer dipasang ulang interceptor request).
  if (renewed) return http.request(config);

  // Refresh gagal. Kalau penggunanya masih diingat, sesi masuk keadaan
  // "kedaluwarsa" → tunggu modal login ulang, lalu ulangi SEKALI lagi.
  if (getAuthStore().getState().status === "kedaluwarsa" && !config.retriedAfterRelogin) {
    const pulih = await tungguLoginUlang();

    if (pulih) {
      config.retriedAfterRelogin = true;
      config.retried = false;

      return http.request(config);
    }
  }

  throw toAuthError(error);
});
