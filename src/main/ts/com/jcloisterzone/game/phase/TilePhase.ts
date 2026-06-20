import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { List, Vector } from "../../../../io/vavr/SeqTypes.js";
import type { PlacementOption } from "../../board/PlacementOption.js";
import type { Position } from "../../board/Position.js";
import type { Rotation } from "../../board/Rotation.js";
import type { Tile } from "../../board/Tile.js";
import { TilePlacementAction } from "../../action/TilePlacementAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import { TileDiscardedEvent } from "../../event/TileDiscardedEvent.js";
import { HillCapability } from "../capability/HillCapability.js";
import { BridgeCapability } from "../capability/BridgeCapability.js";
import { BazaarCapability } from "../capability/BazaarCapability.js";
import type { BazaarCapabilityModel } from "../capability/BazaarCapabilityModel.js";
import { BuilderCapability } from "../capability/BuilderCapability.js";
import { RussianPromosTrapCapability } from "../capability/RussianPromosTrapCapability.js";
import { Builder } from "../../figure/Builder.js";
import { Flag } from "../state/Flag.js";
import { PlaceBridge } from "../../reducers/PlaceBridge.js";
import { TokenPlacedEvent } from "../../event/TokenPlacedEvent.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import type { ClassToken } from "../../../../lang/Class.js";
import type { Capability } from "../Capability.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { PassMessage } from "../../io/message/PassMessage.js";
import { PlaceTileMessage } from "../../io/message/PlaceTileMessage.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { PlaceTile } from "../../reducers/PlaceTile.js";
import { ActionsState } from "../state/ActionsState.js";
import type { GameState } from "../state/GameState.js";
import { Phase, type PhaseHandler } from "./Phase.js";
import { StepResult } from "./StepResult.js";

const BRIDGE_CLS = BridgeCapability as unknown as ClassToken<Capability<Set<FeaturePointer>>>;
const BAZAAR_CAP_CLS = BazaarCapability as unknown as ClassToken<Capability<BazaarCapabilityModel>>;
const BUILDER_PHASE_CLS = BuilderCapability as unknown as ClassToken<BuilderCapability>;
const RUSSIAN_PROMOS_CLS = RussianPromosTrapCapability as unknown as ClassToken<RussianPromosTrapCapability>;

/** Draws and places a tile. */
export class TilePhase extends Phase {
  static readonly simpleName = "TilePhase";

  private endPhase: Phase | null = null;
  private cleanUpTurnPhase: Phase | null = null;

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
  }

  setEndPhase(endPhase: Phase | null): void {
    this.endPhase = endPhase;
  }
  setCleanUpTurnPhase(cleanUpTurnPhase: Phase | null): void {
    this.cleanUpTurnPhase = cleanUpTurnPhase;
  }

  drawTile(state: GameState): GameState {
    const t = state.getTilePack()!.drawTile(this.getRandom());
    return state.setTilePack(t._2).setDrawnTile(t._1);
  }

  enter(state: GameState): StepResult {
    for (;;) {
      // Bazaar-won tiles are placed from the player's supply in TileFromSupplyPhase, not drawn here.
      if (state.getDrawnTile() === null) {
        const tilePack = state.getTilePack()!;
        if (tilePack.isEmpty()) {
          return this.next(state, this.endPhase!);
        }
        state = this.drawTile(state);
      }

      const tile = state.getDrawnTile()!;
      const placements: Set<PlacementOption> = HashSet.ofAll(state.getTilePlacements(tile));

      if (placements.isEmpty()) {
        state = this.discardTile(state);
      } else {
        const action = new TilePlacementAction(tile, placements);
        const canPass = placements.find((p) => p.getMandatoryBridge() === null).isEmpty();
        state = state.setPlayerActions(
          new ActionsState(
            state.getTurnPlayer()!,
            Vector.of(action as unknown as PlayerAction<unknown>),
            canPass,
          ),
        );
        return this.promote(state);
      }
    }
  }

  override handlePass(state: GameState, msg: PassMessage): StepResult {
    const action = state.getAction() as unknown as TilePlacementAction;
    if (action.getOptions().find((p) => p.getMandatoryBridge() === null).isDefined()) {
      throw new Error("Pass is not allowed");
    }
    state = this.discardTile(state);
    state = state.setDrawnTile(null);
    return this.enter(state);
  }

  handlePlaceTile(state: GameState, msg: PlaceTileMessage): StepResult {
    const tile = state.getDrawnTile()!;
    const pos = msg.getPosition()!;
    const rot = msg.getRotation()!;

    const action = state.getPlayerActions()!.getActions().head() as unknown as TilePlacementAction;
    const placement = action
      .getOptions()
      .find((tp) => tp.getPosition().equals(pos) && tp.getRotation() === rot)
      .getOrElseThrow(() => new Error(`Invalid placement ${pos},${rot}`));

    const player = state.getActivePlayer()!;
    const mandatoryBridge = placement.getMandatoryBridge();
    let placedTileDef = tile;
    if (mandatoryBridge !== null) {
      state = state.mapPlayers((ps) =>
        ps.addTokenCount(player.getIndex(), BridgeCapability.BridgeToken.BRIDGE, -1),
      );
      state = state.mapCapabilityModel(BRIDGE_CLS, (model) => model.add(mandatoryBridge));
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

    if (tile.hasModifier(HillCapability.HILL)) {
      const tilePack = state.getTilePack()!;
      if (!tilePack.isEmpty()) {
        state = state.setTilePack(tilePack.increaseHiddenUnderHills());
      }
    }

    // builder: extending one of your own features that holds your builder grants a 2nd turn
    if (state.hasCapability(BUILDER_PHASE_CLS)) {
      for (const t of state.getDeployedMeeples()) {
        const m = t._1;
        const builderFp = t._2;
        if (!(m instanceof Builder) || !m.getPlayer().equals(player)) continue;
        if (builderFp.getPosition().equals(pos)) continue;
        if (state.getFeature(builderFp)?.getTilePositions().contains(pos)) {
          state = (state.getCapabilities().get(BUILDER_PHASE_CLS) as BuilderCapability).useBuilder(state);
          break;
        }
      }
    }

    const russianPromos = state.getCapabilities().get(RUSSIAN_PROMOS_CLS) as RussianPromosTrapCapability | null;
    if (russianPromos !== null) {
      state = russianPromos.trapFollowers(state);
    }

    state = this.clearActions(state);
    state = state.setDrawnTile(null);

    if (tile.hasModifier(BazaarCapability.BAZAAR)) {
      const model = state.getCapabilityModel<BazaarCapabilityModel>(BAZAAR_CAP_CLS as never);
      // do not trigger another auction while the current one is unresolved
      if (model !== null && model !== undefined && model.getSupply() === null) {
        state = state.addFlag(Flag.BAZAAR_AUCTION);
      }
    }

    return this.next(state);
  }

  private discardTile(state: GameState): GameState {
    const tile = state.getDrawnTile()!;
    return state
      .setDrawnTile(null)
      .setDiscardedTiles(state.getDiscardedTiles().append(tile) as List<Tile>)
      .appendEvent(new TileDiscardedEvent(tile));
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTileMessage, this.handlePlaceTile);
    return m;
  }
}
