import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { CommitMessage } from "../../io/message/CommitMessage.js";
import type { Message } from "../../io/message/Message.js";
import { PassMessage } from "../../io/message/PassMessage.js";
import { PayRansomMessage } from "../../io/message/PayRansomMessage.js";
import { PayRansom } from "../../reducers/PayRansom.js";
import { MessageNotHandledException } from "../MessageNotHandledException.js";
import { Flag } from "../state/Flag.js";
import type { GameState } from "../state/GameState.js";
import type { RewindActionContainer } from "./RewindActionContainer.js";
import { StepResult } from "./StepResult.js";

/** A phase message handler: (state, message) -> StepResult. Bound via call(this,...). */
export type PhaseHandler = (state: GameState, message: any) => StepResult;

/**
 * Base for game phases. Phases form a linked chain (defaultNext).
 *
 * Java dispatched messages to {@code @PhaseMessageHandler} methods via
 * reflection; here each phase declares an explicit handler registry in
 * {@link messageHandlers} (keyed by message constructor, exact-match). The
 * cross-phase {@code instanceof} check in handlePass is replaced by the
 * overridable {@link addNoPhantomFlagOnPass}.
 */
export abstract class Phase {
  private readonly random: RandomGenerator;
  private defaultNext: Phase | null;
  private readonly rewindActionContainer: RewindActionContainer | null;

  constructor(
    random: RandomGenerator,
    defaultNext: Phase | null,
    rewindActionContainer: RewindActionContainer | null = null,
  ) {
    this.random = random;
    this.defaultNext = defaultNext;
    this.rewindActionContainer = rewindActionContainer;
  }

  getDefaultNext(): Phase | null {
    return this.defaultNext;
  }

  setDefaultNext(defaultNext: Phase | null): void {
    this.defaultNext = defaultNext;
  }

  next(state: GameState, phase?: Phase): StepResult {
    return new StepResult(state, phase !== undefined ? phase : this.defaultNext);
  }

  abstract enter(state: GameState): StepResult;

  protected promote(state: GameState): StepResult {
    return new StepResult(state.setPhase(this), null);
  }

  protected clearActions(state: GameState): GameState {
    return state.setPlayerActions(null);
  }

  getRandom(): RandomGenerator {
    return this.random;
  }

  toString(): string {
    return (this.constructor as { simpleName?: string }).simpleName ?? this.constructor.name;
  }

  // --- message dispatch (replaces reflection over @PhaseMessageHandler) ---

  /** Message-class -> handler. Subclasses extend super.messageHandlers(). */
  protected messageHandlers(): Map<Function, PhaseHandler> {
    return new Map<Function, PhaseHandler>([
      [PassMessage, this.handlePass],
      [PayRansomMessage, this.handlePayRansom],
    ]);
  }

  /** PAY_RANSOM is allowed in any phase: free a captured follower. When a Tower "random
   *  pay" happens after the wood action but before it has been confirmed (and before a
   *  post-wood follow-up has begun), the turn rewinds back to the Action / Phantom phase
   *  so the freed follower can be (re)deployed; otherwise the current action is re-offered. */
  handlePayRansom(state: GameState, msg: PayRansomMessage): StepResult {
    state = new PayRansom(msg.getMeepleId()).apply(state);

    if (this.rewindActionContainer !== null) {
      let target: Phase | null = null;
      if (state.hasFlag(Flag.WOOD_ACTION_CONFIRMED)) {
        // No Rewind
      } else if (state.hasFlag(Flag.POST_WOOD_ACTION_STARTED)) {
        // No Rewind
      } else if (state.hasFlag(Flag.PHANTOM_PHASE_DONE)) {
        // No Rewind
      } else if (state.hasFlag(Flag.ACTION_PHASE_DONE)) {
        target = this.rewindActionContainer.getPhantomPhase();
      } else {
        target = this.rewindActionContainer.getActionPhase();
      }
      state = this.clearActions(state);
      if (target !== null) return this.next(state, target);
    }
    return this.promote(state);
  }

  /** Applies a message to this phase (exact message-class match). */
  dispatchMessage(state: GameState, message: Message): StepResult {
    const handler = this.messageHandlers().get((message as object).constructor as Function);
    if (!handler) {
      throw new MessageNotHandledException(
        `MessageCommand ${(message as object).constructor.name} hasn't been handled by ${this} phase.`,
      );
    }
    let res = handler.call(this, state, message);
    const commited = message instanceof CommitMessage;
    if (res.getState().isCommited() !== commited) {
      res = new StepResult(res.getState().setCommited(commited), res.getNext());
    }
    return res;
  }

  handlePass(state: GameState, msg: PassMessage): StepResult {
    if (!state.getPlayerActions()!.isPassAllowed()) {
      throw new Error("Pass is not allowed");
    }
    state = this.clearActions(state);
    if (this.addNoPhantomFlagOnPass(state)) {
      state = state.addFlag(Flag.NO_PHANTOM);
    }
    return this.next(state);
  }

  /** Whether a PASS sets the NO_PHANTOM flag. (Java checked the phase was not
   *  TowerCapturePhase/TileFromSupplyPhase; those override this to return false.) */
  protected addNoPhantomFlagOnPass(state: GameState): boolean {
    return true;
  }
}
