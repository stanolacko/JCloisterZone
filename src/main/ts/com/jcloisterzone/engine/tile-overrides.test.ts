// GAME_SETUP `tiles` — optional per-tile final-count overrides. An entry replaces the
// count computed from `sets` (0 excludes the tile); overrides cannot resurrect tiles
// dropped by a set's <remove>; an absent field keeps behavior identical to sets-only.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { describe, it, expect } from "vitest";
import { setDomParserFactory, type XmlDOMParser } from "../XmlUtils.js";
import { Engine } from "./Engine.js";

setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const REPO = process.cwd();
const BASIC_XML = readFileSync(resolve(join(REPO, "xmls", "basic.xml")), "utf8");

// Inline tile-sets referencing basic.xml tiles: pass 1 (tile-set refs) and pass 2 (tile
// definitions) may come from different definition strings.
const TEST_SET = `<?xml version="1.0" encoding="utf-8"?>
<defs><sets>
  <tile-set id="test">
    <ref count="4" tile="BA/L" />
    <ref count="2" tile="BA/LR" />
    <ref count="4" tile="BA/RCr" />
  </tile-set>
  <tile-set id="test-remove">
    <ref count="3" tile="BA/Cccc+" />
    <remove tile="BA/L" />
  </tile-set>
</sets></defs>`;

function runSetup(
  sets: Record<string, number>,
  tiles: Record<string, number> | null,
): Record<string, unknown> {
  const engine = new Engine(() => "");
  (engine as unknown as { tileDefinitions: string[] }).tileDefinitions = [BASIC_XML, TEST_SET];
  const setup = {
    type: "GAME_SETUP",
    payload: {
      initialRandom: 0.5191767944266055,
      players: 1,
      gameAnnotations: {},
      sets,
      ...(tiles !== null ? { tiles } : {}),
      elements: { "small-follower": 7, farmers: true },
      rules: { "tiny-city-scoring": "4" },
      start: [{ tile: "BA/RCr", x: 0, y: 0, rotation: 0 }],
    },
  };
  return JSON.parse(engine.processInput(JSON.stringify(setup))!);
}

function packSize(state: Record<string, unknown>): number {
  return (state.tilePack as { size: number }).size;
}

describe("GAME_SETUP tiles overrides", () => {
  it("without tiles field behaves as sets-only (baseline)", () => {
    // 4×BA/L + 2×BA/LR + 4×BA/RCr = 10, minus the preplaced start tile and the first draw
    const state = runSetup({ test: 1 }, null);
    expect(packSize(state)).toBe(8);
  });

  it("reduces a tile count", () => {
    const state = runSetup({ test: 1 }, { "BA/L": 1 });
    expect(packSize(state)).toBe(5); // 1+2+4 - start - first draw
  });

  it("excludes a tile with an override of 0", () => {
    const state = runSetup({ test: 1 }, { "BA/L": 0 });
    expect(packSize(state)).toBe(4); // 0+2+4 - start - first draw
  });

  it("raises a tile count above the set count", () => {
    const state = runSetup({ test: 1 }, { "BA/LR": 5 });
    expect(packSize(state)).toBe(11); // 4+5+4 - start - first draw
  });

  it("cannot resurrect a tile removed by a set", () => {
    // test-remove drops BA/L entirely; an override for it must be ignored
    const base = runSetup({ test: 1, "test-remove": 1 }, null);
    expect(packSize(base)).toBe(7); // 0(L removed)+2+4+3 - start - first draw
    const overridden = runSetup({ test: 1, "test-remove": 1 }, { "BA/L": 4 });
    expect(packSize(overridden)).toBe(7);
  });

  it("ignores overrides for tiles not present in any selected set", () => {
    const state = runSetup({ test: 1 }, { "BA/Cccc+": 3 });
    expect(packSize(state)).toBe(8); // unchanged baseline
  });
});
