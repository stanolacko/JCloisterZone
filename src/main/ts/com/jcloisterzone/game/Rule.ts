import { JavaEnum, enumValueOf } from "../../../lang/JavaEnum.js";

type RuleType = "boolean" | "string" | "integer";

/** Game rule options (key, value type, allowed values). */
export class Rule extends JavaEnum {
  static readonly ESCAPE = new Rule("ESCAPE", 0, null, "boolean", null);
  static readonly PRINCESS_ACTION = new Rule("PRINCESS_ACTION", 1, "princess-action", "string", ["may", "must"]);
  static readonly FAIRY_PLACEMENT = new Rule("FAIRY_PLACEMENT", 2, "fairy-placement", "string", ["next-follower", "on-tile"]);
  static readonly DRAGON_MOVEMENT = new Rule("DRAGON_MOVEMENT", 3, "dragon-move", "string", ["before-scoring", "after-scoring"]);
  static readonly WAGON_MOVE = new Rule("WAGON_MOVE", 4, "wagon-move", "string", ["C1", "C2"]);
  static readonly BARN_PLACEMENT = new Rule("BARN_PLACEMENT", 5, "barn-placement", "string", ["not-occupied", "occupied"]);
  static readonly BAZAAR_NO_AUCTION = new Rule("BAZAAR_NO_AUCTION", 6, "bazaar-no-auction", "boolean", null);
  static readonly HILL_TIEBREAKER = new Rule("HILL_TIEBREAKER", 7, "hill-tiebreaker", "string", ["at-least-one-follower", "number-of-followers"]);
  static readonly ESCAPE_VARIANT = new Rule("ESCAPE_VARIANT", 8, "espace-variant", "string", ["any-tile", "siege-tile"]);
  static readonly TUNNELIZE_OTHER_EXPANSIONS = new Rule("TUNNELIZE_OTHER_EXPANSIONS", 9, "tunnelize-other-expansions", "boolean", null);
  static readonly MORE_TUNNEL_TOKENS = new Rule("MORE_TUNNEL_TOKENS", 10, "more-tunnel-tokens", "string", ["3/2", "2/1", "1/1"]);
  static readonly FESTIVAL_RETURN = new Rule("FESTIVAL_RETURN", 11, "festival-return", "string", ["meeple", "follower"]);
  static readonly KEEP_MONASTERIES = new Rule("KEEP_MONASTERIES", 12, "keep-monasteries", "string", ["replace", "keep"]);
  static readonly LABYRINTH_VARIANT = new Rule("LABYRINTH_VARIANT", 13, "labyrinth-variant", "string", ["basic", "advanced"]);
  static readonly LITTLE_BUILDINGS_SCORING = new Rule("LITTLE_BUILDINGS_SCORING", 14, "little-buildings-scoring", "string", ["1/1/1", "3/2/1"]);
  static readonly KING_AND_ROBBER_SCORING = new Rule("KING_AND_ROBBER_SCORING", 15, "king-and-robber-scoring", "string", ["default", "10/20", "15/40", "continuously"]);
  static readonly TINY_CITY_SCORING = new Rule("TINY_CITY_SCORING", 16, "tiny-city-scoring", "string", ["4", "2"]);
  static readonly COC_FINAL_SCORING = new Rule("COC_FINAL_SCORING", 17, "coc-final-scoring", "string", ["market-only", "any-district"]);
  static readonly COUNT_MOVE = new Rule("COUNT_MOVE", 18, "count-move", "string", ["by-player", "clockwise", "follow-meeple"]);
  static readonly INN_AND_CATHEDRAL_FINAL_SCORING = new Rule("INN_AND_CATHEDRAL_FINAL_SCORING", 19, "inn-and-cathedral-final-scoring", "string", ["zero", "ignore"]);
  static readonly VINEYARDS_FOR_GARDEN = new Rule("VINEYARDS_FOR_GARDEN", 20, "vineyards-for-garden", "boolean", null);
  static readonly ROBBERS_SON_ACTION = new Rule("ROBBERS_SON_ACTION", 21, "robbers-son-action", "string", ["may", "must"]);
  static readonly METEORITE_IMPACT = new Rule("METEORITE_IMPACT", 22, "meteorite-impact", "string", ["standard", "extended", "combination"]);
  static readonly BLACK_FAIRY_PLACEMENT = new Rule("BLACK_FAIRY_PLACEMENT", 23, "black-fairy-placement", "string", ["next-follower", "on-tile"]);

  private readonly key: string | null;
  private readonly type: RuleType;
  private readonly allowedValues: string[] | null;

  constructor(name: string, ordinal: number, key: string | null, type: RuleType, allowedValues: string[] | null) {
    super(name, ordinal);
    this.key = key;
    this.type = type;
    this.allowedValues = allowedValues;
  }

  private static readonly VALUES: readonly Rule[] = [
    Rule.ESCAPE, Rule.PRINCESS_ACTION, Rule.FAIRY_PLACEMENT, Rule.DRAGON_MOVEMENT, Rule.WAGON_MOVE,
    Rule.BARN_PLACEMENT, Rule.BAZAAR_NO_AUCTION, Rule.HILL_TIEBREAKER, Rule.ESCAPE_VARIANT,
    Rule.TUNNELIZE_OTHER_EXPANSIONS, Rule.MORE_TUNNEL_TOKENS, Rule.FESTIVAL_RETURN, Rule.KEEP_MONASTERIES,
    Rule.LABYRINTH_VARIANT, Rule.LITTLE_BUILDINGS_SCORING, Rule.KING_AND_ROBBER_SCORING, Rule.TINY_CITY_SCORING,
    Rule.COC_FINAL_SCORING, Rule.COUNT_MOVE, Rule.INN_AND_CATHEDRAL_FINAL_SCORING, Rule.VINEYARDS_FOR_GARDEN,
    Rule.ROBBERS_SON_ACTION, Rule.METEORITE_IMPACT, Rule.BLACK_FAIRY_PLACEMENT,
  ];

  static values(): readonly Rule[] {
    return Rule.VALUES;
  }

  static valueOf(name: string): Rule {
    return enumValueOf(Rule.VALUES, name);
  }

  getType(): RuleType {
    return this.type;
  }

  unpackValue(value: string): unknown {
    if (this.type === "boolean") {
      return value === "true";
    } else if (this.type === "integer") {
      return Math.trunc(Number(value));
    } else {
      return value;
    }
  }

  static byKey(key: string): Rule {
    for (const r of Rule.VALUES) {
      if (key === r.key) {
        return r;
      }
    }
    throw new Error("Unknown key");
  }
}
