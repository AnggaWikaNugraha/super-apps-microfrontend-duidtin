import type { FeatureMetadata } from "./types";

/**
 * Remote yang SELALU dimuat, tanpa peduli route — CSS-nya di-fetch di akhir
 * federationInit() supaya halaman nggak sempat tampil tanpa style (FOUC).
 *
 * `routes: []` di sini bukan "nggak punya route", tapi "nggak perlu route match".
 */
export const globalFeatures: FeatureMetadata[] = [
  {
    name: "duidtin_ui_design_system",
    entryPath: "/design-system/static/remoteEntry.js",
    devOrigin: "http://localhost:3001",
    routes: [],
  },
  {
    name: "duidtin_ui_layout",
    entryPath: "/layout/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3002",
    routes: [],
  },
];

/**
 * Remote per-fitur, dimuat cuma kalau route-nya cocok (FASE 2).
 *
 * Nambah fitur cukup nambah satu entry di sini.
 */
export const featureRegistry: Record<string, FeatureMetadata> = {
  duidtin_feature_beranda: {
    name: "duidtin_feature_beranda",
    entryPath: "/beranda/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3003",
    routes: ["/"],
  },
};
