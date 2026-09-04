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

  /**
   * PARAMETER
   *   moduleName: string  → "duidtin_ui_transaksi"   (nama container, underscore)
   *
   * RETURN
   *   Promise<void> → undefined. Nggak ada nilai berguna yang dibalikin;
   *   semua hasil kerjanya berupa EFEK SAMPING (requestedRef, moduleStatus,
   *   request jaringan, console).
   *
   * Dipanggil `void loadModule(...)` dari loadModulesByRoute — nggak ditunggu.
   */
  const loadModule = useCallback(async (moduleName: string) => {
    // ── Penjaga anti-dobel ────────────────────────────────────────────────
    // Panggilan PERTAMA  "duidtin_ui_transaksi" → Set masih kosong  → lanjut
    // Panggilan KEDUA    "duidtin_ui_transaksi" → sudah ada di Set  → RETURN
    //   di panggilan kedua: nggak ada fetch, nggak ada perubahan status,
    //   fungsi langsung selesai.
    if (requestedRef.current.has(moduleName)) return;

    // requestedRef:  Set {}  →  Set { "duidtin_ui_transaksi" }
    requestedRef.current.add(moduleName);

    // moduleStatus:  {}  →  { "duidtin_ui_transaksi": "loading" }
    //
    // Pakai bentuk (prev) => ..., bukan setModuleStatus({ ...moduleStatus, ... }),
    // karena beberapa modul di-set BARENGAN (loop-nya paralel). Bentuk callback
    // selalu baca nilai terbaru; kalau baca variabel `moduleStatus` langsung,
    // modul kedua bisa nimpa hasil modul pertama.
    //
    // `[moduleName]:` itu computed key — nama propertinya diambil dari isi
    // variabel, jadi jadinya "duidtin_ui_transaksi", bukan harfiah "moduleName".
    setModuleStatus((prev) => ({ ...prev, [moduleName]: "loading" }));

    // Di SINI fetch beneran terjadi (2 request: remoteEntry.js + globals chunk).
    // isLoaded: true kalau berhasil, false kalau gagal — TIDAK PERNAH throw.
    const isLoaded = await dynamicLoadStyles(moduleName);

    // FASE 2 nggak punya jejak visual apapun — nggak ada yang berubah di layar
    // waktu dia jalan. Tanpa log ini satu-satunya cara mastiin dia beneran
    // kepanggil adalah ngintip Network tab. Dev-only, nggak ikut ke production.
    if (process.env.NODE_ENV === "development") {
      console.info(`[MFE] FASE 2 warm-up "${moduleName}" → ${isLoaded ? "ok" : "GAGAL"}`);
    }

    // Gagal → dilepas dari daftar "sudah diminta", supaya navigasi berikutnya
    // ke route yang sama boleh nyoba lagi (dev server remote-nya mungkin baru nyala).
    //   requestedRef:  Set { "duidtin_ui_transaksi" }  →  Set {}
    if (!isLoaded) requestedRef.current.delete(moduleName);

    // moduleStatus:
    //   isLoaded true  → { "duidtin_ui_transaksi": "loaded" }
    //   isLoaded false → { "duidtin_ui_transaksi": "error"  }
    setModuleStatus((prev) => ({ ...prev, [moduleName]: isLoaded ? "loaded" : "error" }));

    // Ringkasan satu panggilan yang sukses:
    //   masukan  : "duidtin_ui_transaksi"
    //   keluaran : undefined
    //   requestedRef  Set {}  →  Set { "duidtin_ui_transaksi" }
    //   moduleStatus  {}  →  {...:"loading"}  →  {...:"loaded"}
    //   jaringan      2 request
    //   console       [MFE] FASE 2 warm-up "duidtin_ui_transaksi" → ok
  }, []);

  const loadModulesByRoute = useCallback((route: string) => {
      // return getModulesForRoute masuk ke moduleName
      for (const moduleName of getModulesForRoute(route)) {
        void loadModule(moduleName);
      }
    },[loadModule],
  );

  return { loadModulesByRoute, moduleStatus };
};
