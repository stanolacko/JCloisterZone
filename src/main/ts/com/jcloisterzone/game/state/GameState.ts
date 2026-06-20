import { equals } from "../../../../io/vavr/equality.js";
import { HashMap, LinkedHashMap, type Map as VMap } from "../../../../io/vavr/Map.js";
import { Option } from "../../../../io/vavr/Option.js";
import type { Seq } from "../../../../io/vavr/Seq.js";
import { List, Queue, Stream, Vector, Arr } from "../../../../io/vavr/SeqTypes.js";
import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import { Rectangle } from "../../../../java/awt/Rectangle.js";
import { type ClassToken } from "../../../../lang/Class.js";
import type { Player } from "../../Player.js";
import { EdgePattern } from "../../board/EdgePattern.js";
import { EdgeType } from "../../board/EdgeType.js";
import { Location } from "../../board/Location.js";
import { PlacementOption } from "../../board/PlacementOption.js";
import { Position } from "../../board/Position.js";
import { Rotation } from "../../board/Rotation.js";
import type { Tile } from "../../board/Tile.js";
import type { TilePack } from "../../board/TilePack.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import type { PlayEvent } from "../../event/PlayEvent.js";
import { DoubleTurnEvent } from "../../event/DoubleTurnEvent.js";
import { PlayerTurnEvent } from "../../event/PlayerTurnEvent.js";
import { Acrobats } from "../../feature/Acrobats.js";
import { Bush } from "../../feature/Bush.js";
import { Castle } from "../../feature/Castle.js";
import { City } from "../../feature/City.js";
import { CityGate } from "../../feature/CityGate.js";
import type { Completable } from "../../feature/Completable.js";
import type { Feature } from "../../feature/Feature.js";
import { Road } from "../../feature/Road.js";
import { type Structure, isInstanceOfStructure } from "../../feature/Structure.js";
import type { Meeple } from "../../figure/Meeple.js";
import type { Capability } from "../Capability.js";
import { BridgeCapability } from "../capability/BridgeCapability.js";
import { BazaarCapability } from "../capability/BazaarCapability.js";
import type { BazaarCapabilityModel } from "../capability/BazaarCapabilityModel.js";
import type { Rule } from "../Rule.js";
import type { Phase } from "../phase/Phase.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import { ActionsState } from "./ActionsState.js";
import { CapabilitiesState } from "./CapabilitiesState.js";
import { Flag } from "./Flag.js";
import { NeutralFiguresState } from "./NeutralFiguresState.js";
import { PlacedTile } from "./PlacedTile.js";
import { PlayersState } from "./PlayersState.js";

type FeatureMap = VMap<Position, VMap<FeaturePointer, Feature>>;

/**
 * The immutable game state. Implements (inlined) the 8 Java mixin interfaces:
 * Actions/Board/Rules/Capabilities/Players/Events/Flags/Placements.
 * Every setter returns a new instance (referential no-op short-circuit).
 */
export class GameState {
  constructor(
    private readonly rules: VMap<Rule, unknown>,
    private readonly elements: VMap<string, unknown>,
    private readonly capabilities: CapabilitiesState,
    private readonly players: PlayersState,
    private readonly tilePack: TilePack | null,
    private readonly drawnTile: Tile | null,
    private readonly placedTiles: LinkedHashMap<Position, PlacedTile>,
    private readonly discardedTiles: List<Tile>,
    private readonly featureMap: FeatureMap,
    private readonly neutralFigures: NeutralFiguresState,
    private readonly deployedMeeples: LinkedHashMap<Meeple, FeaturePointer>,
    private readonly playerActions: ActionsState | null,
    private readonly flags: Set<Flag>,
    private readonly events: Queue<PlayEvent>,
    private readonly phase: Phase | null,
    private readonly turnNumber: number,
    private readonly commited: boolean,
  ) {}

  static createInitial(
    rules: VMap<Rule, unknown>,
    elements: VMap<string, unknown>,
    capabilities: Seq<Capability<unknown>>,
    players: Arr<Player>,
    turnPlayerIndex: number,
  ): GameState {
    return new GameState(
      rules,
      elements,
      CapabilitiesState.createInitial(capabilities),
      PlayersState.createInitial(players, turnPlayerIndex),
      null,
      null,
      LinkedHashMap.empty<Position, PlacedTile>(),
      List.empty<Tile>(),
      HashMap.empty<Position, VMap<FeaturePointer, Feature>>(),
      new NeutralFiguresState(),
      LinkedHashMap.empty<Meeple, FeaturePointer>(),
      null,
      HashSet.empty<Flag>(),
      Queue.empty<PlayEvent>(),
      null,
      1,
      false,
    );
  }

  private copy(o: Partial<GameStateFields>): GameState {
    return new GameState(
      o.rules ?? this.rules,
      o.elements ?? this.elements,
      o.capabilities ?? this.capabilities,
      o.players ?? this.players,
      o.tilePack !== undefined ? o.tilePack : this.tilePack,
      o.drawnTile !== undefined ? o.drawnTile : this.drawnTile,
      o.placedTiles ?? this.placedTiles,
      o.discardedTiles ?? this.discardedTiles,
      o.featureMap ?? this.featureMap,
      o.neutralFigures ?? this.neutralFigures,
      o.deployedMeeples ?? this.deployedMeeples,
      o.playerActions !== undefined ? o.playerActions : this.playerActions,
      o.flags ?? this.flags,
      o.events ?? this.events,
      o.phase !== undefined ? o.phase : this.phase,
      o.turnNumber ?? this.turnNumber,
      o.commited ?? this.commited,
    );
  }

  // === setters (referential short-circuit like Java) ===
  setCapabilities(capabilities: CapabilitiesState): GameState {
    return capabilities === this.capabilities ? this : this.copy({ capabilities });
  }
  setPlayers(players: PlayersState): GameState {
    return players === this.players ? this : this.copy({ players });
  }
  setTilePack(tilePack: TilePack | null): GameState {
    return tilePack === this.tilePack ? this : this.copy({ tilePack });
  }
  mapTilePack(fn: (tp: TilePack) => TilePack): GameState {
    return this.setTilePack(fn(this.tilePack!));
  }
  setDrawnTile(drawnTile: Tile | null): GameState {
    return drawnTile === this.drawnTile ? this : this.copy({ drawnTile });
  }
  setPlacedTiles(placedTiles: LinkedHashMap<Position, PlacedTile>): GameState {
    return placedTiles === this.placedTiles ? this : this.copy({ placedTiles });
  }
  setFeatureMap(featureMap: FeatureMap): GameState {
    return featureMap === this.featureMap ? this : this.copy({ featureMap });
  }
  setDiscardedTiles(discardedTiles: List<Tile>): GameState {
    return discardedTiles === this.discardedTiles ? this : this.copy({ discardedTiles });
  }
  setNeutralFigures(neutralFigures: NeutralFiguresState): GameState {
    return neutralFigures === this.neutralFigures ? this : this.copy({ neutralFigures });
  }
  mapNeutralFigures(fn: (nf: NeutralFiguresState) => NeutralFiguresState): GameState {
    return this.setNeutralFigures(fn(this.neutralFigures));
  }
  setDeployedMeeples(deployedMeeples: LinkedHashMap<Meeple, FeaturePointer>): GameState {
    return deployedMeeples === this.deployedMeeples ? this : this.copy({ deployedMeeples });
  }
  setPlayerActions(playerActions: ActionsState | null): GameState {
    return playerActions === this.playerActions ? this : this.copy({ playerActions });
  }
  mapPlayerActions(fn: (a: ActionsState) => ActionsState): GameState {
    return this.setPlayerActions(fn(this.playerActions!));
  }
  setFlags(flags: Set<Flag>): GameState {
    return flags === this.flags ? this : this.copy({ flags });
  }
  setEvents(events: Queue<PlayEvent>): GameState {
    return events === this.events ? this : this.copy({ events });
  }
  setPhase(phase: Phase | null): GameState {
    return phase === this.phase ? this : this.copy({ phase });
  }
  setTurnNumber(turnNumber: number): GameState {
    return turnNumber === this.turnNumber ? this : this.copy({ turnNumber });
  }
  setCommited(commited: boolean): GameState {
    return commited === this.commited ? this : this.copy({ commited });
  }

  // === simple getters ===
  getElements(): VMap<string, unknown> {
    return this.elements;
  }
  getRules(): VMap<Rule, unknown> {
    return this.rules;
  }
  getCapabilities(): CapabilitiesState {
    return this.capabilities;
  }
  getPlayers(): PlayersState {
    return this.players;
  }
  getTilePack(): TilePack | null {
    return this.tilePack;
  }
  getDrawnTile(): Tile | null {
    return this.drawnTile;
  }
  getPlacedTiles(): LinkedHashMap<Position, PlacedTile> {
    return this.placedTiles;
  }
  getDiscardedTiles(): List<Tile> {
    return this.discardedTiles;
  }
  getFeatureMap(): FeatureMap {
    return this.featureMap;
  }
  getNeutralFigures(): NeutralFiguresState {
    return this.neutralFigures;
  }
  getDeployedMeeples(): LinkedHashMap<Meeple, FeaturePointer> {
    return this.deployedMeeples;
  }
  getPlayerActions(): ActionsState | null {
    return this.playerActions;
  }
  getFlags(): Set<Flag> {
    return this.flags;
  }
  getEvents(): Queue<PlayEvent> {
    return this.events;
  }
  getPhase(): Phase | null {
    return this.phase;
  }
  getTurnNumber(): number {
    return this.turnNumber;
  }
  isCommited(): boolean {
    return this.commited;
  }

  // === RulesMixin ===
  getStringRule(rule: Rule): string {
    return this.rules.get(rule).getOrNull() as string;
  }
  getBooleanRule(rule: Rule): boolean {
    return this.rules.get(rule).getOrElse(false) as boolean;
  }

  // === FlagsMixin ===
  hasFlag(flag: Flag): boolean {
    return this.flags.contains(flag);
  }
  addFlag(flag: Flag): GameState {
    return this.setFlags(this.flags.add(flag));
  }

  // === ActionsMixin ===
  getAction(): PlayerAction<unknown> | null {
    return this.playerActions === null ? null : this.playerActions.getActions().getOrNull();
  }
  appendAction(action: PlayerAction<unknown>): GameState {
    return this.setPlayerActions(this.playerActions!.appendAction(action));
  }

  // === PlayersMixin ===
  getTurnPlayer(): Player | null {
    return this.players.getTurnPlayer();
  }
  getActivePlayer(): Player | null {
    return this.playerActions === null ? null : this.playerActions.getPlayer();
  }
  mapPlayers(fn: (p: PlayersState) => PlayersState): GameState {
    return this.setPlayers(fn(this.players));
  }

  /** Tiles a player holds in their personal supply (placeable via TileFromSupplyPhase):
   *  the bazaar items they won and have not yet placed. */
  getTilesInPlayerSupply(player: Player): List<Tile> {
    if (!this.hasCapability(BazaarCapability as never)) return List.empty() as List<Tile>;
    const model = this.getCapabilityModel<BazaarCapabilityModel>(BazaarCapability as never);
    const supply = model === null || model === undefined ? null : model.getSupply();
    if (supply === null) return List.empty() as List<Tile>;
    let result: List<Tile> = List.empty();
    for (const bi of supply) {
      const owner = bi.getOwner();
      if (owner !== null && player.equals(owner)) {
        result = result.append(bi.getTile()) as List<Tile>;
      }
    }
    return result;
  }

  // === CapabilitiesMixin ===
  hasCapability(cls: ClassToken<Capability<unknown>>): boolean {
    return this.capabilities.contains(cls);
  }
  getCapabilityModel<M>(cls: ClassToken<Capability<M>>): M {
    return this.capabilities.getModel<M>(cls);
  }
  setCapabilityModel<M>(cls: ClassToken<Capability<M>>, model: M): GameState {
    return this.setCapabilities(this.capabilities.setModel(cls, model));
  }
  mapCapabilityModel<M>(cls: ClassToken<Capability<M>>, fn: (m: M) => M): GameState {
    return this.setCapabilities(this.capabilities.updateModel(cls, fn));
  }

  // === EventsMixin ===
  appendEvent(ev: PlayEvent): GameState {
    return this.setEvents(this.events.append(ev) as Queue<PlayEvent>);
  }
  getCurrentTurnEvents(): List<PlayEvent> {
    let res: List<PlayEvent> = List.empty<PlayEvent>();
    const arr = this.events.toArray();
    for (let i = arr.length - 1; i >= 0; i--) {
      const ev = arr[i];
      res = res.prepend(ev) as List<PlayEvent>;
      if (ev instanceof PlayerTurnEvent) break;
    }
    return res;
  }
  getCurrentTurnPartEvents(): List<PlayEvent> {
    let res: List<PlayEvent> = List.empty<PlayEvent>();
    const arr = this.events.toArray();
    for (let i = arr.length - 1; i >= 0; i--) {
      const ev = arr[i];
      res = res.prepend(ev) as List<PlayEvent>;
      if (ev instanceof PlayerTurnEvent || ev instanceof DoubleTurnEvent) break;
    }
    return res;
  }

  // === BoardMixin ===
  mapFeatureMap(fn: (m: FeatureMap) => FeatureMap): GameState {
    return this.setFeatureMap(fn(this.featureMap));
  }
  updateFeatureMap(fpUpdate: VMap<FeaturePointer, Feature>): GameState {
    return this.mapFeatureMap((m) => {
      for (const t of fpUpdate) {
        const pos = t._1.getPosition();
        m = m.put(pos, m.get(pos).getOrElse(HashMap.empty<FeaturePointer, Feature>()).put(t._1, t._2));
      }
      return m;
    });
  }
  putFeature(fp: FeaturePointer, feature: Feature): GameState {
    return this.mapFeatureMap((m) => {
      const pos = fp.getPosition();
      return m.put(pos, m.get(pos).getOrElse(HashMap.empty<FeaturePointer, Feature>()).put(fp, feature));
    });
  }
  getPlacedTile(pos: Position): PlacedTile | null {
    return this.placedTiles.get(pos).getOrNull();
  }
  getLastPlaced(): PlacedTile | null {
    return this.placedTiles.toArray().length === 0
      ? null
      : this.placedTiles.toArray()[this.placedTiles.toArray().length - 1]._2;
  }
  private adjacentTilesBy(
    offsets: VMap<Location, Position>,
    pos: Position,
  ): Stream<Tuple2<Location, PlacedTile>> {
    return Stream.ofAll(offsets)
      .map((locPos) => locPos.map2((offset) => this.getPlacedTile(pos.add(offset))))
      .filter((locTile) => locTile._2 !== null) as Stream<Tuple2<Location, PlacedTile>>;
  }
  getAdjacentTiles2(pos: Position): Stream<Tuple2<Location, PlacedTile>> {
    return this.adjacentTilesBy(Position.ADJACENT, pos);
  }
  getAdjacentTiles(pos: Position): Stream<PlacedTile> {
    return this.getAdjacentTiles2(pos).map((t) => t._2) as Stream<PlacedTile>;
  }
  getDiagonalTiles2(pos: Position): Stream<Tuple2<Location, PlacedTile>> {
    return this.adjacentTilesBy(Position.DIAGONAL, pos);
  }
  getDiagonalTiles(pos: Position): Stream<PlacedTile> {
    return this.getDiagonalTiles2(pos).map((t) => t._2) as Stream<PlacedTile>;
  }
  getAdjacentAndDiagonalTiles2(pos: Position): Stream<Tuple2<Location, PlacedTile>> {
    return this.adjacentTilesBy(Position.ADJACENT_AND_DIAGONAL, pos);
  }
  getAdjacentAndDiagonalTiles(pos: Position): Stream<PlacedTile> {
    return this.getAdjacentAndDiagonalTiles2(pos).map((t) => t._2) as Stream<PlacedTile>;
  }
  getBoardBounds(): Rectangle {
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    for (const pos of this.placedTiles.keySet()) {
      if (minX > pos.x) minX = pos.x;
      if (maxX < pos.x) maxX = pos.x;
      if (minY > pos.y) minY = pos.y;
      if (maxY < pos.y) maxY = pos.y;
    }
    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }
  getFeatures(): Stream<Feature>;
  getFeatures<T extends Feature>(cls: ClassToken<T>): Stream<T>;
  getFeatures(cls?: ClassToken<Feature>): Stream<Feature> {
    const all = Stream.ofAll(this.featureMap.values())
      .flatMap((m) => m.values())
      .distinct() as Stream<Feature>;
    if (cls === undefined) return all;
    return all.filter((f) => f instanceof cls).distinct() as Stream<Feature>;
  }
  getTileFeatures2(pos: Position): Stream<Tuple2<FeaturePointer, Feature>>;
  getTileFeatures2<T extends Feature>(pos: Position, cls: ClassToken<T>): Stream<Tuple2<FeaturePointer, T>>;
  getTileFeatures2(pos: Position, cls?: ClassToken<Feature>): Stream<Tuple2<FeaturePointer, Feature>> {
    const base = this.featureMap
      .get(pos)
      .getOrElse(HashMap.empty<FeaturePointer, Feature>())
      .toStream() as Stream<Tuple2<FeaturePointer, Feature>>;
    if (cls === undefined) return base;
    return base.filter((t) => t._2 instanceof cls) as Stream<Tuple2<FeaturePointer, Feature>>;
  }
  getTileFeatures2ForPositions<T extends Feature>(
    positions: Iterable<Position>,
    cls: ClassToken<T>,
  ): Stream<Tuple2<FeaturePointer, T>> {
    return Stream.ofAll(positions).flatMap((pos) => this.getTileFeatures2(pos, cls)) as Stream<
      Tuple2<FeaturePointer, T>
    >;
  }
  getFeature(fp: FeaturePointer): Feature | null {
    if (fp.getLocation() === Location.AS_ABBOT) fp = fp.setLocation(Location.I);
    const tileMap = this.featureMap.get(fp.getPosition()).getOrNull();
    return tileMap === null ? null : tileMap.get(fp).getOrNull();
  }
  getStructure(fp: FeaturePointer): Structure | null {
    const f = this.getFeature(fp);
    return f !== null && isInstanceOfStructure(f) ? (f as unknown as Structure) : null;
  }
  getFeaturePartOf(pos: Position, loc: Location): Feature | null;
  getFeaturePartOf(fp: FeaturePointer): Feature | null;
  getFeaturePartOf(a: Position | FeaturePointer, loc?: Location): Feature | null {
    if (a instanceof Position) {
      let l = loc!;
      if (l === Location.AS_ABBOT) l = Location.I;
      const placedTile = this.getPlacedTile(a);
      if (placedTile === null) return null;
      const t = placedTile.getInitialFeaturePartOf(l);
      if (t === null) return null;
      const fp = t._1.setPosition(a);
      const tileMap = this.featureMap.get(a).getOrElse(HashMap.empty<FeaturePointer, Feature>());
      let f = tileMap.get(fp).getOrNull();
      if (f === null && fp.getFeature() === City) {
        f = tileMap.get(fp.setFeature(Castle)).getOrNull();
      }
      return f;
    }
    const normFp = a.getLocation() === Location.AS_ABBOT ? a.setLocation(Location.I) : a;
    return this.featureMap
      .get(a.getPosition())
      .getOrElse(HashMap.empty<FeaturePointer, Feature>())
      .find((t) => normFp.isPartOf(t._1))
      .map((t) => t._2)
      .getOrNull();
  }
  getFeaturePartOf2(pos: Position, loc: Location): Tuple2<FeaturePointer, Feature> | null;
  getFeaturePartOf2(fp: FeaturePointer): Tuple2<FeaturePointer, Feature> | null;
  getFeaturePartOf2(a: Position | FeaturePointer, loc?: Location): Tuple2<FeaturePointer, Feature> | null {
    if (a instanceof Position) {
      let l = loc!;
      if (l === Location.AS_ABBOT) l = Location.I;
      const placedTile = this.getPlacedTile(a);
      if (placedTile === null) return null;
      const t = placedTile.getInitialFeaturePartOf(l);
      if (t === null) return null;
      const feature = this.featureMap
        .get(a)
        .getOrElse(HashMap.empty<FeaturePointer, Feature>())
        .get(t._1.setPosition(a))
        .getOrNull();
      return feature === null ? null : new Tuple2(t._1.setPosition(a), feature);
    }
    const normFp = a.getLocation() === Location.AS_ABBOT ? a.setLocation(Location.I) : a;
    return this.featureMap
      .get(a.getPosition())
      .getOrElse(HashMap.empty<FeaturePointer, Feature>())
      .find((t) => normFp.isPartOf(t._1))
      .getOrNull();
  }
  getStructurePartOf(fp: FeaturePointer): Structure | null {
    const f = this.getFeaturePartOf(fp);
    return f !== null && isInstanceOfStructure(f) ? (f as unknown as Structure) : null;
  }
  getFeaturePointer(feature: Feature): FeaturePointer | null {
    for (const posEntry of this.featureMap) {
      for (const entry of posEntry._2) {
        if (equals(entry._2, feature)) return entry._1;
      }
    }
    return null;
  }

  // === PlacementsMixin ===
  getAvailablePlacements(): Stream<Tuple2<Position, EdgePattern>> {
    if (this.placedTiles.isEmpty()) {
      return Stream.of(new Tuple2(Position.ZERO, EdgePattern.fromString("????")));
    }
    let used: Set<Position> = HashSet.empty<Position>();
    const out: Tuple2<Position, EdgePattern>[] = [];
    for (const item of this.placedTiles) {
      const pos = item._1;
      for (const offset of Position.ADJACENT.values()) {
        const adj = pos.add(offset);
        if (!used.contains(adj) && !this.placedTiles.containsKey(adj)) {
          out.push(new Tuple2(adj, this.getEdgePattern(adj)));
          used = used.add(adj);
        }
      }
    }
    return Stream.ofAll(out);
  }
  getHoles(): Stream<Tuple2<Position, EdgePattern>> {
    return this.getAvailablePlacements().filter((t) => t._2.wildcardSize() === 0) as Stream<
      Tuple2<Position, EdgePattern>
    >;
  }
  getEdgePattern(pos: Position): EdgePattern {
    const placed = this.getPlacedTile(pos);
    if (placed !== null) {
      return placed.getEdgePattern();
    }
    return new EdgePattern(
      Position.ADJACENT.map((loc, offset) => {
        const adj = pos.add(offset);
        const adjTile = this.getPlacedTile(adj);
        if (adjTile === null) {
          return new Tuple2(loc, EdgeType.ANY);
        }
        return new Tuple2(loc, adjTile.getEdgePattern().at(loc.rev()));
      }),
    );
  }
  getTilePlacements(tile: Tile): Stream<PlacementOption> {
    const playerHasBridge =
      this.players.getPlayerTokenCount(this.getTurnPlayer()!.getIndex(), BridgeCapability.BridgeToken.BRIDGE) > 0;
    const basePattern = tile.getEdgePattern();
    const baseBridgePatterns = playerHasBridge ? this.getBridgePatterns(basePattern) : null;

    return this.getAvailablePlacements().flatMap((avail) => {
      return Stream.of(...Rotation.values())
        .map((rot): PlacementOption | null => {
          const pos = avail._1;
          const border = avail._2;
          const tilePattern = basePattern.rotate(rot);
          if (border.isMatchingExact(tilePattern)) {
            return new PlacementOption(pos, rot, null);
          }
          if (playerHasBridge && baseBridgePatterns !== null) {
            for (const t of baseBridgePatterns) {
              const tileWithBridgePattern = t._1.rotate(rot);
              if (border.isMatchingExact(tileWithBridgePattern)) {
                const bridgeLocation = t._2.rotateCW(rot);
                return new PlacementOption(pos, rot, new FeaturePointer(pos, Road, bridgeLocation));
              }
            }
            for (const side of Location.SIDES) {
              const adjPos = pos.add(side);
              if (!this.placedTiles.containsKey(adjPos)) continue;
              let bridgePtr: FeaturePointer;
              if (side === Location.N || side === Location.S) {
                bridgePtr = new FeaturePointer(adjPos, Road, Location.NS);
              } else {
                bridgePtr = new FeaturePointer(adjPos, Road, Location.WE);
              }
              if (!this.isBridgePlacementAllowed(bridgePtr)) continue;
              const borderWithBridgePattern = border.replace(side, EdgeType.ROAD);
              if (borderWithBridgePattern.isMatchingExact(tilePattern)) {
                return new PlacementOption(pos, rot, bridgePtr);
              }
            }
          }
          return null;
        })
        .filter((tp) => tp !== null)
        .filter((tp) => {
          for (const cap of this.capabilities.toSeq()) {
            if (!cap.isTilePlacementAllowed(this, tile, tp as PlacementOption)) return false;
          }
          return true;
        }) as Stream<PlacementOption>;
    }) as Stream<PlacementOption>;
  }
  isBridgePlacementAllowed(bridgePtr: FeaturePointer): boolean {
    const pos = bridgePtr.getPosition();
    const loc = bridgePtr.getLocation()!;
    for (const l of loc.splitToSides()) {
      const p = pos.add(l);
      if (this.getPlacedTile(p) === null) continue;
      const f = this.getFeaturePartOf(p, l.rev());
      if (!(f instanceof CityGate || f instanceof Bush)) {
        return false;
      }
    }
    const placedBridges = this.getCapabilityModel<Set<FeaturePointer>>(BridgeCapability);
    if (placedBridges.find((fp) => fp.getPosition().equals(pos)).isDefined()) {
      return false;
    }
    const acrobats = this.getFeatures(Acrobats)
      .filter((a) => a.getPlace().getPosition().equals(pos))
      .getOrNull();
    if (acrobats !== null && acrobats.isOccupied(this)) {
      return false;
    }
    const placedTile = this.getPlacedTile(pos)!;
    return placedTile.getEdgePattern().isBridgeAllowed(loc);
  }
  private getBridgePatterns(basePattern: EdgePattern): Vector<Tuple2<EdgePattern, Location>> {
    let patterns: Vector<Tuple2<EdgePattern, Location>> = Vector.empty<Tuple2<EdgePattern, Location>>();
    for (const loc of Location.BRIDGES) {
      if (basePattern.isBridgeAllowed(loc)) {
        patterns = patterns.append(new Tuple2(basePattern.getBridgePattern(loc), loc)) as Vector<
          Tuple2<EdgePattern, Location>
        >;
      }
    }
    return patterns;
  }
}

interface GameStateFields {
  rules: VMap<Rule, unknown>;
  elements: VMap<string, unknown>;
  capabilities: CapabilitiesState;
  players: PlayersState;
  tilePack: TilePack | null;
  drawnTile: Tile | null;
  placedTiles: LinkedHashMap<Position, PlacedTile>;
  discardedTiles: List<Tile>;
  featureMap: FeatureMap;
  neutralFigures: NeutralFiguresState;
  deployedMeeples: LinkedHashMap<Meeple, FeaturePointer>;
  playerActions: ActionsState | null;
  flags: Set<Flag>;
  events: Queue<PlayEvent>;
  phase: Phase | null;
  turnNumber: number;
  commited: boolean;
}

