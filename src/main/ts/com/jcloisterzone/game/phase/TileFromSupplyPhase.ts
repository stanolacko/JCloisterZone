import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { Queue, Vector } from "../../../../io/vavr/SeqTypes.js";
import type { ClassToken } from "../../../../lang/Class.js";
import type { PlacementOption } from "../../board/PlacementOption.js";
import type { Tile } from "../../board/Tile.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import type { Player } from "../../Player.js";
import { TilePlacementAction } from "../../action/TilePlacementAction.js";
import { PreDrawPlaceAction } from "../../action/PreDrawPlaceAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import type { PlaceTileMessage } from "../../io/message/PlaceTileMessage.js";
import { PlaceTileMessage as PlaceTileMessageClass } from "../../io/message/PlaceTileMessage.js";
import { PlacePreDrawnMessage } from "../../io/message/PlacePreDrawnMessage.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { PlaceTile } from "../../reducers/PlaceTile.js";
import { PlaceBridge } from "../../reducers/PlaceBridge.js";
import { TokenPlacedEvent } from "../../event/TokenPlacedEvent.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import type { Capability } from "../Capability.js";
import { BridgeCapability } from "../capability/BridgeCapability.js";
import { AbbeyCapability } from "../capability/AbbeyCapability.js";
import { BazaarCapability } from "../capability/BazaarCapability.js";
import type { BazaarCapabilityModel } from "../capability/BazaarCapabilityModel.js";
import { BuilderCapability } from "../capability/BuilderCapability.js";
import { BuilderState } from "../capability/BuilderState.js";
import { PreDrawCapability } from "../capability/PreDrawCapability.js";
import { ActionsState } from "../state/ActionsState.js";
import type { GameState } from "../state/GameState.js";
import { AbstractAbbeyPhase } from "./AbstractAbbeyPhase.js";
import type { ActionPhase } from "./ActionPhase.js";
import { Phase, type PhaseHandler } from "./Phase.js";
import type { StepResult } from "./StepResult.js";
import type { TilePhase } from "./TilePhase.js";

const BAZAAR_CAP_CLS = BazaarCapability as unknown as ClassToken<BazaarCapabilityModel>;
const BUILDER_CLS = BuilderCapability as unknown as ClassToken<BuilderState>;
const PREDRAW_CLS = PreDrawCapability as unknown as ClassToken<number>;
const BRIDGE_CLS = BridgeCapability as unknown as ClassToken<Capability<Set<FeaturePointer>>>;

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

    // Pre-draw game: tiles come from the player's secret hand, not a public draw. The engine can't
    // enumerate the hand (it's server-side), so it offers an opaque "place from hand" action and
    // waits for a PLACE_PREDRAWN reveal — it never falls through to the public TilePhase draw.
    const hasPreDraw = state.hasCapability(PREDRAW_CLS as never);
    if (hasPreDraw) {
      actions = actions.append(new PreDrawPlaceAction() as unknown as PlayerAction<unknown>) as Vector<PlayerAction<unknown>>;
    }

    if (actions.length() > 0) {
      state = state.setPlayerActions(
        new ActionsState(
          state.getTurnPlayer()!,
          actions,
          // Can pass (to draw) only if the abbey is the sole offered action (never in a pre-draw game)
          !hasPreDraw && abbeyIncluded && actions.length() === 1,
        ),
      );
      return this.promote(state);
    }
    return this.next(state, this.tilePhase!);
  }

  /** Place a tile revealed from the player's pre-draw hand: draw it from the pack by id, validate the
   *  placement is legal, place it, and proceed to the action phase. */
  handlePlacePreDrawn(state: GameState, msg: PlacePreDrawnMessage): StepResult {
    const pos = msg.getPosition();
    const rot = msg.getRotation();
    const t = state.getTilePack()!.drawTile(msg.getTileId());
    const tile = t._1;
    state = state.setTilePack(t._2);
    const placements: Set<PlacementOption> = HashSet.ofAll(state.getTilePlacements(tile));
    const ok = placements.find((p) => p.getPosition().equals(pos) && p.getRotation() === rot);
    if (ok.isEmpty()) throw new Error(`Invalid placement ${pos},${rot}`);
    state = new PlaceTile(tile, pos, rot).apply(state);
    state = this.clearActions(state);
    state = state.setDrawnTile(null);
    return this.next(state, this.actionPhase!);
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
        const pos = msg.getPosition()!;
        const rot = msg.getRotation()!;
        // Validate against the legal placements and recover the matching option, which
        // carries any mandatory bridge (e.g. bridging over an adjacent bazaar tile).
        const placement = HashSet.ofAll(state.getTilePlacements(tile))
          .find((p) => p.getPosition().equals(pos) && p.getRotation() === rot)
          .getOrElseThrow(() => new Error(`Invalid placement ${pos},${rot}`));

        state = this.removeFromBazaarSupply(state, player, msg.getTileId()!);

        let placedTileDef = tile;
        const mandatoryBridge = placement.getMandatoryBridge();
        if (mandatoryBridge !== null) {
          state = state.mapPlayers((ps) =>
            ps.addTokenCount(player.getIndex(), BridgeCapability.BridgeToken.BRIDGE, -1),
          );
          state = state.mapCapabilityModel<Set<FeaturePointer>>(BRIDGE_CLS, (m) => m.add(mandatoryBridge));
          const bridgePos = mandatoryBridge.getPosition();
          const bridgeLoc = mandatoryBridge.getLocation()!;
          if (bridgePos.equals(pos)) {
            // bridge on the just-placed tile → just extend the tile definition
            placedTileDef = placedTileDef.addBridge(bridgeLoc.rotateCCW(rot));
          } else {
            state = new PlaceBridge(mandatoryBridge, true).apply(state);
          }
        }

        state = new PlaceTile(placedTileDef, pos, rot).apply(state);

        if (mandatoryBridge !== null) {
          state = state.appendEvent(
            new TokenPlacedEvent(
              PlayEventMeta.createWithPlayer(player),
              BridgeCapability.BridgeToken.BRIDGE,
              mandatoryBridge,
            ),
          );
        }
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

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTileMessageClass, this.handlePlaceTile);
    m.set(PlacePreDrawnMessage, this.handlePlacePreDrawn);
    return m;
  }
}
