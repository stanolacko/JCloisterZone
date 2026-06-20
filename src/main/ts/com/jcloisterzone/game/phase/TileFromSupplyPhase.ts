import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { Queue, Vector } from "../../../../io/vavr/SeqTypes.js";
import type { ClassToken } from "../../../../lang/Class.js";
import type { PlacementOption } from "../../board/PlacementOption.js";
import type { Tile } from "../../board/Tile.js";
import type { Player } from "../../Player.js";
import { TilePlacementAction } from "../../action/TilePlacementAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import type { PlaceTileMessage } from "../../io/message/PlaceTileMessage.js";
import { PlaceTileMessage as PlaceTileMessageClass } from "../../io/message/PlaceTileMessage.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { PlaceTile } from "../../reducers/PlaceTile.js";
import { AbbeyCapability } from "../capability/AbbeyCapability.js";
import { BazaarCapability } from "../capability/BazaarCapability.js";
import type { BazaarCapabilityModel } from "../capability/BazaarCapabilityModel.js";
import { BuilderCapability } from "../capability/BuilderCapability.js";
import { BuilderState } from "../capability/BuilderState.js";
import { ActionsState } from "../state/ActionsState.js";
import type { GameState } from "../state/GameState.js";
import { AbstractAbbeyPhase } from "./AbstractAbbeyPhase.js";
import type { ActionPhase } from "./ActionPhase.js";
import { Phase, type PhaseHandler } from "./Phase.js";
import type { StepResult } from "./StepResult.js";
import type { TilePhase } from "./TilePhase.js";

const BAZAAR_CAP_CLS = BazaarCapability as unknown as ClassToken<BazaarCapabilityModel>;
const BUILDER_CLS = BuilderCapability as unknown as ClassToken<BuilderState>;

/** Start-of-turn-part phase: the active player may place a tile from their supply
 *  — the abbey tile today (and, once wired, bazaar-won tiles) — instead of drawing.
 *  If a supply tile is placed, play jumps to the ActionPhase; otherwise it falls
 *  through to the normal TilePhase (draw a tile). Replaces the former AbbeyPhase. */
export class TileFromSupplyPhase extends AbstractAbbeyPhase {
  static readonly simpleName = "TileFromSupplyPhase";

  private tilePhase: TilePhase | null = null;
  private actionPhase: ActionPhase | null = null;

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
  }

  setTilePhase(tilePhase: TilePhase): void {
    this.tilePhase = tilePhase;
  }
  setActionPhase(actionPhase: ActionPhase): void {
    this.actionPhase = actionPhase;
  }

  enter(state: GameState): StepResult {
    let actions: Vector<PlayerAction<unknown>> = Vector.empty();
    let abbeyIncluded = false;

    // Abbey is suppressed while a bazaar tile is pending (isAbbeyPlacementAllowed checks that),
    // so a pending bazaar tile becomes the sole, mandatory action: place it, don't draw.
    if (this.isAbbeyPlacementAllowed(state)) {
      const action = this.createAbbeyAction(state);
      if (action !== null) {
        abbeyIncluded = true;
        actions = actions.append(action as unknown as PlayerAction<unknown>) as Vector<PlayerAction<unknown>>;
      }
    }

    const handTiles = state.getTilesInPlayerSupply(state.getTurnPlayer()!);
    if (handTiles.length() > 0) {
      for (const tile of handTiles) {
        const placements: Set<PlacementOption> = HashSet.ofAll(state.getTilePlacements(tile));
        if (!placements.isEmpty()) {
          actions = actions.append(
            new TilePlacementAction(tile, placements) as unknown as PlayerAction<unknown>,
          ) as Vector<PlayerAction<unknown>>;
        }
      }
    }

    if (actions.length() > 0) {
      state = state.setPlayerActions(
        new ActionsState(
          state.getTurnPlayer()!,
          actions,
          // Can pass (to draw) only if the abbey is the sole offered action
          abbeyIncluded && actions.length() === 1,
        ),
      );
      return this.promote(state);
    }
    return this.next(state, this.tilePhase!);
  }

  handlePlaceTile(state: GameState, msg: PlaceTileMessage): StepResult {
    if (this.isTileFromPlayerSupply(state, msg.getTileId()!)) {
      state = this.applyPlaceTile(state, msg);
      return this.next(state, this.actionPhase!);
    } else {
      return this.next(state, this.tilePhase!);
    }
  }

  protected isAbbeyPlacementAllowed(state: GameState): boolean {
    const builderState = state.getCapabilityModel<BuilderState>(BUILDER_CLS as never);
    const builderSecondTurnPart = builderState === BuilderState.SECOND_TURN;
    const bazaarInProgress = this.isBazaarInProgress(state);
    const turnIdx = state.getPlayers().getTurnPlayerIndex()!;
    const hasAbbey =
      state.getPlayers().getPlayerTokenCount(turnIdx, AbbeyCapability.AbbeyToken.ABBEY_TILE) > 0;
    // Not checking if a hole exists (createAbbeyAction handles that)
    return hasAbbey && (builderSecondTurnPart || !bazaarInProgress);
  }

  protected isBazaarInProgress(state: GameState): boolean {
    const bazaarModel = state.getCapabilityModel<BazaarCapabilityModel>(BAZAAR_CAP_CLS as never);
    return bazaarModel !== null && bazaarModel !== undefined && bazaarModel.getSupply() !== null;
  }

  protected isTileFromPlayerSupply(state: GameState, tileId: string): boolean {
    const abbeyTile = tileId === AbbeyCapability.ABBEY_TILE_ID && this.isAbbeyPlacementAllowed(state);
    const supplyTiles = state.getTilesInPlayerSupply(state.getTurnPlayer()!);
    const supplyTile = !supplyTiles.isEmpty() && supplyTiles.map((t) => t.getId()).contains(tileId);
    return abbeyTile || supplyTile;
  }

  /** Place either the abbey tile or a tile held in the player's supply. */
  protected override applyPlaceTile(state: GameState, msg: PlaceTileMessage): GameState {
    const player: Player = state.getActivePlayer()!;
    if (msg.getTileId() === AbbeyCapability.ABBEY_TILE_ID) {
      if (!this.isAbbeyPlacementAllowed(state)) {
        throw new Error("Abbey tile is not possible to place now.");
      }
      state = state.mapPlayers((ps) =>
        ps.addTokenCount(player.getIndex(), AbbeyCapability.AbbeyToken.ABBEY_TILE, -1),
      );
      state = new PlaceTile(AbbeyCapability.ABBEY_TILE, msg.getPosition()!, msg.getRotation()!).apply(state);
    } else {
      const supplyTiles = state.getTilesInPlayerSupply(state.getTurnPlayer()!);
      if (!supplyTiles.isEmpty()) {
        if (!supplyTiles.map((t) => t.getId()).contains(msg.getTileId()!)) {
          throw new Error("Only tile from player supply can be placed.");
        }
        const tile = supplyTiles.find((t) => t.getId() === msg.getTileId()).get();
        state = this.removeFromBazaarSupply(state, player, msg.getTileId()!);
        state = new PlaceTile(tile, msg.getPosition()!, msg.getRotation()!).apply(state);
      }
    }
    state = this.clearActions(state);
    return state;
  }

  /** Remove the just-placed bazaar tile from the player's supply (the bazaar model supply). */
  private removeFromBazaarSupply(state: GameState, player: Player, tileId: string): GameState {
    return state.mapCapabilityModel<BazaarCapabilityModel>(BAZAAR_CAP_CLS as never, (model) => {
      const supply = model.getSupply();
      if (supply === null) return model;
      return model.setSupply(
        Queue.ofAll(
          supply.filter((bi) => !(bi.getTile().getId() === tileId && player.equals(bi.getOwner()))),
        ),
      );
    });
  }

  /** Passing the supply tile must NOT set the NO_PHANTOM flag (Java excludes this phase). */
  protected override addNoPhantomFlagOnPass(_state: GameState): boolean {
    return false;
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTileMessageClass, this.handlePlaceTile);
    return m;
  }
}
