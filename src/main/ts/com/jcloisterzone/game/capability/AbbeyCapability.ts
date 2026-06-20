import { HashMap, type Map as VMap } from "../../../../io/vavr/Map.js";
import { HashSet } from "../../../../io/vavr/Set.js";
import { List } from "../../../../io/vavr/SeqTypes.js";
import { JavaEnum } from "../../../../lang/JavaEnum.js";
import { Location } from "../../board/Location.js";
import { Position } from "../../board/Position.js";
import { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { Tile } from "../../board/Tile.js";
import { AbbeyEdge } from "../../feature/AbbeyEdge.js";
import type { Feature } from "../../feature/Feature.js";
import { Monastery } from "../../feature/Monastery.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { Capability } from "../Capability.js";
import type { Token } from "../Token.js";
import type { GameState } from "../state/GameState.js";

/** Abbey & Mayor — the abbey tile each player may place in a hole. Model: the
 *  player index during the final abbey-placement turn. */
export class AbbeyCapability extends Capability<number> {
  static readonly ABBEY_TILE_ID = "AM/A";
  /** Max abbey tiles a player may start with (the `abbey` element is an integer count). */
  static readonly MAX_ABBEY_TILES = 9;

  /** The (unplaced) abbey tile: a monastery surrounded by abbey edges. */
  static readonly ABBEY_TILE: Tile = (() => {
    let features: VMap<FeaturePointer, Feature> = HashMap.of<FeaturePointer, Feature>(
      new FeaturePointer(Position.ZERO, Monastery, Location.I),
      new Monastery(HashMap.empty()),
    );
    for (const side of Location.SIDES) {
      const fp = new FeaturePointer(Position.ZERO, AbbeyEdge, side);
      features = features.put(fp, new AbbeyEdge(List.of(fp)));
    }
    return new Tile("AM/A", features, HashSet.empty());
  })();

  override onStartGame(state: GameState, _random: RandomGenerator): GameState {
    // The `abbey` element is an integer count (1..9) of abbey tiles each player gets.
    // A legacy boolean `true` (or any non-positive/invalid value) means a single tile.
    const raw = state.getElements().get("abbey").getOrNull();
    let count = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(count) || count < 1) count = 1;
    if (count > AbbeyCapability.MAX_ABBEY_TILES) count = AbbeyCapability.MAX_ABBEY_TILES;
    return state.mapPlayers((ps) =>
      ps.setTokenCountForAllPlayers(AbbeyCapability.AbbeyToken.ABBEY_TILE, count),
    );
  }

  static isAbbey(tile: Tile): boolean {
    return tile.getId() === AbbeyCapability.ABBEY_TILE_ID;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AbbeyCapability {
  export class AbbeyToken extends JavaEnum implements Token {
    static readonly ABBEY_TILE = new AbbeyToken("ABBEY_TILE", 0);
    private static readonly VALUES: readonly AbbeyToken[] = [AbbeyToken.ABBEY_TILE];
    static values(): readonly AbbeyToken[] {
      return AbbeyToken.VALUES;
    }
  }
}

Capability.register(AbbeyCapability);
