import { defineConfig } from "@rslib/core";

import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      source: { entry: { index: ["./src/**", "!./src/**/*.stories.tsx"] } },
      bundle: false,
    },
    {
      format: "esm",
      dts: false,
      source: { entry: { "index.tailwind": "./src/styles/index.tailwind.css" } },
    },
  ],
  output: {
    target: "web",
  },
  plugins: [pluginReact()],
});
