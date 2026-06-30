import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { Vector } from "../../../../io/vavr/SeqTypes.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { ClassToken } from "../../../../lang/Class.js";
import type { Location } from "../../board/Location.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { Road } from "../../feature/Road.js";
import { FerriesAction } from "../../action/FerriesAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import type { PlaceTokenMessage } from "../../io/message/PlaceTokenMessage.js";
import { PlaceTokenMessage as PlaceTokenMessageClass } from "../../io/message/PlaceTokenMessage.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { ChangeFerry } from "../../reducers/ChangeFerry.js";
import type { Capability } from "../Capability.js";
import { FerriesCapability } from "../capability/FerriesCapability.js";
import { FerriesCapabilityModel } from "../capability/FerriesCapabilityModel.js";
import { RussianPromosTrapCapability } from "../capability/RussianPromosTrapCapability.js";
import { ActionsState } from "../state/ActionsState.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import { Phase, type PhaseHandler } from "./Phase.js";
import type { RewindActionContainer } from "./RewindActionContainer.js";
import type { StepResult } from "./StepResult.js";

import { type FeatureCompletionBlocker, isInstanceOfFeatureCompletionBlocker } from "../capability/trait/FeatureCompletionBlocker.js";

/** All unordered pairs of `locs`, each pair unioned into one Location. */
function pairUnions(locs: Location[]): Location[] {
  const out: Location[] = [];
  for (let i = 0; i < locs.length; i++) {
    for (let j = i + 1; j < locs.length; j++) out.push(locs[i].union(locs[j]));
  }
  return out;
}

const FERRIES_CLS = FerriesCapability as unknown as ClassToken<Capability<FerriesCapabilityModel>>;

/** After a tile placement, lets the turn player move a nearby ferry to a different road-end
 *  pair on its tile. Excludes moves that would (un)block a feature completion (donkey/tunnel). */
export class ChangeFerriesPhase extends Phase {
  static readonly simpleName = "ChangeFerriesPhase";

  constructor(
    random: RandomGenerator,
    defaultNext: Phase | null,
    rewindActionContainer: RewindActionContainer | null = null,
  ) {
    super(random, defaultNext, rewindActionContainer);
  }

  /** Candidate new ferry positions reachable from the just-placed tile's roads. */
  private computeOptions(state: GameState, pos: { equals(o: unknown): boolean }): Set<FeaturePointer> {
    const model = this.model(state);
    const ferries = model.getFerries().filter((f) => !f.getPosition().equals(pos));

    // nearest ferry-part of each road on the placed tile
    let ferryParts: Set<FeaturePointer> = HashSet.empty<FeaturePointer>();
    for (const t of state.getTileFeatures2(pos as never, Road)) {
      const nearest = (t._2 as Road).findNearest(state, t._1, (fp) =>
        ferries.find((f) => fp.isPartOf(f)).isDefined(),
      );
      for (const fp of nearest) ferryParts = ferryParts.add(fp);
    }

    let options: Set<FeaturePointer> = HashSet.empty<FeaturePointer>();
    for (const ferryPart of ferryParts) {
      if (model.getMovedFerries().containsKey(ferryPart.getPosition())) continue;
      const ferryPos = ferryPart.getPosition();
      const ferryTile = state.getPlacedTile(ferryPos)!;
      const locs: Location[] = [];
      for (const ft of ferryTile.getTile().getInitialFeatures()) {
        if (ft._2 instanceof Road) locs.push(ft._1.getLocation()!);
      }
      for (const loc of pairUnions(locs)) {
        const fp = new FeaturePointer(ferryPos, Road as never, loc.rotateCW(ferryTile.getRotation()));
        if (!ferries.contains(fp)) options = options.add(fp);
      }
    }
    return options;
  }

  enter(state: GameState): StepResult {
    const lastPlaced = state.getLastPlaced()!;
    const pos = lastPlaced.getPosition();
    const options = this.computeOptions(state, pos);

    if (options.isEmpty()) return this.next(state);

    let allowedOptions = options;
    const blockers = state
      .getCapabilities()
      .toSeq()
      .toArray()
      .filter((c) => isInstanceOfFeatureCompletionBlocker(c)) as unknown as FeatureCompletionBlocker[];

    if (blockers.length > 0) {
      allowedOptions = HashSet.empty<FeaturePointer>();
      for (const newFerry of options) {
        const as = new ActionsState(
          state.getTurnPlayer()!,
          Vector.of(new FerriesAction(options) as unknown as PlayerAction<unknown>),
          true,
        );
        let isBlocked = false;
        for (const cap of blockers) {
          if (isBlocked) break;
          let sim = state.setPlayerActions(as);
          const sModel = this.model(sim);
          const newPos = newFerry.getPosition();
          const oldFerry = sModel.getFerries().find((f) => f.getPosition().equals(newPos)).get();
          sim = sim.setCapabilityModel<FerriesCapabilityModel>(
            FERRIES_CLS,
            sModel.mapMovedFerries((mf) =>
              mf.put(pos, new Tuple2(oldFerry.getLocation()!, newFerry.getLocation()!)),
            ),
          );
          sim = new ChangeFerry(oldFerry, newFerry).apply(sim);

          const newSides = newFerry.getLocation()!.splitToSides();
          const oldSides = oldFerry.getLocation()!.splitToSides();
          const sidesEq = (a: Location, list: typeof newSides) =>
            list.toArray().some((x) => x.equals(a));
          for (const loc of newSides.toArray().filter((l) => !sidesEq(l, oldSides))) {
            const fp = new FeaturePointer(oldFerry.getPosition(), Road as never, loc);
            if (!isBlocked && cap.isFeatureCompletionBlocked(sim, fp)) isBlocked = true;
          }
          for (const loc of oldSides.toArray().filter((l) => !sidesEq(l, newSides))) {
            const fp = new FeaturePointer(oldFerry.getPosition(), Road as never, loc);
            if (!isBlocked && cap.isFeatureCompletionBlocked(sim, fp)) isBlocked = true;
          }
        }
        if (!isBlocked) allowedOptions = allowedOptions.add(newFerry);
      }
    }

    return this.promote(
      state.setPlayerActions(
        new ActionsState(state.getTurnPlayer()!, new FerriesAction(allowedOptions), true),
      ),
    );
  }

  handlePlaceToken(state: GameState, msg: PlaceTokenMessage): StepResult {
    const token = msg.getToken();
    if (token !== FerriesCapability.FerryToken.FERRY) {
      throw new Error("Only ferry token placement is allowed");
    }
    state = state.addFlag(Flag.POST_WOOD_ACTION_STARTED);
    const model = this.model(state);
    const newFerry = msg.getPointer() as FeaturePointer;
    const pos = newFerry.getPosition();
    const oldFerry = model.getFerries().find((f) => f.getPosition().equals(pos)).get();

    state = state.setCapabilityModel<FerriesCapabilityModel>(
      FERRIES_CLS,
      model.mapMovedFerries((mf) =>
        mf.put(pos, new Tuple2(oldFerry.getLocation()!, newFerry.getLocation()!)),
      ),
    );
    state = new ChangeFerry(oldFerry, newFerry).apply(state);
    state = this.clearActions(state);
    const russianPromos = state.getCapabilities().get(RussianPromosTrapCapability as never) as RussianPromosTrapCapability | null;
    if (russianPromos !== null) state = russianPromos.trapFollowers(state);
    return this.enter(state);
  }

  private model(state: GameState): FerriesCapabilityModel {
    return state.getCapabilityModel<FerriesCapabilityModel>(FERRIES_CLS);
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTokenMessageClass, this.handlePlaceToken);
    return m;
  }
}
