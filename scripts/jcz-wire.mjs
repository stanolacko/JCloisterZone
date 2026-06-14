// Shared helper: turn a .jcz saved game into the engine wire protocol (the exact
// line stream both Engine.jar and the TS CLI / engine consume). Used by the
// golden-capture script and the parity test so the two engines get identical input.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Absolute paths of the set XMLs a game needs, or null if any is missing. */
export function resolveXmlPaths(sets, xmlsDir) {
  const paths = [];
  for (const key of Object.keys(sets)) {
    // set id is "<expansion>[/variant]:<edition>" → XML file is "<expansion>.xml".
    // Most use underscores (princess_and_dragon.xml); a few keep the hyphen (robbers-son.xml).
    const base = key.split(":")[0].split("/")[0];
    let p = resolve(join(xmlsDir, base.replace(/-/g, "_") + ".xml"));
    if (!existsSync(p)) p = resolve(join(xmlsDir, base + ".xml"));
    if (!existsSync(p)) return null;
    if (!paths.includes(p)) paths.push(p);
  }
  return paths;
}

// The frontend turns selected expansions into GAME_SETUP `elements` (the engines' only
// capability selector; they never derive elements from sets). The saved elements are
// AUTHORITATIVE: `<implies element="X"/>` only defaults the client option ON — the user can
// still turn it off, and then X is absent from the save. So a missing element means OFF and
// must NOT be re-injected. `<impliesAllowed>` defaults OFF (never inject). Only
// `<enforces element="X"/>` is unconditional (the client cannot turn it off), so it is the
// only declaration we inject. The older expansions predate the elements mechanism entirely,
// so they're hardcoded here. Keep in sync with SET_ELEMENTS in state-parity.test.ts.
const SET_ELEMENTS = {
  "wind-roses": ["wind-rose"],
  darmstadt: ["church"],
  monasteries: ["monastery"],
  river: ["river"],
  flier: ["flier"],
  "corn-circles": ["corn-circle"],
  "russian-promos": ["russian-trap"],
  watchtowers: ["watchtower"],
};

/** Inject set-implied elements: hardcoded old-expansion map + `<enforces>` declarations
 *  parsed from the loaded expansion XMLs (`<implies>` is user-toggleable — the save's
 *  elements already reflect the final on/off choice, so it is never injected). */
export function expandElements(sets, elements, xmlPaths = []) {
  const out = { ...elements };
  const ids = Object.keys(sets).map((k) => k.split(":")[0].split("/")[0]);
  for (const [prefix, keys] of Object.entries(SET_ELEMENTS)) {
    if (ids.includes(prefix)) for (const k of keys) if (!(k in out)) out[k] = true;
  }
  for (const p of xmlPaths) {
    let xml;
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

/** Frontend rule reconstruction: the advanced `labyrinth` set defaults its variant to
 *  "advanced" (engines read `rules` as-is; this is a frontend concern). */
export function expandRules(sets, rules, elements = {}) {
  const out = { ...(rules ?? {}) };
  const ids = Object.keys(sets).map((k) => k.split(":")[0].split("/")[0]);
  if (ids.includes("labyrinth") && !("labyrinth-variant" in out)) out["labyrinth-variant"] = "advanced";
  // The client always sends a value for these rule options; the jar NPEs without them
  // (String.equals on null). Inject the client defaults (first option) when missing.
  if ("count" in elements && !("coc-final-scoring" in out)) out["coc-final-scoring"] = "market-only";
  if (("king" in elements || "robber" in elements) && !("king-and-robber-scoring" in out)) {
    out["king-and-robber-scoring"] = "default";
  }
  return out;
}

/** The frontend translates a `{drawOrder, endTurn}` debug annotation into the
 *  engine's `{tilePack:{className, params}}` shape before sending GAME_SETUP. The
 *  real Java engine ONLY understands the latter; replicate that translation so the
 *  jar honours the forced draw order (otherwise it draws random tiles and errors). */
export function wireGameAnnotations(ann) {
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

/** Build the wire lines: `%load` per XML, GAME_SETUP, then one line per message.
 *  Non-bulk → the engine emits one state JSON per message (what we diff). */
export function buildWireLines(jcz, xmlPaths) {
  const lines = [];
  for (const p of xmlPaths) lines.push("%load " + p);
  const elements = expandElements(jcz.setup.sets, jcz.setup.elements, xmlPaths);
  const setupPayload = {
    ...jcz.setup,
    elements,
    rules: expandRules(jcz.setup.sets, jcz.setup.rules, elements),
    players: jcz.players.length,
    initialRandom: jcz.initialRandom,
    gameAnnotations: wireGameAnnotations(jcz.gameAnnotations),
  };
  lines.push(JSON.stringify({ type: "GAME_SETUP", payload: setupPayload }));
  for (const r of jcz.replay) {
    lines.push(JSON.stringify({ type: r.type, payload: r.payload }));
  }
  return lines;
}
