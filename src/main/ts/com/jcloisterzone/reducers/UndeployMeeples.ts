import { HashSet, type Set } from "../../../io/vavr/Set.js";
import { Queue } from "../../../io/vavr/SeqTypes.js";
import type { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { MeeplePointer } from "../board/pointer/MeeplePointer.js";
import { PlayEvent, PlayEventMeta } from "../event/PlayEvent.js";
import { MeepleReturned } from "../event/MeepleReturned.js";
import type { Feature } from "../feature/Feature.js";
import type { Meeple } from "../figure/Meeple.js";
import { ReturnMeepleSource } from "../game/ReturnMeepleSource.js";
import { isInstanceOfUnaffectedByBarn } from "../game/capability/trait/UnaffectedByBarn.js";
import type { GameState } from "../game/state/GameState.js";
import type { Reducer } from "./Reducer.js";

/** Undeploys all meeples on a feature (except Barn/Shepherd for barn sources). */
export class UndeployMeeples implements Reducer {
  constructor(
    private readonly feature: Feature,
    private readonly forced: boolean,
    private readonly returnMeepleSource: ReturnMeepleSource | null = null,
    private readonly featureCausedUndeploy: Feature | null = null,
  ) {}

  apply(state: GameState): GameState {
    const fps: Set<FeaturePointer> = HashSet.ofAll(this.feature.getPlaces());
    const meeples: Meeple[] = [];
    const events: PlayEvent[] = [];
    const eventMeta = PlayEventMeta.createWithoutPlayer();
    const isBarnSrc =
      this.returnMeepleSource === ReturnMeepleSource.BARN_FIELD_JOIN ||
      this.returnMeepleSource === ReturnMeepleSource.BARN_PLACEMENT;

    for (const t of state.getDeployedMeeples()) {
      if (!fps.contains(t._2)) continue;
      if (isBarnSrc && isInstanceOfUnaffectedByBarn(t._1)) continue;
      meeples.push(t._1);
      events.push(new MeepleReturned(eventMeta, t._1, t._2, this.forced, this.returnMeepleSource));
    }

    let dm = state.getDeployedMeeples();
    for (const m of meeples) dm = dm.remove(m) as typeof dm;
    state = state.setDeployedMeeples(dm);
    state = state.setEvents(state.getEvents().appendAll(events) as Queue<PlayEvent>);

    // Fairy follows the returned meeple (basic: no fairy)
    let nfState = state.getNeutralFigures();
    const fairyPtr = nfState.getFairyDeployment();
    if (fairyPtr instanceof MeeplePointer) {
      for (const meeple of meeples) {
        if (meeple.getId() === fairyPtr.getMeepleId()) {
          const mp = new MeeplePointer(fairyPtr.asFeaturePointer(), null);
          nfState = nfState.setDeployedNeutralFigures(
            nfState.getDeployedNeutralFigures().put(nfState.getFairy()!, mp) as ReturnType<
              typeof nfState.getDeployedNeutralFigures
            >,
          );
          state = state.setNeutralFigures(nfState);
          break;
        }
      }
    }
    // Black Fairy: same — unbind it from a returned meeple so it stays "lonely" on the feature,
    // instead of visually following the returned meeple to its next placement.
    const blackFairyPtr = nfState.getBlackFairyDeployment();
    if (blackFairyPtr instanceof MeeplePointer) {
      for (const meeple of meeples) {
        if (meeple.getId() === blackFairyPtr.getMeepleId()) {
          const mp = new MeeplePointer(blackFairyPtr.asFeaturePointer(), null);
          nfState = nfState.setDeployedNeutralFigures(
            nfState.getDeployedNeutralFigures().put(nfState.getBlackFairy()!, mp) as ReturnType<
              typeof nfState.getDeployedNeutralFigures
            >,
          );
          state = state.setNeutralFigures(nfState);
          break;
        }
      }
    }
    return state;
  }

  isForced(): boolean {
    return this.forced;
  }

  getReturnMeepleSource(): ReturnMeepleSource | null {
    return this.returnMeepleSource;
  }
}
