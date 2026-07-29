import { simpleName } from "../../../../lang/Class.js";
import { List } from "../../../../io/vavr/SeqTypes.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import { Position } from "../../board/Position.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { MeeplePointer } from "../../board/pointer/MeeplePointer.js";
import { ExprItem } from "../../event/ExprItem.js";
import { PointsExpression } from "../../event/PointsExpression.js";
import { ReceivedPoints, type ScoredMeeple } from "../../event/ScoreEvent.js";
import type { Follower } from "../../figure/Follower.js";
import { AddPoints } from "../../reducers/AddPoints.js";
import { FairyCapability } from "../capability/FairyCapability.js";
import type { GameState } from "../state/GameState.js";
import { Phase } from "./Phase.js";
import type { StepResult } from "./StepResult.js";

/** Awards the fairy's +1 at the start of its owner's turn. */
export class FairyPhase extends Phase {
  static readonly simpleName = "FairyPhase";

  enter(state: GameState): StepResult {
    const ptr = state.getNeutralFigures().getFairyDeployment();
    if (ptr === null) return this.next(state);

    const onTileRule = ptr instanceof Position;
    const fairyFp = ptr.asFeaturePointer();
    const feat = fairyFp.getFeature();
    const fairyOnAcrobats = !onTileRule && feat !== null && simpleName(feat) === "Acrobats";

    let points = 0;
    // the host meeple(s) the fairy sits next to — attached to the score event so the UI can show
    // exactly which meeple earned the fairy bonus (and pulse it/the fairy if later removed)
    const hosts: Array<Tuple2<Follower, FeaturePointer>> = [];
    for (const t of state.getDeployedMeeples()) {
      const m = t._1;
      if (!m.getPlayer().equals(state.getTurnPlayer())) continue;
      if (onTileRule) {
        if (!t._2.getPosition().equals(fairyFp.getPosition())) continue;
      } else {
        if (!t._2.equals(fairyFp)) continue;
        if (!(ptr as MeeplePointer).match(m) && !fairyOnAcrobats) continue;
      }
      points += 1;
      hosts.push(new Tuple2(m as unknown as Follower, t._2));
      if (!onTileRule && !fairyOnAcrobats) break; // only one can match
    }

    if (points > 0) {
      const expr = new PointsExpression(
        "fairy.turn",
        new ExprItem("fairy", points * FairyCapability.FAIRY_POINTS_BEGINNING_OF_TURN),
      );
      const meeples = List.ofAll(hosts) as List<ScoredMeeple>;
      state = new AddPoints(
        new ReceivedPoints(expr, state.getTurnPlayer()!, fairyFp, meeples),
        false,
      ).apply(state);
    }
    return this.next(state);
  }
}
