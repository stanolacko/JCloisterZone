import { Vector } from "../../../../io/vavr/SeqTypes.js";
import type { ClassToken } from "../../../../lang/Class.js";
import { MeepleAction } from "../../action/MeepleAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import type { Meeple } from "../../figure/Meeple.js";
import { Phantom } from "../../figure/Phantom.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import type { PlaceTokenMessage } from "../../io/message/PlaceTokenMessage.js";
import { PlaceTokenMessage as PlaceTokenMessageClass } from "../../io/message/PlaceTokenMessage.js";
import { PlaceTunnel } from "../../reducers/PlaceTunnel.js";
import type { Capability } from "../Capability.js";
import { TowerCapability } from "../capability/TowerCapability.js";
import { TunnelCapability } from "../capability/TunnelCapability.js";
import { ActionsState } from "../state/ActionsState.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import { AbstractActionPhase } from "./AbstractActionPhase.js";
import type { Phase } from "./Phase.js";
import type { PhaseHandler } from "./Phase.js";
import type { StepResult } from "./StepResult.js";

const TOWER_CLS = TowerCapability as unknown as ClassToken<Capability<unknown>>;
const TUNNEL_CLS = TunnelCapability as unknown as ClassToken<Capability<unknown>>;
const PHANTOM = Phantom as unknown as ClassToken<Meeple>;

/** After the main action, the active player may deploy a second follower (the
 *  phantom). Reuses the standard meeple-deployment machinery; can also go on towers. */
export class PhantomPhase extends AbstractActionPhase {
  static readonly simpleName = "PhantomPhase";

  constructor(random: RandomGenerator, defaultNext: Phase | null) {
    super(random, defaultNext);
  }

  enter(state: GameState): StepResult {
    if (
      state.getFlags().contains(Flag.PHANTOM_PHASE_DONE) ||
      state.getFlags().contains(Flag.POST_WOOD_ACTION_STARTED)
    ) {
      // Phantom phase already done — this is the rewinded phase after a Tower "random pay"; skip.
      return this.next(state);
    }
    if (state.getFlags().contains(Flag.NO_PHANTOM)) {
      // a princess knight-removal (or similar) forbids a follow-up phantom deploy
      return this.next(state);
    }

    const player = state.getTurnPlayer()!;
    const actions = this.prepareMeepleActions(state, Vector.of(PHANTOM));
    state = state.setPlayerActions(new ActionsState(player, actions, true));

    // the phantom may also be placed on top of a tower: reuse the Tower capability's
    // action computation, then keep only the Phantom MeepleAction(s)
    const towerCap = state.getCapabilities().get(TOWER_CLS);
    if (towerCap !== null) {
      state = towerCap.onActionPhaseEntered(state);
      state = state.mapPlayerActions((as) =>
        as.setActions(
          as
            .getActions()
            .filter((a) => a instanceof MeepleAction && (a as MeepleAction).getMeepleType() === PHANTOM) as Vector<
            PlayerAction<unknown>
          >,
        ),
      );
    }
    // the phantom may also place a tunnel token
    const tunnelCap = state.getCapabilities().get(TUNNEL_CLS);
    if (tunnelCap !== null) {
      state = tunnelCap.onActionPhaseEntered(state);
    }

    if (state.getPlayerActions()!.getActions().isEmpty()) {
      return this.next(state);
    }
    return this.promote(state);
  }

  handlePlaceToken(state: GameState, msg: PlaceTokenMessage): StepResult {
    const player = state.getActivePlayer()!;
    const token = msg.getToken();
    state = state.mapPlayers((ps) => ps.addTokenCount(player.getIndex(), token!, -1));
    if (!(token instanceof TunnelCapability.Tunnel)) {
      throw new Error("Only tunnel token placement is allowed");
    }
    state = new PlaceTunnel(token, msg.getPointer() as FeaturePointer).apply(state);
    state = this.clearActions(state);
    return this.enter(state);
  }

  protected override messageHandlers(): Map<Function, PhaseHandler> {
    const m = super.messageHandlers();
    m.set(PlaceTokenMessageClass, this.handlePlaceToken);
    return m;
  }
}
