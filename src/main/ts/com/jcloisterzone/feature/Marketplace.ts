import { HashSet, type Set } from "../../../io/vavr/Set.js";
import { List } from "../../../io/vavr/SeqTypes.js";
import { Location } from "../board/Location.js";
import { Position } from "../board/Position.js";
import type { Rotation } from "../board/Rotation.js";
import { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import type { GameState } from "../game/state/GameState.js";
import type { Feature } from "./Feature.js";
import type { Road } from "./Road.js";
import { TileFeature } from "./TileFeature.js";

/** A marketplace (Bridges, Castles &amp; Bazaars) — connects adjoining roads. */
export class Marketplace extends TileFeature {
  static readonly simpleName = "Marketplace";

  // Java Marketplace does NOT implement Structure — meeples are never deployable on it.
  override isStructure(): boolean {
    return false;
  }

  static readonly INITIAL_PLACE = List.of(
    new FeaturePointer(Position.ZERO, Marketplace, Location.I),
  );

  private readonly adjoiningRoads: Set<FeaturePointer>;

  constructor(places?: List<FeaturePointer>, adjoiningRoads?: Set<FeaturePointer>) {
    super(places ?? Marketplace.INITIAL_PLACE);
    this.adjoiningRoads = adjoiningRoads ?? HashSet.empty<FeaturePointer>();
  }

  placeOnBoard(pos: Position, rot: Rotation): Feature {
    return new Marketplace(this.placeOnBoardPlaces(pos, rot), this.placeOnBoardAdjoiningRoads(pos, rot));
  }

  getAdjoiningRoads(): Set<FeaturePointer> {
    return this.adjoiningRoads;
  }

  setAdjoiningRoads(adjoiningRoads: Set<FeaturePointer>): Marketplace {
    if (this.adjoiningRoads === adjoiningRoads) return this;
    return new Marketplace(this.places, adjoiningRoads);
  }

  isOpen(state: GameState): boolean {
    for (const fp of this.adjoiningRoads) {
      const road = state
        .getFeatureMap()
        .get(fp.getPosition())
        .flatMap((m) => m.get(fp))
        .get() as Road;
      // Query the road's OWN open end (edges/tunnels), NOT road.isOpen — road.isOpen consults
      // its marketplaces (this one included), which would recurse back into here indefinitely.
      if (road.hasOpenEnd(state)) {
        return true;
      }
    }
    return false;
  }

  placeOnBoardAdjoiningRoads(pos: Position, rot: Rotation): Set<FeaturePointer> {
    return this.getAdjoiningRoads().map((fp) => fp.rotateCW(rot).translate(pos));
  }

  getMarketplaceRoads(state: GameState): List<Road> {
    let roads: Set<Road> = HashSet.empty<Road>();
    for (const fp of this.adjoiningRoads) {
      const road = state
        .getFeatureMap()
        .get(fp.getPosition())
        .flatMap((m) => m.get(fp))
        .get() as Road;
      if (!roads.contains(road)) {
        roads = roads.add(road);
      }
    }
    return roads.toList();
  }
}
