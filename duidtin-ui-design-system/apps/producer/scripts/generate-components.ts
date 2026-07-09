import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_ROOT = join(import.meta.dir, "../../../packages/ui/src/components");
const PRODUCER_COMPONENTS_ROOT = join(import.meta.dir, "../src/components");
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

writeFileSync(EXPOSES_FILE, `export const componentExposes = {\n${exposeEntries.join("\n")}\n};\n`);

console.log(`[generate-components] ${componentDirs.length} component expose(s) generated: ${componentDirs.join(", ")}`);
