import { isInstanceOfCompletable } from "../../feature/Completable.js";
import { isInstanceOfMonastic } from "../../feature/Monastic.js";
import { isInstanceOfStructure } from "../../feature/Structure.js";
import { Capability } from "../Capability.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import type { PlacedTile } from "../state/PlacedTile.js";

/**
 * "Keep Building" — cooperative variant. Every turn the turn player must either
 *  (a) enlarge an already-occupied, in-game-scorable multi-tile feature (city, road,
 *      and similar completables; NOT fields — end-game scoring only — and NOT
 *      monasteries, which are progressed by adjacent tiles, never enlarged), or
 *  (b) occupy a new, previously unoccupied feature with a follower (phantom and
 *      wagon moves count; the barn does not — it is a Special, not a Follower).
 * Condition (b) is earned at deployment time and is NOT revoked by the meeple later
 * returning (feature scored the same turn) or being eaten by the dragon.
 *
 * When neither happens by the end of a turn, the game is over and ALL players lose
 * (see CleanUpTurnPhase). If nobody triggers the loss before the tile pack runs out,
 * all players win together — final scoring runs normally and the client presents the
 * summed team score.
 *
 * Model: the losing player's index, or null while the game is (still) being won.
 */
export class KeepBuildingCapability extends Capability<number | null> {
  static readonly simpleName = "KeepBuildingCapability";

  /** Condition (a): the just-placed tile is part of a completable multi-tile feature
   *  that already carries a meeple. Runs after the merge, but before any deployment
   *  this turn can happen — so any meeple found was there before the placement. */
  override onTilePlaced(state: GameState, placedTile: PlacedTile): GameState {
    if (state.hasFlag(Flag.COOP_CONDITION_MET)) return state;
    const pos = placedTile.getPosition();
    const enlargedOccupied = state
      .getTileFeatures2(pos)
      .find((t) => {
        const f = t._2;
        return (
          isInstanceOfCompletable(f) &&
          !isInstanceOfMonastic(f) &&
          f.getTilePositions().length() > 1 &&
          isInstanceOfStructure(f) &&
          f.isOccupied(state)
        );
      })
      .isDefined();
    return enlargedOccupied ? state.addFlag(Flag.COOP_CONDITION_MET) : state;
  }
}

Capability.register(KeepBuildingCapability);
