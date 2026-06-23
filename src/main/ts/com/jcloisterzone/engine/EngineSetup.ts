import { HashMap, type Map as VMap } from "../../../io/vavr/Map.js";
import { HashSet, type Set } from "../../../io/vavr/Set.js";
import { List } from "../../../io/vavr/SeqTypes.js";
import type { ClassToken } from "../../../lang/Class.js";
import { Abbot } from "../figure/Abbot.js";
import { Barn } from "../figure/Barn.js";
import { BigFollower } from "../figure/BigFollower.js";
import { Builder } from "../figure/Builder.js";
import { DecinskySneznik } from "../figure/DecinskySneznik.js";
import { Mayor } from "../figure/Mayor.js";
import type { Meeple } from "../figure/Meeple.js";
import { Obelisk } from "../figure/Obelisk.js";
import { Windmill } from "../figure/Windmill.js";
import { Phantom } from "../figure/Phantom.js";
import { Pig } from "../figure/Pig.js";
import { Ringmaster } from "../figure/Ringmaster.js";
import { Shepherd } from "../figure/Shepherd.js";
import { SmallFollower } from "../figure/SmallFollower.js";
import { Wagon } from "../figure/Wagon.js";
import type { Capability } from "../game/Capability.js";
import { GameSetup } from "../game/GameSetup.js";
import { Rule } from "../game/Rule.js";
import { BlackTowerCapability } from "../game/capability/BlackTowerCapability.js";
import { AbbeyCapability } from "../game/capability/AbbeyCapability.js";
import { AbbotCapability } from "../game/capability/AbbotCapability.js";
import { BarnCapability } from "../game/capability/BarnCapability.js";
import { BridgeCapability } from "../game/capability/BridgeCapability.js";
import { CastleCapability } from "../game/capability/CastleCapability.js";
import { GoldminesCapability } from "../game/capability/GoldminesCapability.js";
import { MageAndWitchCapability } from "../game/capability/MageAndWitchCapability.js";
import { ObeliskCapability } from "../game/capability/ObeliskCapability.js";
import { WindmillCapability } from "../game/capability/WindmillCapability.js";
import { DecinskySneznikCapability } from "../game/capability/DecinskySneznikCapability.js";
import { DonkeyCapability } from "../game/capability/DonkeyCapability.js";
import { FlierCapability } from "../game/capability/FlierCapability.js";
import { CornCircleCapability } from "../game/capability/CornCircleCapability.js";
import { FestivalCapability } from "../game/capability/FestivalCapability.js";
import { SiegeCapability } from "../game/capability/SiegeCapability.js";
import { WatchtowerCapability } from "../game/capability/WatchtowerCapability.js";
import { ShrineCapability } from "../game/capability/ShrineCapability.js";
import { PhantomCapability } from "../game/capability/PhantomCapability.js";
import { FairyCapability } from "../game/capability/FairyCapability.js";
import { ChurchCapability } from "../game/capability/ChurchCapability.js";
import { FerriesCapability } from "../game/capability/FerriesCapability.js";
import { FieldCapability } from "../game/capability/FieldCapability.js";
import { GamblersLuckCapability } from "../game/capability/GamblersLuckCapability.js";
import { GardenCapability } from "../game/capability/GardenCapability.js";
import { HillCapability } from "../game/capability/HillCapability.js";
import { KingCapability } from "../game/capability/KingCapability.js";
import { MonasteriesCapability } from "../game/capability/MonasteriesCapability.js";
import { PigHerdCapability } from "../game/capability/PigHerdCapability.js";
import { RussianPromosTrapCapability } from "../game/capability/RussianPromosTrapCapability.js";
import { CountCapability } from "../game/capability/CountCapability.js";
import { AcrobatsCapability } from "../game/capability/AcrobatsCapability.js";
import { BigTopCapability } from "../game/capability/BigTopCapability.js";
import { RingmasterCapability } from "../game/capability/RingmasterCapability.js";
import { PortalCapability } from "../game/capability/PortalCapability.js";
import { PrincessCapability } from "../game/capability/PrincessCapability.js";
import { DragonCapability } from "../game/capability/DragonCapability.js";
import { RobbersSonCapability } from "../game/capability/RobbersSonCapability.js";
import { MeteoriteCapability } from "../game/capability/MeteoriteCapability.js";
import { CourierCapability } from "../game/capability/CourierCapability.js";
import { RobberCapability } from "../game/capability/RobberCapability.js";
import { SheepCapability } from "../game/capability/SheepCapability.js";
import { WindRoseCapability } from "../game/capability/WindRoseCapability.js";
import { LittleBuildingsCapability } from "../game/capability/LittleBuildingsCapability.js";
import { MarketplaceCapability } from "../game/capability/MarketplaceCapability.js";
import { RiverCapability } from "../game/capability/RiverCapability.js";
import { FishermenCapability } from "../game/capability/FishermenCapability.js";
import { FishHutsCapability } from "../game/capability/FishHutsCapability.js";
import { FlowersCapability } from "../game/capability/FlowersCapability.js";
import { BazaarCapability } from "../game/capability/BazaarCapability.js";
import { PreDrawCapability } from "../game/capability/PreDrawCapability.js";
import { BuilderCapability } from "../game/capability/BuilderCapability.js";
import { FamiliesCapability } from "../game/capability/FamiliesCapability.js";
import { TowerCapability } from "../game/capability/TowerCapability.js";
import { TradeGoodsCapability } from "../game/capability/TradeGoodsCapability.js";
import { TunnelCapability } from "../game/capability/TunnelCapability.js";
import { WagonCapability } from "../game/capability/WagonCapability.js";
import { VineyardCapability } from "../game/capability/VineyardCapability.js";
import type { GameSetupMessage } from "../io/message/GameSetupMessage.js";

type MeepleClass = ClassToken<Meeple>;
type CapClass = ClassToken<Capability<unknown>>;

// element key -> meeple class (ported subset).
const MEEPLES: Array<[string, MeepleClass]> = [
  ["small-follower", SmallFollower as unknown as MeepleClass],
  ["abbot", Abbot as unknown as MeepleClass],
  ["phantom", Phantom as unknown as MeepleClass],
  ["big-follower", BigFollower as unknown as MeepleClass],
  ["builder", Builder as unknown as MeepleClass],
  ["pig", Pig as unknown as MeepleClass],
  ["barn", Barn as unknown as MeepleClass],
  ["wagon", Wagon as unknown as MeepleClass],
  ["mayor", Mayor as unknown as MeepleClass],
  ["shepherd", Shepherd as unknown as MeepleClass],
  ["ringmaster", Ringmaster as unknown as MeepleClass],
  ["obelisk", Obelisk as unknown as MeepleClass],
  ["windmill", Windmill as unknown as MeepleClass],
  ["decinsky-sneznik", DecinskySneznik as unknown as MeepleClass],
  // TODO(figures): barn, obelisk, windmill, decinsky-sneznik.
];

// element key -> capability class (ported subset).
const CAPABILITIES: Array<[string, CapClass]> = [
  ["farmers", FieldCapability as unknown as CapClass],
  ["garden", GardenCapability as unknown as CapClass],
  ["abbot", AbbotCapability as unknown as CapClass],
  ["abbey", AbbeyCapability as unknown as CapClass],
  ["barn", BarnCapability as unknown as CapClass],
  ["castle", CastleCapability as unknown as CapClass],
  ["mage", MageAndWitchCapability as unknown as CapClass],
  ["witch", MageAndWitchCapability as unknown as CapClass],
  ["phantom", PhantomCapability as unknown as CapClass],
  ["gold", GoldminesCapability as unknown as CapClass],
  ["obelisk", ObeliskCapability as unknown as CapClass],
  ["windmill", WindmillCapability as unknown as CapClass],
  ["decinsky-sneznik", DecinskySneznikCapability as unknown as CapClass],
  ["donkey", DonkeyCapability as unknown as CapClass],
  ["flier", FlierCapability as unknown as CapClass],
  ["corn-circle", CornCircleCapability as unknown as CapClass],
  ["shrine", ShrineCapability as unknown as CapClass],
  ["wagon", WagonCapability as unknown as CapClass],
  ["fairy", FairyCapability as unknown as CapClass],
  ["church", ChurchCapability as unknown as CapClass],
  ["monastery", MonasteriesCapability as unknown as CapClass],
  ["wind-rose", WindRoseCapability as unknown as CapClass],
  ["traders", TradeGoodsCapability as unknown as CapClass],
  ["pig-herd", PigHerdCapability as unknown as CapClass],
  ["russian-trap", RussianPromosTrapCapability as unknown as CapClass],
  ["count", CountCapability as unknown as CapClass],
  ["acrobats", AcrobatsCapability as unknown as CapClass],
  ["big-top", BigTopCapability as unknown as CapClass],
  ["ringmaster", RingmasterCapability as unknown as CapClass],
  ["portal", PortalCapability as unknown as CapClass],
  ["princess", PrincessCapability as unknown as CapClass],
  ["dragon", DragonCapability as unknown as CapClass],
  ["robbers-son", RobbersSonCapability as unknown as CapClass],
  ["meteorite", MeteoriteCapability as unknown as CapClass],
  ["courier", CourierCapability as unknown as CapClass],
  ["king", KingCapability as unknown as CapClass],
  ["robber", RobberCapability as unknown as CapClass],
  ["tower", TowerCapability as unknown as CapClass],
  ["tunnel", TunnelCapability as unknown as CapClass],
  ["ferry", FerriesCapability as unknown as CapClass],
  ["little-buildings", LittleBuildingsCapability as unknown as CapClass],
  ["bridge", BridgeCapability as unknown as CapClass],
  ["hill", HillCapability as unknown as CapClass],
  ["vineyard", VineyardCapability as unknown as CapClass],
  ["shepherd", SheepCapability as unknown as CapClass],
  ["marketplace", MarketplaceCapability as unknown as CapClass],
  ["gamblersluck", GamblersLuckCapability as unknown as CapClass],
  ["black-tower", BlackTowerCapability as unknown as CapClass],
  ["festival", FestivalCapability as unknown as CapClass],
  ["siege", SiegeCapability as unknown as CapClass],
  ["watchtower", WatchtowerCapability as unknown as CapClass],
  ["fishhut", FishHutsCapability as unknown as CapClass],
  ["flowers", FlowersCapability as unknown as CapClass],
  ["bazaar", BazaarCapability as unknown as CapClass],
  ["pre-draw", PreDrawCapability as unknown as CapClass],
  ["builder", BuilderCapability as unknown as CapClass],
  ["families", FamiliesCapability as unknown as CapClass],
  // TODO(capabilities): the many unported expansion capabilities.
];

/** Builds a GameSetup from a GameSetupMessage. Port of Engine.createSetupFromMessage:
 *  `elements` is the sole selector for mechanics (capabilities) + meeples — read as-is.
 *  `sets` only choose tiles; `addons` is save metadata. The frontend (and, for replay
 *  goldens, scripts/jcz-wire.mjs + the parity test harness) is what populates `elements`;
 *  the engine never derives them from `sets`. */
export function createSetupFromMessage(setupMsg: GameSetupMessage): GameSetup {
  const elements: Record<string, unknown> = { ...setupMsg.getElements() };

  let meeples: VMap<MeepleClass, number> = HashMap.empty();
  for (const [key, cls] of MEEPLES) {
    const cnt = elements[key];
    if (cnt === undefined || cnt === null) continue;
    const count = parseInt(String(cnt).split(".")[0], 10);
    if (count > 0) meeples = meeples.put(cls, count);
  }

  let rules: VMap<Rule, unknown> = HashMap.empty();
  if (Object.prototype.hasOwnProperty.call(elements, "escape")) {
    rules = rules.put(Rule.ESCAPE, true);
  }
  for (const [key, value] of Object.entries(setupMsg.getRules())) {
    // Rule.byKey throws on unknown keys; a real client may send a rule we haven't
    // ported yet — skip it (with a `#`-diagnostic) instead of failing GAME_SETUP.
    let rule: Rule | null = null;
    try {
      rule = Rule.byKey(key);
    } catch {
      // eslint-disable-next-line no-console
      console.error(`#unknown rule '${key}' ignored`);
    }
    if (rule !== null) rules = rules.put(rule, value);
  }

  // Capabilities come solely from `elements` (mirrors Java Engine.addCapabilities). E.g.
  // RiverCapability is added only when the `river` element is present — never from a `river/*`
  // tile set; the frontend is what turns the set into the element.
  let capabilities: Set<CapClass> = HashSet.empty();
  for (const [key, cls] of CAPABILITIES) {
    if (elements[key] !== undefined && elements[key] !== null) {
      capabilities = capabilities.add(cls);
    }
  }
  // Mirrors Engine.java: fishermen REPLACES the river capability — the marker keeps the
  // river tile groups at their default activation and lifts the river placement rules.
  if (elements["fishermen"] !== undefined && elements["fishermen"] !== null) {
    capabilities = capabilities.add(FishermenCapability as unknown as CapClass);
  } else if (elements["river"] !== undefined && elements["river"] !== null) {
    capabilities = capabilities.add(RiverCapability as unknown as CapClass);
  }

  return new GameSetup(
    HashMap.ofAll(setupMsg.getSets()),
    HashMap.ofAll(elements),
    meeples,
    capabilities,
    rules,
    List.ofAll(setupMsg.getStart()),
  );
}
