import { getFeatureByName, getFeatureEntryUrl } from "./registry";

/**
 * Dari nama remote jadi URL remoteEntry sungguhan.
 *
 * Versi host `qcash-ui` punya lapis kedua di sini (override port lokal per-module
 * lewat IndexedDB/devtools). Di sini sengaja belum — cuma satu lapis, environment
 * detection, sampai jumlah remote-nya memang bikin itu kepakai.
 */
export const getModuleEntry = (name: string): string => {
  const feature = getFeatureByName(name);

  if (!feature) {
    throw new Error(`[MFE] Feature "${name}" nggak terdaftar di registry`);
  }

  return getFeatureEntryUrl(feature);
};
