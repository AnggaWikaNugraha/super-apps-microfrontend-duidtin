import { defineConfig } from "@rslib/core";

import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      // file .css sengaja dikecualiin di sini: entry ini bundle:false, jadi tiap file
      // diproses SENDIRI-SENDIRI — file css komponen nggak punya konteks
      // `@import "tailwindcss" prefix(ui)`, jadi `@apply ui:...`-nya bakal error.
      // CSS-nya digabung & dikompilasi di lib kedua (index.tailwind) di bawah.
      source: { entry: { index: ["./src/**", "!./src/**/*.stories.tsx", "!./src/**/*.css"] } },
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
