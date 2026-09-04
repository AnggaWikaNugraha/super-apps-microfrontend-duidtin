import { loadRemote } from "@module-federation/runtime";

/**
 * Fetch export "/globals" (CSS) sebuah remote. Balikan `true` kalau berhasil.
 *
 * Efek sampingnya justru yang paling penting: `loadRemote()` WAJIB ambil
 * `remoteEntry.js` (container) dulu sebelum bisa ambil export apapun — jadi
 * baris ini sekaligus "manasin" container-nya, bukan cuma narik CSS. Itu sebabnya
 * fungsi yang sama dipakai di FASE 1 (cegah FOUC) dan FASE 2 (warm-up per-route).
 *
 * Sengaja nggak nge-throw: gagal narik style nggak boleh nge-block boot maupun
 * render. Yang butuh tahu hasilnya (FASE 2, buat status) baca nilai balikannya.
 */
export const dynamicLoadStyles = async (moduleName: string): Promise<boolean> => {
  try {
    await loadRemote(`${moduleName}/globals`);

    return true;
  } catch (error) {
    console.error(`[MFE] Gagal load styles "${moduleName}"`, error);

    return false;
  }
};
