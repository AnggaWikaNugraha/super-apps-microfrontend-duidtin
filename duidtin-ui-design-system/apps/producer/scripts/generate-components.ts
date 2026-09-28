import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_ROOT = join(import.meta.dir, "../../../packages/ui/src/components");
const WRAPPER_ROOT = join(import.meta.dir, "../../../packages/ui/src/component-wrapper");
const PRODUCER_COMPONENTS_ROOT = join(import.meta.dir, "../src/components");
const PRODUCER_WRAPPER_ROOT = join(import.meta.dir, "../src/component-wrapper");
const EXPOSES_FILE = join(PRODUCER_COMPONENTS_ROOT, "component-exposes.ts");

function toPascalCase(kebabCase: string): string {
  return kebabCase
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

const componentDirs = readdirSync(COMPONENTS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (!existsSync(PRODUCER_COMPONENTS_ROOT)) {
  mkdirSync(PRODUCER_COMPONENTS_ROOT, { recursive: true });
}

const exposeEntries: string[] = [];

for (const dir of componentDirs) {
  const componentName = toPascalCase(dir);
  const shimPath = join(PRODUCER_COMPONENTS_ROOT, `${dir}.ts`);

  writeFileSync(shimPath, `export { ${componentName} } from "@duidtin/ui";\nexport { ${componentName} as default } from "@duidtin/ui";\n`);

  exposeEntries.push(`  "./components/${dir}": "./src/components/${dir}.ts",`);
}

/**
 * Pembungkus Web Component (`<dtn-*>`) di-expose terpisah dari komponen React.
 *
 * Konsumen React memakai `./components/<n>`; konsumen non-React (Vue/Svelte/Angular)
 * memuat `./component-wrapper/<n>` sekali — modulnya mendaftarkan elemennya lewat
 * efek samping, lalu tag-nya bisa dipakai di seluruh halaman.
 */
const wrapperDirs = existsSync(WRAPPER_ROOT)
  ? readdirSync(WRAPPER_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "utils")
      .map((entry) => entry.name)
      .sort()
  : [];

if (wrapperDirs.length && !existsSync(PRODUCER_WRAPPER_ROOT)) {
  mkdirSync(PRODUCER_WRAPPER_ROOT, { recursive: true });
}

for (const dir of wrapperDirs) {
  writeFileSync(
    join(PRODUCER_WRAPPER_ROOT, `${dir}.ts`),
    `import "@duidtin/ui/component-wrapper/${dir}";\n\nexport {};\n`,
  );

  exposeEntries.push(`  "./component-wrapper/${dir}": "./src/component-wrapper/${dir}.ts",`);
}

// satu pintu: memuat ini mendaftarkan SEMUA elemen sekaligus
if (wrapperDirs.length) {
  writeFileSync(
    join(PRODUCER_WRAPPER_ROOT, "semua.ts"),
    wrapperDirs.map((dir) => `import "@duidtin/ui/component-wrapper/${dir}";`).join("\n") + "\n\nexport {};\n",
  );

  exposeEntries.push(`  "./component-wrapper/semua": "./src/component-wrapper/semua.ts",`);
}

writeFileSync(EXPOSES_FILE, `export const componentExposes = {\n${exposeEntries.sort().join("\n")}\n};\n`);

console.log(`[generate-components] ${componentDirs.length} komponen React + ${wrapperDirs.length} pembungkus Web Component di-expose`);
