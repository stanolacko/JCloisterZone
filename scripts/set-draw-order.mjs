// Set a test's forced tile draw order, straight from the .jcz.
//
// Writes `gameAnnotations.drawOrder` of each given `.jcz` as the tile ids from two places, in order:
//   1. every `PLACE_TILE` message in the replay (the placed tiles), then
//   2. every `Available action TilePlacement for <tileId>` assertion in the `test` block (a tile
//      that is drawn and offered but not placed — e.g. a test that ends by inspecting its legal
//      placements). These trail the placed tiles.
// No golden is read and no RNG is involved, so the result is deterministic. Other gameAnnotations
// keys (e.g. `endTurn`) are preserved. The abbey tile (AM/A) is dropped — it is placed from the
// abbey supply, not drawn from the pack.
//
// Usage:
//   npm run set-draw-order -- <file.jcz | directory> [...more]
// Examples:
//   npm run set-draw-order -- engine-tests/river/river-II-curve-placement-2.jcz
//   npm run set-draw-order -- engine-tests/fishhuts            # every .jcz in the folder
//
// After updating, regenerate the golden(s) so they match the forced order:
//   JCZ_JAR=build/Engine.jar node scripts/capture-golden.mjs --only <dir>

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ABBEY_TILE = "AM/A"; // placed from the abbey supply, never drawn from the pack
const TILEPLACEMENT_ASSERTION = /^Available action TilePlacement for (.+)$/;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: npm run set-draw-order -- <file.jcz | directory> [...more]");
  process.exit(1);
}

/** Expand a path into the list of .jcz files it refers to (a file, or every .jcz in a directory). */
function jczFiles(p) {
  if (!statSync(p).isDirectory()) return [p];
  return readdirSync(p)
    .filter((f) => f.endsWith(".jcz"))
    .map((f) => join(p, f));
}

/** drawOrder = PLACE_TILE tiles (in replay order), then the tiles named by
 *  "Available action TilePlacement for <tile>" assertions. Abbey excluded. */
function buildDrawOrder(jcz) {
  const placed = (jcz.replay ?? [])
    .filter((r) => r.type === "PLACE_TILE")
    .map((r) => r.payload.tileId);
  const offered = (jcz.test?.assertions ?? [])
    .map((s) => TILEPLACEMENT_ASSERTION.exec(s)?.[1]?.trim())
    .filter((id) => id);
  return [...placed, ...offered].filter((id) => id !== ABBEY_TILE);
}

let updated = 0;
let skipped = 0;
for (const arg of args) {
  for (const file of jczFiles(arg)) {
    const jcz = JSON.parse(readFileSync(file, "utf8"));
    const drawOrder = buildDrawOrder(jcz);
    if (drawOrder.length === 0) {
      console.warn(`SKIP ${file} (no PLACE_TILE / TilePlacement-assertion tiles found)`);
      skipped++;
      continue;
    }
    jcz.gameAnnotations = { ...(jcz.gameAnnotations ?? {}), drawOrder };
    writeFileSync(file, JSON.stringify(jcz, null, 2) + "\n");
    console.log(`updated ${file} -> drawOrder (${drawOrder.length} tiles)`);
    updated++;
  }
}

console.log(`\n${updated} updated, ${skipped} skipped.`);
if (updated > 0) {
  console.log("Regenerate the golden(s) so they match the forced order, e.g.:");
  console.log("  JCZ_JAR=build/Engine.jar node scripts/capture-golden.mjs --only <dir>");
}
