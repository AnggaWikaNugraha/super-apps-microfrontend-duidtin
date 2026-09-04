import { useCallback, useRef, useState } from "react";

import { dynamicLoadStyles } from "@/services/federation/utils/loader";
import { getModulesForRoute } from "@/services/federation/utils/registry";

export type ModuleStatus = "loading" | "loaded" | "error";

/**
 * FASE 2 — warm-up container remote per route.
 *
 * PENTING: ini BUKAN yang naruh komponen ke layar. Yang di-fetch di sini cuma
 * `remoteEntry.js` (container) + CSS-nya. JS chunk komponen halamannya baru
 * di-fetch di FASE 3, waktu `loadRemote("<remote>/<modul>")` dipanggil dari file
 * page. Gunanya: pas FASE 3 jalan, container-nya sudah nangkring di cache browser.
 */
export const useModuleLoading = () => {
  const [moduleStatus, setModuleStatus] = useState<Record<string, ModuleStatus>>({});

  // Ref, bukan state — dipakai buat cegah fetch dobel, dan harus kebaca SEKETIKA
  // di pemanggilan berikutnya. Kalau pakai state, dua navigasi cepat berturut-turut
  // bisa sama-sama lolos karena state-nya belum sempat ke-flush.
  const requestedRef = useRef<Set<string>>(new Set());

  const loadModule = useCallback(async (moduleName: string) => {
    if (requestedRef.current.has(moduleName)) return;

    requestedRef.current.add(moduleName);
    setModuleStatus((prev) => ({ ...prev, [moduleName]: "loading" }));

    const isLoaded = await dynamicLoadStyles(moduleName);

    // FASE 2 nggak punya jejak visual apapun — nggak ada yang berubah di layar
    // waktu dia jalan. Tanpa log ini satu-satunya cara mastiin dia beneran
    // kepanggil adalah ngintip Network tab. Dev-only, nggak ikut ke production.
    if (process.env.NODE_ENV === "development") {
      console.info(`[MFE] FASE 2 warm-up "${moduleName}" → ${isLoaded ? "ok" : "GAGAL"}`);
    }

    // Gagal → dilepas dari daftar "sudah diminta", supaya navigasi berikutnya
    // ke route yang sama boleh nyoba lagi (dev server remote-nya mungkin baru nyala).
    if (!isLoaded) requestedRef.current.delete(moduleName);

    setModuleStatus((prev) => ({ ...prev, [moduleName]: isLoaded ? "loaded" : "error" }));
  }, []);

  const loadModulesByRoute = useCallback(
    (route: string) => {
      // Selama featureRegistry masih kosong, ini selalu array kosong dan nggak
      // ada fetch apapun yang jalan di sini. Rangkanya sudah siap buat feature
      // remote pertama.
      for (const moduleName of getModulesForRoute(route)) {
        void loadModule(moduleName);
      }
    },
    [loadModule],
  );

  return { loadModulesByRoute, moduleStatus };
};
