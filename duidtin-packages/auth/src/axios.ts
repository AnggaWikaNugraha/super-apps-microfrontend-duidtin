import axios, { type AxiosInstance } from "axios";

import { apiRefresh } from "./api.js";
import { getBaseUrl } from "./config.js";
import { getAuthStore } from "./store.js";
import { AuthError, type ApiResponse, type FailureData, type Session } from "./types.js";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Endpoint auth sendiri: tanpa Bearer, tanpa refresh — kalau tidak, refresh bisa memicu dirinya sendiri. */
    skipAuth?: boolean;
    /** Penanda internal supaya satu request tidak diulang lebih dari sekali. */
    retried?: boolean;
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
      // refresh ditolak: sesi berakhir. Pengalihan ke halaman login tugas host.
      store.getState().setSession(null);

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

  if (!renewed) throw toAuthError(error);

  // Bearer-nya dipasang ulang oleh interceptor request di atas
  return http.request(config);
});
