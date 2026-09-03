import { LOCAL_DESIGN_SYSTEM_ORIGIN } from "@/constants/federation";

const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];

/**
 * Base URL remote yang dikonsumsi repo ini, dibaca dari `window.location.hostname`
 * SAAT ITU JUGA — bukan pas build. Wajib fungsi, bukan konstanta hardcode: kalau
 * di-hardcode, layout ini bakal selalu manggil URL dev walaupun lagi diakses dari
 * production.
 *
 * Dev lokal → origin design-system langsung (port beda).
 * Selain itu → origin yang lagi dibuka; di production semua remote satu domain,
 * dibedain lewat basePath masing-masing.
 */
export const getBaseFederationUrl = (): string => {
  if (!globalThis.window) return LOCAL_DESIGN_SYSTEM_ORIGIN;

  const { hostname, origin } = globalThis.window.location;

  if (LOCAL_HOSTNAMES.includes(hostname)) return LOCAL_DESIGN_SYSTEM_ORIGIN;

  return origin;
};
