import type { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { MeeplePointer } from "../board/pointer/MeeplePointer.js";
import { PlayEventMeta } from "../event/PlayEvent.js";
import { Follower } from "../figure/Follower.js";
import type { Meeple } from "../figure/Meeple.js";
import { Shepherd } from "../figure/Shepherd.js";
import { SheepCapability } from "../game/capability/SheepCapability.js";
import type { SheepCapabilityModel } from "../game/capability/SheepCapabilityModel.js";
import type { ReturnMeepleSource } from "../game/ReturnMeepleSource.js";
import type { Capability } from "../game/Capability.js";
import type { ClassToken } from "../../../lang/Class.js";
import type { GameState } from "../game/state/GameState.js";
import { AbstractUndeploy } from "./AbstractUndeploy.js";

/** Undeploys a single meeple (returns it to supply), with lonely-special and
 *  shepherd/fairy cleanup. Port of reducers/UndeployMeeple. */
export class UndeployMeeple extends AbstractUndeploy {
  constructor(
    private readonly meeple: Meeple,
    private readonly forced: boolean,
    private readonly returnMeepleSource: ReturnMeepleSource | null = null,
  ) {
    super();
  }

  apply(state: GameState): GameState {
    const source = this.meeple.getDeployment(state)!;
    const metaWithPlayer = PlayEventMeta.createWithActivePlayer(state);
    // NB: dispatch through primaryUndeploy (overridden by CaptureMeeple to jail an
    // opponent's follower) rather than calling undeploy() directly.
    state = this.primaryUndeploy(state, metaWithPlayer, this.meeple, source, this.returnMeepleSource);

    if (this.meeple instanceof Follower) {
      state = this.undeployLonelySpecials(state, this.meeple, source, this.forced);
    }

    if (this.meeple instanceof Shepherd) {
      state = state.mapCapabilityModel<SheepCapabilityModel>(
        SheepCapability as unknown as ClassToken<Capability<SheepCapabilityModel>>,
        (model) => model.setPlacedTokens(model.getPlacedTokens().remove(source)),
      );
    }

    let nfState = state.getNeutralFigures();
    const fairyPtr = nfState.getFairyDeployment();
    if (fairyPtr instanceof MeeplePointer) {
      if (this.meeple.getId() === fairyPtr.getMeepleId()) {
        const mp = new MeeplePointer(fairyPtr.asFeaturePointer(), null);
        const deployed = nfState.getDeployedNeutralFigures();
        nfState = nfState.setDeployedNeutralFigures(
          deployed.put(nfState.getFairy()!, mp) as typeof deployed,
        );
        state = state.setNeutralFigures(nfState);
      }
    }
    // Black Fairy: unbind it from a returned meeple too (stays lonely on the feature).
    const blackFairyPtr = nfState.getBlackFairyDeployment();
    if (blackFairyPtr instanceof MeeplePointer) {
      if (this.meeple.getId() === blackFairyPtr.getMeepleId()) {
        const mp = new MeeplePointer(blackFairyPtr.asFeaturePointer(), null);
        const deployed = nfState.getDeployedNeutralFigures();
        nfState = nfState.setDeployedNeutralFigures(
          deployed.put(nfState.getBlackFairy()!, mp) as typeof deployed,
        );
        state = state.setNeutralFigures(nfState);
      }
    }
    return state;
  }

  isForced(): boolean {
    return this.forced;
  }

  protected primaryUndeploy(
    state: GameState,
    meta: PlayEventMeta,
    meeple: Meeple,
    source: FeaturePointer,
    returnMeepleSource: ReturnMeepleSource | null,
  ): GameState {
    return this.undeploy(state, meta, meeple, source, this.forced, returnMeepleSource);
  }
}
