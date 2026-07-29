import { simpleName } from "../../../lang/Class.js";
import type { ClassToken } from "../../../lang/Class.js";
import type { Map as VMap } from "../../../io/vavr/Map.js";
import type { Tuple2 } from "../../../io/vavr/Tuple.js";
import type { Capability } from "../game/Capability.js";
import type { Token } from "../game/Token.js";
import { GoldminesCapability } from "../game/capability/GoldminesCapability.js";
import { GamblersLuckCapability } from "../game/capability/GamblersLuckCapability.js";
import { BazaarCapability } from "../game/capability/BazaarCapability.js";
import type { BazaarCapabilityModel } from "../game/capability/BazaarCapabilityModel.js";
import { TunnelCapability } from "../game/capability/TunnelCapability.js";
import type { PlacedTunnelToken } from "../game/state/PlacedTunnelToken.js";
import { FerriesCapability } from "../game/capability/FerriesCapability.js";
import type { FerriesCapabilityModel } from "../game/capability/FerriesCapabilityModel.js";
import { DragonCapability } from "../game/capability/DragonCapability.js";
import { DragonMovePhase } from "../game/phase/DragonMovePhase.js";
import { RussianPromosTrapPhase } from "../game/phase/RussianPromosTrapPhase.js";
import { GameOverPhase } from "../game/phase/GameOverPhase.js";
import { FinalScoring } from "../reducers/FinalScoring.js";
import { MoveDragonAction } from "../action/MoveDragonAction.js";
import { Dragon } from "../figure/neutral/Dragon.js";
import { KingCapability } from "../game/capability/KingCapability.js";
import { LittleBuildingsCapability } from "../game/capability/LittleBuildingsCapability.js";
import { RobberCapability } from "../game/capability/RobberCapability.js";
import { SheepCapability } from "../game/capability/SheepCapability.js";
import { HillCapability } from "../game/capability/HillCapability.js";
import { TowerCapability } from "../game/capability/TowerCapability.js";
import { Rule } from "../game/Rule.js";
import type { Arr, List, Vector } from "../../../io/vavr/SeqTypes.js";
import type { Follower } from "../figure/Follower.js";
import type { Location } from "../board/Location.js";
import { Position } from "../board/Position.js";
import type { Rotation } from "../board/Rotation.js";
import { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { MeeplePointer } from "../board/pointer/MeeplePointer.js";
import { ScoreMeeplePositionsPointer } from "../board/pointer/ScoreMeeplePositionsPointer.js";
import { ScorePositionsFeaturePointer } from "../board/pointer/ScorePositionsFeaturePointer.js";
import type { BoardPointer } from "../board/pointer/BoardPointer.js";
import { DoubleTurnEvent } from "../event/DoubleTurnEvent.js";
import { MeepleDeployed } from "../event/MeepleDeployed.js";
import { MeepleReturned } from "../event/MeepleReturned.js";
import { CastleCreated } from "../event/CastleCreated.js";
import { FlierRollEvent } from "../event/FlierRollEvent.js";
import { FlierDiceRollEvent } from "../event/FlierDiceRollEvent.js";
import { DiceSixRollEvent } from "../event/DiceSixRollEvent.js";
import { TileAuctionedEvent } from "../event/TileAuctionedEvent.js";
import { NeutralFigureMoved } from "../event/NeutralFigureMoved.js";
import { NeutralFigureReturned } from "../event/NeutralFigureReturned.js";
import type { PlayEvent } from "../event/PlayEvent.js";
import { PlayerTurnEvent } from "../event/PlayerTurnEvent.js";
import { ScoreEvent } from "../event/ScoreEvent.js";
import { TileDiscardedEvent } from "../event/TileDiscardedEvent.js";
import { TilePlacedEvent } from "../event/TilePlacedEvent.js";
import { TokenPlacedEvent } from "../event/TokenPlacedEvent.js";
import { TokenReceivedEvent } from "../event/TokenReceivedEvent.js";
import { TokenRemovedEvent } from "../event/TokenRemovedEvent.js";
import { FollowerCaptured } from "../event/FollowerCaptured.js";
import { RansomPaidEvent } from "../event/RansomPaidEvent.js";
import { PrisonersExchangeEvent } from "../event/PrisonersExchangeEvent.js";
import { CoopGameLostEvent } from "../event/CoopGameLostEvent.js";
import { KeepBuildingCapability } from "../game/capability/KeepBuildingCapability.js";
import { Field } from "../feature/Field.js";
import { Tower } from "../feature/Tower.js";
import { isInstanceOfScoreable } from "../feature/Scoreable.js";
import { ConfirmAction } from "../action/ConfirmAction.js";
import { PreDrawPlaceAction } from "../action/PreDrawPlaceAction.js";
import { BazaarSelectTileAction } from "../action/BazaarSelectTileAction.js";
import { BazaarBidAction } from "../action/BazaarBidAction.js";
import { BazaarSelectBuyOrSellAction } from "../action/BazaarSelectBuyOrSellAction.js";
import { CornCircleSelectDeployOrRemoveAction } from "../action/CornCircleSelectDeployOrRemoveAction.js";
import { DonkeyAction } from "../action/DonkeyAction.js";
import { GoldPieceAction } from "../action/GoldPieceAction.js";
import { ShepherdPlacementConfirmAction } from "../action/ShepherdPlacementConfirmAction.js";
import { TilePlacementConfirmAction } from "../action/TilePlacementConfirmAction.js";
import { TunnelAction } from "../action/TunnelAction.js";
import { FerriesAction } from "../action/FerriesAction.js";
import { ScoreAcrobatsAction } from "../action/ScoreAcrobatsAction.js";
import { FairyNextToAction } from "../action/FairyNextToAction.js";
import { FairyOnTileAction } from "../action/FairyOnTileAction.js";
import { NeutralFigureAction } from "../action/NeutralFigureAction.js";
import { RemoveMageOrWitchAction } from "../action/RemoveMageOrWitchAction.js";
import { FlockAction } from "../action/FlockAction.js";
import { BridgeAction } from "../action/BridgeAction.js";
import { CastleAction } from "../action/CastleAction.js";
import { LittleBuildingAction } from "../action/LittleBuildingAction.js";
import { MeepleAction } from "../action/MeepleAction.js";
import type { PlayerAction } from "../action/PlayerAction.js";
import { ReturnMeepleAction } from "../action/ReturnMeepleAction.js";
import { TilePlacementAction } from "../action/TilePlacementAction.js";
import { TowerPieceAction } from "../action/TowerPieceAction.js";
import { CaptureFollowerAction } from "../action/CaptureFollowerAction.js";
import { SelectPrisonerToExchangeAction } from "../action/SelectPrisonerToExchangeAction.js";
import { Flag } from "../game/state/Flag.js";
import type { GameState } from "../game/state/GameState.js";
import type { Game } from "./Game.js";

/**
 * Serializes a {@link Game} to the JSON the FanCloisterZone client renders.
 * Port of the top-level structure of Java `StateGsonBuilder.GameSerializer`.
 *
 * STATUS: the top-level object now carries every key the client expects (so it no
 * longer drops on `undefined`). Cheap fields are emitted at full parity
 * (players/placedTiles/discardedTiles/deployedMeeples/phase/turnPlayer/undo/flags/
 * tilePack). The heavy graphs are valid-but-incomplete and TODO'd:
 *   - features:[]           → board feature graph (Java serializeFeatures)
 *   - tokens:{}             → tunnel/ferry/gold/little-building token placements
 *   - neutralFigures:{}     → dragon/fairy/mage/witch/count placements
 *   - action.items:[]       → per-action serializers (TilePlacement/Meeple/Flock/...)
 *   - history:[]            → play-event log
 *   - players[].tokens:{}   → king/robber/etc. token holdings
 * Drive these to parity via the golden-diff harness (state-parity.test.ts).
 */
/** Gson omits null object-fields by default; mirror that so JSON matches the jar.
 *  (Null elements inside arrays are kept — Gson keeps those too.) */
function stripNulls(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripNulls);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === null || val === undefined) continue;
      out[k] = stripNulls(val);
    }
    return out;
  }
  return v;
}

const SHEEP_CLS = SheepCapability as unknown as ClassToken<SheepCapability>;
const GOLD_CLS = GoldminesCapability as unknown as ClassToken<Capability<VMap<Position, number>>>;
const TUNNEL_CLS = TunnelCapability as unknown as ClassToken<Capability<VMap<FeaturePointer, PlacedTunnelToken>>>;
const DRAGON_CLS = DragonCapability as unknown as ClassToken<Capability<Vector<Position>>>;
const FERRIES_CLS = FerriesCapability as unknown as ClassToken<Capability<FerriesCapabilityModel>>;

export class StateGsonBuilder {
  serializeGame(game: Game): string {
    return JSON.stringify(stripNulls(this.buildGame(game)));
  }

  private buildGame(game: Game): Record<string, unknown> {
    const state = game.getState();
    const players = state.getPlayers();
    const phase = state.getPhase();
    const actions = state.getPlayerActions();
    const tilePack = state.getTilePack();

    return {
      players: this.players(state),
      tilePack: {
        size: tilePack?.totalSize() ?? 0,
        underHills: tilePack?.getHiddenUnderHills() ?? 0,
      },
      placedTiles: this.placedTiles(state),
      discardedTiles: state.getDiscardedTiles().toArray().map((t) => t.getId()),
      deployedMeeples: this.deployedMeeples(state),
      neutralFigures: this.neutralFigures(state),
      tokens: this.tokens(state),
      sheep: this.sheep(state),
      features: this.features(state),
      phase:
        phase === null
          ? null
          : phase instanceof RussianPromosTrapPhase
            ? "CommitPhase"
            : simpleName(phase.constructor as ClassToken),
      turnPlayer: players.getTurnPlayerIndex(),
      action:
        actions === null
          ? null
          : {
              player: actions.getPlayer().getIndex(),
              canPass: actions.isPassAllowed(),
              items: actions
                .getActions()
                .toArray()
                .map((a) => this.serializeAction(a)),
            },
      history: this.playEvents(state),
      flags: state.hasFlag(Flag.RANSOM_PAID) ? { ransomPaid: true } : {},
      undo: { allowed: game.isUndoAllowed(), depth: game.getUndoDepth() },
      bazaar: this.bazaar(state),
      coop: this.coop(state),
    };
  }

  /** Keep Building (cooperative variant) outcome — null unless the variant is active.
   *  `lost` becomes true (with the losing player's index) the moment a turn ends without
   *  either coop condition met; on a normal game end it stays false = everyone won. */
  private coop(state: GameState): unknown {
    if (!state.hasCapability(KeepBuildingCapability)) return null;
    const loser = state.getCapabilityModel<number | null>(
      KeepBuildingCapability as unknown as ClassToken<Capability<number | null>>,
    );
    return { lost: loser !== null && loser !== undefined, loser: loser ?? null };
  }

  /** Bazaar supply (when an auction is in progress / supply unresolved). */
  private bazaar(state: GameState): unknown {
    const model = state.getCapabilityModel<BazaarCapabilityModel>(
      BazaarCapability as unknown as ClassToken<Capability<BazaarCapabilityModel>>,
    );
    if (model === null || model === undefined || model.getSupply() === null) return null;
    const supply = model.getSupply()!;
    const out: Array<Record<string, unknown>> = [];
    for (let idx = 0; idx < supply.length(); idx++) {
      const bi = supply.get(idx);
      const item: Record<string, unknown> = {
        tile: bi.getTile().getId(),
        price: bi.getCurrentPrice(),
        bidder: bi.getCurrentBidder() === null ? null : bi.getCurrentBidder()!.getIndex(),
        owner: bi.getOwner() === null ? null : bi.getOwner()!.getIndex(),
      };
      if (model.getAuctionedItemIndex() !== null && idx === model.getAuctionedItemIndex()) {
        item.selectedBy = model.getTileSelectingPlayer()!.getIndex();
      }
      out.push(item);
    }
    return out;
  }

  /** Neutral figure placements (port of serializeNeutralFigures). Ported subset. */
  private neutralFigures(state: GameState): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const nf = state.getNeutralFigures();
    const dragonPos = nf.getDragonDeployment();
    if (dragonPos !== null) {
      const data: Record<string, unknown> = { position: this.pos(dragonPos) };
      if (state.getPhase() instanceof DragonMovePhase) {
        const visited = state.getCapabilityModel<Vector<Position>>(DRAGON_CLS);
        data.visited = visited.toArray().map((p) => this.pos(p));
        data.remaining = DragonCapability.DRAGON_MOVES - visited.length();
      }
      out.dragon = data;
    }
    const fairyPtr = nf.getFairyDeployment();
    if (fairyPtr !== null) out.fairy = { placement: this.boardPtr(fairyPtr) };
    const blackFairyPtr = nf.getBlackFairyDeployment();
    if (blackFairyPtr !== null) out["black-fairy"] = { placement: this.boardPtr(blackFairyPtr) };
    const magePtr = nf.getMageDeployment();
    if (magePtr !== null) out.mage = { placement: this.boardPtr(magePtr) };
    const witchPtr = nf.getWitchDeployment();
    if (witchPtr !== null) out.witch = { placement: this.boardPtr(witchPtr) };
    const donkeyPtr = nf.getDonkeyDeployment();
    if (donkeyPtr !== null) out.donkey = { placement: this.pos(donkeyPtr) };
    const countPtr = nf.getCountDeployment();
    if (countPtr !== null) out.count = { placement: this.boardPtr(countPtr) };
    const bigTopPos = nf.getBigTopDeployment();
    if (bigTopPos !== null) out.bigtop = { placement: this.pos(bigTopPos) };
    const courierPtr = nf.getCourierDeployment();
    if (courierPtr !== null) out.courier = { placement: this.boardPtr(courierPtr) };
    return out;
  }

  /** Placed board tokens (port of serializeTokens). Only the ported expansions. */
  private tokens(state: GameState): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    // Little Buildings — placed token positions, grouped by type (non-empty only)
    if (state.hasCapability(LittleBuildingsCapability as unknown as ClassToken<Capability<unknown>>)) {
      const model = state.getCapabilityModel<VMap<Position, LittleBuildingsCapability.LittleBuilding>>(
        LittleBuildingsCapability as unknown as ClassToken<
          Capability<VMap<Position, LittleBuildingsCapability.LittleBuilding>>
        >,
      );
      const buckets = new Map<string, Array<[number, number]>>();
      for (const t of model) {
        const name = t._2.name();
        (buckets.get(name) ?? buckets.set(name, []).get(name)!).push(this.pos(t._1));
      }
      for (const lb of LittleBuildingsCapability.LittleBuilding.values()) {
        const arr = buckets.get(lb.name());
        if (arr && arr.length > 0) out[lb.name()] = arr;
      }
    }
    // Goldmines — gold token placements (emitted, possibly empty, when capability present)
    if (state.hasCapability(GOLD_CLS)) {
      const gold = state.getCapabilityModel<VMap<Position, number>>(GOLD_CLS);
      out[GoldminesCapability.GoldToken.GOLD.name()] = gold
        .toArray()
        .map((t) => ({ position: this.pos(t._1), count: t._2 }));
    }
    // Tunnels — placed tunnel tokens, grouped by "<TOKEN>.<playerIndex>"
    if (state.hasCapability(TUNNEL_CLS)) {
      const tunnels = state.getCapabilityModel<VMap<FeaturePointer, PlacedTunnelToken>>(TUNNEL_CLS);
      const groups = new Map<string, unknown[]>();
      for (const t of tunnels) {
        if (t._2 === null) continue;
        const key = t._2.getToken().name() + "." + t._2.getPlayerIndex();
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(this.boardPtr(t._1));
      }
      for (const [k, v] of groups) out[k] = v;
    }
    // Gambler's Luck — rolled shield tokens grouped by token kind (non-empty only)
    {
      const glModel = state.getCapabilityModel<
        VMap<FeaturePointer, Tuple2<GamblersLuckCapability.GamblersLuckShieldToken, number>>
      >(
        GamblersLuckCapability as unknown as ClassToken<
          Capability<VMap<FeaturePointer, Tuple2<GamblersLuckCapability.GamblersLuckShieldToken, number>>>
        >,
      );
      if (glModel !== null && glModel !== undefined) {
        const buckets = new Map<string, unknown[]>();
        for (const t of glModel) {
          const entry = {
            position: this.pos(t._1.getPosition()),
            location: t._1.getLocation()!.toString(),
            extraRotation: t._2._2,
            feature: "GamblersLuckShield",
          };
          const name = t._2._1.name();
          (buckets.get(name) ?? buckets.set(name, []).get(name)!).push(entry);
        }
        for (const tok of GamblersLuckCapability.GamblersLuckShieldToken.values()) {
          const arr = buckets.get(tok.name());
          if (arr && arr.length > 0) out[tok.name()] = arr;
        }
      }
    }
    // Ferries — placed ferry tokens under "FERRY" (emitted even when empty)
    if (state.hasCapability(FERRIES_CLS)) {
      const model = state.getCapabilityModel<FerriesCapabilityModel>(FERRIES_CLS);
      out[FerriesCapability.FerryToken.FERRY.name()] = model
        .getFerries()
        .toArray()
        .map((fp) => this.boardPtr(fp));
    }
    // TODO(serializer): gamblers-luck token placements.
    return out;
  }

  /** Sheep (Hills & Sheep) — bag size + each flock's feature/position/tokens. */
  private sheep(state: GameState): unknown {
    if (!state.hasCapability(SHEEP_CLS)) return null;
    const cap = state.getCapabilities().get(SHEEP_CLS) as SheepCapability;
    const flocks: unknown[] = [];
    for (const t of cap.getModel(state).getPlacedTokens()) {
      const fp = t._1;
      flocks.push({
        feature: simpleName(fp.getFeature()!),
        position: this.pos(fp.getPosition()),
        location: this.loc(fp.getLocation()),
        tokens: t._2.toArray().map((tok) => tok.name()),
      });
    }
    return { bagSize: cap.getBagConent(state).length(), flocks };
  }

  private players(state: GameState): unknown[] {
    const ps = state.getPlayers();
    const score = ps.getScore();
    const followers = ps.getFollowers();
    const specials = ps.getSpecialMeeples();
    const tokenArr = ps.getTokens();
    const turn = ps.getTurnPlayerIndex();
    const count = ps.getPlayers().size();
    const prisoners = state.hasCapability(TowerCapability as unknown as ClassToken<Capability<unknown>>)
      ? state.getCapabilityModel<Arr<List<Follower>>>(
          TowerCapability as unknown as ClassToken<Capability<Arr<List<Follower>>>>,
        )
      : null;

    // TS-only: potential final score — what each player would have if the game ended right
    // now. Final scoring is a pure reducer over the immutable state, so we run it on a
    // throwaway copy and read the resulting scores without affecting the real game. Once the
    // game is actually over, final scoring has already been applied, so reuse the real score
    // (re-running would double-apply capability bonuses like King/Robber/gold).
    const finalScore =
      state.getPhase() instanceof GameOverPhase
        ? score
        : new FinalScoring().apply(state).getPlayers().getScore();

    const out: unknown[] = [];
    for (let i = 0; i < count; i++) {
      const meeples: Record<string, [number, string]> = {};
      this.groupSupply(state, followers.get(i), meeples);
      this.groupSupply(state, specials.get(i), meeples);
      const player: Record<string, unknown> = {
        points: score.get(i),
        finalPoints: finalScore.get(i),
        tokens: this.playerTokens(state, tokenArr.get(i)),
        meeples,
      };
      if (prisoners !== null) player.captured = this.capturedFor(prisoners.get(i));
      if (turn !== null && turn === i) player.turn = true;
      out.push(player);
    }
    return out;
  }

  /** { TOKEN_NAME: {count, [fp,size for KING/ROBBER]} } — port of serializePlayers tokens. */
  private playerTokens(state: GameState, tokens: VMap<Token, number>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const t of tokens) {
      const name = t._1.name();
      const obj: Record<string, unknown> = { count: t._2 };
      if (name === "KING") {
        const m = state.getCapabilityModel<Tuple2<FeaturePointer | null, number>>(
          KingCapability as unknown as ClassToken<Capability<Tuple2<FeaturePointer | null, number>>>,
        );
        obj.fp = this.boardPtr(m._1);
        obj.size = m._2;
      } else if (name === "ROBBER") {
        const m = state.getCapabilityModel<Tuple2<FeaturePointer | null, number>>(
          RobberCapability as unknown as ClassToken<Capability<Tuple2<FeaturePointer | null, number>>>,
        );
        obj.fp = this.boardPtr(m._1);
        obj.size = m._2;
      }
      out[name] = obj;
    }
    return out;
  }

  /** Captured prisoners grouped by (figure class, owner) → {id,type,player,count}. */
  private capturedFor(prisoners: List<Follower>): unknown[] {
    const groups = new Map<string, { id: string; type: string; player: number; count: number }>();
    for (const f of prisoners) {
      const type = simpleName(f.constructor as ClassToken);
      const owner = f.getPlayer().getIndex();
      const key = `${type}/${owner}`;
      const g = groups.get(key);
      if (g) g.count++;
      else groups.set(key, { id: f.getId(), type, player: owner, count: 1 });
    }
    return [...groups.values()];
  }

  /** group in-supply meeples by class → { SimpleName: [count, sampleId] }. */
  private groupSupply(
    state: GameState,
    seq: Iterable<{ isInSupply(s: GameState): boolean; getId(): string; constructor: Function }>,
    into: Record<string, [number, string]>,
  ): void {
    const groups = new Map<string, { count: number; id: string }>();
    for (const f of seq) {
      if (!f.isInSupply(state)) continue;
      const name = simpleName(f.constructor as ClassToken);
      const g = groups.get(name);
      if (g) g.count++;
      else groups.set(name, { count: 1, id: f.getId() });
    }
    for (const [name, g] of groups) into[name] = [g.count, g.id];
  }

  private placedTiles(state: GameState): unknown[] {
    const out: unknown[] = [];
    for (const t of state.getPlacedTiles()) {
      const pt = t._2;
      out.push({
        position: this.pos(pt.getPosition()),
        rotation: this.rotationToPrimitive(pt.getRotation()),
        id: pt.getTile().getId(),
      });
    }
    return out;
  }

  private deployedMeeples(state: GameState): unknown[] {
    const out: unknown[] = [];
    for (const t of state.getDeployedMeeples()) {
      const m = t._1;
      const fp: FeaturePointer = t._2;
      const feat = fp.getFeature();
      out.push({
        id: m.getId(),
        type: simpleName(m.constructor as ClassToken),
        player: m.getPlayer().getIndex(),
        position: this.pos(fp.getPosition()),
        feature: feat === null ? null : simpleName(feat),
        location: this.loc(fp.getLocation()),
      });
    }
    return out;
  }

  /** Port of serializeFeatures — the board feature graph (drives the client's
   *  feature highlighting / score overlays). */
  private features(state: GameState): unknown[] {
    const out: unknown[] = [];
    for (const f of state.getFeatures()) {
      const item: Record<string, unknown> = {
        type: simpleName(f.constructor as ClassToken),
        places: f
          .getPlaces()
          .toArray()
          .map((fp) => [fp.getPosition().x, fp.getPosition().y, this.loc(fp.getLocation())]),
      };
      if (f instanceof Tower) {
        const pieces = f.getPieces();
        item.height = pieces.size();
        item.lastPiece = pieces.size() > 0 ? pieces.last().toString() : null;
      }
      if (isInstanceOfScoreable(f)) {
        const owners: number[] = [];
        for (const p of f.getOwners(state)) owners.push(p.getIndex());
        item.owners = owners;
      }
      if (f instanceof Field) {
        let cities = f.getAdjoiningCities().size();
        if (f.isAdjoiningCityOfCarcassonne()) cities++;
        item.cities = cities;
      }
      out.push(item);
    }
    return out;
  }

  /** Port of serializePlayEvents — groups the event log into turns; the "points"
   *  events carry the scoring breakdown (name + items: count/name/points). */
  private playEvents(state: GameState): unknown[] {
    const events: Array<Record<string, unknown>> = [];
    let turn = 0;
    let playerIdx: number | null = null;
    let turnEvents: Array<Record<string, unknown>> | null = null;
    let hasTurn = false;
    let volcanoTile = false;
    let dragonPath: Array<[number, number]> | null = null;

    // Hills & Sheep majority tie-break mode (game-wide, constant): how a player's `hills`
    // count is to be read — "number-of-followers" counts hill meeples toward the majority,
    // "at-least-one-follower" only breaks ties. null when Hills is not in the game.
    const hillMode: string | null = state.hasCapability(HillCapability)
      ? state.getStringRule(Rule.HILL_TIEBREAKER) === "number-of-followers"
        ? "number-of-followers"
        : "at-least-one-follower"
      : null;

    for (const ev of state.getEvents()) {
      if (ev instanceof PlayerTurnEvent) playerIdx = ev.getPlayer().getIndex();
      if (ev instanceof PlayerTurnEvent || ev instanceof DoubleTurnEvent) {
        turnEvents = [];
        events.push({ turn: ++turn, player: playerIdx, events: turnEvents });
        hasTurn = true;
        dragonPath = null;
        continue;
      }
      if (!hasTurn || turnEvents === null) continue; // events before first turn

      if (ev instanceof TilePlacedEvent) {
        turnEvents.push({
          type: "tile-placed",
          tile: ev.getTile().getId(),
          position: this.pos(ev.getPosition()),
          rotation: this.rotationToPrimitive(ev.getRotation()),
        });
        volcanoTile = ev.getTile().getTileModifiers().contains(DragonCapability.VOLCANO);
      } else if (ev instanceof TileDiscardedEvent) {
        turnEvents.push({ type: "tile-discarded", tile: ev.getTile().getId() });
      } else if (ev instanceof ScoreEvent) {
        if (ev.isFinal() && turn !== -1) {
          turn = -1;
          turnEvents = [];
          events.push({ finalScoring: true, events: turnEvents });
        }
        const points = ev.getPoints().toArray().map((rp) => {
          const entry: Record<string, unknown> = {
            player: rp.getPlayer().getIndex(),
            points: rp.getPoints(),
            name: rp.getExpression().getName(),
            items: rp.getExpression().getItems().toArray().map((it) => ({
              count: it.getCount(),
              name: it.getName(),
              points: it.getPoints(),
            })),
            ptr: this.boardPtr(rp.getSource()),
          };
          // TS-only enrichment (not emitted by Java): the original positions of the
          // followers that earned these points, so the UI can show them after the
          // meeples are returned to supply. Stripped in the parity test.
          const meeples = rp.getMeeples();
          if (!meeples.isEmpty()) {
            entry.meeples = meeples.toArray().map((t) => {
              const feat = t._2.getFeature();
              return {
                type: simpleName(t._1.constructor as ClassToken),
                player: t._1.getPlayer().getIndex(),
                position: this.pos(t._2.getPosition()),
                feature: feat === null ? null : simpleName(feat),
                location: this.loc(t._2.getLocation()),
              };
            });
          }
          // TS-only: the feature's majority race (winners = owners) — the "2nd expression".
          const majority = rp.getMajority();
          if (!majority.isEmpty()) {
            entry.majority = majority.toArray().map((m) => ({
              player: m.player.getIndex(),
              power: m.power,
              hills: m.hills,
              winner: m.winner,
            }));
            if (hillMode !== null) entry.hillMode = hillMode;
          }
          return entry;
        });
        turnEvents.push({ type: "points", points });
      } else if (ev instanceof MeepleDeployed) {
        const data: Record<string, unknown> = {
          type: "meeple-deployed",
          meeple: simpleName(ev.getMeeple().constructor as ClassToken),
          player: ev.getMeeple().getPlayer().getIndex(),
          to: this.boardPtr(ev.getPointer()),
        };
        if (ev.getMovedFrom() !== null) data.from = this.boardPtr(ev.getMovedFrom());
        turnEvents.push(data);
      } else if (ev instanceof MeepleReturned) {
        if (ev.isForced()) {
          turnEvents.push({
            type: "meeple-returned",
            meeple: simpleName(ev.getMeeple().constructor as ClassToken),
            player: ev.getMeeple().getPlayer().getIndex(),
            source: ev.getReturnMeepleSource() === null ? null : String(ev.getReturnMeepleSource()),
            forced: ev.isForced(),
            from: this.boardPtr(ev.getFrom()),
          });
        }
      } else if (ev instanceof TokenReceivedEvent) {
        const data: Record<string, unknown> = {
          type: "token-received",
          player: ev.getPlayer().getIndex(),
          token: ev.getToken().name(),
          count: ev.getCount(),
        };
        const positions = ev.getSourcePositions();
        if (positions !== null) {
          data.positions = positions.toArray().map((p) => this.pos(p));
        } else {
          const feat = ev.getSourceFeature() as { getPlaces(): { head(): FeaturePointer } } | null;
          data.feature = feat === null ? null : this.fp(feat.getPlaces().head());
        }
        turnEvents.push(data);
      } else if (ev instanceof TokenPlacedEvent) {
        turnEvents.push({
          type: "token-placed",
          token: ev.getToken().name(),
          to: this.boardPtr(ev.getPointer()),
        });
      } else if (ev instanceof NeutralFigureMoved) {
        if (volcanoTile) {
          // a volcano tile summons the dragon — that move is not part of a dragon path
          volcanoTile = false;
        } else if (ev.getNeutralFigure() instanceof Dragon) {
          if (dragonPath === null) {
            dragonPath = [this.pos(ev.getFrom() as Position), this.pos(ev.getTo() as Position)];
            turnEvents.push({
              type: "dragon-moved",
              figure: ev.getNeutralFigure().getId(),
              path: dragonPath,
            });
          } else {
            dragonPath.push(this.pos(ev.getTo() as Position));
          }
        } else {
          // non-dragon neutral move; note Java emits getTo() for BOTH from and to here.
          const entry: Record<string, unknown> = {
            type: "neutral-moved",
            figure: ev.getNeutralFigure().getId(),
            from: this.boardPtr(ev.getTo()),
            to: this.boardPtr(ev.getTo()),
          };
          // TS-only: the meeple the figure was placed next to (captured at move time), so the UI can
          // still render it after it is removed, without parsing the meeple id. Stripped in parity.
          const host = ev.getHostMeeple();
          if (host !== null) {
            entry.hostMeeple = {
              type: simpleName(host.constructor as ClassToken),
              player: host.getPlayer().getIndex(),
            };
          }
          turnEvents.push(entry);
        }
      } else if (ev instanceof FlierRollEvent) {
        turnEvents.push({
          type: "flier-roll",
          distance: ev.getDistance(),
          flierPosition: this.pos(ev.getPosition()),
        });
      } else if (ev instanceof FlierDiceRollEvent) {
        turnEvents.push({
          type: "flierdice-roll",
          value: ev.getValue(),
          action: ev.getType(),
          positions: ev.getPositions().toArray().map((p) => this.pos(p)),
        });
      } else if (ev instanceof TileAuctionedEvent) {
        turnEvents.push({
          type: "tile-auctioned",
          tile: ev.getTile().getId(),
          option: ev.getOption(),
          points: ev.getPoints(),
          auctioneer: ev.getAuctioneer().getIndex(),
          bidder: ev.getBidder() === null ? null : ev.getBidder()!.getIndex(),
        });
      } else if (ev instanceof DiceSixRollEvent) {
        turnEvents.push({
          type: "dicesix-roll",
          value: ev.getValue(),
          action: ev.getType(),
          positions: ev.getPositions().toArray().map((p) => this.pos(p)),
        });
      } else if (ev instanceof NeutralFigureReturned) {
        turnEvents.push({
          type: "neutral-returned",
          figure: simpleName(ev.getNeutralFigure().constructor as ClassToken),
          source: ev.getFrom() === null ? null : (ev.getFrom() as { toString(): string }).toString(),
          from: this.boardPtr(ev.getFrom()),
        });
      } else if (ev instanceof CastleCreated) {
        const edge = ev.getCastle().getEdge();
        turnEvents.push({
          type: "castle-created",
          positions: [this.pos(edge.getP1()), this.pos(edge.getP2())],
        });
      } else if (ev instanceof TokenRemovedEvent) {
        turnEvents.push({
          type: "token-removed",
          token: ev.getToken().name(),
          count: ev.getCount(),
          forced: ev.getForced(),
          from: this.boardPtr(ev.getPointer()),
        });
      } else if (ev instanceof FollowerCaptured) {
        turnEvents.push({
          type: "meeple-captured",
          meeple: simpleName(ev.getFollower().constructor as ClassToken),
          player: ev.getFollower().getPlayer().getIndex(),
          from: this.boardPtr(ev.getFrom()),
        });
      } else if (ev instanceof RansomPaidEvent) {
        turnEvents.push({
          type: "ransom-paid",
          follower: simpleName(ev.getMeeple().constructor as ClassToken),
          prisoner: ev.getMeeple().getPlayer().getIndex(),
          jailer: ev.getJailer().getIndex(),
        });
      } else if (ev instanceof PrisonersExchangeEvent) {
        // NB: mirrors the jar — Gson writes both type/player onto `first`, leaving the
        // second element an empty object.
        const first = {
          type: simpleName(ev.getSecond().constructor as ClassToken),
          player: ev.getSecond().getPlayer().getIndex(),
        };
        turnEvents.push({ type: "prisoners-exchange", exchange: [first, {}] });
      } else if (ev instanceof CoopGameLostEvent) {
        // Keep Building (coop variant): this player's turn met neither condition — all lose.
        turnEvents.push({ type: "coop-lost", player: ev.getPlayer().getIndex() });
      }
    }
    return events;
  }

  private boardPtr(p: BoardPointer | null): unknown {
    if (p === null) return null;
    // ScorePositionsFeaturePointer → Gson reflection: {featurePointer, positions}
    if (p instanceof ScorePositionsFeaturePointer) {
      return {
        featurePointer: this.fp(p.asFeaturePointer()),
        positions: p.getPositions().toArray().map((pos) => this.pos(pos)),
      };
    }
    // ScoreMeeplePositionsPointer → Gson reflection: {featurePointer, meepleId, positions}
    if (p instanceof ScoreMeeplePositionsPointer) {
      return {
        featurePointer: this.fp(p.asFeaturePointer()),
        meepleId: p.getMeepleId(),
        positions: p.getPositions().toArray().map((pos) => this.pos(pos)),
      };
    }
    if (p instanceof FeaturePointer) return this.fp(p);
    // MeeplePointer → Gson reflection: {featurePointer, meepleId}
    if (p instanceof MeeplePointer) {
      return { featurePointer: this.fp(p.asFeaturePointer()), meepleId: p.getMeepleId() };
    }
    if (p instanceof Position) return this.pos(p);
    return null;
  }

  /** Serialize one player action (port of the per-action serializers). */
  private serializeAction(action: PlayerAction<unknown>): Record<string, unknown> {
    if (action instanceof TilePlacementAction) {
      const byPos = new Map<
        string,
        { pos: Position; rots: number[]; bridges: Record<number, unknown> }
      >();
      for (const opt of action.getOptions()) {
        const p = opt.getPosition();
        const key = `${p.x},${p.y}`;
        let g = byPos.get(key);
        if (!g) {
          g = { pos: p, rots: [], bridges: {} };
          byPos.set(key, g);
        }
        const rot = this.rotationToPrimitive(opt.getRotation());
        g.rots.push(rot);
        // A rotation that is only legal because a bridge is auto-placed carries a
        // mandatoryBridge. Emit it keyed by rotation so the client can warn the player
        // and preview the bridge. Its position may differ from the tile position
        // (adjacent-tile case), so serialize the full FeaturePointer.
        const bridge = opt.getMandatoryBridge();
        if (bridge !== null) {
          g.bridges[rot] = this.fp(bridge);
        }
      }
      const options = [...byPos.values()].map((g) => {
        const o: Record<string, unknown> = {
          position: this.pos(g.pos),
          rotations: g.rots.slice().sort((a, b) => a - b),
        };
        if (Object.keys(g.bridges).length > 0) {
          o.bridges = g.bridges;
        }
        return o;
      });
      return { type: "TilePlacement", tileId: action.getTile().getId(), options };
    }
    if (action instanceof MeepleAction) {
      const json: Record<string, unknown> = {
        type: "Meeple",
        meeple: simpleName(action.getMeepleType()),
        options: [...action.getOptions()].map((fp) => this.fp(fp)),
      };
      const origin = action.getOrigin();
      if (origin !== null) json.origin = this.fp(origin);
      return json;
    }
    if (action instanceof FlockAction) {
      const mp = action.getShepherdPointer();
      return {
        type: "Flock",
        meepleId: mp.getMeepleId(),
        position: this.pos(mp.getPosition()),
        feature: "Field",
        location: this.loc(mp.getLocation()),
      };
    }
    if (action instanceof ReturnMeepleAction) {
      return {
        type: "ReturnMeeple",
        source: action.getReturnMeepleSource().name(),
        options: [...action.getOptions()].map((ptr) => this.boardPtr(ptr)),
      };
    }
    if (action instanceof LittleBuildingAction) {
      return {
        type: "LittleBuilding",
        options: [...action.getOptions()].map((lb) => lb.name()),
        position: this.pos(action.getPosition()),
      };
    }
    if (action instanceof FairyNextToAction) {
      return {
        type: "MoveFairyNextTo",
        figureId: action.getFigureId(),
        options: [...action.getOptions()].map((ptr) => this.boardPtr(ptr)),
      };
    }
    if (action instanceof FairyOnTileAction) {
      return {
        type: "MoveFairyOnTile",
        figureId: action.getFigureId(),
        options: [...action.getOptions()].map((pos) => this.pos(pos)),
      };
    }
    if (action instanceof NeutralFigureAction) {
      return {
        type: "NeutralFigure",
        figureId: action.getFigure().getId(),
        options: [...action.getOptions()].map((ptr) => this.boardPtr(ptr)),
      };
    }
    if (action instanceof RemoveMageOrWitchAction) {
      return {
        type: "RemoveMageOrWitch",
        options: [...action.getOptions()].map((fig) => fig.getId()),
      };
    }
    if (action instanceof TowerPieceAction) {
      return {
        type: "TowerPiece",
        token: action.getToken().name(),
        options: [...action.getOptions()].map((pos) => this.pos(pos)),
      };
    }
    if (action instanceof CaptureFollowerAction) {
      return {
        type: "CaptureFollower",
        options: [...action.getOptions()].map((ptr) => this.boardPtr(ptr)),
      };
    }
    if (action instanceof SelectPrisonerToExchangeAction) {
      return {
        type: "SelectPrisonerToExchange",
        options: [...action.getOptions()].map((f) => ({
          type: simpleName(f.constructor as ClassToken),
          id: f.getId(),
        })),
      };
    }
    if (action instanceof BridgeAction) {
      return {
        type: "Bridge",
        options: [...action.getOptions()].map((ptr) => this.boardPtr(ptr)),
      };
    }
    if (action instanceof CastleAction) {
      return {
        type: "Castle",
        options: [...action.getOptions()].map((ptr) => this.boardPtr(ptr)),
      };
    }
    if (action instanceof CornCircleSelectDeployOrRemoveAction) {
      return {
        type: "CornCircleSelectDeployOrRemove",
        featureType: simpleName(action.getCornType()),
      };
    }
    if (action instanceof BazaarSelectTileAction) {
      return { type: "BazaarSelectTile", noAuction: action.getNoAuction() };
    }
    if (action instanceof BazaarBidAction) {
      return { type: "BazaarBid" };
    }
    if (action instanceof BazaarSelectBuyOrSellAction) {
      return { type: "BazaarSelectBuyOrSell" };
    }
    if (action instanceof ConfirmAction) {
      return { type: "Confirm" };
    }
    if (action instanceof PreDrawPlaceAction) {
      // opaque "place a tile from your pre-draw hand"; the client lists its own held tiles
      return { type: "PreDrawPlace" };
    }
    if (action instanceof ShepherdPlacementConfirmAction) {
      // Java's Gson reflects this field-less action to an empty object.
      return {};
    }
    if (action instanceof TilePlacementConfirmAction) {
      // field-less action — Java's default Gson reflection emits an empty object.
      return {};
    }
    if (action instanceof GoldPieceAction) {
      return {
        type: "GoldPiece",
        options: [...action.getOptions()].map((pos) => this.pos(pos)),
      };
    }
    if (action instanceof DonkeyAction) {
      return {
        type: "MoveDonkeyOnTile",
        figureId: action.getFigureId(),
        options: [...action.getOptions()].map((pos) => this.pos(pos)),
      };
    }
    if (action instanceof TunnelAction) {
      return {
        type: "Tunnel",
        token: action.getToken().name(),
        options: [...action.getOptions()].map((fp) => this.boardPtr(fp)),
      };
    }
    if (action instanceof FerriesAction) {
      return {
        type: "Ferries",
        options: [...action.getOptions()].map((fp) => this.boardPtr(fp)),
      };
    }
    if (action instanceof ScoreAcrobatsAction) {
      return {
        type: "ScoreAcrobats",
        options: [...action.getOptions()].map((fp) => this.boardPtr(fp)),
      };
    }
    if (action instanceof MoveDragonAction) {
      return {
        type: "MoveDragon",
        figureId: action.getFigureId(),
        options: [...action.getOptions()].map((pos) => this.pos(pos)),
      };
    }
    // Fallback (SelectFeature family, ...): name w/o "Action".
    // TODO(serializer): dedicated serializers (options list etc.) per action type.
    return { type: simpleName(action.constructor as ClassToken).replace(/Action$/, "") };
  }

  private fp(fp: FeaturePointer): Record<string, unknown> {
    const feat = fp.getFeature();
    return {
      position: this.pos(fp.getPosition()),
      location: this.loc(fp.getLocation()),
      feature: feat === null ? null : simpleName(feat),
    };
  }

  private pos(p: Position): [number, number] {
    return [p.x, p.y];
  }
  private loc(l: Location | null): string | null {
    return l === null ? null : l.toString();
  }
  private rotationToPrimitive(rot: Rotation): number {
    return rot.ordinal() * 90;
  }
}
