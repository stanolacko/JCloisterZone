import { List, Arr } from "../../../../io/vavr/SeqTypes.js";
import type { Seq } from "../../../../io/vavr/Seq.js";
import { type ClassToken, isAssignableFrom } from "../../../../lang/Class.js";
import { Player } from "../../Player.js";
import { Position } from "../../board/Position.js";
import { Rotation } from "../../board/Rotation.js";
import { PlayEventMeta } from "../../event/PlayEvent.js";
import { PlayerTurnEvent } from "../../event/PlayerTurnEvent.js";
import { Follower } from "../../figure/Follower.js";
import type { Meeple } from "../../figure/Meeple.js";
import { MeepleIdProvider } from "../../figure/MeepleIdProvider.js";
import { Special } from "../../figure/Special.js";
import type { Capability } from "../Capability.js";
import type { GameSetup } from "../GameSetup.js";
import { RandomGenerator } from "../../random/RandomGenerator.js";
import { TilePackBuilder } from "../../board/TilePackBuilder.js";
import { ForcedDrawTilePack } from "../../debug/ForcedDrawTilePack.js";
import { PlaceTile } from "../../reducers/PlaceTile.js";
import { GameState } from "./GameState.js";

type MeepleCtor = new (id: string, player: Player) => Meeple;

/** Builds the initial GameState from a GameSetup (start of each game). */
export class GameStateBuilder {
  private players: Arr<Player> = Arr.empty<Player>();
  private state!: GameState;
  private gameAnnotations: Record<string, unknown> | null = null;
  private tileOverrides: Record<string, number> | null = null;

  setGameAnnotations(gameAnnotations: Record<string, unknown> | null): void {
    this.gameAnnotations = gameAnnotations;
  }

  /** Per-tile final-count overrides from GAME_SETUP `tiles` (see TilePackBuilder). */
  setTileOverrides(tileOverrides: Record<string, number> | null): void {
    this.tileOverrides = tileOverrides;
  }

  /** `definitions` = tile-definition XML *contents* (one per loaded set file). */
  constructor(
    private readonly definitions: string[],
    private readonly setup: GameSetup,
    private readonly playersCount: number,
    private readonly initialRandom: number,
  ) {
    if (playersCount < 1) {
      throw new Error("No player in game");
    }
  }

  createInitialState(): GameState {
    const capabilities = this.createCapabilities(this.setup.getCapabilities());
    this.createPlayers();

    this.state = GameState.createInitial(
      this.setup.getRules(),
      this.setup.getElements(),
      capabilities,
      this.players,
      0,
    );

    this.state = this.state.mapPlayers((ps) =>
      ps
        .setFollowers(this.players.map((p) => this.createPlayerFollowers(p)) as unknown as Arr<Seq<Follower>>)
        .setSpecialMeeples(this.players.map((p) => this.createPlayerSpecialMeeples(p)) as unknown as Arr<Seq<Special>>),
    );

    this.createTilePack();
    for (const pt of this.setup.getStart()) {
      let draw;
      try {
        draw = this.state.getTilePack()!.drawTile(pt.getTile());
      } catch {
        // Degenerate setup (e.g. a "start"-only tile set whose tile definitions weren't
        // loaded): the preplaced start tile isn't in the pack, so there is nothing to draw
        // or place. Skip it instead of throwing — the resulting empty pack then routes
        // straight to GameOverPhase / final scoring rather than crashing the game window.
        // eslint-disable-next-line no-console
        console.error(`#start tile '${pt.getTile()}' is not in the tile pack — skipping preplacement`);
        continue;
      }
      const rot = Rotation.valueOf("R" + pt.getRotation());
      this.state = this.state.setTilePack(draw._2);
      this.state = new PlaceTile(draw._1, new Position(pt.getX(), pt.getY()), rot).apply(this.state);
    }

    const randomGenerator = new RandomGenerator(this.initialRandom);
    for (const cap of this.state.getCapabilities().toSeq()) {
      this.state = cap.onStartGame(this.state, randomGenerator);
    }

    this.state = this.processGameAnnotations(this.state);
    this.state = this.state.appendEvent(
      new PlayerTurnEvent(PlayEventMeta.createWithoutPlayer(), this.state.getTurnPlayer()!),
    );
    return this.state;
  }

  /** Debug helper: lets integration tests force the draw order / end turn via the
   *  saved game's gameAnnotations (port of GameStateBuilder.processGameAnnotations).
   *  Supports both the frontend shape `{drawOrder, endTurn}` and the engine shape
   *  `{tilePack: {className, params}}`. */
  private processGameAnnotations(state: GameState): GameState {
    const ann = this.gameAnnotations;
    if (ann === null) return state;

    let params: { drawOrder?: string[]; drawLimit?: number | null } | null = null;
    const tilePackAnn = ann["tilePack"] as { params?: Record<string, unknown> } | undefined;
    if (tilePackAnn && tilePackAnn.params) {
      params = tilePackAnn.params as { drawOrder?: string[]; drawLimit?: number | null };
    } else if (Array.isArray(ann["drawOrder"]) || ann["endTurn"] !== undefined) {
      params = {
        drawOrder: ann["drawOrder"] as string[] | undefined,
        // `endTurn` ends the game after that many tiles are drawn (-> drawLimit)
        drawLimit: (ann["endTurn"] as number | undefined) ?? null,
      };
    }
    if (params === null) return state;

    const groups = state.getTilePack()!.getGroups();
    return state.setTilePack(ForcedDrawTilePack.fromParams(groups, params));
  }

  private createPlayers(): void {
    this.players = Arr.empty<Player>();
    for (let i = 0; i < this.playersCount; i++) {
      this.players = this.players.append(new Player(i)) as Arr<Player>;
    }
  }

  private createTilePack(): void {
    const tilePackBuilder = new TilePackBuilder();
    tilePackBuilder.setGameState(this.state);
    tilePackBuilder.setTileSets(this.setup.getTileSets());
    tilePackBuilder.setTileOverrides(this.tileOverrides);
    this.state = this.state.setTilePack(tilePackBuilder.createTilePack(this.definitions));
  }

  private createCapabilityInstance(clazz: ClassToken<Capability<unknown>>): Capability<unknown> {
    return new (clazz as unknown as new () => Capability<unknown>)();
  }

  createCapabilities(classes: import("../../../../io/vavr/Set.js").Set<ClassToken<Capability<unknown>>>): List<Capability<unknown>> {
    let list = List.empty<Capability<unknown>>();
    for (const cls of classes) {
      list = list.append(this.createCapabilityInstance(cls)) as List<Capability<unknown>>;
    }
    return list;
  }

  private createPlayerFollowers(p: Player): List<Follower> {
    const idProvider = new MeepleIdProvider(p);
    let followers = List.empty<Follower>();
    for (const t of this.setup.getMeeples()) {
      if (isAssignableFrom(Follower, t._1)) {
        for (let i = 0; i < t._2; i++) {
          followers = followers.append(
            new (t._1 as unknown as MeepleCtor)(idProvider.generateId(t._1), p) as Follower,
          ) as List<Follower>;
        }
      }
    }
    return followers;
  }

  private createPlayerSpecialMeeples(p: Player): List<Special> {
    const idProvider = new MeepleIdProvider(p);
    let specials = List.empty<Special>();
    for (const t of this.setup.getMeeples()) {
      if (isAssignableFrom(Special, t._1)) {
        for (let i = 0; i < t._2; i++) {
          specials = specials.append(
            new (t._1 as unknown as MeepleCtor)(idProvider.generateId(t._1), p) as Special,
          ) as List<Special>;
        }
      }
    }
    return specials;
  }
}
