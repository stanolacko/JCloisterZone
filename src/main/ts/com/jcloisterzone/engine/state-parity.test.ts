// Enforces THE rule: the GameState JSON emitted by the TS engine must be identical
// to the Java engine's, per step. Java's reference output is captured into
// `<test>.golden.jsonl` by `scripts/capture-golden.mjs` (run against Engine.jar).
//
// This test replays the SAME wire stream through the TS engine in-process and
// deep-compares each emitted state line to the golden line. Tests without a golden
// file are skipped, so this stays green until goldens are captured — at which point
// it becomes the TDD driver for porting StateGsonBuilder to full parity.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { describe, it, expect } from "vitest";
import { setDomParserFactory, type XmlDOMParser } from "../XmlUtils.js";
import { Engine } from "./Engine.js";

setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const REPO = process.cwd();
const TESTS_ROOT = join(REPO, "engine-tests");
const XMLS_DIR = join(REPO, "xmls");

interface Jcz {
  initialRandom: number;
  setup: { addons?: unknown; sets: Record<string, number> };
  players: unknown[];
  replay: Array<{ type: string; payload: Record<string, unknown> }>;
  gameAnnotations?: Record<string, unknown> | null;
}

function xmlPaths(sets: Record<string, number>): string[] | null {
  const paths: string[] = [];
  for (const key of Object.keys(sets)) {
    const base = key.split(":")[0].split("/")[0];
    // Most addon XMLs use underscores (princess_and_dragon.xml); a few keep the hyphen
    // (robbers-son.xml). Try the underscore form first, then fall back to the raw id.
    let p = resolve(join(XMLS_DIR, base.replace(/-/g, "_") + ".xml"));
    if (!existsSync(p)) p = resolve(join(XMLS_DIR, base + ".xml"));
    if (!existsSync(p)) return null;
    if (!paths.includes(p)) paths.push(p);
  }
  return paths;
}

// The frontend turns selected expansions/sets into GAME_SETUP `elements` (the engine's only
// capability selector — see Engine.java). The saved elements are AUTHORITATIVE:
// `<implies element="X"/>` only defaults the client option ON — the user can turn it off,
// and then X is absent from the save, meaning OFF (never re-inject). `<impliesAllowed>`
// defaults OFF (never inject). Only `<enforces element="X"/>` is unconditional, so it is
// the only declaration injected from the loaded XMLs. Old expansions predate the elements
// mechanism entirely and are hardcoded here. MUST match jcz-wire.mjs.
const SET_ELEMENTS: Record<string, string[]> = {
  "wind-roses": ["wind-rose"],
  darmstadt: ["church"],
  monasteries: ["monastery"],
  river: ["river"],
  flier: ["flier"],
  "corn-circles": ["corn-circle"],
  "russian-promos": ["russian-trap"],
  watchtowers: ["watchtower"],
};
function expandElements(
  sets: Record<string, number>,
  elements: Record<string, unknown>,
  paths: string[] = [],
): Record<string, unknown> {
  const out = { ...elements };
  const ids = Object.keys(sets).map((k) => k.split(":")[0].split("/")[0]);
  for (const [prefix, keys] of Object.entries(SET_ELEMENTS)) {
    if (ids.includes(prefix)) for (const k of keys) if (!(k in out)) out[k] = true;
  }
  for (const p of paths) {
    let xml: string;
    try {
      xml = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    for (const m of xml.matchAll(/<enforces\s+element="([^"]+)"/g)) {
      if (!(m[1] in out)) out[m[1]] = true;
    }
  }
  return out;
}

/** Frontend rule reconstruction: loading the advanced `labyrinth` set defaults its variant
 *  to "advanced" (the engine reads `rules` as-is, so this belongs in the frontend layer). */
function expandRules(
  sets: Record<string, number>,
  rules: Record<string, unknown>,
  elements: Record<string, unknown> = {},
): Record<string, unknown> {
  const out = { ...rules };
  const ids = Object.keys(sets).map((k) => k.split(":")[0].split("/")[0]);
  if (ids.includes("labyrinth") && !("labyrinth-variant" in out)) out["labyrinth-variant"] = "advanced";
  // client rule defaults the jar requires (String.equals NPEs on null) — keep in sync with jcz-wire.mjs
  if ("count" in elements && !("coc-final-scoring" in out)) out["coc-final-scoring"] = "market-only";
  if (("king" in elements || "robber" in elements) && !("king-and-robber-scoring" in out)) {
    out["king-and-robber-scoring"] = "default";
  }
  return out;
}

/** Mirror the frontend's `{drawOrder,endTurn}` → `{tilePack:{className,params}}`
 *  translation so both engines receive identical GAME_SETUP. */
function wireAnnotations(ann: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (ann && (Array.isArray(ann.drawOrder) || ann.endTurn !== undefined)) {
    return {
      tilePack: {
        className: "com.jcloisterzone.debug.ForcedDrawTilePack",
        params: { drawOrder: ann.drawOrder, drawLimit: ann.endTurn ?? null },
      },
    };
  }
  return ann ?? {};
}

function wireLines(jcz: Jcz, paths: string[]): string[] {
  const lines = paths.map((p) => "%load " + p);
  const elements = expandElements(
    jcz.setup.sets,
    (jcz.setup as { elements?: Record<string, unknown> }).elements ?? {},
    paths,
  );
  lines.push(
    JSON.stringify({
      type: "GAME_SETUP",
      payload: {
        ...jcz.setup,
        elements,
        rules: expandRules(jcz.setup.sets, (jcz.setup as { rules?: Record<string, unknown> }).rules ?? {}, elements),
        players: jcz.players.length,
        initialRandom: jcz.initialRandom,
        gameAnnotations: wireAnnotations(jcz.gameAnnotations),
      },
    }),
  );
  for (const r of jcz.replay) lines.push(JSON.stringify({ type: r.type, payload: r.payload }));
  return lines;
}

// Array-order policy: arrays that are the value of these keys are UNORDERED (their
// direct members may appear in any order but must be the same set); EVERY OTHER array
// is ORDERED (length + element order must match Java exactly).
//   - places, points : vavr HashSet/Stream (per project rule).
//   - features, options : also vavr-hash-backed, and Java orders them by
//     FeaturePointer.hashCode() which includes Class.hashCode() (a JVM identity hash) —
//     deterministic within one JVM but NOT reproducible in TS, so they must be unordered.
// "owners" is a vavr Set<Player> projection — hash order, compare as multiset.
const UNORDERED_KEYS = new Set(["places", "points", "features", "options", "positions", "owners"]);

function kindOf(v: unknown): string {
  return v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
}

/** Recursively remove the TS-only `meeples` field from "points" event entries (the
 *  ones carrying a `ptr`), so Java goldens — which never had it — still compare equal. */
function stripScoredMeeples(v: unknown): void {
  if (Array.isArray(v)) {
    v.forEach(stripScoredMeeples);
    return;
  }
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("ptr" in o && "meeples" in o) delete o.meeples;
    for (const k of Object.keys(o)) stripScoredMeeples(o[k]);
  }
}

/** Recursively remove the TS-only 0-point `"<feature>.no-majority"` score entries — the TS
 *  engine adds one for every player who had a meeple on a scored feature but lacked the
 *  majority (so the history shows contested features); Java emits none. (The genuine
 *  no-owner `.empty` entries Java DOES produce are left untouched and stay fully compared.) */
function stripContestedEmpties(v: unknown): void {
  if (Array.isArray(v)) {
    for (let i = v.length - 1; i >= 0; i--) {
      const e = v[i] as Record<string, unknown> | null;
      if (
        e !== null && typeof e === "object" && "ptr" in e &&
        typeof e.name === "string" && e.name.endsWith(".no-majority")
      ) {
        v.splice(i, 1);
      } else {
        stripContestedEmpties(v[i]);
      }
    }
    return;
  }
  if (v !== null && typeof v === "object") {
    for (const k of Object.keys(v as Record<string, unknown>)) {
      stripContestedEmpties((v as Record<string, unknown>)[k]);
    }
  }
}

/** An array is UNORDERED when it is a vavr-collection projection — i.e. its key is one
 *  of UNORDERED_KEYS (tuple lists like places/positions), OR its members are objects
 *  (feature lists, point/event lists, deployedMeeples, …). These are emitted in vavr
 *  hash-iteration order which the TS shim does not reproduce, so only their membership
 *  is compared. Tuple arrays ([x,y], [x,y,loc]) and primitive arrays stay ORDERED. */
function isUnorderedArray(arr: unknown[], key?: string): boolean {
  if (key !== undefined && UNORDERED_KEYS.has(key)) return true;
  if (arr.length <= 1) return false;
  // array of objects (feature/point/event/token lists, …)
  if (arr.every((e) => e !== null && typeof e === "object" && !Array.isArray(e))) return true;
  // array of [x,y] coordinate pairs (vavr position sets, e.g. token placements)
  if (arr.every((e) => Array.isArray(e) && e.length === 2 && e.every((n) => typeof n === "number"))) {
    return true;
  }
  return false;
}

/** Canonical form used only to test member equality when matching unordered arrays:
 *  object keys sorted; unordered arrays sorted; ordered (tuple/primitive) arrays kept. */
function canonForMatch(v: unknown, key?: string): unknown {
  if (Array.isArray(v)) {
    const mapped = v.map((e) => canonForMatch(e));
    if (isUnorderedArray(v, key)) {
      return [...mapped].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return mapped;
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = canonForMatch((v as Record<string, unknown>)[k], k);
    }
    return out;
  }
  return v;
}
const matchKey = (v: unknown, key?: string): string => JSON.stringify(canonForMatch(v, key));
const brief = (v: unknown): string => {
  const s = JSON.stringify(v);
  return s.length > 160 ? s.slice(0, 157) + "..." : s;
};

/** Collects every structural difference between java (a) and ts (b) into `out`.
 *  Objects: reports keys present on only one side, recurses shared keys. Arrays under
 *  a "places"/"points" key are matched as a multiset (unmatched members reported, and
 *  leftovers paired up so field-level gaps like a missing "ptr" surface); all other
 *  arrays are compared by length + position. `key` is the object key `a`/`b` sit under. */
function collectDiffs(a: unknown, b: unknown, path: string, key: string | undefined, out: string[]): void {
  const ta = kindOf(a);
  const tb = kindOf(b);
  if (ta !== tb) {
    out.push(`${path}: type ${ta} (java) vs ${tb} (ts)`);
    return;
  }
  if (ta === "array") {
    const aa = a as unknown[];
    const bb = b as unknown[];
    if (isUnorderedArray(aa, key) || isUnorderedArray(bb, key)) {
      // multiset match by canonical member equality
      const bMatched = new Array(bb.length).fill(false);
      const unmatchedA: unknown[] = [];
      for (const ea of aa) {
        const ka = matchKey(ea);
        const j = bb.findIndex((eb, idx) => !bMatched[idx] && matchKey(eb) === ka);
        if (j >= 0) bMatched[j] = true;
        else unmatchedA.push(ea);
      }
      const unmatchedB = bb.filter((_, idx) => !bMatched[idx]);
      // pair leftovers (sorted) and recurse to surface field-level gaps (e.g. ptr)
      unmatchedA.sort((x, y) => matchKey(x).localeCompare(matchKey(y)));
      unmatchedB.sort((x, y) => matchKey(x).localeCompare(matchKey(y)));
      const n = Math.min(unmatchedA.length, unmatchedB.length);
      for (let i = 0; i < n; i++) collectDiffs(unmatchedA[i], unmatchedB[i], `${path}[~${i}]`, undefined, out);
      for (let i = n; i < unmatchedA.length; i++) out.push(`${path}: member in JAVA only → ${brief(unmatchedA[i])}`);
      for (let i = n; i < unmatchedB.length; i++) out.push(`${path}: member in TS only → ${brief(unmatchedB[i])}`);
      return;
    }
    // ordered comparison
    if (aa.length !== bb.length) {
      out.push(`${path}.length: ${aa.length} (java) vs ${bb.length} (ts)`);
    }
    for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
      collectDiffs(aa[i], bb[i], `${path}[${i}]`, undefined, out);
    }
    return;
  }
  if (ta === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    for (const k of [...new Set([...Object.keys(ao), ...Object.keys(bo)])].sort()) {
      if (!(k in ao)) out.push(`${path}.${k}: present in TS only → ${brief(bo[k])}`);
      else if (!(k in bo)) out.push(`${path}.${k}: present in JAVA only → ${brief(ao[k])}`);
      else collectDiffs(ao[k], bo[k], `${path}.${k}`, k, out);
    }
    return;
  }
  if (a !== b) out.push(`${path}: ${JSON.stringify(a)} (java) vs ${JSON.stringify(b)} (ts)`);
}

function tsStates(jcz: Jcz, paths: string[]): string[] {
  const engine = new Engine((p) => readFileSync(p, "utf8"));
  const out: string[] = [];
  for (const line of wireLines(jcz, paths)) {
    const r = engine.processInput(line);
    if (r !== null) out.push(r);
  }
  return out;
}

// discover tests: every .jcz file. Those WITH a golden run a full byte-parity comparison;
// those WITHOUT a golden run a smoke test (replay must complete without throwing). No addon
// test file is skipped — un-ported addons surface here as smoke-test crashes.
const golden: Array<{ dir: string; file: string }> = [];
const noGolden: Array<{ dir: string; file: string }> = [];
for (const dir of readdirSync(TESTS_ROOT)) {
  const dirPath = join(TESTS_ROOT, dir);
  if (!statSync(dirPath).isDirectory()) continue;
  const files = readdirSync(dirPath);
  const goldenJcz = new Set(
    files.filter((f) => f.endsWith(".golden.jsonl")).map((f) => f.replace(/\.golden\.jsonl$/, ".jcz")),
  );
  for (const jczFile of goldenJcz) golden.push({ dir, file: jczFile });
  for (const file of files) {
    if (file.endsWith(".jcz") && !goldenJcz.has(file)) noGolden.push({ dir, file });
  }
}

describe("GameState JSON parity (TS vs Java golden)", () => {
  if (golden.length === 0) {
    it.skip("no golden files — run `JCZ_JAR=… node scripts/capture-golden.mjs` to enable", () => {});
    return;
  }
  for (const { dir, file } of golden) {
    it(`${dir}/${file}`, () => {
      const jcz = JSON.parse(readFileSync(join(TESTS_ROOT, dir, file), "utf8")) as Jcz;
      const paths = xmlPaths(jcz.setup.sets);
      expect(paths, "set XML present").not.toBeNull();
      const goldenLines = readFileSync(join(TESTS_ROOT, dir, file.replace(/\.jcz$/, ".golden.jsonl")), "utf8")
        .split("\n")
        .filter(Boolean);
      const ts = tsStates(jcz, paths!);

      expect(ts.length, "number of emitted states").toBe(goldenLines.length);
      for (let i = 0; i < goldenLines.length; i++) {
        const diffs: string[] = [];
        // "marketplace.<n>" expr-item counters follow vavr HashSet iteration order of
        // road.marketplaces (JVM hash, not reproducible) — neutralize the counter so the
        // items multiset pairs by points (same policy as other vavr hash-order artifacts).
        const neutralize = (s: string) => s.replace(/"marketplace\.\d+"/g, '"marketplace.#"');
        const ja = JSON.parse(neutralize(goldenLines[i]));
        const tb = JSON.parse(neutralize(ts[i]));
        // KING/ROBBER fp = getFeaturePointer(feature) — the FIRST featureMap entry in vavr
        // hash-iteration order (irreproducible). Both engines agree on the feature; drop the
        // representative pointer (same policy as other vavr hash artifacts).
        for (const st of [ja, tb]) {
          for (const pl of (st as { players?: Array<{ tokens?: Record<string, { fp?: unknown }> }> }).players ?? []) {
            if (pl.tokens?.KING) delete pl.tokens.KING.fp;
            if (pl.tokens?.ROBBER) delete pl.tokens.ROBBER.fp;
          }
        }
        // The TS engine enriches each "points" event entry with `meeples` (the scored
        // followers' original positions) — Java emits no such field. Strip it before
        // comparing so the Java-captured goldens stay a valid regression net.
        stripScoredMeeples(ja);
        stripScoredMeeples(tb);
        stripContestedEmpties(ja);
        stripContestedEmpties(tb);
        collectDiffs(ja, tb, "$", undefined, diffs);
        expect(
          diffs.length,
          `state #${i} differs (${diffs.length}):\n  ${diffs.slice(0, 12).join("\n  ")}`,
        ).toBe(0);
      }
    });
  }
});

// Smoke tests for every .jcz WITHOUT a golden: the full replay must run through the TS engine
// without throwing (and emit at least the initial state). Un-ported addons fail here loudly
// instead of being silently skipped.
// Only declared when some .jcz lacks a golden — an empty describe would otherwise
// surface as a "No test found in suite" failure once every test has a golden.
if (noGolden.length > 0) {
  describe("GameState replay smoke test (no golden)", () => {
    for (const { dir, file } of noGolden) {
      it(`${dir}/${file}`, () => {
        const jcz = JSON.parse(readFileSync(join(TESTS_ROOT, dir, file), "utf8")) as Jcz;
        const paths = xmlPaths(jcz.setup.sets);
        expect(paths, "set XML present").not.toBeNull();
        const ts = tsStates(jcz, paths!);
        expect(ts.length, "emitted at least one state").toBeGreaterThan(0);
      });
    }
  });
}
