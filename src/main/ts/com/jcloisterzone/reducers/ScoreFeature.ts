import { List } from "../../../io/vavr/SeqTypes.js";
import { HashSet, type Set } from "../../../io/vavr/Set.js";
import type { Tuple2 } from "../../../io/vavr/Tuple.js";
import { simpleName } from "../../../lang/Class.js";
import type { Player } from "../Player.js";
import type { BoardPointer } from "../board/pointer/BoardPointer.js";
import type { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { ScorePositionsFeaturePointer } from "../board/pointer/ScorePositionsFeaturePointer.js";
import { PointsExpression } from "../event/PointsExpression.js";
import { ReceivedPoints } from "../event/ScoreEvent.js";
import { isInstanceOfRangeFeature } from "../feature/RangeFeature.js";
import type { Scoreable } from "../feature/Scoreable.js";
import type { Follower } from "../figure/Follower.js";
import type { ScoreFeatureReducer } from "../game/ScoreFeatureReducer.js";
import type { GameState } from "../game/state/GameState.js";
import { AddPoints } from "./AddPoints.js";


/** Scores a feature's followers (owners share points). */
export abstract class ScoreFeature implements ScoreFeatureReducer {
  private readonly feature: Scoreable;
  protected readonly isFinal: boolean;
  private owners: Set<Player> = HashSet.empty();
  private bonusPoints: List<ReceivedPoints> = List.empty();

  constructor(feature: Scoreable, isFinal: boolean) {
    this.feature = feature;
    this.isFinal = isFinal;
  }

  /** Java's protected getFeaturePoints(state, player). */
  protected abstract computeFeaturePoints(state: GameState, player: Player): PointsExpression;

  abstract getFeaturePoints(): PointsExpression;

  getFeaturePointsForPlayer(player: Player): PointsExpression | null {
    return this.getOwners().contains(player) ? this.getFeaturePoints() : null;
  }

  getFeature(): Scoreable {
    return this.feature;
  }

  getOwners(): Set<Player> {
    return this.owners;
  }

  /** ALL followers still on the feature (with their feature pointers) at scoring time —
   *  every player's, including those who do not score for lack of majority — recorded on
   *  the ScoreEvent so the UI can show their original positions (in each owner's colour)
   *  after they are returned to supply. */
  private getFeatureMeeples(state: GameState): List<Tuple2<Follower, FeaturePointer>> {
    return List.ofAll(this.feature.getFollowers2(state));
  }

  /** A 0-point entry named `"<feature>.<reason>"` for a player who has a meeple on the
   *  feature but scores nothing — `reason` is "empty" when nobody owns the feature (Java
   *  parity) or "no-majority" for a player out-powered by the majority (TS-only). */
  private zeroReceivedPoints(state: GameState, player: Player, reason: string): ReceivedPoints {
    const expr = new PointsExpression(
      simpleName((this.feature as object).constructor).toLowerCase() + "." + reason,
      List.empty(),
    );
    return new ReceivedPoints(
      expr,
      player,
      this.getSampleSource(state, player, this.bonusPoints),
      this.getFeatureMeeples(state),
    );
  }

  private getSampleSource(
    state: GameState,
    player: Player,
    bonusPoints: List<ReceivedPoints>,
  ): BoardPointer {
    const followers: List<Tuple2<Follower, FeaturePointer>> = List.ofAll(
      this.feature.getFollowers2(state).filter((t) => t._1.getPlayer().equals(player)),
    );
    let returnSource: BoardPointer | null = null;
    for (const bonus of bonusPoints) {
      if (!bonus.getPlayer().equals(player)) continue;
      for (const t of followers) {
        if (t._2.equals(bonus.getSource())) {
          if (returnSource !== null) returnSource = t._2;
        }
      }
    }
    if (returnSource === null) {
      returnSource = followers.head()._2;
    }
    if (isInstanceOfRangeFeature(this.feature)) {
      const positions = HashSet.ofAll(
        this.feature.getRangeTilesWithFeature(state).map((t) => t.getPosition()),
      );
      return new ScorePositionsFeaturePointer(returnSource as FeaturePointer, positions);
    }
    return returnSource;
  }

  protected addFiguresBonusPoints(state: GameState): GameState {
    for (const t of this.bonusPoints.groupBy((bonus) => bonus.getExpression().getName())) {
      state = new AddPoints(List.ofAll(t._2), false, this.isFinal).apply(state);
    }
    return state;
  }

  apply(state: GameState): GameState {
    this.owners = this.feature.getOwners(state);

    for (const cap of state.getCapabilities().toSeq()) {
      this.bonusPoints = cap.appendFiguresBonusPoints(state, this.bonusPoints, this.feature, this.isFinal);
    }

    let receivedPoints: List<ReceivedPoints> = List.empty<ReceivedPoints>();

    if (this.owners.isEmpty()) {
      // no owners but followers may exist (e.g. Mayor on a city without pennants)
      for (const player of this.feature
        .getFollowers(state)
        .map((f) => f.getPlayer())
        .distinct()) {
        receivedPoints = receivedPoints.append(this.zeroReceivedPoints(state, player, "empty")) as List<ReceivedPoints>;
      }
    } else {
      for (const player of this.owners) {
        const expr = this.computeFeaturePoints(state, player);
        receivedPoints = receivedPoints.append(
          new ReceivedPoints(
            expr,
            player,
            this.getSampleSource(state, player, this.bonusPoints),
            this.getFeatureMeeples(state),
          ),
        ) as List<ReceivedPoints>;
      }
      // TS-only (Java emits nothing here): players with at least one meeple on the
      // feature but WITHOUT the majority get a 0-point "no-majority" entry, so the score
      // history shows the feature was contested (rendered as "<feature> (no majority) = 0").
      for (const player of this.feature
        .getFollowers(state)
        .map((f) => f.getPlayer())
        .distinct()) {
        if (this.owners.contains(player)) continue;
        receivedPoints = receivedPoints.append(this.zeroReceivedPoints(state, player, "no-majority")) as List<ReceivedPoints>;
      }
    }

    if (!receivedPoints.isEmpty()) {
      state = new AddPoints(receivedPoints, true, this.isFinal).apply(state);
    }

    state = this.addFiguresBonusPoints(state);
    return state;
  }
}
