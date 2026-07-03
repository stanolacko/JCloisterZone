import type { ClassToken } from "../../../lang/Class.js";
import { Location } from "../board/Location.js";
import { Position } from "../board/Position.js";
import { Rotation } from "../board/Rotation.js";
import { FeaturePointer } from "../board/pointer/FeaturePointer.js";
import { AbbeyEdge } from "../feature/AbbeyEdge.js";
import { Acrobats } from "../feature/Acrobats.js";
import { Bush } from "../feature/Bush.js";
import { Castle } from "../feature/Castle.js";
import { City } from "../feature/City.js";
import { CityGate } from "../feature/CityGate.js";
import { Field } from "../feature/Field.js";
import { FlyingMachine } from "../feature/FlyingMachine.js";
import { Garden } from "../feature/Garden.js";
import { GamblersLuckShield } from "../feature/GamblersLuckShield.js";
import { Marketplace } from "../feature/Marketplace.js";
import { Monastery } from "../feature/Monastery.js";
import { River } from "../feature/River.js";
import { Road } from "../feature/Road.js";
import { Tower } from "../feature/Tower.js";
import { YagaHut } from "../feature/YagaHut.js";
import { FishHut } from "../feature/FishHut.js";
import { Vodyanoy } from "../feature/Vodyanoy.js";
import { SoloveiRazboynik } from "../feature/SoloveiRazboynik.js";
import { Quarter } from "../feature/Quarter.js";
import { Circus } from "../feature/Circus.js";
import { CourierLetter } from "../feature/CourierLetter.js";
import { BridgeCapability } from "../game/capability/BridgeCapability.js";
import { CastleCapability } from "../game/capability/CastleCapability.js";
import { GoldminesCapability } from "../game/capability/GoldminesCapability.js";
import { TunnelCapability } from "../game/capability/TunnelCapability.js";
import { FerriesCapability } from "../game/capability/FerriesCapability.js";
import { LittleBuildingsCapability } from "../game/capability/LittleBuildingsCapability.js";
import { TowerCapability } from "../game/capability/TowerCapability.js";
import type { Token } from "../game/Token.js";
import { DeployMeepleMessage } from "./message/DeployMeepleMessage.js";
import { CaptureFollowerMessage } from "./message/CaptureFollowerMessage.js";
import { PayRansomMessage } from "./message/PayRansomMessage.js";
import { ExchangeFollowerChoiceMessage } from "./message/ExchangeFollowerChoiceMessage.js";
import { CommitMessage } from "./message/CommitMessage.js";
import { PlacePreDrawnMessage } from "./message/PlacePreDrawnMessage.js";
import { BazaarBidMessage } from "./message/BazaarBidMessage.js";
import { BazaarBuyOrSellMessage } from "./message/BazaarBuyOrSellMessage.js";
import { CornCircleRemoveOrDeployMessage } from "./message/CornCircleRemoveOrDeployMessage.js";
import { FlockMessage } from "./message/FlockMessage.js";
import { GameSetupMessage } from "./message/GameSetupMessage.js";
import { MeeplePointer } from "../board/pointer/MeeplePointer.js";
import type { BoardPointer } from "../board/pointer/BoardPointer.js";
import { MoveNeutralFigureMessage } from "./message/MoveNeutralFigureMessage.js";
import type { Message } from "./message/Message.js";
import { PassMessage } from "./message/PassMessage.js";
import { PlaceTileMessage } from "./message/PlaceTileMessage.js";
import { PlaceTokenMessage } from "./message/PlaceTokenMessage.js";
import { ShepherdPlacementConfirmMessage } from "./message/ShepherdPlacementConfirmMessage.js";
import { ScoreAcrobatsMessage } from "./message/ScoreAcrobatsMessage.js";
import { ReturnMeepleMessage } from "./message/ReturnMeepleMessage.js";
import { TilePlacementConfirmMessage } from "./message/TilePlacementConfirmMessage.js";
import { ReturnMeepleSource } from "../game/ReturnMeepleSource.js";
import { AiMessage } from "./message/AiMessage.js";
import { simpleName } from "../../../lang/Class.js";

/** Resolve a replay token string to its Token enum value. */
function resolveToken(name: string): Token {
  if (name.startsWith("LB_")) {
    return LittleBuildingsCapability.LittleBuilding.valueOf(name);
  }
  if (name.endsWith("TOWER_PIECE")) {
    return TowerCapability.TowerToken.valueOf(name);
  }
  if (name === "BRIDGE") {
    return BridgeCapability.BridgeToken.BRIDGE;
  }
  if (name === "CASTLE") {
    return CastleCapability.CastleToken.CASTLE;
  }
  if (name === "GOLD") {
    return GoldminesCapability.GoldToken.GOLD;
  }
  if (name.startsWith("TUNNEL_")) {
    return TunnelCapability.Tunnel.valueOf(name);
  }
  if (name === "FERRY") {
    return FerriesCapability.FerryToken.FERRY;
  }
  throw new Error("Unknown token " + name);
}

/** Feature simple-name -> class token (for pointer.feature in replay JSON). */
const FEATURES: Record<string, ClassToken> = Object.fromEntries(
  [
    AbbeyEdge, Acrobats, Bush, Castle, City, CityGate, Field, FlyingMachine, Garden,
    GamblersLuckShield, Marketplace, Monastery, River, Road, Tower,
    YagaHut, FishHut, Vodyanoy, SoloveiRazboynik, Quarter, Circus, CourierLetter,
  ].map((c) => [(c as { simpleName?: string }).simpleName ?? c.name, c as unknown as ClassToken]),
);

interface ReplayEntry {
  type: string;
  payload: Record<string, unknown>;
  // Top-level message fields (present on live wire messages). The AI request carries
  // `player`/`seq`/`random` at the top level — matching Java, which deserializes the
  // whole message line into AiMessage (Engine.java: gson.fromJson(line, AiMessage.class)).
  player?: number | null;
  seq?: number | null;
  random?: number | null;
}

/** Parses replay JSON entries into Message objects (subset used by basic games). */
export class MessageParser {
  /** Build a GameSetupMessage from the GAME_SETUP wire payload (or .jcz setup block). */
  parseSetup(payload: Record<string, unknown>): GameSetupMessage {
    const msg = new GameSetupMessage();
    msg.sets = (payload.sets as Record<string, number>) ?? {};
    msg.tiles = (payload.tiles as Record<string, number> | null) ?? null;
    msg.elements = (payload.elements as Record<string, unknown>) ?? {};
    msg.rules = (payload.rules as Record<string, unknown>) ?? {};
    msg.timer = (payload.timer as Record<string, unknown> | null) ?? null;
    msg.players = (payload.players as number) ?? 0;
    msg.initialRandom = (payload.initialRandom as number) ?? 0;
    msg.gameAnnotations = (payload.gameAnnotations as Record<string, unknown>) ?? {};
    const start = (payload.start as Array<{ tile: string; x: number; y: number; rotation: number }>) ?? [];
    msg.start = start.map((s) => {
      const item = new GameSetupMessage.PlacedTileItem();
      item.tile = s.tile;
      item.x = s.x;
      item.y = s.y;
      item.rotation = s.rotation;
      return item;
    });
    return msg;
  }

  parse(entry: ReplayEntry): Message {
    const p = entry.payload;
    switch (entry.type) {
      case "PLACE_TILE": {
        const position = p.position as [number, number];
        return new PlaceTileMessage(
          p.tileId as string,
          Rotation.valueOf(p.rotation as string),
          new Position(position[0], position[1]),
        );
      }
      case "PLACE_PREDRAWN": {
        const ppos = p.position as [number, number];
        return new PlacePreDrawnMessage(
          p.tileId as string,
          Rotation.valueOf(p.rotation as string),
          new Position(ppos[0], ppos[1]),
        );
      }
      case "DEPLOY_MEEPLE": {
        const ptr = p.pointer as { position: [number, number]; feature: string; location: string };
        const featureClass = FEATURES[ptr.feature];
        if (!featureClass) throw new Error("Unknown feature in pointer: " + ptr.feature);
        const fp = new FeaturePointer(
          new Position(ptr.position[0], ptr.position[1]),
          featureClass,
          Location.valueOf(ptr.location),
        );
        return new DeployMeepleMessage(fp, p.meepleId as string, (p.random as number) ?? null);
      }
      case "PLACE_TOKEN":
        // pointer is [x,y] (little buildings) or {position,feature,location} (tower)
        return new PlaceTokenMessage(resolveToken(p.token as string), this.parseBoardPointer(p.pointer));
      case "CAPTURE_FOLLOWER":
        return new CaptureFollowerMessage(this.parseBoardPointer(p.pointer) as MeeplePointer);
      case "PAY_RANSOM":
        return new PayRansomMessage(p.meepleId as string);
      case "EXCHANGE_FOLLOWER":
        return new ExchangeFollowerChoiceMessage(p.meepleId as string);
      case "RETURN_MEEPLE":
        return new ReturnMeepleMessage(
          this.parseBoardPointer(p.pointer) as MeeplePointer,
          ReturnMeepleSource.valueOf(p.source as string),
        );
      case "BAZAAR_BID":
        return new BazaarBidMessage(p.supplyIndex as number, p.price as number);
      case "BAZAAR_BUY_OR_SELL":
        return new BazaarBuyOrSellMessage(p.value as "BUY" | "SELL");
      case "COMMIT": {
        const m = new CommitMessage();
        if (p.random !== undefined && p.random !== null) m.setRandom(p.random as number);
        return m;
      }
      case "TILE_CONFIRM": {
        const m = new TilePlacementConfirmMessage();
        if (p.random !== undefined && p.random !== null) m.setRandom(p.random as number);
        return m;
      }
      case "CIRCLE_REMOVE_OR_DEPLOY":
        return new CornCircleRemoveOrDeployMessage(
          p.value as CornCircleRemoveOrDeployMessage.CornCircleOption,
        );
      case "SHEPHERD_CONFIRM": {
        const m = new ShepherdPlacementConfirmMessage();
        if (p.random !== undefined && p.random !== null) m.setRandom(p.random as number);
        return m;
      }
      case "FLOCK_EXPAND_OR_SCORE": {
        const m = new FlockMessage(p.value as FlockMessage.FlockOption);
        if (p.random !== undefined && p.random !== null) m.setRandom(p.random as number);
        return m;
      }
      case "MOVE_NEUTRAL_FIGURE":
        return new MoveNeutralFigureMessage(p.figureId as string, this.parseBoardPointer(p.to));
      case "SCORE_ACROBATS":
        return new ScoreAcrobatsMessage(this.parseBoardPointer(p.pointer) as FeaturePointer);
      case "PASS":
        return new PassMessage();
      case "AI": {
        const m = new AiMessage();
        // `player`/`seq`/`random` live at the TOP LEVEL of an AI message on the live wire
        // (the client sets message.player = action.player; payload holds only gameId).
        // Java reads the same from the whole line. Fall back to payload for callers that
        // nest them (e.g. the AI smoke test).
        const player = (entry.player ?? (p.player as number | null | undefined)) ?? null;
        const seq = (entry.seq ?? (p.seq as number | null | undefined)) ?? null;
        const random = entry.random ?? (p.random as number | null | undefined);
        m.setPlayer(player);
        m.setSeq(seq);
        if (random !== undefined && random !== null) m.setRandom(random as number);
        return m;
      }
      default:
        throw new Error("Unknown message type " + entry.type);
    }
  }

  /** Encode a FeaturePointer to its wire shape. */
  private encodeFp(fp: FeaturePointer): Record<string, unknown> {
    return {
      position: [fp.getPosition().x, fp.getPosition().y],
      feature: simpleName(fp.getFeature() as ClassToken),
      location: fp.getLocation()!.toString(),
    };
  }

  /** Encode a BoardPointer to its wire shape (inverse of parseBoardPointer). */
  private encodeBoardPointer(ptr: BoardPointer): unknown {
    if (ptr instanceof Position) return [ptr.x, ptr.y];
    if (ptr instanceof MeeplePointer) {
      return { featurePointer: this.encodeFp(ptr.asFeaturePointer()), meepleId: ptr.getMeepleId() };
    }
    return this.encodeFp(ptr as FeaturePointer);
  }

  /** Serialize a message back to its `{type, payload}` wire form. Inverse of
   *  {@link parse} for the subset of messages the engine emits (e.g. AI moves).
   *  Round-trips through parse(). */
  toWire(msg: Message): { type: string; payload: Record<string, unknown> } {
    if (msg instanceof PlaceTileMessage) {
      return {
        type: "PLACE_TILE",
        payload: {
          tileId: msg.getTileId(),
          rotation: msg.getRotation()!.toString(),
          position: [msg.getPosition()!.x, msg.getPosition()!.y],
        },
      };
    }
    if (msg instanceof DeployMeepleMessage) {
      return {
        type: "DEPLOY_MEEPLE",
        payload: { pointer: this.encodeFp(msg.getPointer()!), meepleId: msg.getMeepleId() },
      };
    }
    if (msg instanceof PlaceTokenMessage) {
      return {
        type: "PLACE_TOKEN",
        payload: { token: msg.getToken()!.name(), pointer: this.encodeBoardPointer(msg.getPointer()!) },
      };
    }
    if (msg instanceof CaptureFollowerMessage) {
      return { type: "CAPTURE_FOLLOWER", payload: { pointer: this.encodeBoardPointer(msg.getPointer()!) } };
    }
    if (msg instanceof MoveNeutralFigureMessage) {
      return {
        type: "MOVE_NEUTRAL_FIGURE",
        payload: { figureId: msg.getFigureId(), to: this.encodeBoardPointer(msg.getTo()!) },
      };
    }
    if (msg instanceof ReturnMeepleMessage) {
      return {
        type: "RETURN_MEEPLE",
        payload: {
          pointer: this.encodeBoardPointer(msg.getPointer()!),
          source: msg.getReturnMeepleSource()!.toString(),
        },
      };
    }
    if (msg instanceof ScoreAcrobatsMessage) {
      return { type: "SCORE_ACROBATS", payload: { pointer: this.encodeFp(msg.getPointer()!) } };
    }
    if (msg instanceof PayRansomMessage) {
      return { type: "PAY_RANSOM", payload: { meepleId: msg.getMeepleId() } };
    }
    if (msg instanceof ExchangeFollowerChoiceMessage) {
      return { type: "EXCHANGE_FOLLOWER", payload: { meepleId: msg.getMeepleId() } };
    }
    if (msg instanceof FlockMessage) {
      return { type: "FLOCK_EXPAND_OR_SCORE", payload: { value: msg.getValue()!.toString() } };
    }
    if (msg instanceof CornCircleRemoveOrDeployMessage) {
      return { type: "CIRCLE_REMOVE_OR_DEPLOY", payload: { value: msg.getValue()!.toString() } };
    }
    if (msg instanceof BazaarBidMessage) {
      return { type: "BAZAAR_BID", payload: { supplyIndex: msg.getSupplyIndex(), price: msg.getPrice() } };
    }
    if (msg instanceof BazaarBuyOrSellMessage) {
      return { type: "BAZAAR_BUY_OR_SELL", payload: { value: msg.getValue() } };
    }
    if (msg instanceof TilePlacementConfirmMessage) {
      return { type: "TILE_CONFIRM", payload: {} };
    }
    if (msg instanceof ShepherdPlacementConfirmMessage) {
      return { type: "SHEPHERD_CONFIRM", payload: {} };
    }
    if (msg instanceof CommitMessage) {
      return { type: "COMMIT", payload: {} };
    }
    if (msg instanceof PassMessage) {
      return { type: "PASS", payload: {} };
    }
    throw new Error("Cannot serialize message " + simpleName(msg.constructor as ClassToken));
  }

  private parseFp(o: { position: [number, number]; feature: string; location: string }): FeaturePointer {
    const fc = FEATURES[o.feature];
    if (!fc) throw new Error("Unknown feature " + o.feature);
    return new FeaturePointer(new Position(o.position[0], o.position[1]), fc, Location.valueOf(o.location));
  }

  /** Parse a BoardPointer from the wire: [x,y] Position | {featurePointer, meepleId}
   *  MeeplePointer | {position, feature, location} bare FeaturePointer. */
  private parseBoardPointer(to: unknown): BoardPointer {
    if (Array.isArray(to)) return new Position(to[0] as number, to[1] as number);
    const o = to as Record<string, unknown>;
    if (o.featurePointer) {
      return new MeeplePointer(
        this.parseFp(o.featurePointer as { position: [number, number]; feature: string; location: string }),
        (o.meepleId as string) ?? null,
      );
    }
    if (o.feature && o.position) {
      return this.parseFp(o as unknown as { position: [number, number]; feature: string; location: string });
    }
    if (o.position) {
      const pp = o.position as [number, number];
      return new Position(pp[0], pp[1]);
    }
    throw new Error("Unknown board pointer " + JSON.stringify(to));
  }
}
