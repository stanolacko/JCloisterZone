import { Vector } from "../../../../io/vavr/SeqTypes.js";
import { getElementStreamByTagName, type XmlElement } from "../../XmlUtils.js";
import type { Position } from "../../board/Position.js";
import type { Tile } from "../../board/Tile.js";
import { TileModifier } from "../../board/TileModifier.js";
import type { BoardPointer } from "../../board/pointer/BoardPointer.js";
import { Dragon } from "../../figure/neutral/Dragon.js";
import type { NeutralFigure } from "../../figure/neutral/NeutralFigure.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { MoveNeutralFigure } from "../../reducers/MoveNeutralFigure.js";
import { Capability } from "../Capability.js";
import type { GameState } from "../state/GameState.js";
import type { PlacedTile } from "../state/PlacedTile.js";

/** The Dragon (Princess & the Dragon) — a volcano tile summons it; dragon-trigger tiles then
 *  let it walk 6 tiles, eating any meeple it lands on. Model = the path of visited positions. */
export class DragonCapability extends Capability<Vector<Position>> {
  static readonly VOLCANO = new TileModifier("Volcano");
  static readonly DRAGON_TRIGGER = new TileModifier("DragonTrigger");
  static readonly DRAGON_MOVES = 6;
  static readonly TILE_GROUP_DRAGON = "dragon";

  override initTile(_state: GameState, tile: Tile, tileElement: XmlElement): Tile {
    if (!getElementStreamByTagName(tileElement, "volcano").isEmpty()) {
      tile = tile.addTileModifier(DragonCapability.VOLCANO);
    }
    if (!getElementStreamByTagName(tileElement, "dragon").isEmpty()) {
      tile = tile.addTileModifier(DragonCapability.DRAGON_TRIGGER);
    }
    return tile;
  }

  override getTileGroup(tile: Tile): string | null {
    return tile.hasModifier(DragonCapability.DRAGON_TRIGGER) ? DragonCapability.TILE_GROUP_DRAGON : null;
  }

  override onStartGame(state: GameState, _random: RandomGenerator): GameState {
    state = state.mapNeutralFigures((nf) => nf.setDragon(new Dragon("dragon.1")));
    state = state.mapTilePack((pack) => pack.deactivateGroup(DragonCapability.TILE_GROUP_DRAGON));
    return this.setModel(state, Vector.empty<Position>());
  }

  override onTilePlaced(state: GameState, pt: PlacedTile): GameState {
    // A volcano summons the dragon onto the placed tile immediately (this is always correct,
    // even for the River II volcano lake tile RI.2/I.v).
    if (pt.getTile().hasModifier(DragonCapability.VOLCANO)) {
      state = new MoveNeutralFigure(
        state.getNeutralFigures().getDragon() as unknown as NeutralFigure<BoardPointer>,
        pt.getPosition() as unknown as BoardPointer,
      ).apply(state);
    }
    // Shuffle the dragon deck into the pack once the dragon is out — but NOT while the River is
    // still being built. The river enforces its order solely by keeping "default" deactivated until
    // the river→river-lake→default chain drains; activating the dragon group mid-river leaks the
    // whole P&D deck into the forced river draw. So defer until "default" is active (river finished).
    // In a non-river game "default" is active from the start, so this fires on the volcano tile
    // exactly as before. The next placement after the river finishes activates the held-back deck.
    const pack = state.getTilePack()!;
    const dragonGroup = pack.getGroup(DragonCapability.TILE_GROUP_DRAGON);
    if (
      dragonGroup !== null &&
      !dragonGroup.isActive() &&
      state.getNeutralFigures().getDragonDeployment() !== null
    ) {
      const def = pack.getGroup("default");
      const riverFinished = def === null || def.isActive();
      if (riverFinished) {
        state = state.mapTilePack((p) => p.activateGroup(DragonCapability.TILE_GROUP_DRAGON));
      }
    }
    return state;
  }

  override isMeepleDeploymentAllowed(state: GameState, pos: Position): boolean {
    const dragonPos = state.getNeutralFigures().getDragonDeployment();
    return dragonPos === null || !pos.equals(dragonPos);
  }
}

Capability.register(DragonCapability);
