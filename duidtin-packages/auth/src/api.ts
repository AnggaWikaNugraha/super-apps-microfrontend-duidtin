import type { AxiosResponse } from "axios";

import { http } from "./axios.js";
import type { ApiResponse, Session, User } from "./types.js";

/**
 * Daftar endpoint `duidtin-api`. Cuma URL + tipe, tanpa menyentuh store —
 * yang menggabungkannya dengan sesi adalah service.ts.
 *
 * Semua endpoint auth memakai `skipAuth`: tokennya dikirim manual (atau tidak
 * perlu sama sekali), dan `/auth/refresh` memang TIDAK boleh lewat interceptor.
 */
const AUTH = { skipAuth: true } as const;

/** Server selalu membungkus `{ status, message, data }`; yang dipakai pemanggil cuma `data`. */
const unwrap = <T>(res: AxiosResponse<ApiResponse<T>>): T => res.data.data;

export const apiLogin = (email: string, password: string): Promise<Session> =>
  http.post<ApiResponse<Session>>("/auth/login", { email, password }, AUTH).then(unwrap);

export const apiRefresh = (refreshToken: string): Promise<Omit<Session, "pengguna">> =>
  http.post<ApiResponse<Omit<Session, "pengguna">>>("/auth/refresh", { refreshToken }, AUTH).then(unwrap);

export const apiLogout = (refreshToken: string): Promise<null> =>
  http.post<ApiResponse<null>>("/auth/logout", { refreshToken }, AUTH).then(unwrap);

export const apiLogoutAll = (accessToken: string): Promise<{ dicabut: number }> =>
  http
    .post<ApiResponse<{ dicabut: number }>>("/auth/logout-semua", null, {
      ...AUTH,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .then(unwrap);

export const apiProfile = (accessToken: string): Promise<{ pengguna: User }> =>
  http
    .get<ApiResponse<{ pengguna: User }>>("/auth/me", { ...AUTH, headers: { Authorization: `Bearer ${accessToken}` } })
    .then(unwrap);
