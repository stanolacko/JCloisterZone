import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { describe, it, expect } from "vitest";
import { setDomParserFactory, type XmlDOMParser } from "../XmlUtils.js";
import { GameStateBuilder } from "../game/state/GameStateBuilder.js";
import { GameStatePhaseReducer } from "../game/GameStatePhaseReducer.js";
import { GameSetupMessage } from "../io/message/GameSetupMessage.js";
import { MessageParser } from "../io/MessageParser.js";
import { createSetupFromMessage } from "./EngineSetup.js";
import { MeeplePointer } from "../board/pointer/MeeplePointer.js";

setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const REPO = process.cwd();

// Replay the black-fairy fixture (black fairy next to Betty's city meeple, city scores → meeple
// returns) and assert that AFTER the meeple is undeployed the black fairy is kept on the board as a
// "lonely" pointer (feature pointer retained, meepleId nulled) — NOT still bound to the meeple id,
// which would make it follow the meeple when it is redeployed.
describe("black fairy undeploy keeps it on board", () => {
  it("nulls the meepleId on undeploy", () => {
    const jcz = JSON.parse(
      readFileSync(join(REPO, "engine-tests", "black-fairy", "black-fairy-next-meeple.jcz"), "utf8"),
    );
    const xmlContents = ["basic.xml", "princess_and_dragon.xml"].map((f) =>
      readFileSync(join(REPO, "xmls", f), "utf8"),
    );

    const msg = new GameSetupMessage();
    msg.sets = jcz.setup.sets;
    msg.tiles = jcz.setup.tiles ?? null;
    msg.elements = jcz.setup.elements;
    msg.rules = jcz.setup.rules ?? {};
    msg.players = jcz.players.length;
    msg.initialRandom = jcz.initialRandom;
    msg.start = jcz.setup.start.map((s: { tile: string; x: number; y: number; rotation: number }) => {
      const item = new GameSetupMessage.PlacedTileItem();
      item.tile = s.tile;
      item.x = s.x;
      item.y = s.y;
      item.rotation = s.rotation;
      return item;
    });

    const setup = createSetupFromMessage(msg);
    const reducer = new GameStatePhaseReducer(setup, jcz.initialRandom);
    const builder = new GameStateBuilder(xmlContents, setup, jcz.players.length, jcz.initialRandom);
    builder.setGameAnnotations(jcz.gameAnnotations ?? null);
    builder.setTileOverrides(jcz.setup.tiles ?? null);

    let state = builder.createInitialState();
    const firstPhase = reducer.getFirstPhase();
    state = state.setPhase(firstPhase);
    state = reducer.applyStepResult(firstPhase.enter(state));

    const parser = new MessageParser();
    for (const entry of jcz.replay) {
      const m = parser.parse(entry);
      const rnd = (m as { getRandom?: () => number | null }).getRandom;
      if (typeof rnd === "function") {
        const r = rnd.call(m);
        if (r !== null && r !== undefined) reducer.getRandomGenerator().setRandom(r);
      }
      state = reducer.apply(state, m);
    }

    const ptr = state.getNeutralFigures().getBlackFairyDeployment();
    // it must still be on the board (a pointer exists)…
    expect(ptr, "black fairy deployment should still exist (kept on board)").not.toBeNull();
    // …but no longer bound to the returned meeple id (lonely)
    if (ptr instanceof MeeplePointer) {
      expect(ptr.getMeepleId(), "black fairy meepleId should be null after undeploy").toBeNull();
    }
  });
});
