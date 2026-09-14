/**
 * Build untuk Vercel: remote Module Federation + Storybook dalam SATU output.
 *
 * Hasilnya satu folder `apps/producer/dist/mf`:
 *   /remoteEntry.js, /mf-manifest.json, chunk…   ← remote, TETAP di root
 *   /storybook/index.html, /storybook/sb-manager… ← Storybook di sub-folder
 *
 * Remote harus tetap di root karena rewrite host memetakan
 * `/design-system/static/:path*` → `<domain project ini>/:path*`. Storybook
 * aman di sub-folder karena build-nya memakai path aset RELATIF (`./sb-manager/…`).
 *
 * Konsekuensi yang disadari: kalau build Storybook gagal, deploy remote ikut
 * gagal — padahal remote dipakai semua halaman aplikasi. Dipilih demi satu URL.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { $ } from "bun";

const ROOT = join(import.meta.dir, "..");
const REMOTE_OUT = join(ROOT, "apps/producer/dist/mf");
const STORYBOOK_OUT = join(ROOT, "packages/ui/storybook-static");
const TARGET = join(REMOTE_OUT, "storybook");

// Jaring pengaman: MF_PUBLIC_PATH yang terisi akan mengunci URL absolut ke dalam
// remoteEntry.js (mis. localhost) dan membuat semua chunk gagal dimuat di produksi.
if (process.env.MF_PUBLIC_PATH) {
  throw new Error(
    `[build:vercel] MF_PUBLIC_PATH harus kosong di build produksi, sekarang: "${process.env.MF_PUBLIC_PATH}"`,
  );
}

console.log("[build:vercel] 1/3 remote — turbo run build");
await $`bun run build`.cwd(ROOT);

if (!existsSync(join(REMOTE_OUT, "remoteEntry.js"))) {
  throw new Error(`[build:vercel] remoteEntry.js tidak ditemukan di ${REMOTE_OUT}`);
}

console.log("[build:vercel] 2/3 storybook — storybook build");
await $`bun run build-storybook`.cwd(join(ROOT, "packages/ui"));

if (!existsSync(join(STORYBOOK_OUT, "index.html"))) {
  throw new Error(`[build:vercel] index.html Storybook tidak ditemukan di ${STORYBOOK_OUT}`);
}

console.log("[build:vercel] 3/3 salin storybook-static → dist/mf/storybook");
rmSync(TARGET, { recursive: true, force: true });
cpSync(STORYBOOK_OUT, TARGET, { recursive: true });

console.log(`[build:vercel] selesai → ${REMOTE_OUT}  (remote di root, Storybook di /storybook/)`);
