import { RetryPlugin } from "@module-federation/retry-plugin";
import { init } from "@module-federation/runtime";

import { fallbackPlugin } from "./fallbackPlugin";
import { dynamicLoadStyles } from "./utils/loader";
import { getModuleEntry } from "./utils/module-entry";
import { bacaRemoteLokal, kirimRefererKeRemoteLokal, terapkanParamRemoteLokal } from "./utils/remote-lokal";
import { getAllFeatures, getGlobalFeatures } from "./utils/registry";

import type { FeatureMetadata } from "@/constants/features/types";

export const HOST_NAME = "duidtin_ui";

/**
 * FASE 1 — dipanggil SEKALI dari pages/_app.tsx, di top-level, sebelum React
 * render apapun.
 *
 * Urutannya penting:
 *   1. kumpulkan SEMUA remote (global + per-fitur) dan resolve URL-nya
 *   2. daftarkan ke MF runtime — di titik ini BELUM ada fetch apapun ke jaringan
 *   3. angkat flag, supaya FASE 2 (provider) boleh mulai jalan
 *   4. baru fetch container + CSS punya remote GLOBAL doang
 *
 * Yang per-fitur nggak ikut di-fetch di sini — itu tugas FASE 2, cuma kalau
 * route-nya memang cocok.
 */
export const federationInit = async (): Promise<void> => {
  if (globalThis.window.__FEDERATION_LOADED) return;

  // ?remote-lokal harus diterapkan SEBELUM URL remote di-resolve
  terapkanParamRemoteLokal(getAllFeatures().map((feature: FeatureMetadata) => feature.name));

  const remotes = getAllFeatures().map((feature: FeatureMetadata) => ({
    name: feature.name,
    entry: getModuleEntry(feature.name),
  }));

  // Remote dengan MF runtime sendiri (beranda, MF 2.x) tidak berbagi registry dengan
  // host, jadi mereka membaca URL final di sini supaya memakai design-system yang SAMA.
  globalThis.window.__DUIDTIN_REMOTE_ENTRY__ = Object.fromEntries(remotes.map((remote) => [remote.name, remote.entry]));

  const remoteLokal = bacaRemoteLokal();

  if (Object.keys(remoteLokal).length > 0) {
    console.warn("[MFE] remote lokal aktif:", remoteLokal);
    // harus sebelum init()/loadRemote pertama, supaya request script ke localhost membawa Referer
    kirimRefererKeRemoteLokal();
  }

  init({
    name: HOST_NAME,
    remotes,
    plugins: [
      // LAPIS 1 — fetch script gagal (network flaky) → coba ulang dulu sebelum
      // dianggap benar-benar gagal dan diserahkan ke fallbackPlugin
      RetryPlugin({ retryTimes: 3, retryDelay: 1000 }),
      fallbackPlugin(),
    ],
  });

  globalThis.window.__FEDERATION_LOADED = true;

  // Cegah FOUC: CSS design-system & layout harus sudah masuk sebelum halaman
  // pertama kerender. dynamicLoadStyles() nelen error-nya sendiri, jadi satu
  // remote mati nggak bikin boot-nya gagal total.
  await Promise.all(
    getGlobalFeatures().map((feature: FeatureMetadata) => dynamicLoadStyles(feature.name)),
  );
};
