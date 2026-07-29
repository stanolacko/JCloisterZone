// Regression: a game whose only selected tile set is "start" (a single starting tile)
// must not crash at GAME_SETUP. If the start tile cannot be drawn from the pack (e.g. the
// set's tile definitions were not loaded, so the pack is empty), the engine must degrade to
// an immediately-finished game (GameOverPhase / final scoring) instead of throwing an
// uncaught error that closes the game window. See GameStateBuilder.createInitialState.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { describe, it, expect } from "vitest";
import { setDomParserFactory, type XmlDOMParser } from "../XmlUtils.js";
import { Engine } from "./Engine.js";

setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const REPO = process.cwd();
const BASIC_XML = readFileSync(resolve(join(REPO, "xmls", "basic.xml")), "utf8");

// A "start"-style set referencing the single start tile (mirrors the client's start.xml).
const START_SET = `<?xml version="1.0" encoding="utf-8"?>
<defs><sets><tile-set id="start"><ref count="1" tile="BA/RCr" /></tile-set></sets></defs>`;

function runSetup(definitions: string[]): Record<string, unknown> {
  const engine = new Engine(() => "");
  (engine as unknown as { tileDefinitions: string[] }).tileDefinitions = definitions;
  const setup = {
    type: "GAME_SETUP",
    payload: {
      initialRandom: 0.5191767944266055,
      players: 1,
      gameAnnotations: {},
      sets: { start: 1 },
      elements: { "small-follower": 7, farmers: true },
      rules: { "tiny-city-scoring": "4" },
      start: [{ tile: "BA/RCr", x: 0, y: 0, rotation: 0 }],
    },
  };
  return JSON.parse(engine.processInput(JSON.stringify(setup))!);
}

describe("game with only the start tile set", () => {
  it("places the start tile and ends the game when the tile is in the pack", () => {
    // basic.xml defines BA/RCr; the start set selects it -> pack has exactly one tile,
    // which is preplaced, leaving the pack empty -> game is immediately over.
    const state = runSetup([BASIC_XML, START_SET]);
    expect(state.phase).toBe("GameOverPhase");
    expect((state.tilePack as { size: number }).size).toBe(0);
    expect((state.placedTiles as unknown[]).length).toBe(1);
  });

  it("does not crash when the start tile is missing from the pack", () => {
    // No tile definitions loaded for BA/RCr -> the pack is empty and the preplaced start
    // tile cannot be drawn. The engine must not throw; it ends the game instead.
    const state = runSetup([START_SET]);
    expect(state.phase).toBe("GameOverPhase");
    expect((state.tilePack as { size: number }).size).toBe(0);
    expect((state.placedTiles as unknown[]).length).toBe(0);
  });
});
