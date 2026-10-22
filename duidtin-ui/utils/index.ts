const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];

// Bawaan dev "publish" (.env.development); "lokal" di .env.local → tiap remote dari port-nya sendiri
const REMOTE_DARI_PUBLISH = process.env.NEXT_PUBLIC_REMOTE_DARI === "publish";

/**
 * Base URL sebuah remote, dibaca dari `window.location.hostname` SAAT ITU JUGA —
 * bukan pas build. Wajib fungsi, bukan konstanta: kalau di-hardcode, host bakal
 * selalu manggil URL dev walaupun lagi diakses dari production.
 *
 * Dev lokal → `devOrigin` remote-nya (tiap remote port sendiri, beda origin).
 * Selain itu → origin yang lagi dibuka; di production semua remote satu domain,
 * dibedain lewat prefix path di `entryPath` masing-masing.
 *
 * Pengecualian `NEXT_PUBLIC_REMOTE_DARI=publish` (bawaan dev, dari `.env.development`):
 * host lokal tetap memakai origin-nya sendiri, lalu rewrites di next.config (env
 * REMOTE_*_URL) meneruskan tiap path remote ke Vercel. Server remote tidak perlu
 * dinyalakan; yang sedang dikerjakan diarahkan ke laptop lewat `?remote-lokal`.
 */
export const getBaseFederationUrl = (devOrigin: string): string => {
  if (!globalThis.window) return devOrigin;

  const { hostname, origin } = globalThis.window.location;

  if (LOCAL_HOSTNAMES.includes(hostname) && !REMOTE_DARI_PUBLISH) return devOrigin;

  return origin;
};
