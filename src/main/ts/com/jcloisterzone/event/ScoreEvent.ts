import { List } from "../../../io/vavr/SeqTypes.js";
import type { Tuple2 } from "../../../io/vavr/Tuple.js";
import type { Player } from "../Player.js";
import type { BoardPointer } from "../board/pointer/BoardPointer.js";
import type { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import type { Follower } from "../figure/Follower.js";
import { PlayEvent, PlayEventMeta } from "./PlayEvent.js";
import type { PointsExpression } from "./PointsExpression.js";

/** The original position of a meeple that contributed to a scoring (its follower
 *  and the feature pointer it sat on at scoring time). TS-only enrichment — Java
 *  does not carry this; see KNOWN_DIFFS.md. */
export type ScoredMeeple = Tuple2<Follower, FeaturePointer>;

/** One player's stake in a scored feature's majority race: their power (follower
 *  strength) and whether they won the majority (an owner). TS-only enrichment. */
export interface MajorityShare {
  player: Player;
  power: number;
  winner: boolean;
}

/** Points awarded to a player from a source. */
export class ReceivedPoints {
  private readonly meeples: List<ScoredMeeple>;
  private readonly majority: List<MajorityShare>;

  constructor(
    private readonly expression: PointsExpression,
    private readonly player: Player,
    private readonly source: BoardPointer | null,
    meeples: List<ScoredMeeple> = List.empty<ScoredMeeple>(),
    majority: List<MajorityShare> = List.empty<MajorityShare>(),
  ) {
    this.meeples = meeples;
    this.majority = majority;
  }

  getPoints(): number {
    return this.expression.getPoints();
  }

  getExpression(): PointsExpression {
    return this.expression;
  }

  getPlayer(): Player {
    return this.player;
  }

  getSource(): BoardPointer | null {
    return this.source;
  }

  /** Followers (with the feature pointer they occupied) that earned this player's
   *  points — used to show the meeples' original positions for the score event. */
  getMeeples(): List<ScoredMeeple> {
    return this.meeples;
  }

  /** The feature's majority race (winners = owners, losers = other meeple holders) —
   *  the "2nd expression" explaining who won the feature. Empty for non-feature scores. */
  getMajority(): List<MajorityShare> {
    return this.majority;
  }

  toString(): string {
    return `{${this.expression},${this.player},${this.source}}`;
  }
}

/** A scoring event (one or more {@link ReceivedPoints}). */
export class ScoreEvent extends PlayEvent {
  static readonly simpleName = "ScoreEvent";

  /** Nested-class alias for Java's ScoreEvent.ReceivedPoints. */
  static readonly ReceivedPoints = ReceivedPoints;

  private readonly points: List<ReceivedPoints>;
  private readonly landscapeSource: boolean;
  private readonly final: boolean;

  constructor(points: List<ReceivedPoints> | ReceivedPoints, landscapeSource: boolean, isFinal: boolean) {
    super(PlayEventMeta.createWithoutPlayer());
    this.points = points instanceof List ? points : List.of(points);
    this.landscapeSource = landscapeSource;
    this.final = isFinal;
  }

  getPoints(): List<ReceivedPoints> {
    return this.points;
  }

  isFinal(): boolean {
    return this.final;
  }

  isLandscapeSource(): boolean {
    return this.landscapeSource;
  }
}