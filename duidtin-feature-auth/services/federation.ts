import { init, loadRemote } from "@module-federation/runtime";

import { DESIGN_SYSTEM_ENTRY_PATH, DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { getBaseFederationUrl } from "@/utils";

let isRegistered = false;

/**
 * Daftarkan design-system ke MF runtime MILIK REPO INI.
 *
 * Tidak ditaruh di `pages/_app.tsx`: waktu remote ini dimuat host, host cuma
 * mengambil modul `./login` — `_app.tsx` tidak pernah dieksekusi. Jadi
 * pendaftarannya ditaruh di modul yang pasti ikut ter-import komponennya.
 *
 * Runtime MF repo ini (2.x) instance terpisah dari punya host (0.24.1), jadi
 * registry-nya juga terpisah — design-system harus didaftarkan lagi di sini
 * walaupun host sudah mendaftarkannya.
 */
export const ensureDesignSystemRegistered = (): void => {
  if (isRegistered || !globalThis.window) return;

  isRegistered = true;

  // Kalau dimuat host, pakai URL yang sudah di-resolve host (termasuk override
  // ?remote-lokal dan mode REMOTE_DARI=publish). Dibuka sendiri → cara lama.
  const entryDariHost = globalThis.window.__DUIDTIN_REMOTE_ENTRY__?.[DESIGN_SYSTEM_REMOTE];

  init({
    name: "duidtin_feature_auth",
    remotes: [
      {
        name: DESIGN_SYSTEM_REMOTE,
        entry: entryDariHost ?? `${getBaseFederationUrl()}${DESIGN_SYSTEM_ENTRY_PATH}`,
      },
    ],
  });

  // cegah FOUC — CSS design-system ke-fetch duluan sebelum komponennya dirender
  void loadRemote(`${DESIGN_SYSTEM_REMOTE}/globals`);
};
