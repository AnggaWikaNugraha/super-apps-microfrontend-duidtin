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

const isRouteMatch = (pattern: string, route: string, matchType: RouteMatchType): boolean =>
  matchType === "exact" ? route === pattern : route === pattern || route.startsWith(`${pattern}/`);

/**
 * Filter feature mana yang perlu dimuat buat route ini (FASE 2).
 *
 * SENGAJA cuma `featureRegistry`, TANPA `globalFeatures` — yang global sudah
 * dimuat unconditional di FASE 1, nggak perlu di-route-match lagi.
 *
 * Selama `featureRegistry` masih kosong, fungsi ini selalu balik array kosong.
 */
export const getModulesForRoute = (route: string): string[] =>
  Object.values(featureRegistry)
    .filter((feature: FeatureMetadata) =>
      feature.routes.some((pattern: string) =>
        isRouteMatch(pattern, route, feature.matchType ?? "prefix"),
      ),
    )
    .map((feature: FeatureMetadata) => feature.name);
