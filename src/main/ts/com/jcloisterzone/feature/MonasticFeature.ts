import { Tuple2 } from "../../../io/vavr/Tuple.js";
import { type Map as VMap } from "../../../io/vavr/Map.js";
import { HashSet, type Set } from "../../../io/vavr/Set.js";
import { List, Stream } from "../../../io/vavr/SeqTypes.js";
import { Position } from "../board/Position.js";
import type { ExprItem } from "../event/ExprItem.js";
import { PointsExpression } from "../event/PointsExpression.js";
import { LittleBuildingsCapability } from "../game/capability/LittleBuildingsCapability.js";
import type { GameState } from "../game/state/GameState.js";
import type { PlacedTile } from "../game/state/PlacedTile.js";
import type { Completable } from "./Completable.js";
import type { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import type { Monastic } from "./Monastic.js";
import { NeighbouringTileFeature } from "./NeighbouringTileFeature.js";

/**
 * Synthetic port-only base implementing the Java {@code Monastic} default methods
 * (completed when surrounded by 8 tiles). Garden and Monastery extend this.
 */
export abstract class MonasticFeature extends NeighbouringTileFeature implements Monastic {
  abstract override setNeighboring(neighboring: Set<FeaturePointer>): Completable;

  isCompletable(): true {
    return true;
  }
  isMonastic(): true {
    return true;
  }
  isFlowersBonusAffected(): true {
    return true;
  }


  getPosition(): Position {
    return this.getPlaces().head().getPosition();
  }

  isOpen(state: GameState): boolean {
    return state.getAdjacentAndDiagonalTiles2(this.getPosition()).size() < 8;
  }

  isCompleted(state: GameState): boolean {
    return !this.isOpen(state);
  }

  override getTilePositions(): Set<Position> {
    return HashSet.of(this.getPosition());
  }

  getPoints(state: GameState): PointsExpression {
    return this.getStructurePoints(state, this.isCompleted(state)).appendAll(
      this.getLittleBuildingPoints(state),
    );
  }

  abstract getStructurePoints(state: GameState, completed: boolean): PointsExpression;

  override getLittleBuildingPoints(state: GameState): List<ExprItem> {
    const buildings = state.getCapabilityModel<
      VMap<Position, LittleBuildingsCapability.LittleBuilding>
    >(LittleBuildingsCapability);
    if (buildings === null) {
      return List.empty<ExprItem>();
    }
    const tilePositions = HashSet.ofAll(this.getRangeTiles(state).map((pt) => pt.getPosition()));
    const buildingsSeq = buildings.filterKeys((pos) => tilePositions.contains(pos)).values();
    return LittleBuildingsCapability.getBuildingsPoints(state, buildingsSeq);
  }

  getRangeTiles(state: GameState): Stream<PlacedTile> {
    return state.getAdjacentAndDiagonalTiles2(this.getPosition()).map((t) => t._2) as Stream<PlacedTile>;
  }

  getRangeTilesWithFeature(state: GameState): Stream<PlacedTile> {
    const featureTiles = Stream.ofAll(this.getPlaces())
      .map((fp) => fp.getPosition())
      .distinct()
      .map((pos) => state.getPlacedTiles().get(pos))
      .flatMap((opt) => opt.toArray());
    return this.getRangeTiles(state).appendAll(featureTiles) as Stream<PlacedTile>;
  }
}
