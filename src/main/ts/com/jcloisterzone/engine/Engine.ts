import type { List } from "../../../io/vavr/SeqTypes.js";
import { HashSet } from "../../../io/vavr/Set.js";
import { GameStatePhaseReducer } from "../game/GameStatePhaseReducer.js";
import { GameOverPhase } from "../game/phase/GameOverPhase.js";
import { GameStateBuilder } from "../game/state/GameStateBuilder.js";
import type { GameState } from "../game/state/GameState.js";
import { MessageParser } from "../io/MessageParser.js";
import type { ReplayableMessage } from "../io/message/ReplayableMessage.js";
import { isInstanceOfRandomChangingMessage } from "../io/message/RandomChangingMessage.js";
import { AiMessage } from "../io/message/AiMessage.js";
import { MoveNeutralFigureMessage } from "../io/message/MoveNeutralFigureMessage.js";
import { LegacyAiPlayer } from "../ai/player/LegacyAiPlayer.js";
import { Player } from "../Player.js";
import { createSetupFromMessage } from "./EngineSetup.js";
import { Game } from "./Game.js";
import { StateGsonBuilder } from "./StateGsonBuilder.js";

/**
 * I/O-agnostic port of `Engine.java`'s protocol loop. Feed it one input line at a
 * time via {@link processInput}; it returns the JSON line to emit (or `null` when
 * the protocol produces no output for that input, e.g. in bulk mode).
 *
 * A host (Node CLI, web worker, socket server) wires this to a transport and is
 * responsible for reading files referenced by `%load` (via the `loadFile` hook).
 *
 * Handles `%`-directives, GAME_SETUP, replayable game messages, UNDO, and AI requests
 * (`AiMessage` → `LegacyAiPlayer` computes the move and replies with an AI_MESSAGE).
 */
export class Engine {
  private readonly parser = new MessageParser();
  private readonly serializer = new StateGsonBuilder();

  private game: Game | null = null;
  private reducer: GameStatePhaseReducer | null = null;
  private state: GameState | null = null;

  private bulk = false;
  /** Set once the game reaches GameOverPhase. Java's host loop is `while (!gameIsOver)`,
   *  so it stops reading input after the game ends; mirror that here so a trailing
   *  directive/message (e.g. a replay client's final `%bulk off` / `%state`) does NOT
   *  re-emit the final state (which would surface as a duplicate JSON to the client). */
  private over = false;
  private readonly tileDefinitions: string[] = [];

  /** `loadFile` resolves a `%load <arg>` argument to the tile-definition XML text.
   *  Default is identity (the arg already IS the XML). Node hosts pass `readFileSync`. */
  constructor(private readonly loadFile: (arg: string) => string = (s) => s) {}

  /** Process a single input line. Returns the JSON to emit, or null. */
  processInput(line: string): string | null {
    if (line.length === 0) return null;
    if (this.over) return null; // game is over — Java's run loop has already stopped reading
    if (line.charAt(0) === "%") return this.parseDirective(line);
    if (this.game === null) return this.handleGameSetup(line);
    return this.handleMessage(line);
  }

  private parseDirective(line: string): string | null {
    const sep = line.indexOf(" ");
    const directive = sep < 0 ? line : line.substring(0, sep);
    const value = sep < 0 ? null : line.substring(sep + 1).trim();
    switch (directive) {
      case "%bulk":
        this.bulk = value === "on";
        // `%bulk off` flushes the current state once
        return !this.bulk && this.game !== null ? this.serialize() : null;
      case "%load":
        if (value !== null) this.tileDefinitions.push(this.loadFile(value));
        return null;
      case "%state":
        return this.game !== null ? this.serialize() : null;
      case "%compat":
        // version-compat flag — no behavioural difference ported yet
        return null;
      case "%placements":
        // NON-MUTATING query: legal placements for a tile id in the CURRENT state. Used by the
        // pre-draw UI to pick position+rotation for a secret hand tile (the tile is in the public
        // pack, so this leaks nothing and never advances/changes state). Output mirrors a
        // TilePlacementAction's `options`: [{ position:[x,y], rotations:[0,90,...] }].
        return this.serializePlacements(value);
      default:
        // unknown directive: Java logs to stderr; host may surface this
        return null;
    }
  }

  /** Legal placements for `tileId` in the current state, without mutating it (the tile is peeked
   *  from the pack and the new pack is discarded). Returns `{type:"PLACEMENTS",tileId,options}`. */
  private serializePlacements(tileId: string | null): string {
    const empty = JSON.stringify({ type: "PLACEMENTS", tileId, options: [] });
    if (this.state === null || tileId === null) return empty;
    try {
      const tile = this.state.getTilePack()!.drawTile(tileId)._1; // peek only — pack not replaced
      const placements = HashSet.ofAll(this.state.getTilePlacements(tile));
      const byPos = new Map<string, { x: number; y: number; rots: number[] }>();
      for (const opt of placements) {
        const p = opt.getPosition();
        const key = `${p.x},${p.y}`;
        let g = byPos.get(key);
        if (!g) {
          g = { x: p.x, y: p.y, rots: [] };
          byPos.set(key, g);
        }
        g.rots.push(opt.getRotation().ordinal() * 90);
      }
      const options = [...byPos.values()].map((g) => ({
        position: [g.x, g.y],
        rotations: g.rots.slice().sort((a, b) => a - b),
      }));
      return JSON.stringify({ type: "PLACEMENTS", tileId, options });
    } catch {
      return empty;
    }
  }

  private handleGameSetup(line: string): string | null {
    const json = JSON.parse(line) as { type?: string; payload?: Record<string, unknown> };
    const payload = json.payload ?? (json as Record<string, unknown>);
    const setupMsg = this.parser.parseSetup(payload);
    const initialRandom = setupMsg.getInitialRandom();

    const setup = createSetupFromMessage(setupMsg);
    this.game = new Game();
    this.reducer = new GameStatePhaseReducer(setup, initialRandom);

    const builder = new GameStateBuilder(
      this.tileDefinitions,
      setup,
      setupMsg.getPlayers(),
      initialRandom,
    );
    const annotations = setupMsg.getGameAnnotations();
    builder.setGameAnnotations(annotations && Object.keys(annotations).length > 0 ? annotations : null);

    let state = builder.createInitialState();
    const firstPhase = this.reducer.getFirstPhase();
    state = state.setPhase(firstPhase);
    state = this.reducer.applyStepResult(firstPhase.enter(state));

    this.state = state;
    this.game.replaceState(state);
    return this.bulk ? null : this.serialize();
  }

  private handleMessage(line: string): string | null {
    const entry = JSON.parse(line) as { type: string; payload: Record<string, unknown> };

    // UNDO reverts to the last markUndo snapshot (port of Engine.java UndoMessage path)
    if (entry.type === "UNDO") {
      this.game!.undo();
      this.state = this.game!.getState();
      return this.bulk ? null : this.serialize();
    }

    const msg = this.parser.parse(entry);
    const oldActivePlayer = this.state!.getActivePlayer();

    // AI request: compute (but don't apply) the active player's move and reply with an
    // AI_MESSAGE wrapping it. The state is unchanged; the client applies the move itself.
    // (Port of Engine.java's AiMessage branch.) NOTE: the AI search shares the reducer's
    // RandomGenerator and advances it during look-ahead — matching Java; live play resets
    // the RNG via the client-supplied `random` on the next message.
    if (msg instanceof AiMessage) {
      let aiResponse: string | null = null;
      const reqIdx = msg.getPlayer();
      if (oldActivePlayer !== null && reqIdx !== null && reqIdx === oldActivePlayer.getIndex()) {
        const aiPlayer = new LegacyAiPlayer(this.reducer!, new Player(reqIdx));
        const chosen = aiPlayer.apply(this.state!);
        const wire = this.parser.toWire(chosen);
        aiResponse = JSON.stringify({
          type: "AI_MESSAGE",
          payload: { type: wire.type, payload: wire.payload, player: oldActivePlayer.getIndex() },
        });
      }
      // undo/replay bookkeeping (state unchanged for an AI request)
      const undoAllowedAi = msg.getRandom() === null && oldActivePlayer !== null;
      if (undoAllowedAi) this.game!.markUndo();
      else this.game!.clearUndo();
      this.game!.replaceState(this.state!);
      this.game!.setReplay(
        this.game!.getReplay().prepend(msg as unknown as ReplayableMessage) as List<ReplayableMessage>,
      );
      return aiResponse;
    }

    // RandomChangingMessage: apply the message's random before reducing
    const isRandomChanging = isInstanceOfRandomChangingMessage(msg);
    const msgRandom = isRandomChanging ? msg.getRandom() : null;
    if (msgRandom !== null && msgRandom !== undefined) {
      this.reducer!.getRandomGenerator().setRandom(msgRandom);
    }

    this.state = this.reducer!.apply(this.state!, msg);

    // Undo is offered while the SAME player is still active and the move didn't
    // consume a (client-supplied) random — i.e. it can be replayed deterministically.
    // A dragon move is never undoable (Java's undoAllowed). (Port of Engine.java.)
    // NOTE: a pre-draw PLACEMENT (PLACE_PREDRAWN) IS undoable — the player may take the tile back
    // and place a different one; the server restores it to the hand. (Only the DRAW is final, and
    // that is a server-side deal that never reaches the engine replay.)
    const newActivePlayer = this.state.getActivePlayer();
    const isDragonMove =
      msg instanceof MoveNeutralFigureMessage && (msg.getFigureId() ?? "").includes("dragon");
    const undoAllowed =
      (!isRandomChanging || msgRandom === null || msgRandom === undefined) &&
      newActivePlayer !== null &&
      oldActivePlayer !== null &&
      newActivePlayer.equals(oldActivePlayer) &&
      !isDragonMove;

    if (undoAllowed) this.game!.markUndo();
    else this.game!.clearUndo();

    this.game!.replaceState(this.state);
    // every parsed game message is replayable in Stage 0
    this.game!.setReplay(
      this.game!.getReplay().prepend(msg as unknown as ReplayableMessage) as List<ReplayableMessage>,
    );

    const gameOver = this.state.getPhase() instanceof GameOverPhase;
    const result = !this.bulk || gameOver ? this.serialize() : null;
    if (gameOver) this.over = true; // emit the final state once, then ignore further input
    return result;
  }

  private serialize(): string {
    return this.serializer.serializeGame(this.game!);
  }

  /** Current game (for hosts that want direct access / testing). */
  getGame(): Game | null {
    return this.game;
  }
}
