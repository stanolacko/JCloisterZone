import { Tuple2 } from "../../../io/vavr/Tuple.js";
import { type Map as VMap } from "../../../io/vavr/Map.js";
import { HashSet, type Set } from "../../../io/vavr/Set.js";
import { List } from "../../../io/vavr/SeqTypes.js";
import { Edge } from "../board/Edge.js";
import type { Position } from "../board/Position.js";
import type { Rotation } from "../board/Rotation.js";
import { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { ExprItem } from "../event/ExprItem.js";
import { PointsExpression } from "../event/PointsExpression.js";
import { Rule } from "../game/Rule.js";
import { FerriesCapability } from "../game/capability/FerriesCapability.js";
import type { FerriesCapabilityModel } from "../game/capability/FerriesCapabilityModel.js";
import { MarketplaceCapability } from "../game/capability/MarketplaceCapability.js";
import { TunnelCapability } from "../game/capability/TunnelCapability.js";
import { GameElementQuery } from "../game/setup/GameElementQuery.js";
import { RuleQuery } from "../game/setup/RuleQuery.js";
import type { GameState } from "../game/state/GameState.js";
import type { PlacedTunnelToken } from "../game/state/PlacedTunnelToken.js";
import type { BuilderExtendable } from "../game/capability/trait/BuilderExtendable.js";
import type { FlowersBonusAffected } from "../game/capability/trait/FlowersBonusAffected.js";
import type { WagonEligible } from "../game/capability/trait/WagonEligible.js";
import { CompletableFeature } from "./CompletableFeature.js";
import type { EdgeFeature } from "./EdgeFeature.js";
import type { Feature } from "./Feature.js";
import { Marketplace } from "./Marketplace.js";
import type { ModifiedFeature } from "./ModifiedFeature.js";
import { BooleanAnyModifier } from "./modifier/BooleanAnyModifier.js";
import type { BooleanModifier } from "./modifier/BooleanModifier.js";
import type { FeatureModifier } from "./modifier/FeatureModifier.js";
import { IntegerAddModifier } from "./modifier/IntegerAddModifier.js";
import * as ModifierSupport from "./modifier/ModifierSupport.js";

type ModMap = VMap<FeatureModifier<unknown>, unknown>;

/** A road feature. */
export class Road
  extends CompletableFeature<Road>
  implements BuilderExtendable, FlowersBonusAffected, WagonEligible, ModifiedFeature
{
  static readonly simpleName: string = "Road";
  isWagonEligible(): true {
    return true;
  }
  isBuilderExtendable(): true {
    return true;
  }
  isFlowersBonusAffected(): true {
    return true;
  }

  static readonly INN = new BooleanAnyModifier("road[inn]", new GameElementQuery("inn"));
  static readonly LABYRINTH = new BooleanAnyModifier(
    "road[labyrinth]",
    new RuleQuery(Rule.LABYRINTH_VARIANT, "advanced"),
  );
  static readonly ROBBERS_SON = new BooleanAnyModifier(
    "road[robbers-son]",
    new GameElementQuery("robbers-son"),
  );
  static readonly WELL = new IntegerAddModifier("road[wells]", new GameElementQuery("well"));

  private readonly modifiers: ModMap;
  private readonly openTunnelEnds: Set<FeaturePointer>;
  private readonly marketplaces: Set<FeaturePointer>;

  constructor(places: List<FeaturePointer>, openEdges: Set<Edge>, modifiers: ModMap);
  constructor(
    places: List<FeaturePointer>,
    openEdges: Set<Edge>,
    neighboring: Set<FeaturePointer>,
    modifiers: ModMap,
    openTunnelEnds: Set<FeaturePointer>,
    marketplaces: Set<FeaturePointer>,
  );
  constructor(
    places: List<FeaturePointer>,
    openEdges: Set<Edge>,
    arg3: ModMap | Set<FeaturePointer>,
    modifiers?: ModMap,
    openTunnelEnds?: Set<FeaturePointer>,
    marketplaces?: Set<FeaturePointer>,
  ) {
    if (modifiers === undefined) {
      super(places, openEdges, HashSet.empty<FeaturePointer>());
      this.modifiers = arg3 as ModMap;
      this.openTunnelEnds = HashSet.empty<FeaturePointer>();
      this.marketplaces = HashSet.empty<FeaturePointer>();
    } else {
      super(places, openEdges, arg3 as Set<FeaturePointer>);
      this.modifiers = modifiers;
      this.openTunnelEnds = openTunnelEnds!;
      this.marketplaces = marketplaces!;
    }
  }

  /** True when this road has an open end OF ITS OWN — an unmatched edge or an open tunnel end —
   *  independent of any marketplace it adjoins. `Marketplace.isOpen` queries THIS (not `isOpen`)
   *  so the marketplace check in `isOpen` cannot recurse back through the marketplace. */
  hasOpenEnd(state: GameState): boolean {
    return super.isOpen(state) || !this.openTunnelEnds.isEmpty();
  }

  override isOpen(state: GameState): boolean {
    if (this.hasOpenEnd(state)) {
      return true;
    }
    // marketplace-adjoining roads stay open while their marketplace is open — but ONLY
    // when the Marketplace capability is active (Java gates on `marketplaceCap != null`).
    // Marketplace.isOpen only inspects each road's hasOpenEnd, so this does not recurse.
    if (state.hasCapability(MarketplaceCapability as never) && !this.marketplaces.isEmpty()) {
      for (const fp of this.marketplaces) {
        const feature = state
          .getFeatureMap()
          .get(fp.getPosition())
          .flatMap((m) => m.get(fp))
          .get();
        if (feature instanceof Marketplace) {
          if (feature.isOpen(state)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isLabyrinth(state: GameState): boolean {
    return this.hasModifier(state, Road.LABYRINTH);
  }

  // --- ModifiedFeature ---
  getModifiers(): ModMap {
    return this.modifiers;
  }

  setModifiers(modifiers: ModMap): Road {
    if (this.modifiers === modifiers) return this;
    return new Road(
      this.places,
      this.openEdges,
      this.neighboring,
      modifiers,
      this.openTunnelEnds,
      this.marketplaces,
    );
  }

  putModifier<T>(modifier: FeatureModifier<T>, value: T): Road {
    return this.setModifiers(this.modifiers.put(modifier as FeatureModifier<unknown>, value));
  }

  hasModifier(state: GameState, modifier: BooleanModifier): boolean {
    return ModifierSupport.hasModifier(this.modifiers, state, modifier);
  }

  getModifier<T>(state: GameState, modifier: FeatureModifier<T>, defaultValue: T): T {
    return ModifierSupport.getModifier(this.modifiers, state, modifier, defaultValue);
  }

  getScriptedModifiers(state: GameState): Set<FeatureModifier<unknown>> {
    return ModifierSupport.getScriptedModifiers(this.modifiers, state);
  }

  mergeModifiers(otherModifiers: ModMap): ModMap {
    return ModifierSupport.mergeModifierMaps(this.modifiers, otherModifiers);
  }

  override isMergeableWith(other: EdgeFeature): boolean {
    return other instanceof Road; // handles Bridges
  }

  merge(road: Road): Road {
    return new Road(
      this.mergePlaces(road),
      this.mergeEdges(road),
      this.mergeNeighboring(road),
      this.mergeModifiers(road.getModifiers()),
      this.mergeTunnelEnds(road),
      this.mergeMarketplaces(road),
    );
  }

  closeEdge(edge: Edge): Road {
    return new Road(
      this.places,
      this.openEdges.remove(edge),
      this.neighboring,
      this.modifiers,
      this.openTunnelEnds,
      this.marketplaces,
    );
  }

  setOpenEdges(openEdges: Set<Edge>): Road {
    return new Road(
      this.places,
      openEdges,
      this.neighboring,
      this.modifiers,
      this.openTunnelEnds,
      this.marketplaces,
    );
  }

  /** Merge roads through connecting tunnel ends. */
  connectTunnels(road: Road, tunnelEnd1: FeaturePointer, tunnelEnd2: FeaturePointer): Road {
    const merged: Road = this === road ? this : this.merge(road);
    return merged.setOpenTunnelEnds(merged.openTunnelEnds.remove(tunnelEnd1).remove(tunnelEnd2));
  }

  placeOnBoard(pos: Position, rot: Rotation): Feature {
    return new Road(
      this.placeOnBoardPlaces(pos, rot),
      this.placeOnBoardEdges(pos, rot),
      this.placeOnBoardNeighboring(pos, rot),
      this.modifiers,
      this.placeOnBoardTunnelEnds(pos, rot),
      this.placeOnBoardMarketplaces(pos, rot),
    );
  }

  getOpenTunnelEnds(): Set<FeaturePointer> {
    return this.openTunnelEnds;
  }

  setOpenTunnelEnds(openTunnelEnds: Set<FeaturePointer>): Road {
    if (this.openTunnelEnds === openTunnelEnds) return this;
    return new Road(
      this.places,
      this.openEdges,
      this.neighboring,
      this.modifiers,
      openTunnelEnds,
      this.marketplaces,
    );
  }

  getMarketplaces(): Set<FeaturePointer> {
    return this.marketplaces;
  }

  setMarketplaces(marketplaces: Set<FeaturePointer>): Road {
    if (this.marketplaces === marketplaces) return this;
    return new Road(
      this.places,
      this.openEdges,
      this.neighboring,
      this.modifiers,
      this.openTunnelEnds,
      marketplaces,
    );
  }

  override setNeighboring(neighboring: Set<FeaturePointer>): Road {
    if (this.neighboring === neighboring) return this;
    return new Road(
      this.places,
      this.openEdges,
      neighboring,
      this.modifiers,
      this.openTunnelEnds,
      this.marketplaces,
    );
  }

  getStructurePoints(state: GameState, completed: boolean): PointsExpression {
    const inn = this.hasModifier(state, Road.INN);

    if (
      inn &&
      !completed &&
      state.getStringRule(Rule.INN_AND_CATHEDRAL_FINAL_SCORING) !== "ignore"
    ) {
      return new PointsExpression("road.incomplete", new ExprItem("inn", 0));
    }

    const labyrinth = this.hasModifier(state, Road.LABYRINTH);
    const tileCount = this.getTilePositions().size();
    const wellsCount = this.getModifier(state, Road.WELL, 0);

    const exprItems: ExprItem[] = [];
    exprItems.push(new ExprItem(tileCount, "tiles", tileCount));

    if (inn && completed) {
      exprItems.push(new ExprItem("inn", tileCount));
    }
    if (labyrinth && completed) {
      const meeplesCount = this.getMeeples(state).size();
      exprItems.push(new ExprItem(meeplesCount, "meeples", 2 * meeplesCount));
    }
    if (wellsCount > 0) {
      exprItems.push(new ExprItem(wellsCount, "wells", (inn && completed ? 2 : 1) * wellsCount));
    }
    if (this.marketplaces.length() > 0) {
      const marketplaceCap = state.getCapabilities().get(MarketplaceCapability);
      if (marketplaceCap !== null) {
        let counter = 0;
        for (const marketplaceFp of this.marketplaces) {
          const otherRoadsTiles = marketplaceCap.getMarketplaceOtherRoadsTiles(
            state,
            this,
            marketplaceFp,
            completed,
          );
          if (otherRoadsTiles !== null && otherRoadsTiles > 0) {
            exprItems.push(new ExprItem("marketplace." + counter++, otherRoadsTiles));
          }
        }
      }
    }
    return new PointsExpression(completed ? "road" : "road.incomplete", List.ofAll(exprItems));
  }

  getPoints(state: GameState): PointsExpression {
    const basePoints = this.getStructurePoints(state, this.isCompleted(state));
    return this.getMageAndWitchPoints(state, basePoints).appendAll(
      this.getLittleBuildingPoints(state),
    );
  }

  private findPartOf(list: Iterable<FeaturePointer>, fp: FeaturePointer): FeaturePointer | null {
    for (const item of list) {
      if (fp.isPartOf(item)) {
        return item;
      }
    }
    return null;
  }

  private iterateParts(
    state: GameState,
    from: FeaturePointer,
    callback: (fp: FeaturePointer) => boolean,
  ): void {
    let places: Set<FeaturePointer> = HashSet.ofAll(this.places).remove(from);
    const queue: FeaturePointer[] = [from];

    const placedTunnels = state.getCapabilityModel<VMap<FeaturePointer, PlacedTunnelToken>>(
      TunnelCapability,
    );
    const ferriesModel = state.getCapabilityModel<FerriesCapabilityModel>(FerriesCapability);

    while (queue.length > 0) {
      const fp = queue.pop()!;

      if (!callback(fp)) {
        continue;
      }

      for (const adj of fp.getAdjacent()) {
        const place = this.findPartOf(places, adj);
        if (place !== null && places.contains(place)) {
          places = places.remove(place);
          queue.push(place);
        }
      }

      if (placedTunnels !== null) {
        const placedTunnel = placedTunnels.get(fp).getOrNull();
        if (placedTunnel !== null) {
          const place = placedTunnels
            .find(
              (t) =>
                t._2 !== null &&
                t._2 !== placedTunnel &&
                t._2.getToken() === placedTunnel.getToken() &&
                t._2.getPlayerIndex() === placedTunnel.getPlayerIndex(),
            )
            .map((t) => t._1)
            .getOrNull();
          if (place !== null && places.contains(place)) {
            places = places.remove(place);
            queue.push(place);
          }
        }
      }

      if (ferriesModel !== null) {
        const ferry = ferriesModel
          .getFerries()
          .find((f) => fp.isPartOf(f))
          .getOrNull();
        if (ferry !== null) {
          const place = ferry.setLocation(ferry.getLocation()!.subtract(fp.getLocation()!));
          if (place !== null && places.contains(place)) {
            places = places.remove(place);
            queue.push(place);
          }
        }
      }
    }
  }

  /** Follow road up to nearest parts matching the predicate. */
  findNearest(
    state: GameState,
    from: FeaturePointer,
    predicate: (fp: FeaturePointer) => boolean,
  ): List<FeaturePointer> {
    const result: FeaturePointer[] = [];
    this.iterateParts(state, from, (fp) => {
      if (predicate(fp)) {
        result.push(fp);
        return false;
      }
      return true;
    });
    return List.ofAll(result);
  }

  findSegmentBorderedBy(
    state: GameState,
    from: FeaturePointer,
    predicate: (fp: FeaturePointer) => boolean,
  ): List<FeaturePointer> {
    const result: FeaturePointer[] = [];
    this.iterateParts(state, from, (fp) => {
      if (predicate(fp)) {
        return false;
      }
      result.push(fp);
      return true;
    });
    return List.ofAll(result);
  }

  protected mergeTunnelEnds(road: Road): Set<FeaturePointer> {
    return this.openTunnelEnds.union(road.openTunnelEnds);
  }

  protected placeOnBoardTunnelEnds(pos: Position, rot: Rotation): Set<FeaturePointer> {
    return this.openTunnelEnds.map((fp) => fp.rotateCW(rot).translate(pos));
  }

  protected mergeMarketplaces(road: Road): Set<FeaturePointer> {
    return this.marketplaces.union(road.marketplaces);
  }

  placeOnBoardMarketplaces(pos: Position, rot: Rotation): Set<FeaturePointer> {
    return this.getMarketplaces().map((fp) => fp.rotateCW(rot).translate(pos));
  }
}
