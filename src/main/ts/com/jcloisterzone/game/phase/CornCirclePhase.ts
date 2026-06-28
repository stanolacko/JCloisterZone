import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { Vector } from "../../../../io/vavr/SeqTypes.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { ClassToken } from "../../../../lang/Class.js";
import type { Player } from "../../Player.js";
import { ConfirmAction } from "../../action/ConfirmAction.js";
import { CornCircleSelectDeployOrRemoveAction } from "../../action/CornCircleSelectDeployOrRemoveAction.js";
import { MeepleAction } from "../../action/MeepleAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import { ReturnMeepleAction } from "../../action/ReturnMeepleAction.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { MeeplePointer } from "../../board/pointer/MeeplePointer.js";
import { City } from "../../feature/City.js";
import type { Feature } from "../../feature/Feature.js";
import { Field } from "../../feature/Field.js";
import { BigFollower } from "../../figure/BigFollower.js";
import { Follower } from "../../figure/Follower.js";
import { Mayor } from "../../figure/Mayor.js";
import type { Meeple } from "../../figure/Meeple.js";
import { Phantom } from "../../figure/Phantom.js";
import { Ringmaster } from "../../figure/Ringmaster.js";
import { SmallFollower } from "../../figure/SmallFollower.js";
import { Wagon } from "../../figure/Wagon.js";
import { CommitMessage } from "../../io/message/CommitMessage.js";
import { CornCircleRemoveOrDeployMessage } from "../../io/message/CornCircleRemoveOrDeployMessage.js";
import { DeployMeepleMessage } from "../../io/message/DeployMeepleMessage.js";
import type { PassMessage } from "../../io/message/PassMessage.js";
import { ReturnMeepleMessage } from "../../io/message/ReturnMeepleMessage.js";
import { ReturnMeepleSource } from "../ReturnMeepleSource.js";
import type { Capability } from "../Capability.js";
import { CornCircleCapability, CornCircleModifier } from "../capability/CornCircleCapability.js";
import { DeployMeeple } from "../../reducers/DeployMeeple.js";
import { UndeployMeeple } from "../../reducers/UndeployMeeple.js";
import { ActionsState } from "../state/ActionsState.js";
import type { GameState } from "../state/GameState.js";
import { Phase, type PhaseHandler } from "./Phase.js";
import type { StepResult } from "./StepResult.js";

type Opt = CornCircleRemoveOrDeployMessage.CornCircleOption;
const CC_CLS = CornCircleCapability as unknown as ClassToken<Capability<Opt>>;

/** Crop Circles — after a corn-circle tile is placed, each player (from the turn
 *  player) deploys or removes a follower of the circle's feature type. */
export class CornCirclePhase extends Phase {
  static readonly simpleName = "CornCirclePhase";

  private getCornType(state: GameState): ClassToken<Feature> | null {
    const m = state
      .getLastPlaced()!
      .getTile()
      .getTileModifiers()
      .find((mod) => mod instanceof CornCircleModifier)
      .getOrNull();
    return m === null ? null : (m as CornCircleModifier).getFeatureType();
  }

  enter(state: GameState): StepResult {
    const cornType = this.getCornType(state);
    if (cornType === null || state.getDeployedMeeples().isEmpty()) {
      return this.next(state);
    }
    const action = new CornCircleSelectDeployOrRemoveAction(cornType);
    return this.promote(
      state.setPlayerActions(new ActionsState(state.getTurnPlayer()!, action as unknown as PlayerAction<unknown>, false)),
    );
  }

  handleCornCircleRemoveOrDeploy(state: GameState, msg: CornCircleRemoveOrDeployMessage): StepResult {
    state = state.setCapabilityModel<Opt>(CC_CLS, msg.getValue());
    return this.createAction(state, state.getTurnPlayer()!.getNextPlayer(state));
  }

  private isLast(state: GameState, player: Player): boolean {
    return state.getTurnPlayer()!.equals(player);
  }

  private nextCornPlayer(state: GameState, player: Player): StepResult {
    if (this.isLast(state, player)) {
      return this.next(this.clearActions(state));
    }
    return this.createAction(state, player.getNextPlayer(state));
  }

  private createAction(state: GameState, player: Player): StepResult {
    const option = state.getCapabilityModel<Opt>(CC_CLS);
    const cornType = this.getCornType(state)!;

    const followers: Array<[Meeple, FeaturePointer]> = [];
    for (const t of state.getDeployedMeeples()) {
      if (!(t._1 instanceof Follower)) continue;
      if (!t._1.getPlayer().equals(player)) continue;
      const f = state.getFeature(t._2);
      if (f !== null && f instanceof (cornType as unknown as new () => Feature)) followers.push([t._1, t._2]);
    }
    if (followers.length === 0) return this.nextCornPlayer(state, player);

    let actions: Vector<PlayerAction<unknown>>;
    if (option === "DEPLOY") {
      let meepleTypes: Vector<ClassToken<Meeple>> = Vector.ofAll([
        SmallFollower,
        BigFollower,
        Phantom,
        Ringmaster,
      ] as unknown as ClassToken<Meeple>[]);
      if (cornType !== (Field as unknown as ClassToken<Feature>)) {
        meepleTypes = meepleTypes.append(Wagon as unknown as ClassToken<Meeple>) as Vector<ClassToken<Meeple>>;
      }
      if (cornType === (City as unknown as ClassToken<Feature>)) {
        meepleTypes = meepleTypes.append(Mayor as unknown as ClassToken<Meeple>) as Vector<ClassToken<Meeple>>;
      }
      const availMeeples = player.getMeeplesFromSupply(state, meepleTypes);
      if (availMeeples.isEmpty()) return this.nextCornPlayer(state, player);
      const deployOptions: Set<FeaturePointer> = HashSet.ofAll(followers.map(([, fp]) => fp));
      actions = availMeeples.map(
        (meeple) => new MeepleAction(meeple, deployOptions) as unknown as PlayerAction<unknown>,
      ) as Vector<PlayerAction<unknown>>;
    } else {
      const opts: MeeplePointer[] = followers.map(([m, fp]) => new MeeplePointer(new Tuple2(m, fp)));
      actions = Vector.of(
        new ReturnMeepleAction(HashSet.ofAll(opts), ReturnMeepleSource.CORN_CIRCLE) as unknown as PlayerAction<unknown>,
      );
    }

    return this.promote(state.setPlayerActions(new ActionsState(player, actions, option === "DEPLOY")));
  }

  handleDeployMeeple(state: GameState, msg: DeployMeepleMessage): StepResult {
    const player = state.getActivePlayer()!;
    const m = player.getMeepleFromSupply(state, msg.getMeepleId()!)!;
    state = new DeployMeeple(m, msg.getPointer()!).apply(state);
    return this.promote(
      state.setPlayerActions(new ActionsState(player, new ConfirmAction() as unknown as PlayerAction<unknown>, false)),
    );
  }

  handleReturnMeeple(state: GameState, msg: ReturnMeepleMessage): StepResult {
    const option = state.getCapabilityModel<Opt>(CC_CLS);
    if (option !== "REMOVE") throw new Error("IllegalState: Crop Circle option is not REMOVE");
    if (msg.getReturnMeepleSource() !== ReturnMeepleSource.CORN_CIRCLE) {
      throw new Error("IllegalState: unexpected return meeple source");
    }
    const ptr = msg.getPointer()!;
    const player = state.getActivePlayer()!;
    const meeple = state
      .getDeployedMeeples()
      .find((m) => ptr.match(m._1))
      .map((t) => t._1)
      .getOrNull();
    if (meeple === null) throw new Error("Pointer doesn't match any meeple");
    state = new UndeployMeeple(meeple, true, ReturnMeepleSource.CORN_CIRCLE).apply(state);
    return this.promote(
      state.setPlayerActions(new ActionsState(player, new ConfirmAction() as unknown as PlayerAction<unknown>, false)),
    );
  }

  handleCommit(state: GameState, _msg: CommitMessage): StepResult {
    return this.nextCornPlayer(state, state.getActivePlayer()!);
  }

  override handlePass(state: GameState, _msg: PassMessage): StepResult {
    return this.nextCornPlayer(state, state.getActivePlayer()!);
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(CornCircleRemoveOrDeployMessage, this.handleCornCircleRemoveOrDeploy);
    m.set(DeployMeepleMessage, this.handleDeployMeeple);
    m.set(ReturnMeepleMessage, this.handleReturnMeeple);
    m.set(CommitMessage, this.handleCommit);
    return m;
  }
}
