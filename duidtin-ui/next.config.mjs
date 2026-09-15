import { NextFederationPlugin } from "@module-federation/nextjs-mf";

import { federationConfig } from "./module-federation.config.mjs";

const tanpaGarisMiringAkhir = (url) => url.replace(/\/+$/, "");

/**
 * Di produksi host jadi router satu domain: path tiap remote diteruskan ke project
 * Vercel-nya. Aturan cuma dipasang kalau env-nya terisi, jadi dev lokal (env kosong)
 * tetap mengakses remote langsung lewat port masing-masing.
 *
 * Dikunci saat build — mengganti env berarti redeploy.
 */
const remoteRewrites = () => {
  const { REMOTE_BERANDA_URL, REMOTE_DESIGN_SYSTEM_URL, REMOTE_LAYOUT_URL } = process.env;

  return [
    // design-system bukan Next dan tanpa basePath: berkasnya ada di root domainnya,
    // jadi prefiks /design-system/static dibuang
    REMOTE_DESIGN_SYSTEM_URL && {
      source: "/design-system/static/:path*",
      destination: `${tanpaGarisMiringAkhir(REMOTE_DESIGN_SYSTEM_URL)}/:path*`,
    },
    REMOTE_LAYOUT_URL && {
      source: "/layout/:path*",
      destination: `${tanpaGarisMiringAkhir(REMOTE_LAYOUT_URL)}/layout/:path*`,
    },
    REMOTE_BERANDA_URL && {
      source: "/beranda/:path*",
      destination: `${tanpaGarisMiringAkhir(REMOTE_BERANDA_URL)}/beranda/:path*`,
    },
  ].filter(Boolean);
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Host TANPA basePath — dia yang pegang root domain. Yang punya prefix justru
  // remote-nya: /design-system/static, /layout, /beranda.
  async rewrites() {
    return remoteRewrites();
  },
  webpack: (config, { dev }) => {
    // Build produksi tanpa cache webpack. Vercel memulihkan cache dari deployment
    // sebelumnya, dan bersama nextjs-mf itu bisa menggagalkan build dengan
    // "RealContentHashPlugin: Some kind of unexpected caching problem occurred".
    // Saat dev cache tetap aktif supaya kompilasi ulang cepat.
    if (!dev) config.cache = false;

    config.plugins.push(new NextFederationPlugin({ ...federationConfig }));

    return config;
  },
};

export default nextConfig;
