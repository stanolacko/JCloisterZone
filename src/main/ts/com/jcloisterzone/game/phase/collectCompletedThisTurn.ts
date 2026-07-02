import { HashSet } from "../../../../io/vavr/Set.js";
import { List } from "../../../../io/vavr/SeqTypes.js";
import type { ClassToken } from "../../../../lang/Class.js";
import { Location } from "../../board/Location.js";
import type { Position } from "../../board/Position.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { ShortEdge } from "../../board/ShortEdge.js";
import { TokenPlacedEvent } from "../../event/TokenPlacedEvent.js";
import { City } from "../../feature/City.js";
import { type Completable, isInstanceOfCompletable } from "../../feature/Completable.js";
import { Marketplace } from "../../feature/Marketplace.js";
import { Monastery } from "../../feature/Monastery.js";
import { isInstanceOfMonastic } from "../../feature/Monastic.js";
import { Road } from "../../feature/Road.js";
import type { Capability } from "../Capability.js";
import { FerriesCapability } from "../capability/FerriesCapability.js";
import { FerriesCapabilityModel } from "../capability/FerriesCapabilityModel.js";
import { MarketplaceCapability } from "../capability/MarketplaceCapability.js";
import { TunnelCapability } from "../capability/TunnelCapability.js";
import type { GameState } from "../state/GameState.js";

/**
 * The single source of truth for "which completable features finished on THIS turn's tile
 * placement" — the set the {@link ScoringPhase} scores and the Count-of-Carcassonne district
 * move ({@link CocScoringPhase}) may redeploy a follower onto.
 *
 * Sharing one implementation guarantees the two phases stay in step: any capability that
 * completes a feature in a non-adjacent way (marketplace, ferries, tunnels, …) is handled once
 * here and both consumers pick it up automatically.
 *
 * Returns the completables in a stable collection order (insertion order, de-duplicated), which
 * ScoringPhase relies on when applying score reducers.
 */
export function collectCompletedThisTurn(state: GameState): Completable[] {
  const result: Completable[] = [];
  const seen = new globalThis.Set<Completable>();

  const collect = (completable: Completable): void => {
    if (!completable.isCompleted(state) || seen.has(completable)) return;
    if (completable instanceof Monastery && completable.isSpecialMonastery(state)) {
      const meeples = List.ofAll(completable.getMeeplesIncludingSpecialMonastery2(state));
      if (meeples.size() > 0 && meeples.filter((t) => t._2.getLocation() === Location.I).size() === 0) {
        return; // only abbots on monastery
      }
    }
    seen.add(completable);
    result.push(completable);
  };

  const lastPlaced = state.getLastPlaced()!;
  const pos = lastPlaced.getPosition();

  // features on the just-placed tile
  for (const t of state.getTileFeatures2(pos)) {
    if (isInstanceOfCompletable(t._2)) collect(t._2);
  }

  // features closed across the placed tile's edges (abbey holes, adjacent completions, marketplaces)
  collectCompletedOnAdjacentEdges(state, pos, collect);

  // ferries moved this turn may have closed roads
  if (state.hasCapability(FerriesCapability as unknown as ClassToken<never>)) {
    collectClosedByFerries(state, collect);
  }

  // tunnels connected this turn may have closed roads
  if (state.hasCapability(TunnelCapability as unknown as ClassToken<never>)) {
    for (const ev of state.getCurrentTurnEvents()) {
      if (!(ev instanceof TokenPlacedEvent)) continue;
      if (!(ev.getToken() instanceof TunnelCapability.Tunnel)) continue;
      const road = state.getFeature(ev.getPointer() as FeaturePointer);
      if (road !== null) collect(road as unknown as Completable);
    }
  }

  // a road on the placed tile that adjoins a marketplace may have just closed it, completing
  // ALL of the marketplace's roads at once
  if (state.hasCapability(MarketplaceCapability as unknown as ClassToken<never>)) {
    for (const t of state.getTileFeatures2(pos)) {
      if (!(t._2 instanceof Road)) continue;
      for (const mfp of t._2.getMarketplaces()) {
        const marketplace = state.getFeature(mfp) as Marketplace;
        for (const marketplaceRoad of marketplace.getMarketplaceRoads(state)) {
          collect(marketplaceRoad as unknown as Completable);
        }
      }
    }
  }

  // monasteries in the placed tile's neighbourhood may have been completed
  const neighbourPositions = HashSet.ofAll(
    state.getAdjacentAndDiagonalTiles2(pos).map((pt) => pt._2.getPosition()),
  );
  for (const f of state.getFeatures()) {
    if (isInstanceOfMonastic(f) && neighbourPositions.contains(f.getPosition())) {
      collect(f as unknown as Completable);
    }
  }

  return result;
}

function collectClosedByFerries(state: GameState, collect: (c: Completable) => void): void {
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
      if (road !== null) collect(road as unknown as Completable);
    }
    // connected side: the road segment that is now merged (first side is enough — both ends belong to the same road)
    const connectedLoc = to.subtract(from).splitToSides().get(0);
    const road = state.getFeature(new FeaturePointer(pos, Road, connectedLoc));
    if (road !== null) collect(road as unknown as Completable);
  }
}

function collectCompletedOnAdjacentEdges(
  state: GameState,
  pos: Position,
  collect: (c: Completable) => void,
): void {
  const isMarketplaceCap = state.hasCapability(MarketplaceCapability as unknown as ClassToken<never>);
  for (const t of state.getAdjacentTiles2(pos)) {
    const pt = t._2;
    const adj = state.getFeaturePartOf2(pt.getPosition(), t._1.rev());
    if (adj === null) continue;
    const feature = adj._2;
    if (isInstanceOfCompletable(feature)) collect(feature);
    if (feature instanceof City) {
      const edge = new ShortEdge(pos, pt.getPosition());
      const multiEdge = feature.getMultiEdges().find((me) => me._1.equals(edge)).getOrNull();
      if (multiEdge !== null) {
        collect(state.getFeature(multiEdge._2) as unknown as Completable);
      }
    }
    if (isMarketplaceCap && feature instanceof Road && feature.isCompleted(state)) {
      for (const mfp of feature.getMarketplaces()) {
        const marketplace = state.getFeature(mfp) as Marketplace;
        for (const marketplaceRoad of marketplace.getMarketplaceRoads(state)) {
          collect(marketplaceRoad as unknown as Completable);
        }
      }
    }
  }
}
