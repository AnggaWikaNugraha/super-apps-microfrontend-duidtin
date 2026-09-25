import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { http } from "../src/axios.js";
import { SESSION_KEY } from "../src/storage.js";
import type { Session } from "../src/types.js";

export const MINUTE = 60_000;

export const fakeSession = (overrides: Partial<Session> = {}): Session => ({
  accessToken: "akses-lama",
  accessTokenBerlakuSampai: new Date(Date.now() + 5 * MINUTE).toISOString(),
  refreshToken: "r".repeat(43),
  sesiBerlakuSampai: new Date(Date.now() + 24 * 60 * MINUTE).toISOString(),
  pengguna: {
    id: "u1",
    nama: "Angga Wika",
    email: "angga@duidtin.test",
    peran: ["checker"],
    perusahaan: { id: "p1", nama: "PT Duitin Nusantara" },
  },
  ...overrides,
});

/** Bentuk respons `duidtin-api`. */
export interface Jawaban {
  status: number;
  message: string;
  data: unknown;
}

export const respond = (status: number, message: string, data: unknown): Jawaban => ({ status, message, data });

export interface Palsu {
  /** Config tiap request yang sampai ke adapter, berurutan. */
  calls: InternalAxiosRequestConfig[];
  urls: string[];
}

/**
 * Mengganti adapter kedua instance axios, jadi tidak ada request beneran dan
 * header + URL yang dirakit interceptor bisa diperiksa langsung.
 */
export const mockApi = (handler: (config: InternalAxiosRequestConfig, palsu: Palsu) => Jawaban | Error): Palsu => {
  const palsu: Palsu = { calls: [], urls: [] };

  const adapter: AxiosAdapter = async (config) => {
    palsu.calls.push(config);
    palsu.urls.push(`${config.baseURL ?? ""}${config.url ?? ""}`);

    const hasil = handler(config, palsu);

    if (hasil instanceof Error) throw hasil;

    const res: AxiosResponse = {
      data: hasil,
      status: hasil.status,
      statusText: "",
      headers: {},
      config,
    };

    if (hasil.status >= 200 && hasil.status < 300) return res;

    throw new AxiosError(hasil.message, String(hasil.status), config, null, res);
  };

  http.defaults.adapter = adapter;

  return palsu;
};

export const fillStorage = (session: Session): void =>
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

export const readRaw = (): string | null => localStorage.getItem(SESSION_KEY);

/** Store di-cache di window, jadi harus dibuang tiap tes supaya tidak bocor antar-kasus. */
export const resetAuth = (): void => {
  localStorage.clear();
  delete (window as unknown as Record<string, unknown>).__DUIDTIN_AUTH__;
};
