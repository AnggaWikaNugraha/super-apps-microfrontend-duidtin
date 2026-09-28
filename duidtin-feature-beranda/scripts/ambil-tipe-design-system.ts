/**
 * Unduh arsip tipe design-system lalu buka ke `@mf-types/`.
 *
 * KENAPA SCRIPT SENDIRI, BUKAN FITUR `dts` PLUGIN MF:
 * tiga repo di duidtin memakai tiga keluarga plugin MF yang berbeda (nextjs-mf,
 * enhanced, rsbuild-plugin) dengan cara konfigurasi `dts` yang berbeda pula. Dan
 * remote di repo ini didaftarkan saat RUNTIME, bukan di config build — jadi plugin
 * tidak punya URL untuk mengambil tipenya. Script ini satu cara yang sama untuk
 * semua repo, dan tidak bergantung versi plugin.
 *
 * GAGAL = PERINGATAN, BUKAN ERROR. Kalau design-system sedang tidak terjangkau,
 * build tetap lanjut memakai tipe yang sudah ada (atau tanpa tipe) — jaringan mati
 * tidak boleh menggagalkan build.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { unzipSync } from "fflate";

const REMOTE = "duidtin_ui_design_system";
const ASAL = process.env.MF_TYPES_URL ?? "https://super-apps-duidtin-ui-system.vercel.app";
// import.meta.dir hanya ada di Bun; fileURLToPath jalan di dua-duanya dan lolos tsc
const TUJUAN = join(dirname(fileURLToPath(import.meta.url)), "..", "@mf-types", REMOTE);

const arsip = `${ASAL.replace(/\/+$/, "")}/@mf-types.zip`;

try {
  const respons = await fetch(arsip, { signal: AbortSignal.timeout(15_000) });

  if (!respons.ok) throw new Error(`HTTP ${respons.status}`);

  const isi = unzipSync(new Uint8Array(await respons.arrayBuffer()));

  rmSync(TUJUAN, { force: true, recursive: true });

  let jumlah = 0;

  for (const [nama, data] of Object.entries(isi)) {
    if (nama.endsWith("/")) continue;

    const tujuan = join(TUJUAN, nama);

    if (!existsSync(dirname(tujuan))) mkdirSync(dirname(tujuan), { recursive: true });

    writeFileSync(tujuan, data);
    jumlah += 1;
  }

  console.log(`[tipe] ${jumlah} berkas dari ${arsip}`);
} catch (galat) {
  console.warn(`[tipe] lewati — ${arsip} tidak bisa diambil (${galat instanceof Error ? galat.message : galat})`);
}
