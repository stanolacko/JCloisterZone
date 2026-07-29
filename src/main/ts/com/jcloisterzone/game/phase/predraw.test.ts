// Engine-side pre-draw placement path. There is no Java golden for pre-draw (it is server-
// authoritative and never sent to the jar), so this verifies the engine piece directly: with the
// `pre-draw` element the turn-part phase offers an opaque "PreDrawPlace" action (the secret hand
// lives server-side), and a PLACE_PREDRAWN reveal draws the named tile from the pack, validates the
// placement, and advances to the action phase.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { describe, it, expect } from "vitest";
import { setDomParserFactory, type XmlDOMParser } from "../../XmlUtils.js";
import { Engine } from "../../engine/Engine.js";

setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const REPO = process.cwd();

describe("pre-draw placement (engine)", () => {
  it("offers PreDrawPlace and places a revealed hand tile", () => {
    const engine = new Engine((p) => readFileSync(p, "utf8"));
    engine.processInput("%load " + resolve(join(REPO, "xmls/basic.xml")));

    const afterSetup = engine.processInput(
      JSON.stringify({
        type: "GAME_SETUP",
        payload: {
          sets: { "basic:1": 1 },
          elements: { "small-follower": 7, farmers: true, "pre-draw": 3 },
          rules: {},
          start: [{ tile: "BA/RCr", x: 0, y: 0, rotation: 0 }],
          players: 2,
          initialRandom: 0.0,
          gameAnnotations: null,
        },
      }),
    );
    expect(afterSetup).not.toBeNull();
    const s0 = JSON.parse(afterSetup!) as {
      phase: string;
      action: { canPass: boolean; items: Array<{ type: string }> };
    };
    // Turn-part start: pre-draw is active, so the engine waits for a hand placement (no public draw).
    expect(s0.phase).toBe("TileFromSupplyPhase");
    expect(s0.action.items.some((i) => i.type === "PreDrawPlace")).toBe(true);
    expect(s0.action.canPass).toBe(false);

    // Reveal + place a tile from the (server-secret) hand. BA/RCr at [1,0] R0 is a legal neighbour
    // of the start tile (same placement the abbey-merge fixture uses).
    const afterPlace = engine.processInput(
      JSON.stringify({
        type: "PLACE_PREDRAWN",
        payload: { tileId: "BA/RCr", rotation: "R0", position: [1, 0] },
      }),
    );
    expect(afterPlace).not.toBeNull();
    const s1 = JSON.parse(afterPlace!) as {
      phase: string;
      placedTiles: Array<{ position: [number, number]; id: string }>;
      undo: { allowed: boolean };
    };
    // The revealed tile is on the board and play advanced to the action phase.
    expect(s1.placedTiles.some((t) => t.id === "BA/RCr" && t.position[0] === 1 && t.position[1] === 0)).toBe(true);
    expect(s1.phase).toBe("ActionPhase");
    // Placing a pre-drawn tile IS undoable (the player may re-choose which tile to place).
    expect(s1.undo.allowed).toBe(true);
  });

  it("answers a %placements query without mutating state", () => {
    const engine = new Engine((p) => readFileSync(p, "utf8"));
    engine.processInput("%load " + resolve(join(REPO, "xmls/basic.xml")));
    engine.processInput(
      JSON.stringify({
        type: "GAME_SETUP",
        payload: {
          sets: { "basic:1": 1 },
          elements: { "small-follower": 7, farmers: true, "pre-draw": 3 },
          rules: {},
          start: [{ tile: "BA/RCr", x: 0, y: 0, rotation: 0 }],
          players: 2,
          initialRandom: 0.0,
          gameAnnotations: null,
        },
      }),
    );

    // The client asks for legal placements of a secret hand tile (the tile is in the public pack).
    const placementsOut = engine.processInput("%placements BA/RCr");
    expect(placementsOut).not.toBeNull();
    const pl = JSON.parse(placementsOut!) as {
      type: string;
      tileId: string;
      options: Array<{ position: [number, number]; rotations: number[] }>;
    };
    expect(pl.type).toBe("PLACEMENTS");
    expect(pl.tileId).toBe("BA/RCr");
    // [1,0] (a neighbour of the start tile) must be an offered position.
    expect(pl.options.some((o) => o.position[0] === 1 && o.position[1] === 0)).toBe(true);

    // The query did not consume the tile: a subsequent reveal+place of the SAME id still works.
    const afterPlace = engine.processInput(
      JSON.stringify({ type: "PLACE_PREDRAWN", payload: { tileId: "BA/RCr", rotation: "R0", position: [1, 0] } }),
    );
    const s1 = JSON.parse(afterPlace!) as { phase: string; placedTiles: Array<{ id: string }> };
    expect(s1.placedTiles.some((t) => t.id === "BA/RCr")).toBe(true);
    expect(s1.phase).toBe("ActionPhase");
  });

  it("rejects an illegal pre-drawn placement", () => {
    const engine = new Engine((p) => readFileSync(p, "utf8"));
    engine.processInput("%load " + resolve(join(REPO, "xmls/basic.xml")));
    engine.processInput(
      JSON.stringify({
        type: "GAME_SETUP",
        payload: {
          sets: { "basic:1": 1 },
          elements: { "small-follower": 7, farmers: true, "pre-draw": 3 },
          rules: {},
          start: [{ tile: "BA/RCr", x: 0, y: 0, rotation: 0 }],
          players: 2,
          initialRandom: 0.0,
          gameAnnotations: null,
        },
      }),
    );
    // [0,5] is not adjacent to any tile → no legal placement → engine refuses.
    expect(() =>
      engine.processInput(
        JSON.stringify({ type: "PLACE_PREDRAWN", payload: { tileId: "BA/RCr", rotation: "R0", position: [0, 5] } }),
      ),
    ).toThrow();
  });
});
