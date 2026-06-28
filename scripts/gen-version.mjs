// Writes src/main/ts/version.ts from package.json so the engine reports its REAL version
// (e.g. via `--version`, shown in FanCloisterZone's About dialog). Run before build/bundle.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const out = join(root, "src/main/ts/version.ts");
writeFileSync(
  out,
  `// AUTO-GENERATED from package.json by scripts/gen-version.mjs — do not edit by hand.\n` +
    `export const ENGINE_VERSION = ${JSON.stringify(version)};\n`,
);
console.log("engine version.ts ->", version);
