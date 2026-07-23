import { Vector } from "../../../../io/vavr/SeqTypes.js";
import type { Set } from "../../../../io/vavr/Set.js";
import type { ClassToken } from "../../../../lang/Class.js";
import { Flag } from "../state/Flag.js";
import type { PointsExpression } from "../../event/PointsExpression.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import { Abbot } from "../../figure/Abbot.js";
import { BigFollower } from "../../figure/BigFollower.js";
import { Builder } from "../../figure/Builder.js";
import { Mayor } from "../../figure/Mayor.js";
import type { Meeple } from "../../figure/Meeple.js";
import { Phantom } from "../../figure/Phantom.js";
import { Pig } from "../../figure/Pig.js";
import { Ringmaster } from "../../figure/Ringmaster.js";
import { Shepherd } from "../../figure/Shepherd.js";
import { SmallFollower } from "../../figure/SmallFollower.js";
import { Wagon } from "../../figure/Wagon.js";
import type { Position } from "../../board/Position.js";
import type { BoardPointer } from "../../board/pointer/BoardPointer.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { Tower } from "../../feature/Tower.js";
import { TokenPlacedEvent } from "../../event/TokenPlacedEvent.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import { TowerCapability } from "../capability/TowerCapability.js";
import { TowerCapturePhase } from "./TowerCapturePhase.js";
import { Donkey } from "../../figure/neutral/Donkey.js";
import { Fairy } from "../../figure/neutral/Fairy.js";
import { BlackFairy } from "../../figure/neutral/BlackFairy.js";
import type { NeutralFigure } from "../../figure/neutral/NeutralFigure.js";
import { BridgeCapability } from "../capability/BridgeCapability.js";
import { TunnelCapability } from "../capability/TunnelCapability.js";
import { LittleBuildingsCapability } from "../capability/LittleBuildingsCapability.js";
import type { Token } from "../Token.js";
import { PlaceTokenMessage } from "../../io/message/PlaceTokenMessage.js";
import { MoveNeutralFigureMessage } from "../../io/message/MoveNeutralFigureMessage.js";
import { ScoreAcrobatsMessage } from "../../io/message/ScoreAcrobatsMessage.js";
import { ScoreAcrobatsAction } from "../../action/ScoreAcrobatsAction.js";
import { ReturnMeepleMessage } from "../../io/message/ReturnMeepleMessage.js";
import { ReturnMeepleAction } from "../../action/ReturnMeepleAction.js";
import { MeepleAction } from "../../action/MeepleAction.js";
import { PassMessage } from "../../io/message/PassMessage.js";
import { ReturnMeepleSource } from "../ReturnMeepleSource.js";
import { Acrobats } from "../../feature/Acrobats.js";
import { AcrobatsCapability } from "../capability/AcrobatsCapability.js";
import { PrincessCapability } from "../capability/PrincessCapability.js";
import { RobbersSonCapability } from "../capability/RobbersSonCapability.js";
import { FestivalCapability } from "../capability/FestivalCapability.js";
import { UndeployMeeple } from "../../reducers/UndeployMeeple.js";
import { AddPoints } from "../../reducers/AddPoints.js";
import { ReceivedPoints } from "../../event/ScoreEvent.js";
import type { MeeplePointer } from "../../board/pointer/MeeplePointer.js";
import { Rule } from "../Rule.js";
import { PlaceBridge } from "../../reducers/PlaceBridge.js";
import { PlaceTunnel } from "../../reducers/PlaceTunnel.js";
import { PlaceLittleBuilding } from "../../reducers/PlaceLittleBuilding.js";
import { MoveNeutralFigure } from "../../reducers/MoveNeutralFigure.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { ActionsState } from "../state/ActionsState.js";
import type { GameState } from "../state/GameState.js";
import { AbstractActionPhase } from "./AbstractActionPhase.js";
import { type PhaseHandler } from "./Phase.js";
import type { Phase } from "./Phase.js";
import type { StepResult } from "./StepResult.js";

/** The main action phase: deploy a meeple or pass. */
const ACROBATS_CLS = AcrobatsCapability as unknown as ClassToken<AcrobatsCapability>;

export class ActionPhase extends AbstractActionPhase {
  static readonly simpleName = "ActionPhase";

  private readonly towerCapturePhase: TowerCapturePhase;

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
    this.towerCapturePhase = new TowerCapturePhase(random, defaultNext);
  }

  enter(state: GameState): StepResult {
    if (
      state.getFlags().contains(Flag.ACTION_PHASE_DONE) ||
      state.getFlags().contains(Flag.POST_WOOD_ACTION_STARTED)
    ) {
      // Action phase already done, or a phase after it has already started — this is the
      // rewinded phase after a Tower "random pay"; skip.
      return this.next(state);
    }

    const player = state.getTurnPlayer()!;

    const meepleTypes: Vector<ClassToken<Meeple>> = Vector.ofAll(
      [SmallFollower, BigFollower, Phantom, Abbot, Wagon, Mayor, Builder, Pig, Shepherd, Ringmaster] as unknown as ClassToken<Meeple>[],
    );

    const actions = this.prepareMeepleActions(state, meepleTypes);

    // NB: Java's ActionPhase sets canPass=false when a gamblers-luck shield was placed this
    // turn, but the reference jar's goldens show canPass=true there — so pass stays allowed
    // (matching the authoritative jar, not the source line).
    state = state.setPlayerActions(new ActionsState(player, actions, true));

    for (const cap of state.getCapabilities().toSeq()) {
      state = cap.onActionPhaseEntered(state);
    }

    // Princess: when the rule is "must", the princess return is the only available action.
    if (
      state.getCapabilities().contains(PrincessCapability as never) &&
      state.getStringRule(Rule.PRINCESS_ACTION) === "must"
    ) {
      const princessAction = state
        .getPlayerActions()!
        .getActions()
        .find(
          (a) =>
            a instanceof ReturnMeepleAction &&
            (a as ReturnMeepleAction).getReturnMeepleSource() === ReturnMeepleSource.PRINCESS,
        )
        .getOrNull();
      if (princessAction !== null) {
        state = state.setPlayerActions(new ActionsState(player, Vector.of(princessAction), false));
      }
    }
    // Robber's Son: same mandatory-action handling as Princess, but on roads.
    if (
      state.getCapabilities().contains(RobbersSonCapability as never) &&
      state.getStringRule(Rule.ROBBERS_SON_ACTION) === "must"
    ) {
      const robbersSonAction = state
        .getPlayerActions()!
        .getActions()
        .find(
          (a) =>
            a instanceof ReturnMeepleAction &&
            (a as ReturnMeepleAction).getReturnMeepleSource() === ReturnMeepleSource.ROBBERS_SON,
        )
        .getOrNull();
      if (robbersSonAction !== null) {
        state = state.setPlayerActions(new ActionsState(player, Vector.of(robbersSonAction), false));
      }
    }
    state = state.setPlayerActions(state.getPlayerActions()!.reorderActions());

    if (state.getPlayerActions()!.getActions().isEmpty()) {
      state = this.clearActions(state);
      return this.next(state);
    }
    return this.promote(state);
  }

  handlePlaceToken(state: GameState, msg: PlaceTokenMessage): StepResult {
    const player = state.getActivePlayer()!;
    const token = msg.getToken()!;
    state = state.mapPlayers((ps) => ps.addTokenCount(player.getIndex(), token as Token, -1));

    if (token instanceof LittleBuildingsCapability.LittleBuilding) {
      state = new PlaceLittleBuilding(token, msg.getPointer() as Position).apply(state);
      state = this.clearActions(state);
      return this.next(state);
    }
    if (token instanceof TowerCapability.TowerToken) {
      return this.handlePlaceTower(state, msg, token);
    }
    if (token instanceof BridgeCapability.BridgeToken) {
      state = new PlaceBridge(msg.getPointer() as FeaturePointer).apply(state);
      state = this.clearActions(state);
      return this.enter(state);
    }
    if (token instanceof TunnelCapability.Tunnel) {
      state = new PlaceTunnel(token, msg.getPointer() as FeaturePointer).apply(state);
      state = this.clearActions(state);
      return this.enter(state);
    }
    throw new Error("token placement is not allowed: " + token.name());
  }

  private handlePlaceTower(
    state: GameState,
    msg: PlaceTokenMessage,
    token: TowerCapability.TowerToken,
  ): StepResult {
    const ptr = msg.getPointer() as FeaturePointer;
    let tower = state.getFeature(ptr) as Tower;
    tower = tower.addPiece(token);
    state = state.putFeature(ptr, tower);
    state = state.appendEvent(new TokenPlacedEvent(PlayEventMeta.createWithActivePlayer(state), token, ptr));
    state = this.clearActions(state);
    if (token === TowerCapability.TowerToken.WHITE_TOWER_PIECE) {
      return this.next(state);
    }
    return this.next(state, this.towerCapturePhase);
  }

  handleMoveNeutralFigure(state: GameState, msg: MoveNeutralFigureMessage): StepResult {
    const ptr = msg.getTo();
    const fig = state.getNeutralFigures().getById(msg.getFigureId()!);
    if (fig instanceof Fairy || fig instanceof BlackFairy) {
      state = new MoveNeutralFigure(
        fig as unknown as NeutralFigure<BoardPointer>,
        ptr,
        state.getActivePlayer(),
      ).apply(state);
      state = this.clearActions(state);
      return this.next(state);
    }
    if (fig instanceof Donkey) {
      state = new MoveNeutralFigure(
        fig as unknown as NeutralFigure<BoardPointer>,
        ptr,
        state.getActivePlayer(),
      ).apply(state);
      state = this.clearActions(state);
      return this.next(state);
    }
    // TODO(neutral): other neutral figures.
    throw new Error("Illegal neutral figure move");
  }

  handleReturnMeeple(state: GameState, msg: ReturnMeepleMessage): StepResult {
    const ptr = msg.getPointer()!;
    const meeple = state
      .getDeployedMeeples()
      .find((m) => ptr.match(m._1))
      .map((t) => t._1)
      .getOrNull();
    if (meeple === null) throw new Error("Pointer doesn't match any meeple");
    const source = msg.getReturnMeepleSource()!;
    const actionsPlayer = state.getPlayerActions()!.getPlayer();

    let assignAbbotScore: { getStructurePoints(s: GameState, completed: boolean): PointsExpression } | null = null;

    switch (source) {
      case ReturnMeepleSource.PRINCESS:
      case ReturnMeepleSource.ROBBERS_SON: {
        const action = state
          .getPlayerActions()!
          .getActions()
          .find(
            (a) =>
              a instanceof ReturnMeepleAction &&
              (a as ReturnMeepleAction).getReturnMeepleSource() === source,
          )
          .getOrNull() as ReturnMeepleAction | null;
        if (action === null) throw new Error("Return meeple is not allowed");
        if ((action.getOptions() as Set<MeeplePointer>).contains(ptr)) {
          state = state.addFlag(Flag.NO_PHANTOM);
        } else {
          throw new Error("Pointer doesn't match return action");
        }
        break;
      }
      case ReturnMeepleSource.FESTIVAL: {
        if (!state.getLastPlaced()!.getTile().hasModifier(FestivalCapability.FESTIVAL)) {
          throw new Error("Festival return is not allowed");
        }
        break;
      }
      case ReturnMeepleSource.ABBOT_RETURN: {
        if (!meeple.getPlayer().equals(actionsPlayer) || !(meeple instanceof Abbot)) {
          throw new Error("Not abbot owner");
        }
        assignAbbotScore = state.getFeature(ptr.asFeaturePointer()) as unknown as {
          getStructurePoints(s: GameState, completed: boolean): PointsExpression;
        };
        break;
      }
      case ReturnMeepleSource.TRAP: {
        if (!meeple.getPlayer().equals(actionsPlayer)) {
          throw new Error("Not owner");
        }
        break;
      }
      default:
        throw new Error("Return meeple is not allowed");
    }

    state = new UndeployMeeple(meeple, true, source).apply(state);
    state = this.clearActions(state);

    if (assignAbbotScore !== null) {
      const points = assignAbbotScore.getStructurePoints(state, false);
      const rp = new ReceivedPoints(points, meeple.getPlayer(), ptr.asFeaturePointer());
      state = new AddPoints(rp, false).apply(state);
    }
    return this.next(state);
  }

  handleScoreAcrobats(state: GameState, msg: ScoreAcrobatsMessage): StepResult {
    const fp = msg.getPointer()!;
    const valid = state
      .getPlayerActions()!
      .getActions()
      .find((a) => a instanceof ScoreAcrobatsAction && (a as ScoreAcrobatsAction).getOptions().contains(fp))
      .getOrNull();
    if (valid === null) throw new Error("Invalid SCORE_ACROBATS");
    const acrobatsCap = state.getCapabilities().get(ACROBATS_CLS) as AcrobatsCapability;
    state = acrobatsCap.scoreAcrobats(state, state.getFeature(fp) as Acrobats, true);
    state = this.clearActions(state);
    return this.next(state);
  }

  /** Passing the main action also declines a phantom that was on offer: record it via
   *  NO_PHANTOM so PhantomPhase doesn't re-offer it. Only set the flag when a Phantom deploy
   *  was actually among the offered actions — otherwise the phantom must not be blocked.
   *  (NO_PHANTOM is otherwise reserved for Princess / Robber's Son returns.) */
  override handlePass(state: GameState, msg: PassMessage): StepResult {
    if (!state.getPlayerActions()!.isPassAllowed()) {
      throw new Error("Pass is not allowed");
    }
    const phantomOffered = state
      .getPlayerActions()!
      .getActions()
      .find(
        (a) =>
          a instanceof MeepleAction &&
          (a as MeepleAction).getMeepleType() === (Phantom as unknown as ClassToken<Meeple>),
      )
      .isDefined();
    state = this.clearActions(state);
    if (phantomOffered) {
      state = state.addFlag(Flag.NO_PHANTOM);
    }
    return this.next(state);
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTokenMessage, this.handlePlaceToken);
    m.set(MoveNeutralFigureMessage, this.handleMoveNeutralFigure);
    m.set(ScoreAcrobatsMessage, this.handleScoreAcrobats);
    m.set(ReturnMeepleMessage, this.handleReturnMeeple);
    return m;
  }
}
