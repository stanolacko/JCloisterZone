import { JavaEnum, enumValueOf } from "../../../../lang/JavaEnum.js";

/** Flags marking once-per-turn / once-per-turn-part actions. */
export class Flag extends JavaEnum {
  // Cleared at the turn end
  static readonly RANSOM_PAID = new Flag("RANSOM_PAID", 0);
  static readonly BAZAAR_AUCTION = new Flag("BAZAAR_AUCTION", 1);
  static readonly TUNNEL_PLACED = new Flag("TUNNEL_PLACED", 2);

  // Cleared at the turn part end
  static readonly PORTAL_USED = new Flag("PORTAL_USED", 3);
  static readonly NO_PHANTOM = new Flag("NO_PHANTOM", 4);
  static readonly FLYING_MACHINE_USED = new Flag("FLYING_MACHINE_USED", 5);

  // Cleared at the turn part end, solving Tower RandomPay between ActionPhase and ConfirmPhase
  static readonly ACTION_PHASE_DONE = new Flag("ACTION_PHASE_DONE", 6);
  static readonly PHANTOM_PHASE_DONE = new Flag("PHANTOM_PHASE_DONE", 7);
  static readonly POST_WOOD_ACTION_STARTED = new Flag("POST_WOOD_ACTION_STARTED", 8);
  static readonly WOOD_ACTION_CONFIRMED = new Flag("WOOD_ACTION_CONFIRMED", 9);

  // Set when the river's volcano lake (the forced-last river tile) is placed; consumed at the
  // turn end to grant the placing player another turn. Cleared at the turn end.
  static readonly RIVER_VOLCANO_DOUBLE_TURN = new Flag("RIVER_VOLCANO_DOUBLE_TURN", 10);

  private static readonly VALUES: readonly Flag[] = [
    Flag.RANSOM_PAID,
    Flag.BAZAAR_AUCTION,
    Flag.TUNNEL_PLACED,
    Flag.PORTAL_USED,
    Flag.NO_PHANTOM,
    Flag.FLYING_MACHINE_USED,
    Flag.ACTION_PHASE_DONE,
    Flag.PHANTOM_PHASE_DONE,
    Flag.POST_WOOD_ACTION_STARTED,
    Flag.WOOD_ACTION_CONFIRMED,
    Flag.RIVER_VOLCANO_DOUBLE_TURN,
  ];

  static values(): readonly Flag[] {
    return Flag.VALUES;
  }

  static valueOf(name: string): Flag {
    return enumValueOf(Flag.VALUES, name);
  }
}
