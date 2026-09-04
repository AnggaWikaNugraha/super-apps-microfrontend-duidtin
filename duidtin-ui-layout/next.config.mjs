import { NextFederationPlugin } from "@module-federation/nextjs-mf";

import { federationConfig } from "./module-federation.config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // tiap remote punya basePath sendiri; nanti di production semua remote
  // satu domain, dibedain lewat prefix path ini
  basePath: "/layout",
  // WAJIB absolut waktu dev. Tanpa ini publicPath webpack jadi "auto", yang
  // di-resolve relatif terhadap halaman yang lagi dibuka — dan halaman itu
  // punya HOST (:3000), bukan punya repo ini. Akibatnya remoteEntry.js sukses
  // dimuat, tapi chunk di dalamnya diminta ke :3000 dan kena 404:
  //   Loading chunk __federation_expose_default failed
  //   (error: http://localhost:3000/layout/_next/static/chunks/...)
  //
  // Nggak ketahuan sebelum host ada, karena selama ini repo ini cuma KONSUMEN.
  // duidtin-ui-design-system sudah sejak awal pakai pola yang sama lewat
  // MF_PUBLIC_PATH di script dev-nya.
  //
  // Di production nggak diisi: semua remote satu domain, basePath sudah cukup.
  assetPrefix: process.env.MF_PUBLIC_PATH,
  webpack: (config) => {
    // supaya `exposes["./globals"]` (file CSS) bisa di-loadRemote konsumen —
    // CSS-nya di-inject lewat style-loader pas modul-nya diambil, bukan lewat
    // pipeline CSS bawaan Next yang cuma jalan buat import lokal
    config.module.rules.push({
      test: /\.css$/i,
      use: ["style-loader", "css-loader", "postcss-loader"],
    });

    config.plugins.push(new NextFederationPlugin({ ...federationConfig }));

    return config;
  },
};

export default nextConfig;
