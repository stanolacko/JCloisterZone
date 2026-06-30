import { HashMap } from "../../../../io/vavr/Map.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { ExprItem } from "../../event/ExprItem.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import { PointsExpression } from "../../event/PointsExpression.js";
import { ReceivedPoints } from "../../event/ScoreEvent.js";
import { TokenReceivedEvent } from "../../event/TokenReceivedEvent.js";
import type { Completable } from "../../feature/Completable.js";
import { Road } from "../../feature/Road.js";
import type { Scoreable } from "../../feature/Scoreable.js";
import type { RandomGenerator } from "../../random/RandomGenerator.js";
import { AddPoints } from "../../reducers/AddPoints.js";
import { BiggestFeatureAward } from "../BiggestFeatureAward.js";
import { Capability } from "../Capability.js";
import { Rule } from "../Rule.js";
import type { ScoreFeatureReducer } from "../ScoreFeatureReducer.js";
import type { GameState } from "../state/GameState.js";
import { MemoizedValue } from "../state/MemoizedValue.js";

type Model = Tuple2<FeaturePointer | null, number>;

/** Robber Baron (King & Robber Baron) — token to the player who completes the longest road. */
export class RobberCapability extends Capability<Model> {
  override onStartGame(state: GameState, _random: RandomGenerator): GameState {
    return this.setModel(state, new Tuple2<FeaturePointer | null, number>(null, 0));
  }

  override onTurnScoring(state: GameState, completed: HashMap<Scoreable, ScoreFeatureReducer>): GameState {
    let maxRoadSize = this.getModel(state)._2;
    let completedRoadsThisTurn = 0;
    let longestRoadCompleted: Road | null = null;

    for (const feature of completed.keySet()) {
      if (feature instanceof Road) {
        completedRoadsThisTurn++;
        const roadSize = feature.getTilePositions().size();
        if (roadSize > maxRoadSize) {
          maxRoadSize = roadSize;
          longestRoadCompleted = feature;
        }
      }
    }

    if (state.getStringRule(Rule.KING_AND_ROBBER_SCORING) === "continuously" && completedRoadsThisTurn > 0) {
      const currentHolder = state.getPlayers().getPlayerWithToken(BiggestFeatureAward.ROBBER);
      if (currentHolder !== null) {
        const rp = new ReceivedPoints(
          new PointsExpression("robber", new ExprItem(completedRoadsThisTurn, "roads", completedRoadsThisTurn)),
          currentHolder,
          null,
        );
        state = new AddPoints(rp, false).apply(state);
      }
    }

    const turnPlayer = state.getTurnPlayer()!;
    let ps = state.getPlayers();
    if (longestRoadCompleted !== null) {
      state = this.setModel(
        state,
        new Tuple2<FeaturePointer | null, number>(
          state.getFeaturePointer(longestRoadCompleted),
          longestRoadCompleted.getTilePositions().size(),
        ),
      );
      for (const p of ps.getPlayers()) {
        ps = ps.setTokenCount(p.getIndex(), BiggestFeatureAward.ROBBER, p.equals(turnPlayer) ? 1 : 0);
      }
      const ev = new TokenReceivedEvent(
        PlayEventMeta.createWithActivePlayer(state),
        turnPlayer,
        BiggestFeatureAward.ROBBER,
        1,
      );
      ev.setSourceFeature(longestRoadCompleted);
      state = state.appendEvent(ev);
    }
    return state.setPlayers(ps);
  }

  override onFinalScoring(state: GameState): GameState {
    const ps = state.getPlayers();
    const rule = state.getStringRule(Rule.KING_AND_ROBBER_SCORING);
    if (rule === "continuously") return state;

    const player = ps.getPlayerWithToken(BiggestFeatureAward.ROBBER);
    if (player === null) return state;

    let itemName = "robber";
    let count: number | null = null;
    let points: number;
    if (rule === "10/20") {
      points = 10;
    } else if (rule === "15/40") {
      const hasAlsoKing = ps.getPlayerTokenCount(player.getIndex(), BiggestFeatureAward.KING) > 0;
      if (hasAlsoKing) {
        // awarded from KingCapability
        return state;
      }
      points = 15;
    } else {
      itemName = "roads";
      points = this.countCompletedRoads(state);
      count = points;
    }
    const rp = new ReceivedPoints(new PointsExpression("robber", new ExprItem(count, itemName, points)), player, null);
    return new AddPoints(rp, false, true).apply(state);
  }

  countCompletedRoads(state: GameState): number {
    return state.getFeatures(Road).filter((c) => c.isCompleted(state)).size();
  }

  private getMaxSize<T extends Completable>(state: GameState, cls: abstract new (...args: any[]) => T): number {
    let max = 0;
    for (const f of state.getFeatures(cls)) {
      if (!f.isCompleted(state)) continue;
      const size = f.getTilePositions().size();
      if (size > max) max = size;
    }
    return max;
  }

  private readonly _getLongestRoadSize = new MemoizedValue<number>((state) => this.getMaxSize(state, Road));

  getLongestRoadSize(state: GameState): number {
    return this._getLongestRoadSize.apply(state);
  }
}

Capability.register(RobberCapability);
