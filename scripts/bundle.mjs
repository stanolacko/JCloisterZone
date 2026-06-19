// Bundle the compiled CLI (dist/cli/jcz-engine.js) into a single self-contained
// CommonJS file (bundle/jcz-engine.js) that runs with `node jcz-engine.js` in any
// directory. The engine's `--version` is taken from package.json's `version` field
// (single source of truth) and injected via esbuild's `define`, so the release tag,
// package.json version, and reported version all stay in sync.
//
// Run after `npm run build` (it bundles dist/, not the TS source). Wired as `build:bundle`.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

await build({
  entryPoints: ["dist/cli/jcz-engine.js"],
  bundle: true,
  platform: "node",
  target: "node16",
  format: "cjs",
  outfile: "bundle/jcz-engine.js",
  define: { __ENGINE_VERSION__: JSON.stringify(version) },
});

console.log(`bundled bundle/jcz-engine.js  (version ${version})`);
