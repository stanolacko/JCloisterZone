import type { Message } from "../io/message/Message.js";
import { RandomGenerator } from "../random/RandomGenerator.js";
import type { GameSetup } from "./GameSetup.js";
import { AbbeyEndGamePhase } from "./phase/AbbeyEndGamePhase.js";
import { TileFromSupplyPhase } from "./phase/TileFromSupplyPhase.js";
import { ActionPhase } from "./phase/ActionPhase.js";
import { CastlePhase } from "./phase/CastlePhase.js";
import { CleanUpTurnPartPhase } from "./phase/CleanUpTurnPartPhase.js";
import { CornCirclePhase } from "./phase/CornCirclePhase.js";
import { CleanUpTurnPhase } from "./phase/CleanUpTurnPhase.js";
import { EscapePhase } from "./phase/EscapePhase.js";
import { CommitAbbeyPassPhase } from "./phase/CommitAbbeyPassPhase.js";
import { CommitActionPhase } from "./phase/CommitActionPhase.js";
import { GameOverPhase } from "./phase/GameOverPhase.js";
import { GamblersLuckDicePhase } from "./phase/GamblersLuckDicePhase.js";
import { BazaarPhase } from "./phase/BazaarPhase.js";
import { GamblersLuckCapability } from "./capability/GamblersLuckCapability.js";
import { BazaarCapability } from "./capability/BazaarCapability.js";
import { GoldPiecePhase } from "./phase/GoldPiecePhase.js";
import { MageAndWitchPhase } from "./phase/MageAndWitchPhase.js";
import { PhantomPhase } from "./phase/PhantomPhase.js";
import { TunnelPhase } from "./phase/TunnelPhase.js";
import { PlaceFerryPhase } from "./phase/PlaceFerryPhase.js";
import { ChangeFerriesPhase } from "./phase/ChangeFerriesPhase.js";
import { RussianPromosTrapPhase } from "./phase/RussianPromosTrapPhase.js";
import { CocScoringPhase } from "./phase/CocScoringPhase.js";
import { CocFollowerPhase } from "./phase/CocFollowerPhase.js";
import { CocFinalScoringPhase } from "./phase/CocFinalScoringPhase.js";
import { BigTopPhase } from "./phase/BigTopPhase.js";
import { DragonPhase } from "./phase/DragonPhase.js";
import { TilePlacementConfirmPhase } from "./phase/TilePlacementConfirmPhase.js";
import { CourierPhase } from "./phase/CourierPhase.js";
import type { Phase } from "./phase/Phase.js";
import { RewindActionContainer } from "./phase/RewindActionContainer.js";
import { FairyPhase } from "./phase/FairyPhase.js";
import { ScoringPhase } from "./phase/ScoringPhase.js";
import { ShepherdPhase } from "./phase/ShepherdPhase.js";
import { ShepherdPlacementConfirmPhase } from "./phase/ShepherdPlacementConfirmPhase.js";
import { WagonPhase } from "./phase/WagonPhase.js";
import type { StepResult } from "./phase/StepResult.js";
import { TilePhase } from "./phase/TilePhase.js";
import { AbbeyCapability } from "./capability/AbbeyCapability.js";
import { CastleCapability } from "./capability/CastleCapability.js";
import { CornCircleCapability } from "./capability/CornCircleCapability.js";
import { GoldminesCapability } from "./capability/GoldminesCapability.js";
import { MageAndWitchCapability } from "./capability/MageAndWitchCapability.js";
import { PhantomCapability } from "./capability/PhantomCapability.js";
import { TunnelCapability } from "./capability/TunnelCapability.js";
import { FerriesCapability } from "./capability/FerriesCapability.js";
import { RussianPromosTrapCapability } from "./capability/RussianPromosTrapCapability.js";
import { CountCapability } from "./capability/CountCapability.js";
import { BigTopCapability } from "./capability/BigTopCapability.js";
import { DragonCapability } from "./capability/DragonCapability.js";
import { MeteoriteCapability } from "./capability/MeteoriteCapability.js";
import { CourierCapability } from "./capability/CourierCapability.js";
import { Rule } from "./Rule.js";
import { SheepCapability } from "./capability/SheepCapability.js";
import { FairyCapability } from "./capability/FairyCapability.js";
import { WagonCapability } from "./capability/WagonCapability.js";
import type { GameState } from "./state/GameState.js";

/**
 * Applies a Message to derive a new GameState (Java Function2<GameState,Message,GameState>).
 *
 * Builds the linked phase chain from the setup. NOTE: only the BASIC chain is
 * built so far; expansion phases (bazaar/abbey/dragon/wagon/...) are TODO — they
 * are inserted conditionally on setup.contains(capability) once ported.
 */
export class GameStatePhaseReducer {
  private readonly firstPhase: Phase;
  private readonly randomGenerator: RandomGenerator;

  constructor(setup: GameSetup, initialRandom: number) {
    this.randomGenerator = new RandomGenerator(initialRandom);
    const rng = this.randomGenerator;

    const gameOverPhase = new GameOverPhase(rng, null);
    let endChain: Phase = gameOverPhase;
    if (setup.contains(CountCapability as never)) {
      endChain = new CocFinalScoringPhase(rng, endChain);
    }
    let abbeyEndGamePhase: AbbeyEndGamePhase | null = null;
    if (setup.contains(AbbeyCapability as never)) {
      abbeyEndGamePhase = new AbbeyEndGamePhase(rng, endChain);
      endChain = abbeyEndGamePhase;
    }

    const cleanUpTurnPhase = new CleanUpTurnPhase(rng, null);
    let next: Phase = cleanUpTurnPhase;
    if (setup.contains(BazaarCapability as never)) {
      next = new BazaarPhase(rng, next);
    }
    if (setup.getBooleanRule(Rule.ESCAPE)) {
      next = new EscapePhase(rng, next);
    }
    const cleanUpTurnPartPhase = new CleanUpTurnPartPhase(rng, next);
    next = cleanUpTurnPartPhase;
    if (setup.contains(CourierCapability as never)) {
      next = new CourierPhase(rng, next);
    }
    if (setup.contains(CornCircleCapability as never)) {
      next = new CornCirclePhase(rng, next);
    }
    if (
      setup.contains(DragonCapability as never) &&
      setup.getStringRule(Rule.DRAGON_MOVEMENT) === "after-scoring"
    ) {
      next = new DragonPhase(rng, next);
    }
    if (setup.contains(CountCapability as never)) {
      next = new CocFollowerPhase(rng, next);
    }
    if (setup.contains(BigTopCapability as never)) {
      next = new BigTopPhase(rng, next);
    }
    if (setup.contains(WagonCapability as never)) {
      next = new WagonPhase(rng, next);
    }
    next = new ScoringPhase(rng, next);
    if (setup.contains(CountCapability as never)) {
      next = new CocScoringPhase(rng, next);
    }
    if (setup.contains(GamblersLuckCapability as never)) {
      next = new GamblersLuckDicePhase(rng, next);
    }
    // Action and Phantom area — when a Tower "random pay" frees a meeple/phantom, rewind
    // back to these phases. Each phase after Action/Phantom must set
    // Flag.POST_WOOD_ACTION_STARTED when resolving its user request, to prevent rewinding
    // once a post-wood follow-up (e.g. a dragon move) has begun.
    const rewindActionContainer = new RewindActionContainer();
    next = new CommitActionPhase(rng, next, rewindActionContainer);
    if (setup.contains(CastleCapability as never)) {
      next = new CastlePhase(rng, next, rewindActionContainer);
    }
    if (
      setup.contains(DragonCapability as never) &&
      setup.getStringRule(Rule.DRAGON_MOVEMENT) !== "after-scoring"
    ) {
      next = new DragonPhase(rng, next, rewindActionContainer);
    }
    if (setup.contains(SheepCapability as never)) {
      next = new ShepherdPhase(rng, next, rewindActionContainer);
      next = new ShepherdPlacementConfirmPhase(rng, next, rewindActionContainer);
    }
    if (setup.contains(FerriesCapability as never)) {
      next = new ChangeFerriesPhase(rng, next, rewindActionContainer);
      next = new PlaceFerryPhase(rng, next, rewindActionContainer);
    }
    if (setup.contains(RussianPromosTrapCapability as never)) {
      next = new RussianPromosTrapPhase(rng, next);
    }
    if (setup.contains(TunnelCapability as never)) {
      next = new TunnelPhase(rng, next, rewindActionContainer);
    }
    let phantomPhase: Phase | null = null;
    if (setup.contains(PhantomCapability as never)) {
      phantomPhase = new PhantomPhase(rng, next);
      next = phantomPhase;
    }
    if (setup.contains(RussianPromosTrapCapability as never)) {
      next = new RussianPromosTrapPhase(rng, next);
    }
    const actionPhase = new ActionPhase(rng, next);
    next = actionPhase;
    // Set Action/Phantom phases as possible rewind targets
    rewindActionContainer.setActionPhase(actionPhase);
    rewindActionContainer.setPhantomPhase(phantomPhase);
    if (setup.contains(MageAndWitchCapability as never)) {
      next = new MageAndWitchPhase(rng, next);
    }
    if (setup.contains(GoldminesCapability as never)) {
      next = new GoldPiecePhase(rng, next);
    }
    if (setup.contains(MeteoriteCapability as never)) {
      next = new TilePlacementConfirmPhase(rng, next);
    }
    const tilePhase = new TilePhase(rng, next);
    next = tilePhase;
    if (setup.contains(AbbeyCapability as never)) {
      // if abbey is passed, a commit follows (to advance RNG salt) before the tile draw
      next = new CommitAbbeyPassPhase(rng, next);
    }
    // Always present: lets the player place a tile from supply (abbey/bazaar) before drawing.
    const tileFromSupplyPhase = new TileFromSupplyPhase(rng, next);
    next = tileFromSupplyPhase;
    if (setup.contains(FairyCapability as never)) {
      next = new FairyPhase(rng, next);
    }

    cleanUpTurnPhase.setDefaultNext(next); // after last phase, the first is default
    cleanUpTurnPhase.setAbbeyEndGamePhase(abbeyEndGamePhase);
    cleanUpTurnPhase.setEndPhase(endChain);
    cleanUpTurnPhase.setGameOverPhase(gameOverPhase); // coop-variant loss goes straight to game over
    cleanUpTurnPartPhase.setSecondPartStartPhase(tileFromSupplyPhase);
    if (abbeyEndGamePhase !== null) abbeyEndGamePhase.setActionPhase(actionPhase);
    tileFromSupplyPhase.setTilePhase(tilePhase);
    tileFromSupplyPhase.setActionPhase(actionPhase);
    tilePhase.setEndPhase(endChain);
    tilePhase.setCleanUpTurnPhase(cleanUpTurnPhase);

    this.firstPhase = next;
    void setup;
  }

  applyStepResult(stepResult: StepResult): GameState {
    let state = stepResult.getState();
    let next = stepResult.getNext();
    while (next !== null) {
      stepResult = next.enter(state);
      state = stepResult.getState();
      next = stepResult.getNext();
    }
    return state;
  }

  apply(state: GameState, message: Message): GameState {
    const phase = state.getPhase()!;
    const stepResult = phase.dispatchMessage(state, message);
    return this.applyStepResult(stepResult);
  }

  getFirstPhase(): Phase {
    return this.firstPhase;
  }

  getRandomGenerator(): RandomGenerator {
    return this.randomGenerator;
  }
}
