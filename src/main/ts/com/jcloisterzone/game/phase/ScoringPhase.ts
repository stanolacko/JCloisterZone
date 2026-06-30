import { HashMap, type Map as VMap } from "../../../../io/vavr/Map.js";
import { HashSet } from "../../../../io/vavr/Set.js";
import { List, Queue } from "../../../../io/vavr/SeqTypes.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { ClassToken } from "../../../../lang/Class.js";
import { Location } from "../../board/Location.js";
import type { Position } from "../../board/Position.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { ShortEdge } from "../../board/ShortEdge.js";
import { TokenPlacedEvent } from "../../event/TokenPlacedEvent.js";
import { Barn } from "../../figure/Barn.js";
import { Wagon } from "../../figure/Wagon.js";
import type { Capability } from "../Capability.js";
import { BarnCapability } from "../capability/BarnCapability.js";
import { CastleCapability } from "../capability/CastleCapability.js";
import { FerriesCapability } from "../capability/FerriesCapability.js";
import { FerriesCapabilityModel } from "../capability/FerriesCapabilityModel.js";
import { MarketplaceCapability } from "../capability/MarketplaceCapability.js";
import { TunnelCapability } from "../capability/TunnelCapability.js";
import { WagonCapability, type WagonModel } from "../capability/WagonCapability.js";
import { City } from "../../feature/City.js";
import { Marketplace } from "../../feature/Marketplace.js";
import { Road } from "../../feature/Road.js";
import { type Completable, isInstanceOfCompletable } from "../../feature/Completable.js";
import { Field } from "../../feature/Field.js";
import { Monastery } from "../../feature/Monastery.js";
import { isInstanceOfMonastic } from "../../feature/Monastic.js";
import type { Scoreable } from "../../feature/Scoreable.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { ReturnMeepleSource } from "../ReturnMeepleSource.js";
import { ScoreCompletable } from "../../reducers/ScoreCompletable.js";
import { ScoreField } from "../../reducers/ScoreField.js";
import { ScoreFieldWhenBarnIsConnected } from "../../reducers/ScoreFieldWhenBarnIsConnected.js";
import { UndeployMeeples } from "../../reducers/UndeployMeeples.js";
import type { ScoreFeatureReducer } from "../ScoreFeatureReducer.js";
import type { GameState } from "../state/GameState.js";
import type { PlacedTile } from "../state/PlacedTile.js";
import { Phase } from "./Phase.js";
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

  private collectCompleted(state: GameState, completable: Completable): void {
    if (completable.isCompleted(state) && !this.completedMutable.has(completable)) {
      if (completable instanceof Monastery && completable.isSpecialMonastery(state)) {
        const meeples = List.ofAll(completable.getMeeplesIncludingSpecialMonastery2(state));
        if (meeples.size() > 0 && meeples.filter((t) => t._2.getLocation() === Location.I).size() === 0) {
          return; // only abbots on monastery
        }
      }
      this.completedMutable.set(completable, new ScoreCompletable(completable, false));
    }
  }

  private collectClosedByFerries(state: GameState): void {
    const model = state.getCapabilityModel<FerriesCapabilityModel>(
      FerriesCapability as unknown as ClassToken<Capability<FerriesCapabilityModel>>,
    )!;
    for (const t of model.getMovedFerries()) {
      const pos = t._1;
      const from = t._2._1;
      const to = t._2._2;
      // disconnected sides: the road segment on the "from" side that is no longer connected
      for (const loc of from.subtract(to).splitToSides()) {
        const road = state.getFeature(new FeaturePointer(pos, Road, loc));
        if (road !== null) this.collectCompleted(state, road as unknown as Completable);
      }
      // connected side: the road segment that is now merged (first side is enough — both ends belong to the same road)
      const connectedLoc = to.subtract(from).splitToSides().get(0);
      const road = state.getFeature(new FeaturePointer(pos, Road, connectedLoc));
      if (road !== null) this.collectCompleted(state, road as unknown as Completable);
    }
  }

  private collectCompletedOnTile(state: GameState, tile: PlacedTile): void {
    for (const t of state.getTileFeatures2(tile.getPosition())) {
      if (isInstanceOfCompletable(t._2)) this.collectCompleted(state, t._2);
    }
  }

  private collectCompletedOnAdjacentEdges(state: GameState, pos: Position): void {
    const isMarketplaceCap = state.hasCapability(MarketplaceCapability as unknown as ClassToken<never>);
    for (const t of state.getAdjacentTiles2(pos)) {
      const pt = t._2;
      const adj = state.getFeaturePartOf2(pt.getPosition(), t._1.rev());
      if (adj === null) continue;
      const feature = adj._2;
      if (isInstanceOfCompletable(feature)) this.collectCompleted(state, feature);
      if (feature instanceof City) {
        const edge = new ShortEdge(pos, pt.getPosition());
        const multiEdge = feature.getMultiEdges().find((me) => me._1.equals(edge)).getOrNull();
        if (multiEdge !== null) {
          this.collectCompleted(state, state.getFeature(multiEdge._2) as City);
        }
      }
      if (isMarketplaceCap && feature instanceof Road && feature.isCompleted(state)) {
        for (const mfp of feature.getMarketplaces()) {
          const marketplace = state.getFeature(mfp) as Marketplace;
          for (const marketplaceRoad of marketplace.getMarketplaceRoads(state)) {
            this.collectCompleted(state, marketplaceRoad as unknown as Completable);
          }
        }
      }
    }
  }

  enter(state: GameState): StepResult {
    const lastPlaced = state.getLastPlaced()!;
    const pos = lastPlaced.getPosition();
    // record wagons deployed BEFORE scoring (so we can detect which got returned)
    const wagonsBefore: Array<[Wagon, FeaturePointer]> = [];
    for (const t of state.getDeployedMeeples()) {
      if (t._1 instanceof Wagon) wagonsBefore.push([t._1, t._2]);
    }

    this.collectCompletedOnTile(state, lastPlaced);
    this.collectCompletedOnAdjacentEdges(state, pos);

    if (state.hasCapability(FerriesCapability as unknown as ClassToken<never>)) {
      this.collectClosedByFerries(state);
    }

    if (state.hasCapability(TunnelCapability as unknown as ClassToken<never>)) {
      for (const ev of state.getCurrentTurnEvents()) {
        if (!(ev instanceof TokenPlacedEvent)) continue;
        if (!(ev.getToken() instanceof TunnelCapability.Tunnel)) continue;
        const road = state.getFeature(ev.getPointer() as FeaturePointer);
        if (road !== null) this.collectCompleted(state, road as unknown as Completable);
      }
    }

    if (state.hasCapability(MarketplaceCapability as unknown as ClassToken<never>)) {
      // roads on the placed tile adjoin a marketplace → the marketplace may have just
      // closed, completing ALL its roads at once
      for (const t of state.getTileFeatures2(pos)) {
        if (!(t._2 instanceof Road)) continue;
        for (const mfp of t._2.getMarketplaces()) {
          const marketplace = state.getFeature(mfp) as Marketplace;
          for (const marketplaceRoad of marketplace.getMarketplaceRoads(state)) {
            this.collectCompleted(state, marketplaceRoad as unknown as Completable);
          }
        }
      }
    }

    const neighbourPositions = HashSet.ofAll(
      state.getAdjacentAndDiagonalTiles2(pos).map((pt) => pt._2.getPosition()),
    );
    for (const f of state.getFeatures()) {
      if (isInstanceOfMonastic(f) && neighbourPositions.contains(f.getPosition())) {
        this.collectCompleted(state, f as unknown as Completable);
      }
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
