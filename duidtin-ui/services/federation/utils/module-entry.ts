import { getFeatureByName, getFeatureEntryUrl } from "./registry";
import { bacaRemoteLokal } from "./remote-lokal";

/**
 * Dari nama remote jadi URL remoteEntry sungguhan. Dua lapis, sama seperti `qcash-ui`:
 *
 *   Lapis B — override `?remote-lokal` (remote-lokal.ts): kalau remote ini diarahkan
 *             ke laptop, pakai http://localhost:<port> + entryPath. Menang atas lapis A.
 *   Lapis A — environment detection (getBaseFederationUrl): devOrigin di localhost,
 *             origin halaman di tempat lain.
 */
export const getModuleEntry = (name: string): string => {
  const feature = getFeatureByName(name);

  if (!feature) {
    throw new Error(`[MFE] Feature "${name}" nggak terdaftar di registry`);
  }

  const originLokal = bacaRemoteLokal()[name];

  if (originLokal) return `${originLokal}${feature.entryPath}`;

  return getFeatureEntryUrl(feature);
};
