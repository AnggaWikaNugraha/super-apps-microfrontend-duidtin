import { init, loadRemote } from "@module-federation/runtime";

import { DESIGN_SYSTEM_ENTRY_PATH, DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { getBaseFederationUrl } from "@/utils";

let isRegistered = false;

/**
 * Daftarkan design-system ke MF runtime MILIK REPO INI.
 *
 * KENAPA NGGAK DI `pages/_app.tsx`:
 * waktu beranda dimuat sebagai remote, host cuma ngambil modul `./base` —
 * `_app.tsx` NGGAK PERNAH dieksekusi. Jadi apapun yang ditaruh di sana cuma
 * jalan kalau repo ini dibuka langsung di :3003, bukan waktu dipakai host.
 *
 * KENAPA NGGAK DI `remotes` build-time:
 * itu cara `duidtin-ui-layout`, dan jadi ganjalan di sana — URL-nya ke-bake
 * pas build, jadi URL dev ikut kebawa sampai production.
 *
 * Jadi pendaftarannya ditaruh di jalur kode yang PASTI jalan di dua-duanya:
 * modul yang di-import komponen beranda sendiri.
 *
 * Catatan: runtime MF di bundel repo ini instance TERPISAH dari punya host
 * (2.x vs 0.24.1), jadi registry-nya juga terpisah — design-system harus
 * didaftarkan lagi di sini walaupun host sudah mendaftarkannya.
 */
export const ensureDesignSystemRegistered = (): void => {
  if (isRegistered || !globalThis.window) return;

  isRegistered = true;

  init({
    name: "duidtin_feature_beranda",
    remotes: [
      {
        name: DESIGN_SYSTEM_REMOTE,
        entry: `${getBaseFederationUrl()}${DESIGN_SYSTEM_ENTRY_PATH}`,
      },
    ],
  });

  // cegah FOUC — CSS design-system ke-fetch duluan sebelum komponennya dirender
  void loadRemote(`${DESIGN_SYSTEM_REMOTE}/globals`);
};
