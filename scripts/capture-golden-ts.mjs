// Capture golden GameState JSON for saved games FROM THE TS ENGINE itself (not the jar).
//
// Use this AFTER the Java→TS cutover, for TS-only features the frozen Java engine on the
// `6.x` branch can no longer produce a reference for. The TS engine becomes the oracle:
// you author a `.jcz` replay, capture its per-step output here, **review it once to confirm
// it is correct**, then commit the `*.golden.jsonl` as a regression baseline that
// `state-parity.test.ts` enforces from then on.
//
// Existing Java-derived goldens stay as-is — only capture NEW or intentionally-changed tests.
//
// Usage (build first — this loads the compiled dist/):
//   npm run build
//   node scripts/capture-golden-ts.mjs                 # all .jcz
//   node scripts/capture-golden-ts.mjs tower           # only engine-tests/tower/
//   node scripts/capture-golden-ts.mjs tower/foo.jcz   # a single test
//
// Unlike capture-golden.mjs (the jar capture) this needs NO Java and NO jar.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, isAbsolute, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { buildWireLines, resolveXmlPaths } from "./jcz-wire.mjs";

const REPO = process.cwd();
const TESTS_ROOT = join(REPO, "engine-tests");
const XMLS_DIR = join(REPO, "xmls");

// load the compiled TS engine from dist/ (run `npm run build` first)
const distBase = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "com", "jcloisterzone");
const mod = (rel) => pathToFileURL(join(distBase, rel)).href;
const { setDomParserFactory } = await import(mod("XmlUtils.js")).catch((e) => {
  console.error("Could not load dist/. Run `npm run build` first.\n" + e.message);
  process.exit(2);
});
const { Engine } = await import(mod("engine/Engine.js"));
setDomParserFactory(() => new DOMParser());

const filter = process.argv.slice(2).find((a) => !a.startsWith("-")) ?? null;

/** Replay one .jcz through a fresh TS engine; return the emitted state lines. */
function runTs(jcz, xmlPaths) {
  const engine = new Engine((p) => readFileSync(p, "utf8"));
  const out = [];
  for (const line of buildWireLines(jcz, xmlPaths)) {
    const r = engine.processInput(line);
    if (r !== null && r.startsWith("{")) out.push(r);
  }
  return out;
}

/** Capture one .jcz at an absolute path. */
function capture(jczPath) {
  const jcz = JSON.parse(readFileSync(jczPath, "utf8"));
  if (jcz.setup?.addons) delete jcz.setup.addons; // save-version metadata the engine ignores
  const xmlPaths = resolveXmlPaths(jcz.setup.sets, XMLS_DIR);
  const rel = jczPath.slice(TESTS_ROOT.length + 1);
  if (!xmlPaths) {
    process.stdout.write(`SKIPPED ${rel} (missing set XML)\n`);
    return "skip";
  }
  let lines;
  try {
    lines = runTs(jcz, xmlPaths);
  } catch (e) {
    process.stdout.write(`FAILED  ${rel} (${e.message})\n`);
    return "fail";
  }
  if (lines.length === 0) {
    process.stdout.write(`SKIPPED ${rel} (0 states emitted)\n`);
    return "skip";
  }
  const goldenPath = jczPath.replace(/\.jcz$/, ".golden.jsonl");
  writeFileSync(goldenPath, lines.join("\n") + "\n", "utf8");
  process.stdout.write(`captured ${rel} -> ${lines.length} states\n`);
  return "ok";
}

/** Collect target .jcz paths from the optional filter (dir name or single test path). */
function targets() {
  if (filter) {
    if (filter.endsWith(".jcz")) {
      const p = isAbsolute(filter) ? filter : join(existsSync(filter) ? REPO : TESTS_ROOT, filter);
      if (!existsSync(p)) {
        console.error(`No such test: ${filter}`);
        process.exit(2);
      }
      return [p];
    }
    const dirPath = join(TESTS_ROOT, filter);
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
      console.error(`No such test directory: engine-tests/${filter}`);
      process.exit(2);
    }
    return readdirSync(dirPath).filter((f) => f.endsWith(".jcz")).map((f) => join(dirPath, f));
  }
  const all = [];
  for (const dir of readdirSync(TESTS_ROOT)) {
    const dirPath = join(TESTS_ROOT, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    for (const f of readdirSync(dirPath)) if (f.endsWith(".jcz")) all.push(join(dirPath, f));
  }
  return all;
}

const tally = { ok: 0, skip: 0, fail: 0 };
for (const p of targets()) tally[capture(p)]++;
console.log(`\nDONE. captured: ${tally.ok}, skipped: ${tally.skip}, failed: ${tally.fail}`);
console.log("Review the new/changed *.golden.jsonl before committing — the TS engine is the oracle now.");
