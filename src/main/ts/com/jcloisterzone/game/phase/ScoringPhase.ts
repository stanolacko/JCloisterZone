import { HashMap, type Map as VMap } from "../../../../io/vavr/Map.js";
import { HashSet } from "../../../../io/vavr/Set.js";
import { Queue } from "../../../../io/vavr/SeqTypes.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { ClassToken } from "../../../../lang/Class.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { Barn } from "../../figure/Barn.js";
import { Wagon } from "../../figure/Wagon.js";
import type { Capability } from "../Capability.js";
import { BarnCapability } from "../capability/BarnCapability.js";
import { CastleCapability } from "../capability/CastleCapability.js";
import { WagonCapability, type WagonModel } from "../capability/WagonCapability.js";
import type { Completable } from "../../feature/Completable.js";
import { Field } from "../../feature/Field.js";
import type { Scoreable } from "../../feature/Scoreable.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { ReturnMeepleSource } from "../ReturnMeepleSource.js";
import { ScoreCompletable } from "../../reducers/ScoreCompletable.js";
import { ScoreField } from "../../reducers/ScoreField.js";
import { ScoreFieldWhenBarnIsConnected } from "../../reducers/ScoreFieldWhenBarnIsConnected.js";
import { UndeployMeeples } from "../../reducers/UndeployMeeples.js";
import type { ScoreFeatureReducer } from "../ScoreFeatureReducer.js";
import type { GameState } from "../state/GameState.js";
import { Phase } from "./Phase.js";
import { collectCompletedThisTurn } from "./collectCompletedThisTurn.js";
import type { StepResult } from "./StepResult.js";

const WAGON_CLS = WagonCapability as unknown as ClassToken<Capability<WagonModel>>;
const BARN_CLS = BarnCapability as unknown as ClassToken<Capability<FeaturePointer | null>>;
const CASTLE_CLS = CastleCapability as unknown as ClassToken<CastleCapability>;


/** Scores features completed by the just-placed tile. */
export class ScoringPhase extends Phase {
  static readonly simpleName = "ScoringPhase";

  private completedMutable = new globalThis.Map<Completable, ScoreCompletable>();

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
  }

  enter(state: GameState): StepResult {
    const lastPlaced = state.getLastPlaced()!;
    const pos = lastPlaced.getPosition();
    // record wagons deployed BEFORE scoring (so we can detect which got returned)
    const wagonsBefore: Array<[Wagon, FeaturePointer]> = [];
    for (const t of state.getDeployedMeeples()) {
      if (t._1 instanceof Wagon) wagonsBefore.push([t._1, t._2]);
    }

    // Which completables finished this turn — shared with CocScoringPhase so the two phases
    // never drift (see collectCompletedThisTurn). Order is preserved for deterministic scoring.
    for (const completable of collectCompletedThisTurn(state)) {
      this.completedMutable.set(completable, new ScoreCompletable(completable, false));
    }

    const completedSet = HashSet.ofAll([...this.completedMutable.keys()]);
    for (const cap of state.getCapabilities().toSeq()) {
      state = cap.beforeCompletableScore(state, completedSet);
    }

    for (const scoreReducer of this.completedMutable.values()) {
      state = scoreReducer.apply(state);
    }

    // barn field scoring (Abbey & Mayor)
    if (state.hasCapability(BARN_CLS)) {
      const placedBarnPtr = state.getCapabilityModel<FeaturePointer | null>(BARN_CLS);
      const placedBarnField =
        placedBarnPtr === null || placedBarnPtr === undefined
          ? null
          : (state.getFeature(placedBarnPtr) as Field);
      if (placedBarnField !== null) {
        // ScoreField scores only the followers on the field; the barn stays
        state = new ScoreField(placedBarnField, false, "barn-placed").apply(state);
        state = new UndeployMeeples(placedBarnField, true, ReturnMeepleSource.BARN_PLACEMENT).apply(state);
      }
      // fields newly joined (by this tile) to a field that already holds a barn
      for (const t of state.getTileFeatures2(pos)) {
        const f = t._2;
        if (f === placedBarnField || !(f instanceof Field)) continue;
        if (f.getSpecialMeeples(state).find((m) => m instanceof Barn).isEmpty()) continue;
        state = new ScoreFieldWhenBarnIsConnected(f).apply(state);
        state = new UndeployMeeples(f, true, ReturnMeepleSource.BARN_FIELD_JOIN).apply(state);
      }
    }

    for (const completable of this.completedMutable.keys()) {
      state = new UndeployMeeples(completable, false).apply(state);
    }

    let scored: VMap<Scoreable, ScoreFeatureReducer> = HashMap.empty<Scoreable, ScoreFeatureReducer>();
    for (const [k, v] of this.completedMutable) {
      scored = scored.put(k as unknown as Scoreable, v);
    }
    // castles steal the score of the best completed feature in their vicinity
    const castleCap = state.getCapabilities().get(CASTLE_CLS) as CastleCapability | null;
    if (castleCap !== null) {
      let completed: VMap<Completable, ScoreFeatureReducer> = HashMap.empty();
      for (const [k, v] of this.completedMutable) {
        completed = completed.put(k, v);
      }
      const res = castleCap.scoreCastles(state, completed);
      state = res._1;
      scored = scored.merge(res._2 as unknown as VMap<Scoreable, ScoreFeatureReducer>);
    }
    for (const cap of state.getCapabilities().toSeq()) {
      state = cap.onTurnScoring(state, scored as HashMap<Scoreable, ScoreFeatureReducer>);
    }

    // record wagons that were RETURNED by scoring, in play order, for WagonPhase
    if (wagonsBefore.length > 0 && state.hasCapability(WAGON_CLS)) {
      const afterWagons = new globalThis.Set<Wagon>();
      for (const t of state.getDeployedMeeples()) if (t._1 instanceof Wagon) afterWagons.add(t._1);
      const returned = wagonsBefore.filter(([w]) => !afterWagons.has(w));
      if (returned.length > 0) {
        const ps = state.getPlayers();
        const n = ps.getPlayers().size();
        const turnIdx = ps.getTurnPlayerIndex()!;
        let model = Queue.empty<Tuple2<Wagon, FeaturePointer>>();
        for (let i = 0; i < n; i++) {
          const p = ps.getPlayer((turnIdx + i) % n);
          for (const [w, fp] of returned) {
            if (w.getPlayer().equals(p)) model = model.enqueue(new Tuple2(w, fp));
          }
        }
        state = state.setCapabilityModel<WagonModel>(WAGON_CLS, model);
      }
    }

    this.completedMutable.clear();
    return this.next(state);
  }
}
