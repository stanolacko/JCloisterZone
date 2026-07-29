import { HashSet, type Set } from "../../../../io/vavr/Set.js";
import { List } from "../../../../io/vavr/SeqTypes.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { Position } from "../../board/Position.js";
import type { BoardPointer } from "../../board/pointer/BoardPointer.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { MeeplePointer } from "../../board/pointer/MeeplePointer.js";
import { ExprItem } from "../../event/ExprItem.js";
import { PointsExpression } from "../../event/PointsExpression.js";
import { ReceivedPoints, type ScoredMeeple } from "../../event/ScoreEvent.js";
import { Monastery } from "../../feature/Monastery.js";
import type { Scoreable } from "../../feature/Scoreable.js";
import { Follower } from "../../figure/Follower.js";
import { Fairy } from "../../figure/neutral/Fairy.js";
import { FairyNextToAction } from "../../action/FairyNextToAction.js";
import { FairyOnTileAction } from "../../action/FairyOnTileAction.js";
import type { PlayerAction } from "../../action/PlayerAction.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { Capability } from "../Capability.js";
import { Rule } from "../Rule.js";
import type { GameState } from "../state/GameState.js";

/** The Fairy (Princess & Dragon) — sits next to a follower; +1 at the owner's turn
 *  start and +3 when that follower's feature scores. */
export class FairyCapability extends Capability<void> {
  static readonly FAIRY_POINTS_BEGINNING_OF_TURN = 1;
  static readonly FAIRY_POINTS_FINISHED_OBJECT = 3;

  override onStartGame(state: GameState, _random: RandomGenerator): GameState {
    return state.mapNeutralFigures((nf) => nf.setFairy(new Fairy("fairy.1")));
  }

  override onActionPhaseEntered(state: GameState): GameState {
    const fairyOnTile = state.getStringRule(Rule.FAIRY_PLACEMENT) === "on-tile";
    const activePlayer = state.getPlayerActions()!.getPlayer();
    const fairy = state.getNeutralFigures().getFairy()!;
    const fairyPtr = state.getNeutralFigures().getFairyDeployment();

    if (fairyOnTile) {
      const positions: Position[] = [];
      const seen = new globalThis.Set<string>();
      for (const t of state.getDeployedMeeples()) {
        if (!(t._1 instanceof Follower) || !t._1.getPlayer().equals(activePlayer)) continue;
        const p = t._2.getPosition();
        if (fairyPtr !== null && p.equals(fairyPtr.getPosition())) continue;
        const key = `${p.x},${p.y}`;
        if (!seen.has(key)) {
          seen.add(key);
          positions.push(p);
        }
      }
      if (positions.length === 0) return state;
      const options: Set<Position> = HashSet.ofAll(positions);
      return state.appendAction(
        new FairyOnTileAction(fairy.getId(), options) as unknown as PlayerAction<unknown>,
      );
    }

    const ptrs: MeeplePointer[] = [];
    for (const t of state.getDeployedMeeples()) {
      if (!(t._1 instanceof Follower) || !t._1.getPlayer().equals(activePlayer)) continue;
      const mp = new MeeplePointer(t._2, t._1.getId());
      if (fairyPtr !== null && mp.getMeepleId() === (fairyPtr as MeeplePointer).getMeepleId()) continue;
      ptrs.push(mp);
    }
    if (ptrs.length === 0) return state;
    const options: Set<MeeplePointer> = HashSet.ofAll(ptrs);
    return state.appendAction(
      new FairyNextToAction(fairy.getId(), options) as unknown as PlayerAction<unknown>,
    );
  }

  override appendFiguresBonusPoints(
    state: GameState,
    bonusPoints: List<ReceivedPoints>,
    feature: Scoreable,
    _isFinal: boolean,
  ): List<ReceivedPoints> {
    const ptr = state.getNeutralFigures().getFairyDeployment();
    if (ptr === null) return bonusPoints;

    const onTileRule = !(ptr instanceof MeeplePointer);
    let followers: Iterable<Tuple2<Follower, FeaturePointer>>;
    if (feature instanceof Monastery && feature.isSpecialMonastery(state)) {
      followers = feature.getMonasteryFollowers2(state);
    } else {
      followers = feature.getFollowers2(state);
    }

    for (const t of followers) {
      const m = t._1;
      if (onTileRule && !ptr.getPosition().equals(t._2.getPosition())) continue;
      if (!onTileRule && !(ptr as MeeplePointer).match(m)) continue;

      const expr = new PointsExpression(
        "fairy.completed",
        new ExprItem("fairy", FairyCapability.FAIRY_POINTS_FINISHED_OBJECT),
      );
      // attach the host meeple so the UI can show which meeple earned the bonus
      const meeples = List.of(new Tuple2(m, t._2)) as List<ScoredMeeple>;
      return bonusPoints.append(
        new ReceivedPoints(expr, m.getPlayer(), t._2, meeples),
      ) as List<ReceivedPoints>;
    }
    return bonusPoints;
  }
}

Capability.register(FairyCapability);
