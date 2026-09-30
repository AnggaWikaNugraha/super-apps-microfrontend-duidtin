/**
 * Menulis `src/component-wrapper/<nama>/index.ts` untuk tiap komponen di `src/components`.
 *
 * Yang dibaca otomatis:
 *   - nama varian  ← `src/styles/<n>/<n>.styles.ts`  (kunci di dalam `variants: { … }`)
 *   - bagian compound ← `src/components/<n>/index.ts` (kunci `Object.assign(Root, { … })`)
 *
 * Yang tidak bisa disimpulkan (props non-varian, event, komponen yang tidak boleh dipecah)
 * ada di `src/component-wrapper/utils/peta.ts`.
 *
 * Berkas hasil generate JANGAN diedit tangan — jalankan ulang `bun run gen:wrapper`.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { peta } from "../src/component-wrapper/utils/peta";

const SRC = join(import.meta.dir, "../src");
const KOMPONEN = join(SRC, "components");
const WRAPPER = join(SRC, "component-wrapper");

const pascal = (kebab: string) => kebab.split("-").map((b) => b[0].toUpperCase() + b.slice(1)).join("");

const varian = (nama: string): string[] => {
  try {
    const isi = readFileSync(join(SRC, "styles", nama, `${nama}.styles.ts`), "utf8");
    const mulai = isi.indexOf("variants: {");

    if (mulai === -1) return [];

    let i = isi.indexOf("{", mulai) + 1;
    let dalam = 1;

    while (i < isi.length && dalam > 0) {
      if (isi[i] === "{") dalam += 1;
      if (isi[i] === "}") dalam -= 1;
      i += 1;
    }

    return [...isi.slice(mulai, i).matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
  } catch {
    return [];
  }
};

const bagianCompound = (nama: string): string[] => {
  const isi = readFileSync(join(KOMPONEN, nama, "index.ts"), "utf8");
  const cocok = /Object\.assign\(\s*\w+\s*,\s*{([\s\S]*?)}\s*\)/.exec(isi);

  if (!cocok) return [];

  return cocok[1]
    .split(",")
    .map((baris) => baris.split(":")[0].trim())
    .filter((kunci) => /^[A-Z]\w*$/.test(kunci) && kunci !== "Root");
};

const daftarProp = (props: Record<string, string>): string =>
  Object.entries(props)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(", ");

const dilewati: string[] = [];
const dibuat: string[] = [];
/** nama elemen → daftar atribut, dipakai menulis deklarasi JSX */
const elemen: Record<string, string[]> = {};

for (const nama of readdirSync(KOMPONEN, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()) {
  const sesuaian = peta[nama] ?? {};
  const folder = join(WRAPPER, nama);

  if (sesuaian.lewati) {
    dilewati.push(nama);
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      join(folder, "index.ts"),
      `// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).\n` +
        `//\n` +
        `// ${pascal(nama)} SENGAJA belum dibungkus jadi Web Component.\n` +
        `//\n` +
        `// ${sesuaian.lewati.replace(/(.{92}\S*)\s+/g, "$1\n// ")}\n` +
        `\nexport const BELUM_DIBUNGKUS = ${JSON.stringify(sesuaian.lewati)};\n`,
    );
    continue;
  }

  const props: Record<string, string> = {};

  for (const v of varian(nama)) props[v] = "string";
  Object.assign(props, sesuaian.props ?? {});

  const bagian = sesuaian.bagian === false ? [] : bagianCompound(nama);
  const Komponen = pascal(nama);
  const opsi = [
    Object.keys(props).length ? `props: { ${daftarProp(props)} }` : "",
    sesuaian.events ? `events: { ${daftarProp(sesuaian.events)} }` : "",
  ].filter(Boolean);

  const baris = [
    "// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).",
    "//",
    `// <dtn-${nama}> menjalankan komponen React ${Komponen} yang sama, dengan kelas CSS`,
    "// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya",
    "// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.",
    "",
    `import { ${Komponen} } from "../../components/${nama}";`,
    'import { buatElemen } from "../utils/inti";',
    "",
    `export const NAMA_ELEMEN = "dtn-${nama}";`,
    "",
    `buatElemen(NAMA_ELEMEN, ${Komponen} as never${opsi.length ? `, { ${opsi.join(", ")} }` : ""});`,
  ];

  for (const b of bagian) {
    const kebab = b.replace(/[A-Z]/g, (h) => `-${h.toLowerCase()}`).replace(/^-/, "");
    const propsBagian = sesuaian.propsBagian?.[b];
    const opsiBagian = propsBagian ? `, { props: { ${daftarProp(propsBagian)} } }` : "";

    baris.push(`buatElemen("dtn-${nama}-${kebab}", ${Komponen}.${b} as never${opsiBagian});`);
  }

  elemen[`dtn-${nama}`] = Object.keys(props).map((k) => k.replace(/[A-Z]/g, (h) => `-${h.toLowerCase()}`)).sort();

  for (const b of bagian) {
    const kebab = b.replace(/[A-Z]/g, (h) => `-${h.toLowerCase()}`).replace(/^-/, "");

    elemen[`dtn-${nama}-${kebab}`] = Object.keys(sesuaian.propsBagian?.[b] ?? {})
      .map((k) => k.replace(/[A-Z]/g, (h) => `-${h.toLowerCase()}`))
      .sort();
  }

  baris.push("", "export default NAMA_ELEMEN;", "");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "index.ts"), baris.join("\n"));
  dibuat.push(`${nama}${bagian.length ? ` (+${bagian.length} bagian)` : ""}`);
}

// satu pintu: memuat ini mendaftarkan SEMUA elemen sekaligus
writeFileSync(
  join(WRAPPER, "index.ts"),
  `// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).\n` +
    `//\n// Memuat berkas ini mendaftarkan semua elemen <dtn-*> sekaligus.\n\n` +
    readdirSync(WRAPPER, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "utils")
      .map((e) => e.name)
      .sort()
      .map((n) => `import "./${n}";`)
      .join("\n") +
    "\n",
);

// deklarasi JSX supaya <dtn-*> dikenali TypeScript di berkas .tsx
writeFileSync(
  join(WRAPPER, "utils", "elemen.d.ts"),
  `// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).\n` +
    `//\n// Custom element tidak punya tipe otomatis di JSX. Konsumen Vue punya\n` +
    `// padanannya sendiri lewat \`GlobalComponents\`.\n\n` +
    `import type { DetailedHTMLProps, HTMLAttributes } from "react";\n\n` +
    `type Atribut = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;\n\n` +
    `declare global {\n  namespace JSX {\n    interface IntrinsicElements {\n` +
    Object.entries(elemen)
      .map(([nama, atribut]) => {
        const tambahan = atribut.map((a) => `"${a}"?: string`).join("; ");

        return `      "${nama}": Atribut${tambahan ? ` & { ${tambahan} }` : ""};`;
      })
      .join("\n") +
    `\n    }\n  }\n}\n\nexport {};\n`,
);

console.log(`[wrapper] ${dibuat.length} elemen: ${dibuat.join(", ")}`);
console.log(`[wrapper] ${dilewati.length} dilewati (butuh elemen khusus): ${dilewati.join(", ")}`);
