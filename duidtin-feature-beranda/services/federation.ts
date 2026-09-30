import { init, loadRemote } from "@module-federation/runtime";

import { DESIGN_SYSTEM_ENTRY_PATH, DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { getBaseFederationUrl } from "@/utils";

let siap: Promise<void> | undefined;

/**
 * Daftarkan design-system ke MF runtime MILIK REPO INI, lalu muat CSS-nya dan
 * SEMUA pembungkus Web Component-nya.
 *
 * KENAPA PEMBUNGKUS, BUKAN KOMPONEN REACT-NYA:
 * repo ini Vue. `./components/<n>` mengembalikan komponen React yang tidak bisa
 * dirender Vue. `./component-wrapper/semua` sebaliknya cuma punya efek samping —
 * `customElements.define("dtn-card", …)` dan seterusnya — setelah itu `<dtn-card>`
 * bisa dipakai di template Vue mana pun seperti tag HTML biasa.
 *
 * KENAPA TIDAK DI ENTRY DEV:
 * waktu beranda dimuat sebagai remote, host cuma mengambil modul `./base` —
 * entry dev NGGAK PERNAH dieksekusi. Jadi pendaftarannya ditaruh di jalur kode
 * yang PASTI jalan di dua-duanya.
 *
 * KENAPA TIDAK DI `remotes` BUILD-TIME:
 * itu cara `duidtin-ui-layout`, dan jadi ganjalan di sana — URL-nya ke-bake pas
 * build, jadi URL dev ikut kebawa sampai production.
 *
 * Catatan: runtime MF di bundel repo ini instance TERPISAH dari punya host, jadi
 * registry-nya juga terpisah — design-system harus didaftarkan lagi di sini
 * walaupun host sudah mendaftarkannya.
 */
export const siapkanDesignSystem = (): Promise<void> => {
  siap ??= (async () => {
    // Kalau dimuat host, pakai URL design-system yang sudah di-resolve host (termasuk
    // override ?remote-lokal dan mode REMOTE_DARI=publish). Dibuka sendiri → cara lama.
    const entryDariHost = globalThis.window?.__DUIDTIN_REMOTE_ENTRY__?.[DESIGN_SYSTEM_REMOTE];

    init({
      name: "duidtin_feature_beranda",
      remotes: [
        {
          name: DESIGN_SYSTEM_REMOTE,
          entry: entryDariHost ?? `${getBaseFederationUrl()}${DESIGN_SYSTEM_ENTRY_PATH}`,
        },
      ],
    });

    await Promise.all([
      // cegah FOUC — CSS design-system ke-fetch duluan sebelum komponennya dirender
      loadRemote(`${DESIGN_SYSTEM_REMOTE}/globals`),
      loadRemote(`${DESIGN_SYSTEM_REMOTE}/component-wrapper/semua`),
    ]);
  })();

  return siap;
};
