import { featureRegistry, globalFeatures } from "@/constants/features/registry";
import { getBaseFederationUrl } from "@/utils";

import type { FeatureMetadata, RouteMatchType } from "@/constants/features/types";

/** SEMUA remote: global + per-fitur. Dipakai FASE 1 buat didaftarkan ke MF runtime. */
export const getAllFeatures = (): FeatureMetadata[] => [
  ...globalFeatures,
  ...Object.values(featureRegistry),
];

/** Cuma yang selalu dimuat. Dipakai FASE 1 buat warm-up CSS di akhir federationInit(). */
export const getGlobalFeatures = (): FeatureMetadata[] => globalFeatures;

export const getFeatureByName = (name: string): FeatureMetadata | undefined =>
  getAllFeatures().find((feature: FeatureMetadata) => feature.name === name);

/** Gabungan base URL (hasil environment detection) + path remoteEntry si feature. */
export const getFeatureEntryUrl = (feature: FeatureMetadata): string =>
  `${getBaseFederationUrl(feature.devOrigin)}${feature.entryPath}`;

/**
 * Cocokkan SATU pola route dengan route yang lagi dibuka.
 *
 * PARAMETER
 *   pattern    "/transaksi"              ← satu isi dari feature.routes[]
 *   route      "/transaksi/detail/123"   ← dari router.pathname
 *   matchType  "prefix" | "exact"
 *
 * RETURN: boolean
 *   isRouteMatch("/transaksi", "/transaksi",             "prefix") → true
 *   isRouteMatch("/transaksi", "/transaksi/detail/123",  "prefix") → true
 *   isRouteMatch("/transaksi", "/transaksian",           "prefix") → false  ← lihat catatan
 *   isRouteMatch("/profil",    "/profil/edit",           "exact")  → false
 *
 * Cabang "prefix" pakai `${pattern}/` (ADA garis miringnya), bukan startsWith
 * polos. Kalau polos, "/transaksian" bakal salah cocok sama "/transaksi".
 */
const isRouteMatch = (pattern: string, route: string, matchType: RouteMatchType): boolean =>
  matchType === "exact" ? route === pattern : route === pattern || route.startsWith(`${pattern}/`);

/**
 * Filter feature mana yang perlu dimuat buat route ini (FASE 2).
 *
 * PARAMETER
 *   route: string   → "/transaksi"   (dari router.pathname, BUKAN router.asPath)
 *
 * RETURN
 *   string[]        → ["duidtin_ui_transaksi"]   nama container doang, objeknya dibuang
 *
 * SENGAJA cuma `featureRegistry`, TANPA `globalFeatures` — yang global sudah
 * dimuat unconditional di FASE 1, nggak perlu di-route-match lagi.
 *
 * KONDISI SEKARANG: `featureRegistry` masih kosong, jadi fungsi ini SELALU
 * balik [] buat route apapun.
 */
export const getModulesForRoute = (route: string): string[] =>
  // ── Langkah 1: objek → array ────────────────────────────────────────────
  // featureRegistry itu objek berkunci nama:
  //   { duidtin_ui_transaksi: {...}, duidtin_ui_laporan: {...} }
  // Object.values() buang kuncinya, sisakan isinya jadi array:
  //   → [ {name:"duidtin_ui_transaksi", routes:["/transaksi"], ...},
  //       {name:"duidtin_ui_laporan",   routes:["/laporan","/rekap"], ...} ]
  Object.values(featureRegistry)
    // ── Langkah 2: saring yang route-nya cocok ────────────────────────────
    // Tetap FeatureMetadata[], cuma isinya menyusut.
    // Dengan route = "/transaksi":
    //   → [ {name:"duidtin_ui_transaksi", ...} ]     ← laporan tersaring keluar
    .filter((feature: FeatureMetadata) =>
      // .some() = "CUKUP SATU yang cocok". Satu remote boleh punya banyak route,
      // mis. routes: ["/laporan", "/rekap"] — cocok salah satu sudah lolos.
      feature.routes.some((pattern: string) =>
        // `?? "prefix"` = kalau matchType nggak diisi di registry, anggap "prefix"
        isRouteMatch(pattern, route, feature.matchType ?? "prefix"),
      ),
    )
    // ── Langkah 3: objek → nama ───────────────────────────────────────────
    // Di sinilah datanya menyusut drastis: FeatureMetadata[] → string[].
    //   → ["duidtin_ui_transaksi"]
    // Sisa metadata (entryPath, devOrigin) nggak dibawa, karena loadRemote()
    // cuma butuh nama — URL-nya sudah didaftarkan ke MF runtime sejak FASE 1.
    .map((feature: FeatureMetadata) => feature.name);
