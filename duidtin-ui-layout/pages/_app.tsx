import { init, loadRemote } from "@module-federation/runtime";

import { DESIGN_SYSTEM_ENTRY_PATH, DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { getBaseFederationUrl } from "@/utils";

import "@/styles/globals.css";

import type { AppProps } from "next/app";

// Client-only, jalan di top-level sebelum React render apapun. Ini yang BENERAN
// nentuin URL remote yang di-fetch browser user (entry-nya hasil environment
// detection), beda dari `remotes` statis di module-federation.config.mjs yang
// cuma dipakai webpack pas build.
if (globalThis.window) {
  init({
    name: "duidtin_ui_layout",
    remotes: [
      {
        name: DESIGN_SYSTEM_REMOTE,
        entry: `${getBaseFederationUrl()}${DESIGN_SYSTEM_ENTRY_PATH}`,
      },
    ],
  });

  // cegah FOUC — CSS design-system ke-fetch duluan sebelum layout dirender
  void loadRemote(`${DESIGN_SYSTEM_REMOTE}/globals`);
}

const App = ({ Component, pageProps }: AppProps) => <Component {...pageProps} />;

export default App;
