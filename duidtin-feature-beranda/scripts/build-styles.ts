/**
 * Kompilasi Tailwind jadi STRING, lalu tulis `styles/global.exposes.ts`.
 *
 * KENAPA REPOT BEGINI:
 * Next melarang import CSS global dari berkas selain `pages/_app.tsx` — dan
 * modul yang di-expose Module Federation ("./globals") jelas bukan `_app.tsx`.
 * Jadi CSS-nya nggak bisa sekadar di-`import`.
 *
 * Repo lain menyiasatinya berbeda:
 *   duidtin-ui-layout  → rule webpack custom (style-loader/css-loader)
 *   repo ini           → compile jadi string, suntik manual lewat <style>
 *                        (pola yang sama dengan qcash-ui-dashboard-dhe)
 *
 * Dijalankan otomatis lewat `predev` dan `prebuild`, jadi nggak perlu diingat.
 * Hasilnya (`styles/global.exposes.ts`) berkas GENERATE — jangan diedit tangan,
 * dan nggak ikut ke git.
 */
import { $ } from "bun";

const INPUT = "./styles/globals.css";
const OUTPUT = "./styles/global.exposes.ts";
const STYLE_ID = "duidtin-feature-beranda-globals";

const css = await $`bun x @tailwindcss/cli -i ${INPUT} --minify`.text();

const banner = `// BERKAS HASIL GENERATE — jangan diedit tangan.
// Dihasilkan \`scripts/build-styles.ts\` dari \`styles/globals.css\`.
// Jalankan ulang: bun run style`;

const file = `${banner}

const STYLE_ID = ${JSON.stringify(STYLE_ID)};

const CSS_TEXT = ${JSON.stringify(css)};

export const styleId = STYLE_ID;
export const cssText = CSS_TEXT;

/**
 * Suntik CSS ke <head>. Idempotent — kalau <style> dengan id yang sama sudah
 * ada, nggak disuntik ulang.
 */
export function ensureGlobalsStylesheet(): string {
  if (typeof document === "undefined") return CSS_TEXT;
  if (document.getElementById(STYLE_ID)) return CSS_TEXT;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);

  return CSS_TEXT;
}

// Dieksekusi begitu modul ini di-loadRemote — itu inti gunanya "./globals".
ensureGlobalsStylesheet();

export default ensureGlobalsStylesheet;
`;

await Bun.write(OUTPUT, file);

console.log(`[style] ${OUTPUT} — ${(css.length / 1024).toFixed(1)} kB CSS`);
