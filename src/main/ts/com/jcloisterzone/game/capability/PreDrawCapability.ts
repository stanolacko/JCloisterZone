import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { Capability } from "../Capability.js";
import type { GameState } from "../state/GameState.js";

/**
 * Pre-draw variant (server-authoritative, online-only — see PREDRAW_DESIGN.md / PREDRAW_RULES.md).
 *
 * Each player keeps a private hand of up to N regular tiles. Approach A: the engine holds only the
 * PUBLIC max hand size here; the per-player hand COUNT and the turn-flow (end-of-turn pre-draw,
 * abbey-pass releases the draw, bazaar forced) are added once the draw-count rule is finalised. The
 * secret tile identities never enter the engine — they live in the neutral server + the owner's UI;
 * placing a held tile is an atomic public reveal that reuses TileFromSupplyPhase / PlaceTile.
 *
 * Model: the max hand size (from the `pre-draw` element, clamped to 1..MAX_HAND).
 */
export class PreDrawCapability extends Capability<number> {
  static readonly MAX_HAND = 3;

  override onStartGame(state: GameState, _random: RandomGenerator): GameState {
    const raw = state.getElements().get("pre-draw").getOrNull();
    let max = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(max) || max < 1) max = 1;
    if (max > PreDrawCapability.MAX_HAND) max = PreDrawCapability.MAX_HAND;
    return this.setModel(state, max);
  }
}

Capability.register(PreDrawCapability);
