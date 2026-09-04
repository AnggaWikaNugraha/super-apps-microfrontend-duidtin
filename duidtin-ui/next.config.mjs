import { NextFederationPlugin } from "@module-federation/nextjs-mf";

import { federationConfig } from "./module-federation.config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Host TANPA basePath — dia yang pegang root domain. Yang punya prefix justru
  // remote-nya: /design-system (design-system) dan /layout (layout).
  webpack: (config) => {
    config.plugins.push(new NextFederationPlugin({ ...federationConfig }));

    return config;
  },
};

export default nextConfig;
