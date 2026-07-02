import type { List } from "../../../../io/vavr/SeqTypes.js";
import type { ClassToken } from "../../../../lang/Class.js";
import type { Player } from "../../Player.js";
import { ConfirmAction } from "../../action/ConfirmAction.js";
import { Location } from "../../board/Location.js";
import { type Completable, isInstanceOfCompletable } from "../../feature/Completable.js";
import type { Feature } from "../../feature/Feature.js";
import { Field } from "../../feature/Field.js";
import { Barn } from "../../figure/Barn.js";
import type { CommitMessage } from "../../io/message/CommitMessage.js";
import { CommitMessage as CommitMessageClass } from "../../io/message/CommitMessage.js";
import type { PassMessage } from "../../io/message/PassMessage.js";
import type { Capability } from "../Capability.js";
import { BarnCapability } from "../capability/BarnCapability.js";
import { RussianPromosTrapCapability } from "../capability/RussianPromosTrapCapability.js";
import { ActionsState } from "../state/ActionsState.js";
import type { GameState } from "../state/GameState.js";
import { AbstractCocScoringPhase } from "./AbstractCocScoringPhase.js";
import { collectCompletedThisTurn } from "./collectCompletedThisTurn.js";
import type { Phase, PhaseHandler } from "./Phase.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import type { StepResult } from "./StepResult.js";


const TRAP_CLS = RussianPromosTrapCapability as unknown as ClassToken<RussianPromosTrapCapability>;
const BARN_CLS = BarnCapability as unknown as ClassToken<Capability<FeaturePointerNull>>;
type FeaturePointerNull = import("../../board/pointer/FeaturePointer.js").FeaturePointer | null;

/** Per-turn Count district scoring: after this turn's scoring, each player (turn player first)
 *  may move one follower from a feature finished this turn onto a city district. */
export class CocScoringPhase extends AbstractCocScoringPhase {
  static readonly simpleName = "CocScoringPhase";

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
  }

  enter(state: GameState): StepResult {
    return this.nextPlayer(state, state.getTurnPlayer()!, false);
  }

  override handlePass(state: GameState, _msg: PassMessage): StepResult {
    const player = state.getActivePlayer()!;
    if (player.equals(state.getTurnPlayer()!)) {
      return this.endPhase(state);
    }
    return super.handlePass(state, _msg);
  }

  handleCommit(state: GameState, _msg: CommitMessage): StepResult {
    const russianPromos = state.getCapabilities().get(TRAP_CLS) as RussianPromosTrapCapability | null;
    if (russianPromos !== null && russianPromos !== undefined) {
      state = russianPromos.trapFollowers(state);
    }
    return this.handlePass(state, null as unknown as PassMessage);
  }

  protected nextPlayer(state: GameState, player: Player, actionUsed: boolean): StepResult {
    let p = player;
    if (!actionUsed) {
      p = player.getNextPlayer(state);
    }
    for (;;) {
      const res = this.processPlayer(state, p);
      if (res !== null) {
        return res;
      }
      if (actionUsed && p === player) {
        return this.promote(state.setPlayerActions(new ActionsState(player, new ConfirmAction(), false)));
      }
      if (p.equals(state.getTurnPlayer()!)) {
        return this.endPhase(state);
      }
      p = p.getNextPlayer(state);
    }
  }

  protected getValidQuarters(_state: GameState): List<Location> {
    return Location.QUARTERS;
  }

  protected getAllowedFeaturesFilter(state: GameState): (f: Feature) => boolean {
    const lastPlaced = state.getLastPlaced()!;

    const barnInvolvedFields = new globalThis.Set<Feature>();
    if (state.getCapabilities().contains(BarnCapability as never)) {
      const placedBarnPtr = state.getCapabilityModel<FeaturePointerNull>(BARN_CLS);
      const placedBarnField =
        placedBarnPtr === null ? null : (state.getFeature(placedBarnPtr) as Field | null);
      if (placedBarnField !== null) {
        barnInvolvedFields.add(placedBarnField as unknown as Feature);
      }
      const pos = lastPlaced.getPosition();
      for (const t of state.getTileFeatures2(pos)) {
        const f = t._2;
        if (f === (placedBarnField as unknown)) continue;
        if (!(f instanceof Field)) continue;
        if (f.getSpecialMeeples(state).find((m) => m instanceof Barn).isEmpty()) continue;
        if (f.getFollowers(state).isEmpty()) continue;
        barnInvolvedFields.add(f as unknown as Feature);
      }
    }

    // Completables finished this turn — shared with ScoringPhase so both phases agree on what
    // "finished this turn" means (marketplaces, ferries, tunnels, …). Fields are handled
    // separately above (they never appear in the completed-this-turn set).
    const completedThisTurn = new globalThis.Set<Completable>(collectCompletedThisTurn(state));

    return (f: Feature) => {
      if (f instanceof Field) {
        return barnInvolvedFields.has(f as unknown as Feature);
      }
      if (isInstanceOfCompletable(f)) {
        return completedThisTurn.has(f as unknown as Completable);
      }
      throw new Error("Unsupported feature");
    };
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(CommitMessageClass, this.handleCommit);
    return m;
  }
}
