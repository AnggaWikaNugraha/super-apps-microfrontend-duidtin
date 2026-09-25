import { beforeEach, describe, expect, test } from "bun:test";

import { login, logout, refreshProfile } from "../src/service.js";
import { http } from "../src/axios.js";
import { configureAuth } from "../src/config.js";
import { SESSION_KEY } from "../src/storage.js";
import { getAuthStore, installAuthStore } from "../src/store.js";
import { fakeSession, fillStorage, MINUTE, mockApi, readRaw, resetAuth, respond } from "./helpers.js";

const API = "http://localhost:4000";

const sesiBaru = () =>
  respond(200, "Sesi diperbarui.", {
    accessToken: "akses-baru",
    accessTokenBerlakuSampai: new Date(Date.now() + 5 * MINUTE).toISOString(),
    refreshToken: "b".repeat(43),
    sesiBerlakuSampai: fakeSession().sesiBerlakuSampai,
  });

beforeEach(() => {
  resetAuth();
  configureAuth({ baseUrl: API });
});

describe("store", () => {
  test("hydrate dari penyimpanan saat dipasang", () => {
    fillStorage(fakeSession());

    const store = installAuthStore();

    expect(store.getState().status).toBe("authenticated");
    expect(store.getState().session?.pengguna.nama).toBe("Angga Wika");
  });

  test("penyimpanan kosong → status unauthenticated", () => {
    expect(installAuthStore().getState().status).toBe("unauthenticated");
  });

  test("isi rusak diperlakukan seperti kosong", () => {
    localStorage.setItem(SESSION_KEY, "{bukan json");

    expect(installAuthStore().getState().status).toBe("unauthenticated");
  });

  test("remote memakai instance yang sama dengan host", () => {
    expect(getAuthStore()).toBe(installAuthStore());
  });

  test("perubahan dari tab lain diikuti", () => {
    const store = installAuthStore();

    expect(store.getState().status).toBe("unauthenticated");

    fillStorage(fakeSession());
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));

    expect(store.getState().status).toBe("authenticated");
  });
});

describe("login / logout", () => {
  test("login menyimpan sesi ke store dan penyimpanan", async () => {
    mockApi(() => respond(200, "Login berhasil.", fakeSession()));

    await login("angga@duidtin.test", "Duidtin123!");

    expect(getAuthStore().getState().status).toBe("authenticated");
    expect(readRaw()).toContain("angga@duidtin.test");
  });

  test("login gagal melempar AuthError berisi kode", async () => {
    mockApi(() => respond(401, "Email atau password salah.", { kode: "KREDENSIAL_SALAH" }));

    expect(login("angga@duidtin.test", "salah")).rejects.toMatchObject({
      name: "AuthError",
      status: 401,
      kode: "KREDENSIAL_SALAH",
      message: "Email atau password salah.",
    });
    expect(getAuthStore().getState().status).toBe("unauthenticated");
  });

  test("logout membersihkan sesi walau request gagal", async () => {
    fillStorage(fakeSession());
    installAuthStore();

    mockApi(() => new Error("jaringan putus"));

    await logout();

    expect(getAuthStore().getState().session).toBeNull();
    expect(readRaw()).toBeNull();
  });

  test("refreshProfile memperbarui data pengguna tanpa mengganti token", async () => {
    fillStorage(fakeSession());
    installAuthStore();

    mockApi(() => respond(200, "ok", { pengguna: { ...fakeSession().pengguna, nama: "Angga Baru" } }));

    await refreshProfile();

    expect(getAuthStore().getState().session?.pengguna.nama).toBe("Angga Baru");
    expect(getAuthStore().getState().session?.accessToken).toBe("akses-lama");
  });
});

describe("http", () => {
  test("menempel Authorization dari store", async () => {
    fillStorage(fakeSession());
    installAuthStore();

    const palsu = mockApi(() => respond(200, "ok", { rekening: [] }));

    await http.get("/beranda/rekening");

    expect(palsu.urls[0]).toBe(`${API}/beranda/rekening`);
    expect(palsu.calls[0]?.headers.Authorization).toBe("Bearer akses-lama");
  });

  test("TOKEN_KEDALUWARSA → refresh → ulangi sekali", async () => {
    fillStorage(fakeSession());
    installAuthStore();

    const palsu = mockApi((config) => {
      if (config.url?.endsWith("/auth/refresh")) return sesiBaru();

      return palsu.urls.filter((u) => u.endsWith("/beranda/rekening")).length === 1
        ? respond(401, "Sesi berakhir, silakan muat ulang.", { kode: "TOKEN_KEDALUWARSA" })
        : respond(200, "ok", { rekening: [] });
    });

    const res = await http.get("/beranda/rekening");

    expect(res.status).toBe(200);
    expect(palsu.urls).toHaveLength(3);
    expect(getAuthStore().getState().session?.accessToken).toBe("akses-baru");
    expect(palsu.calls[2]?.headers.Authorization).toBe("Bearer akses-baru");
  });

  test("401 selain TOKEN_KEDALUWARSA tidak memicu refresh", async () => {
    fillStorage(fakeSession());
    installAuthStore();

    const palsu = mockApi(() => respond(401, "Sesi tidak valid.", { kode: "TOKEN_TIDAK_VALID" }));

    await expect(http.get("/beranda/rekening")).rejects.toMatchObject({
      name: "AuthError",
      status: 401,
      kode: "TOKEN_TIDAK_VALID",
    });
    expect(palsu.urls).toHaveLength(1);
  });

  test("sisa access token < 30 detik → refresh sebelum request", async () => {
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    installAuthStore();

    const palsu = mockApi((config) =>
      config.url?.endsWith("/auth/refresh") ? sesiBaru() : respond(200, "ok", null),
    );

    await http.get("/beranda/rekening");

    expect(palsu.urls[0]).toBe(`${API}/auth/refresh`);
    expect(palsu.urls).toHaveLength(2);
  });

  test("dua request bersamaan hanya memicu satu refresh", async () => {
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    installAuthStore();

    const palsu = mockApi((config) =>
      config.url?.endsWith("/auth/refresh") ? sesiBaru() : respond(200, "ok", null),
    );

    await Promise.all([http.get("/beranda/rekening"), http.get("/beranda/persetujuan")]);

    expect(palsu.urls.filter((u) => u.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  test("refresh ditolak → sesi dibersihkan", async () => {
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    installAuthStore();

    mockApi((config) =>
      config.url?.endsWith("/auth/refresh")
        ? respond(401, "Sesi berakhir, silakan login ulang.", { kode: "REFRESH_TOKEN_TIDAK_VALID" })
        : respond(200, "ok", null),
    );

    await http.get("/beranda/rekening");

    expect(getAuthStore().getState().session).toBeNull();
    expect(getAuthStore().getState().status).toBe("unauthenticated");
    expect(readRaw()).toBeNull();
  });
});
