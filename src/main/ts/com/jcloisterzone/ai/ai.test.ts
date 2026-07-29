// Smoke test for the engine-side AI (LegacyAiPlayer). There is no Java golden for AI
// (no `.jcz` sends an AI message), so this verifies the AI subsystem end-to-end: the
// Engine answers an AI request with a legal move for the active player, and that move
// round-trips back through the engine (the reverse MessageParser.toWire serialization
// is parseable and accepted).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { describe, it, expect } from "vitest";
import { setDomParserFactory, type XmlDOMParser } from "../XmlUtils.js";
import { Engine } from "../engine/Engine.js";

setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const REPO = process.cwd();

describe("engine-side AI (LegacyAiPlayer)", () => {
  it("computes a legal move for the active player and round-trips it", () => {
    const jcz = JSON.parse(
      readFileSync(join(REPO, "engine-tests/basic/city-and-road-scoring.jcz"), "utf8"),
    ) as {
      setup: Record<string, unknown>;
      players: unknown[];
      initialRandom: number;
      gameAnnotations: Record<string, unknown> | null;
    };
    const xml = resolve(join(REPO, "xmls/basic.xml"));

    const engine = new Engine((p) => readFileSync(p, "utf8"));
    engine.processInput("%load " + xml);
    // basic game → no element/rule expansion needed; the TS builder handles the
    // frontend {drawOrder} annotation shape directly.
    const afterSetup = engine.processInput(
      JSON.stringify({
        type: "GAME_SETUP",
        payload: {
          ...jcz.setup,
          players: jcz.players.length,
          initialRandom: jcz.initialRandom,
          gameAnnotations: jcz.gameAnnotations,
        },
      }),
    );
    expect(afterSetup).not.toBeNull();

    // Ask the AI to move for the active player (player 0, at TilePhase).
    const aiResp = engine.processInput(JSON.stringify({ type: "AI", payload: { player: 0, seq: 0 } }));
    expect(aiResp).not.toBeNull();
    const parsed = JSON.parse(aiResp!) as {
      type: string;
      payload: { type: string; payload: Record<string, unknown>; player: number };
    };
    expect(parsed.type).toBe("AI_MESSAGE");
    expect(parsed.payload.player).toBe(0);
    // the only action at TilePhase is tile placement
    expect(parsed.payload.type).toBe("PLACE_TILE");
    expect(parsed.payload.payload.tileId).toBe("BA/CC.2"); // first forced-draw tile

    // round-trip: the AI's chosen move (re-serialized via toWire) must be accepted
    const afterMove = engine.processInput(
      JSON.stringify({ type: parsed.payload.type, payload: parsed.payload.payload }),
    );
    expect(afterMove).not.toBeNull();
  });

  it("reads `player` from the top level of the message (live-wire shape)", () => {
    // Regression: the live client sends `player` at the TOP LEVEL of the AI message
    // (message.player = action.player; payload holds only {gameId}). The engine must
    // read it there — reading payload.player left it null and the AI never moved.
    const jcz = JSON.parse(
      readFileSync(join(REPO, "engine-tests/basic/city-and-road-scoring.jcz"), "utf8"),
    ) as { setup: Record<string, unknown>; players: unknown[]; initialRandom: number; gameAnnotations: unknown };
    const xml = resolve(join(REPO, "xmls/basic.xml"));
    const engine = new Engine((p) => readFileSync(p, "utf8"));
    engine.processInput("%load " + xml);
    engine.processInput(
      JSON.stringify({
        type: "GAME_SETUP",
        payload: {
          ...jcz.setup,
          players: jcz.players.length,
          initialRandom: jcz.initialRandom,
          gameAnnotations: jcz.gameAnnotations,
        },
      }),
    );
    // top-level player (NOT nested in payload), exactly like the client's apply()
    const aiResp = engine.processInput(
      JSON.stringify({ type: "AI", payload: { gameId: "g1" }, player: 0, seq: 0 }),
    );
    expect(aiResp).not.toBeNull();
    const parsed = JSON.parse(aiResp!) as { type: string; payload: { player: number; type: string } };
    expect(parsed.type).toBe("AI_MESSAGE");
    expect(parsed.payload.player).toBe(0);
    expect(parsed.payload.type).toBe("PLACE_TILE");
  });

  it("does not answer an AI request for a non-active player", () => {
    const jcz = JSON.parse(
      readFileSync(join(REPO, "engine-tests/basic/city-and-road-scoring.jcz"), "utf8"),
    ) as { setup: Record<string, unknown>; players: unknown[]; initialRandom: number; gameAnnotations: unknown };
    const xml = resolve(join(REPO, "xmls/basic.xml"));
    const engine = new Engine((p) => readFileSync(p, "utf8"));
    engine.processInput("%load " + xml);
    engine.processInput(
      JSON.stringify({
        type: "GAME_SETUP",
        payload: {
          ...jcz.setup,
          players: jcz.players.length,
          initialRandom: jcz.initialRandom,
          gameAnnotations: jcz.gameAnnotations,
        },
      }),
    );
    // player 1 is not active → no response
    const resp = engine.processInput(JSON.stringify({ type: "AI", payload: { player: 1, seq: 0 } }));
    expect(resp).toBeNull();
  });
});
