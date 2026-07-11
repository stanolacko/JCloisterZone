import type { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { PlayEventMeta } from "../event/PlayEvent.js";
import { MeepleDeployed } from "../event/MeepleDeployed.js";
import { Follower } from "../figure/Follower.js";
import type { Meeple } from "../figure/Meeple.js";
import { KeepBuildingCapability } from "../game/capability/KeepBuildingCapability.js";
import { Flag } from "../game/state/Flag.js";
import type { GameState } from "../game/state/GameState.js";
import { AbstractUndeploy } from "./AbstractUndeploy.js";

/** Deploys a meeple onto a feature pointer. */
export class DeployMeeple extends AbstractUndeploy {
  constructor(
    private readonly meeple: Meeple,
    private readonly fp: FeaturePointer,
  ) {
    super();
  }

  apply(state: GameState): GameState {
    const feature = state.getStructure(this.fp);
    if (feature === null) {
      throw new Error("There is no feature on " + this.fp);
    }

    const check = this.meeple.isDeploymentAllowed(state, this.fp, feature);
    if (!check.result) {
      throw new Error(check.error ?? "Deployment not allowed");
    }

    // Keep Building (coop variant), condition (b): a follower (phantom/wagon included;
    // the barn is a Special, hence excluded) occupies a previously unoccupied feature.
    // Checked before the deploy is recorded, so `isOccupied` reflects the prior state.
    // Once earned, the flag is never revoked this turn (scoring return / dragon don't undo it).
    if (
      this.meeple instanceof Follower &&
      !state.hasFlag(Flag.COOP_CONDITION_MET) &&
      state.hasCapability(KeepBuildingCapability) &&
      !feature.isOccupied(state)
    ) {
      state = state.addFlag(Flag.COOP_CONDITION_MET);
    }

    const deployedMeeples = state.getDeployedMeeples();
    const movedFrom = deployedMeeples.get(this.meeple).getOrNull();
    state = state.setDeployedMeeples(deployedMeeples.put(this.meeple, this.fp) as typeof deployedMeeples);
    state = state.appendEvent(
      new MeepleDeployed(PlayEventMeta.createWithActivePlayer(state), this.meeple, this.fp, movedFrom),
    );

    if (movedFrom !== null && this.meeple instanceof Follower) {
      state = this.undeployLonelySpecials(state, this.meeple, movedFrom, true);
    }
    return state;
  }
}
