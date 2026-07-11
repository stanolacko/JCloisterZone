import { HashSet } from "../../../../io/vavr/Set.js";
import type { ClassToken } from "../../../../lang/Class.js";
import { CoopGameLostEvent } from "../../event/CoopGameLostEvent.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { SetNextPlayer } from "../../reducers/SetNextPlayer.js";
import type { Capability } from "../Capability.js";
import { AbbeyCapability } from "../capability/AbbeyCapability.js";
import { KeepBuildingCapability } from "../capability/KeepBuildingCapability.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import { Phase } from "./Phase.js";
import type { StepResult } from "./StepResult.js";

const ABBEY_CLS = AbbeyCapability as unknown as ClassToken<Capability<number>>;
const KEEP_BUILDING_CLS = KeepBuildingCapability as unknown as ClassToken<Capability<number | null>>;

/** Real end of turn: clean up and switch to the next player. */
export class CleanUpTurnPhase extends Phase {
  static readonly simpleName = "CleanUpTurnPhase";

  private endPhase: Phase | null = null;
  private gameOverPhase: Phase | null = null;
  private abbeyEndGamePhase: Phase | null = null;

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
  }

  setEndPhase(endPhase: Phase | null): void {
    this.endPhase = endPhase;
  }

  setGameOverPhase(gameOverPhase: Phase | null): void {
    this.gameOverPhase = gameOverPhase;
  }

  setAbbeyEndGamePhase(abbeyEndGamePhase: Phase | null): void {
    this.abbeyEndGamePhase = abbeyEndGamePhase; // TODO(abbey)
  }

  enter(state: GameState): StepResult {
    for (const cap of state.getCapabilities().toSeq()) {
      state = cap.onTurnCleanUp(state);
    }
    // Keep Building (coop variant): capture the condition before flags are wiped.
    const coopFailed =
      state.hasCapability(KEEP_BUILDING_CLS) && !state.hasFlag(Flag.COOP_CONDITION_MET);
    // The river's volcano lake grants its placer another turn — capture before flags are wiped.
    const riverVolcanoDoubleTurn = state.getFlags().contains(Flag.RIVER_VOLCANO_DOUBLE_TURN);
    if (!state.getFlags().isEmpty()) {
      state = state.setFlags(HashSet.empty());
    }

    // end-game abbey placement in progress (model holds the player index it ends on).
    // NB: checked BEFORE the coop loss — the abbey end-game only starts once the pack is
    // empty (the coop win is already secured); its abbey-or-pass turns are exempt.
    if (state.hasCapability(ABBEY_CLS)) {
      const endPlayerIdx = state.getCapabilityModel<number>(ABBEY_CLS);
      if (endPlayerIdx !== null && endPlayerIdx !== undefined) {
        return this.next(state, this.abbeyEndGamePhase!);
      }
    }
    // TODO(bazaar): bazaar supply handling.

    // Keep Building loss: the turn player neither enlarged an occupied completable feature
    // nor occupied a new one — game over immediately, everyone loses. Skips the endPhase
    // chain (abbey end-game / CoC final scoring) and goes straight to GameOverPhase.
    if (coopFailed) {
      const loser = state.getTurnPlayer()!;
      state = state.setCapabilityModel<number | null>(KEEP_BUILDING_CLS as never, loser.getIndex());
      state = state.appendEvent(new CoopGameLostEvent(PlayEventMeta.createWithPlayer(loser), loser));
      return this.next(state, this.gameOverPhase!);
    }

    const tilePack = state.getTilePack()!;
    if (tilePack.isEmpty()) {
      return this.next(state, this.endPhase!);
    }
    // Skip advancing the player when the volcano lake was just placed — the same player goes again.
    if (!riverVolcanoDoubleTurn) {
      state = new SetNextPlayer().apply(state);
    }
    return this.next(state);
  }
}
