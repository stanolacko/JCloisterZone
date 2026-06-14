// Capture Java's reference GameState JSON for each saved game, to enforce the rule:
//   "the GameState JSON must be identical between Engine.jar and the TS engine".
//
// Spawns the real Engine.jar, pipes each test's wire stream, and records the
// per-message state lines to `<test>.golden.jsonl` next to the .jcz. The parity
// test then deep-compares the TS engine's output against these golden files.
//
// Usage:
//   JCZ_JAR=/path/to/Engine.jar node scripts/capture-golden.mjs [--java java] [--only basic]
//
// Requires the jar + a JDK on PATH. This script does NOT need the TS build.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildWireLines, resolveXmlPaths } from "./jcz-wire.mjs";

const REPO = process.cwd();
const TESTS_ROOT = join(REPO, "engine-tests");
const XMLS_DIR = join(REPO, "xmls");

const args = process.argv.slice(2);
const javaBin = argVal("--java") || "java";
const jar = process.env.JCZ_JAR || argVal("--jar");
const only = argVal("--only"); // optional dir filter
if (!jar) {
  console.error("Set JCZ_JAR=/path/to/Engine.jar (or pass --jar). Aborting.");
  process.exit(2);
}

function argVal(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

/** Run the jar on one stream; resolve to the array of emitted JSON lines. */
function runJar(lines) {
  return new Promise((resolveP, reject) => {
    const proc = spawn(javaBin, ["-jar", jar], { stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    const out = [];
    proc.stdout.on("data", (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);
        // keep only JSON state objects; the dev-snapshot jar prints debug lines
        // (e.g. river: "RIVER", "DIFF", numbers) to stdout that aren't game states
        if (line.startsWith("{")) out.push(line);
      }
    });
    proc.on("error", reject);
    proc.on("close", () => resolveP(out));
    for (const l of lines) proc.stdin.write(l + "\n");
    proc.stdin.end();
  });
}

let captured = 0;
let skipped = 0;
for (const dir of readdirSync(TESTS_ROOT)) {
  const dirPath = join(TESTS_ROOT, dir);
  if (!statSync(dirPath).isDirectory()) continue;
  if (only && dir !== only) continue;
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith(".jcz")) continue;
    const jcz = JSON.parse(readFileSync(join(dirPath, file), "utf8"));
    // `addons` is save-version metadata the engine ignores — don't send it, don't skip on it.
    if (jcz.setup?.addons) delete jcz.setup.addons;
    const xmlPaths = resolveXmlPaths(jcz.setup.sets, XMLS_DIR);
    if (!xmlPaths) { skipped++; continue; }

    const lines = buildWireLines(jcz, xmlPaths);
    const responses = await runJar(lines);
    if (responses.length === 0) {
      // jar failed before emitting any state (e.g. an expansion it predates) — no golden.
      skipped++;
      process.stdout.write(`SKIPPED ${dir}/${file} (jar produced 0 states)\n`);
      continue;
    }
    const goldenPath = join(dirPath, file.replace(/\.jcz$/, ".golden.jsonl"));
    writeFileSync(goldenPath, responses.join("\n") + "\n", "utf8");
    captured++;
    process.stdout.write(`captured ${dir}/${file} -> ${responses.length} states\n`);
  }
}
console.log(`\nDONE. golden files written: ${captured}, skipped: ${skipped}`);
