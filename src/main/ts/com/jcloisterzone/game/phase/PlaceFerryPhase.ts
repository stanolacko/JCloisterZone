import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { Location } from "../../board/Location.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { Road } from "../../feature/Road.js";
import { FerriesAction } from "../../action/FerriesAction.js";
import type { PlaceTokenMessage } from "../../io/message/PlaceTokenMessage.js";
import { PlaceTokenMessage as PlaceTokenMessageClass } from "../../io/message/PlaceTokenMessage.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { PlaceFerry } from "../../reducers/PlaceFerry.js";
import { FerriesCapability } from "../capability/FerriesCapability.js";
import { RussianPromosTrapCapability } from "../capability/RussianPromosTrapCapability.js";
import { ActionsState } from "../state/ActionsState.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import { Phase, type PhaseHandler } from "./Phase.js";
import type { RewindActionContainer } from "./RewindActionContainer.js";
import type { StepResult } from "./StepResult.js";

/** All unordered pairs of `locs`, each pair unioned into a single Location. */
function pairUnions(locs: Location[]): Location[] {
  const out: Location[] = [];
  for (let i = 0; i < locs.length; i++) {
    for (let j = i + 1; j < locs.length; j++) out.push(locs[i].union(locs[j]));
  }
  return out;
}

/** After placing a lake-ferry tile, offer to place the ferry on one of the road-end pairs. */
export class PlaceFerryPhase extends Phase {
  static readonly simpleName = "PlaceFerryPhase";

  constructor(
    random: RandomGenerator,
    defaultNext: Phase | null,
    rewindActionContainer: RewindActionContainer | null = null,
  ) {
    super(random, defaultNext, rewindActionContainer);
  }

  enter(state: GameState): StepResult {
    const placedTile = state.getLastPlaced()!;
    const tile = placedTile.getTile();
    const pos = placedTile.getPosition();
    const rot = placedTile.getRotation();
    if (tile.hasModifier(FerriesCapability.LAKE_FERRY)) {
      const locs: Location[] = [];
      for (const t of tile.getInitialFeatures()) {
        if (t._2 instanceof Road) locs.push(t._1.getLocation()!);
      }
      let ferries: Set<FeaturePointer> = HashSet.empty<FeaturePointer>();
      for (const loc of pairUnions(locs)) {
        ferries = ferries.add(new FeaturePointer(pos, Road as never, loc.rotateCW(rot)));
      }
      return this.promote(
        state.setPlayerActions(new ActionsState(state.getTurnPlayer()!, new FerriesAction(ferries), false)),
      );
    }
    return this.next(state);
  }

  handlePlaceToken(state: GameState, msg: PlaceTokenMessage): StepResult {
    const token = msg.getToken();
    if (token !== FerriesCapability.FerryToken.FERRY) {
      throw new Error("Only ferry token placement is allowed");
    }
    state = state.addFlag(Flag.POST_WOOD_ACTION_STARTED);
    const ferry = msg.getPointer() as FeaturePointer;
    state = new PlaceFerry(ferry).apply(state);
    state = this.clearActions(state);
    const russianPromos = state.getCapabilities().get(RussianPromosTrapCapability as never) as RussianPromosTrapCapability | null;
    if (russianPromos !== null) state = russianPromos.trapFollowers(state);
    return this.next(state);
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTokenMessageClass, this.handlePlaceToken);
    return m;
  }
}
