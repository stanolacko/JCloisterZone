import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { List, Vector } from "../../../../io/vavr/SeqTypes.js";
import { EdgeType } from "../../board/EdgeType.js";
import { Location } from "../../board/Location.js";
import { Position } from "../../board/Position.js";
import type { PlacementOption } from "../../board/PlacementOption.js";
import { Rotation } from "../../board/Rotation.js";
import type { Tile } from "../../board/Tile.js";
import { TileGroup } from "../../board/TileGroup.js";
import type { TilePack } from "../../board/TilePack.js";
import { River } from "../../feature/River.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { PlaceTile } from "../../reducers/PlaceTile.js";
import { Capability } from "../Capability.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import type { PlacedTile } from "../state/PlacedTile.js";
import { DragonCapability } from "./DragonCapability.js";

/** Name of the group holding the single volcano (or, lacking one, random) lake forced to be the
 *  last river tile drawn — so the dragon is summoned exactly when the river finishes. */
const RIVER_LAKE_VOLCANO = "river-lake-volcano";

/** The River — a separate tile group drawn first, with placement rules that forbid
 *  U-turns and same-direction river junctions. Port of RiverCapability. */
export class RiverCapability extends Capability<void> {
  override onStartGame(state: GameState, random: RandomGenerator): GameState {
    return state.mapTilePack((pack: TilePack) => {
      pack = pack.deactivateGroup("default");
      pack = pack.deactivateGroup("river-lake");
      pack = pack.mapGroup("river", (g) => g.setSuccessiveGroup("river-lake"));
      pack = pack.mapGroup("river-lake", (g) => g.setSuccessiveGroup("default"));

      if (pack.hasGroup("river-fork")) {
        const riverForks = pack.getGroup("river-fork")!;
        let riverForksLocationsCount = 0;
        for (const t of riverForks.getTiles()) {
          for (const loc of this.getRiverLocations(t, Rotation.R0)) {
            riverForksLocationsCount += loc.splitToSides().size();
          }
        }
        pack = pack.mapGroup("river-fork", (g) => g.setSuccessiveGroup("river"));
        pack = pack.deactivateGroup("river");

        // lakes needed = 1 initial open branch + each fork's (ends - 2):
        // a fork uses 1 existing open end to connect and adds (ends - 1) new ones, net (ends - 2).
        const branches = 1 + (riverForksLocationsCount - 2 * riverForks.getTiles().size());
        const ends = pack.getGroupSize("river-lake");
        if (branches !== ends) {
          const riverLakes = pack.getGroup("river-lake")!.getTiles();
          const trimmed = this.adjustRandomTiles(riverLakes, branches - ends, random);
          pack = pack.mapGroup("river-lake", (g) => g.setTiles(trimmed));
        }
      }
      // Pull ONE lake — a volcano lake if any (so the dragon is summoned exactly when the river
      // finishes), otherwise any lake — into its own group drawn LAST. The remaining lakes stay in
      // the river-lake group, drawn (via the successive chain) AFTER all river tiles and before the
      // final lake. Chain: river → river-lake → river-lake-volcano → default.
      if (pack.hasGroup("river-lake") && pack.getGroupSize("river-lake") > 0) {
        const lakes = pack.getGroup("river-lake")!.getTiles();
        const volcanoLakes = lakes.filter((t) => this.isVolcanoTile(t)) as Vector<Tile>;
        const candidates = (volcanoLakes.isEmpty() ? lakes : volcanoLakes) as Vector<Tile>;
        const chosen = candidates.get(random.getNextInt(candidates.size()));
        const remaining = lakes.removeFirst((t) => t === chosen) as Vector<Tile>;
        if (remaining.isEmpty()) {
          // the chosen lake was the only one — river flows straight into the volcano-lake group
          // (an empty river-lake group would never trigger its successive).
          pack = pack.removeGroup("river-lake");
          pack = pack.mapGroup("river", (g) => g.setSuccessiveGroup(RIVER_LAKE_VOLCANO));
        } else {
          // the other lakes stay in river-lake (chain-activated when river drains), flowing into
          // the volcano-lake group instead of straight to default.
          pack = pack.mapGroup("river-lake", (g) =>
            g.setTiles(remaining).setSuccessiveGroup(RIVER_LAKE_VOLCANO),
          );
        }
        pack = pack.updateGroup(new TileGroup(RIVER_LAKE_VOLCANO, Vector.of(chosen) as Vector<Tile>, false, "default"));
      }
      pack = pack.removeGroup("river-spring"); // remove unused springs
      return pack;
    });
  }

  override onTilePlaced(state: GameState, placedTile: PlacedTile): GameState {
    if (state.getPlacedTiles().size() > 1) {
      // first tile already placed (the river-fork if any) → mix other forks in
      state = state.mapTilePack((pack) => pack.activateGroup("river"));
    }
    // The volcano lake is forced to be the last river tile; whoever places it takes another turn
    // (so they play the first tile of the now-active main deck the dragon just joined).
    if (placedTile.getTile().hasModifier(DragonCapability.VOLCANO)) {
      state = state.addFlag(Flag.RIVER_VOLCANO_DOUBLE_TURN);
    }
    return state;
  }

  private isVolcanoTile(tile: Tile): boolean {
    return tile.hasModifier(DragonCapability.VOLCANO);
  }

  override isTilePlacementAllowed(state: GameState, tile: Tile, placement: PlacementOption): boolean {
    const pos = placement.getPosition();
    const rot = placement.getRotation();
    const riverLocations = this.getRiverLocations(tile, rot);
    if (riverLocations.size() === 0) return true;

    let foundValidRiverPlacement = false;
    for (const riverLoc of riverLocations) {
      const sides = riverLoc.splitToSides();
      const openSides = sides.filter((side) => !this.isConnectedToPlacedRiver(state, pos, side));
      const openSidesSize = openSides.size();
      if (sides.size() !== openSidesSize) {
        foundValidRiverPlacement = true;
        if (
          openSides.filter((side) => this.isContinuationFree(state, pos, side, tile, rot)).size() !==
          openSidesSize
        ) {
          return false;
        }
      }
    }
    return foundValidRiverPlacement;
  }

  /** The unioned river side-location(s) of a tile (rotated), or empty if not a river tile. */
  private getRiverLocations(tile: Tile, rot: Rotation): List<Location> {
    const sideLocs: Location[] = [];
    for (const t of tile.getInitialFeatures()) {
      if (!(t._2 instanceof River)) continue;
      const loc = t._1.getLocation()!.rotateCW(rot);
      for (const s of loc.splitToSides()) sideLocs.push(s);
    }
    if (sideLocs.length === 0) return List.empty<Location>();
    let u = sideLocs[0];
    for (let i = 1; i < sideLocs.length; i++) u = u.union(sideLocs[i]);
    return List.of(u);
  }

  private isConnectedToPlacedRiver(state: GameState, pos: Position, side: Location): boolean {
    return state.getPlacedTiles().containsKey(pos.add(side));
  }

  private isContinuationFree(
    state: GameState,
    pos: Position,
    side: Location,
    tile: Tile,
    rot: Rotation,
  ): boolean {
    const adjPos = pos.add(side);
    const adjPos2 = adjPos.add(side);
    const reserved = [
      adjPos.add(side.prev()),
      adjPos.add(side.next()),
      adjPos2,
      adjPos2.add(side.prev()),
      adjPos2.add(side.next()),
    ];
    for (const p of reserved) if (state.getPlacedTiles().containsKey(p)) return false; // U-turn

    const placed = new PlaceTile(tile, pos, rot).apply(state);
    const placedTiles = placed.getPlacedTiles();
    let minX = 0,
      maxX = 0,
      minY = 0,
      maxY = 0;
    for (const p of placedTiles.keySet()) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const check: Position[] = [];
    let edgeI = -1;
    if (side === Location.N) {
      edgeI = 0;
      for (let y = minY; y < pos.y; y++)
        check.push(new Position(pos.x - 1, y), new Position(pos.x, y), new Position(pos.x + 1, y));
    } else if (side === Location.E) {
      edgeI = 1;
      for (let x = pos.x + 1; x <= maxX; x++)
        check.push(new Position(x, pos.y - 1), new Position(x, pos.y), new Position(x, pos.y + 1));
    } else if (side === Location.S) {
      edgeI = 2;
      for (let y = pos.y + 1; y <= maxY; y++)
        check.push(new Position(pos.x - 1, y), new Position(pos.x, y), new Position(pos.x + 1, y));
    } else if (side === Location.W) {
      edgeI = 3;
      for (let x = minX; x < pos.x; x++)
        check.push(new Position(x, pos.y - 1), new Position(x, pos.y), new Position(x, pos.y + 1));
    }
    if (check.length > 0 && check.some((p) => placedTiles.containsKey(p))) return false; // tile in straight path

    const edgePositions: Position[] = [];
    for (const placement of placed.getAvailablePlacements()) {
      const edges = placement._2.getEdges();
      if (edges[(edgeI + 2) % 4] === EdgeType.RIVER) edgePositions.push(placement._1);
    }
    if (edgePositions.length >= 2) {
      for (let i = 0; i < edgePositions.length; i++) {
        for (let j = i + 1; j < edgePositions.length; j++) {
          const p1 = edgePositions[i];
          const p2 = edgePositions[j];
          const consecutive =
            edgeI === 0 || edgeI === 2 ? Math.abs(p1.x - p2.x) === 1 : Math.abs(p1.y - p2.y) === 1;
          if (consecutive) return false; // river junction following the curve
        }
      }
    }
    return true;
  }

  private adjustRandomTiles(tiles: Vector<Tile>, count: number, random: RandomGenerator): Vector<Tile> {
    if (count > 0) {
      // Add `count` extra lake ends by duplicating random lake tiles. Java does NOT
      // exclude the protected volcano here (the duplicate is only a draw-pile entry,
      // not a second physical tile) and it MUST consume one getNextInt per added end
      // to keep the RNG in lock-step with the Java engine.
      return tiles.appendAll(
        Vector.range(0, count).map(() => tiles.get(random.getNextInt(tiles.size()))),
      ) as Vector<Tile>;
    }
    // Never remove a volcano lake (detected by modifier, not by tile id).
    let pool = Vector.range(0, tiles.size()).filter(
      (idx) => !this.isVolcanoTile(tiles.get(idx)),
    ) as Vector<number>;
    const toRemove = Math.min(-count, pool.size());
    let removeIdx: Set<number> = HashSet.empty<number>();
    for (let i = 0; i < toRemove; i++) {
      const p = random.getNextInt(pool.size());
      removeIdx = removeIdx.add(pool.get(p));
      pool = pool.removeAt(p) as Vector<number>;
    }
    return tiles
      .zipWithIndex()
      .filter((t) => !removeIdx.contains(t._2))
      .map((t) => t._1) as Vector<Tile>;
  }
}

Capability.register(RiverCapability);
