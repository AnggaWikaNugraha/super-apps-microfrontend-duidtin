const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];

/**
 * Base URL sebuah remote, dibaca dari `window.location.hostname` SAAT ITU JUGA —
 * bukan pas build. Wajib fungsi, bukan konstanta: kalau di-hardcode, host bakal
 * selalu manggil URL dev walaupun lagi diakses dari production.
 *
 * Dev lokal → `devOrigin` remote-nya (tiap remote port sendiri, beda origin).
 * Selain itu → origin yang lagi dibuka; di production semua remote satu domain,
 * dibedain lewat prefix path di `entryPath` masing-masing.
 */
export const getBaseFederationUrl = (devOrigin: string): string => {
  if (!globalThis.window) return devOrigin;

  const { hostname, origin } = globalThis.window.location;

  if (LOCAL_HOSTNAMES.includes(hostname)) return devOrigin;

  return origin;
};
