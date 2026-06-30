import { HashMap } from "../../../../io/vavr/Map.js";
import { Tuple2 } from "../../../../io/vavr/Tuple.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import { ExprItem } from "../../event/ExprItem.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import { PointsExpression } from "../../event/PointsExpression.js";
import { ReceivedPoints } from "../../event/ScoreEvent.js";
import { TokenReceivedEvent } from "../../event/TokenReceivedEvent.js";
import { City } from "../../feature/City.js";
import type { Completable } from "../../feature/Completable.js";
import { CountCapability } from "./CountCapability.js";
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

/** King (King & Robber Baron) — token to the player who completes the biggest city. */
export class KingCapability extends Capability<Model> {
  override onStartGame(state: GameState, _random: RandomGenerator): GameState {
    return this.setModel(state, new Tuple2<FeaturePointer | null, number>(null, 0));
  }

  override onTurnScoring(state: GameState, completed: HashMap<Scoreable, ScoreFeatureReducer>): GameState {
    let maxCitySize = this.getModel(state)._2;
    let completedCitiesThisTurn = 0;
    let biggestCityCompleted: City | null = null;

    for (const feature of completed.keySet()) {
      if (feature instanceof City) {
        completedCitiesThisTurn++;
        const citySize = feature.getTilePositions().size();
        if (citySize > maxCitySize) {
          maxCitySize = citySize;
          biggestCityCompleted = feature;
        }
      }
    }

    if (state.getStringRule(Rule.KING_AND_ROBBER_SCORING) === "continuously" && completedCitiesThisTurn > 0) {
      const currentHolder = state.getPlayers().getPlayerWithToken(BiggestFeatureAward.KING);
      if (currentHolder !== null) {
        const rp = new ReceivedPoints(
          new PointsExpression("king", new ExprItem(completedCitiesThisTurn, "cities", completedCitiesThisTurn)),
          currentHolder,
          null,
        );
        state = new AddPoints(rp, false).apply(state);
      }
    }

    const turnPlayer = state.getTurnPlayer()!;
    let ps = state.getPlayers();
    if (biggestCityCompleted !== null) {
      state = this.setModel(
        state,
        new Tuple2<FeaturePointer | null, number>(
          state.getFeaturePointer(biggestCityCompleted),
          biggestCityCompleted.getTilePositions().size(),
        ),
      );
      for (const p of ps.getPlayers()) {
        ps = ps.setTokenCount(p.getIndex(), BiggestFeatureAward.KING, p.equals(turnPlayer) ? 1 : 0);
      }
      const ev = new TokenReceivedEvent(
        PlayEventMeta.createWithActivePlayer(state),
        turnPlayer,
        BiggestFeatureAward.KING,
        1,
      );
      ev.setSourceFeature(biggestCityCompleted);
      state = state.appendEvent(ev);
    }
    return state.setPlayers(ps);
  }

  override onFinalScoring(state: GameState): GameState {
    const ps = state.getPlayers();
    const rule = state.getStringRule(Rule.KING_AND_ROBBER_SCORING);
    if (rule === "continuously") return state;

    const player = ps.getPlayerWithToken(BiggestFeatureAward.KING);
    if (player === null) return state;

    let exprName = "king";
    let itemName = "king";
    let count: number | null = null;
    let points: number;
    if (rule === "10/20") {
      points = 10;
    } else if (rule === "15/40") {
      const hasAlsoRobber = ps.getPlayerTokenCount(player.getIndex(), BiggestFeatureAward.ROBBER) > 0;
      if (hasAlsoRobber) {
        exprName = "king+robber";
        itemName = "king+robber";
        points = 40;
      } else {
        points = 15;
      }
    } else {
      itemName = "cities";
      points = this.countCompletedCities(state);
      count = points;
    }

    const rp = new ReceivedPoints(new PointsExpression(exprName, new ExprItem(count, itemName, points)), player, null);
    return new AddPoints(rp, false, true).apply(state);
  }

  countCompletedCities(state: GameState): number {
    let count = state.getFeatures(City).filter((c) => c.isCompleted(state)).size();
    // City of Carcassonne (Count) counts as a completed city.
    if (state.hasCapability(CountCapability as never)) count += 1;
    return count;
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

  private readonly _getBiggestCitySize = new MemoizedValue<number>((state) => this.getMaxSize(state, City));

  getBiggestCitySize(state: GameState): number {
    return this._getBiggestCitySize.apply(state);
  }
}

Capability.register(KingCapability);
