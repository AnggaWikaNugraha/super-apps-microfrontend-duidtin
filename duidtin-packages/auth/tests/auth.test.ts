import { beforeEach, describe, expect, test } from "bun:test";
import { effectScope } from "vue";

import { login, logout, refreshProfile } from "../src/service.js";
import { http } from "../src/axios.js";
import { configureAuth } from "../src/config.js";
import { SESSION_KEY } from "../src/storage.js";
import { getAuthStore, installAuthStore } from "../src/store.js";
import { useAuth as useAuthVue } from "../src/vue.js";
import { fakeSession, fillStorage, MINUTE, mockApi, readRaw, readRawPengguna, resetAuth, respond } from "./helpers.js";

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

  test("refresh ditolak tanpa catatan pengguna → sesi dibersihkan", async () => {
    // tanpa `duidtin:pengguna-terakhir`, modal login ulang tidak ada gunanya —
    // keadaannya harus jatuh ke "unauthenticated" supaya guard ke halaman login
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    const store = installAuthStore();

    store.setState({ penggunaTerakhir: null });

    mockApi((config) =>
      config.url?.endsWith("/auth/refresh")
        ? respond(401, "Sesi berakhir, silakan login ulang.", { kode: "REFRESH_TOKEN_TIDAK_VALID" })
        : respond(200, "ok", null),
    );

    await expect(http.get("/beranda/rekening")).rejects.toMatchObject({
      name: "AuthError",
      status: 401,
      kode: "TOKEN_TIDAK_ADA",
    });

    expect(getAuthStore().getState().session).toBeNull();
    expect(getAuthStore().getState().status).toBe("unauthenticated");
    expect(readRaw()).toBeNull();
  });
});

describe("sesi berakhir", () => {
  test("sesi di penyimpanan yang sudah lewat → status kedaluwarsa, pengguna diingat", () => {
    fillStorage(fakeSession({ sesiBerlakuSampai: new Date(Date.now() - MINUTE).toISOString() }));

    const store = installAuthStore();

    expect(store.getState().status).toBe("kedaluwarsa");
    expect(store.getState().session).toBeNull();
    expect(store.getState().penggunaTerakhir).toEqual({ email: "angga@duidtin.test", nama: "Angga Wika" });
    expect(readRaw()).toBeNull();
  });

  test("timer memicu kedaluwarsa tanpa request apa pun", async () => {
    mockApi(() => respond(200, "Login berhasil.", fakeSession({ sesiBerlakuSampai: new Date(Date.now() + 40).toISOString() })));

    await login("angga@duidtin.test", "Duidtin123!");

    expect(getAuthStore().getState().status).toBe("authenticated");

    await Bun.sleep(80);

    expect(getAuthStore().getState().status).toBe("kedaluwarsa");
    expect(getAuthStore().getState().penggunaTerakhir?.email).toBe("angga@duidtin.test");
  });

  test("refresh ditolak → kedaluwarsa, bukan unauthenticated", async () => {
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    installAuthStore();

    mockApi((config) =>
      config.url?.endsWith("/auth/refresh")
        ? respond(401, "Sesi berakhir, silakan login ulang.", { kode: "REFRESH_TOKEN_TIDAK_VALID" })
        : respond(200, "ok", null),
    );

    const permintaan = http.get("/beranda/rekening");

    await Bun.sleep(30);

    expect(getAuthStore().getState().status).toBe("kedaluwarsa");

    // request-nya DITAHAN, belum selesai — dilanjutkan setelah login ulang
    getAuthStore().getState().setSession(fakeSession({ accessToken: "akses-baru" }));

    const res = await permintaan;

    expect(res.status).toBe(200);
  });

  test("dua request tertahan, satu login ulang, dua-duanya lanjut", async () => {
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    installAuthStore();

    const palsu = mockApi((config) =>
      config.url?.endsWith("/auth/refresh")
        ? respond(401, "Sesi berakhir, silakan login ulang.", { kode: "REFRESH_TOKEN_TIDAK_VALID" })
        : respond(200, "ok", null),
    );

    const permintaan = Promise.all([http.get("/beranda/rekening"), http.get("/beranda/persetujuan")]);

    await Bun.sleep(40);

    expect(getAuthStore().getState().status).toBe("kedaluwarsa");

    getAuthStore().getState().setSession(fakeSession({ accessToken: "akses-baru" }));

    const [satu, dua] = await permintaan;

    expect([satu.status, dua.status]).toEqual([200, 200]);
    expect(palsu.calls.filter((c) => c.headers.Authorization === "Bearer akses-baru")).not.toHaveLength(0);
  });

  test("logout saat menunggu → request tertahan ditolak", async () => {
    fillStorage(fakeSession({ accessTokenBerlakuSampai: new Date(Date.now() + 10_000).toISOString() }));
    installAuthStore();

    mockApi((config) =>
      config.url?.endsWith("/auth/refresh")
        ? respond(401, "Sesi berakhir, silakan login ulang.", { kode: "REFRESH_TOKEN_TIDAK_VALID" })
        : respond(200, "ok", null),
    );

    const permintaan = http.get("/beranda/rekening");

    await Bun.sleep(30);
    getAuthStore().getState().setSession(null);

    await expect(permintaan).rejects.toMatchObject({ name: "AuthError", status: 401 });
  });

  test("logout membuang catatan pengguna terakhir", async () => {
    fillStorage(fakeSession());
    installAuthStore();

    expect(readRawPengguna()).toBeNull();

    mockApi(() => respond(200, "ok", null));
    getAuthStore().getState().setSession(fakeSession());

    expect(readRawPengguna()).toContain("angga@duidtin.test");

    await logout();

    expect(readRawPengguna()).toBeNull();
    expect(getAuthStore().getState().status).toBe("unauthenticated");
  });
});

describe("tanpa sesi", () => {
  test("request bertoken tanpa sesi ditolak sebelum menyentuh jaringan", async () => {
    installAuthStore();

    const palsu = mockApi(() => respond(200, "ok", null));

    await expect(http.get("/beranda/rekening")).rejects.toMatchObject({
      name: "AuthError",
      status: 401,
      kode: "TOKEN_TIDAK_ADA",
    });
    expect(palsu.calls).toHaveLength(0);
  });
});

describe("useAuth (vue)", () => {
  test("ref ikut berubah saat store berubah", () => {
    installAuthStore();

    const scope = effectScope();
    const auth = scope.run(() => useAuthVue())!;

    expect(auth.status.value).toBe("unauthenticated");
    expect(auth.isLoggedIn.value).toBe(false);

    getAuthStore().getState().setSession(fakeSession());

    expect(auth.status.value).toBe("authenticated");
    expect(auth.user.value?.nama).toBe("Angga Wika");
    expect(auth.isLoggedIn.value).toBe(true);

    getAuthStore().getState().tandaiKedaluwarsa();

    expect(auth.sesiKedaluwarsa.value).toBe(true);
    expect(auth.penggunaTerakhir.value?.email).toBe("angga@duidtin.test");

    scope.stop();
  });

  test("langganan dilepas saat scope berhenti", () => {
    installAuthStore();

    const scope = effectScope();
    const auth = scope.run(() => useAuthVue())!;

    scope.stop();
    getAuthStore().getState().setSession(fakeSession());

    // store berubah, tapi ref ini sudah tidak mendengarkan lagi
    expect(auth.status.value).toBe("unauthenticated");
  });

  test("membaca store yang sama dengan versi React, bukan salinan", () => {
    fillStorage(fakeSession());
    installAuthStore();

    const scope = effectScope();
    const auth = scope.run(() => useAuthVue())!;

    expect(auth.user.value?.email).toBe("angga@duidtin.test");
    expect(JSON.parse(readRaw()!).pengguna.email).toBe(auth.user.value?.email);

    scope.stop();
  });
});
