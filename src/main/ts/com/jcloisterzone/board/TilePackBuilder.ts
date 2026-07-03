import { LinkedHashMap } from "../../../io/vavr/Map.js";
import { Vector } from "../../../io/vavr/SeqTypes.js";
import {
  attributeIntValue,
  elementStream,
  parseDocument,
  type XmlElement,
} from "../XmlUtils.js";
import type { FeatureModifier } from "../feature/modifier/FeatureModifier.js";
import { BooleanAllModifier } from "../feature/modifier/BooleanAllModifier.js";
import { BooleanAnyModifier } from "../feature/modifier/BooleanAnyModifier.js";
import { IntegerAddModifier } from "../feature/modifier/IntegerAddModifier.js";
import { Rule } from "../game/Rule.js";
import { GameElementQuery } from "../game/setup/GameElementQuery.js";
import { TunnelCapability } from "../game/capability/TunnelCapability.js";
import type { GameState } from "../game/state/GameState.js";
import type { Map as VMap } from "../../../io/vavr/Map.js";
import { RemoveTileException } from "./RemoveTileException.js";
import { Tile } from "./Tile.js";
import { TileBuilder } from "./TileBuilder.js";
import { TileGroup } from "./TileGroup.js";
import { TilePack } from "./TilePack.js";

/**
 * Builds a {@link TilePack} from tile-definition XML. `definitions` is a list of
 * XML *contents* (strings) — the host fetches the files (browser-friendly; the
 * Java version read file paths).
 */
export class TilePackBuilder {
  static readonly DEFAULT_TILE_GROUP = "default";

  private readonly tileBuilder = new TileBuilder();
  private state!: GameState;
  private tileSets!: VMap<string, number>;
  private tileOverrides: Record<string, number> | null = null;

  private readonly usedIds = new Set<string>(); // assertion only
  private readonly tiles = new Map<string, Tile[]>();

  setGameState(state: GameState): void {
    this.state = state;
    this.tileBuilder.setGameState(state);
  }

  setTileSets(tileSets: VMap<string, number>): void {
    this.tileSets = tileSets;
  }

  /** Per-tile final-count overrides from GAME_SETUP `tiles`. An entry replaces the count
   *  computed from the sets (0 excludes the tile). Only applies to tiles the sets actually
   *  produce — it cannot resurrect `remove`d tiles or add tiles from unselected sets — and
   *  the per-tile XML `max` cap still holds. */
  setTileOverrides(tileOverrides: Record<string, number> | null): void {
    this.tileOverrides = tileOverrides;
  }

  private isTunnelActive(tileId: string): boolean {
    if (!this.state.getCapabilities().contains(TunnelCapability)) {
      return false;
    }
    return tileId.startsWith("TU/") || this.state.getBooleanRule(Rule.TUNNELIZE_OTHER_EXPANSIONS);
  }

  private getTileGroup(tile: Tile, tileElement: XmlElement): string {
    for (const cap of this.state.getCapabilities().toSeq()) {
      const group = cap.getTileGroup(tile);
      if (group !== null) return group;
    }
    const group = tileElement.getAttribute("group");
    if (group !== "") return group;
    return TilePackBuilder.DEFAULT_TILE_GROUP;
  }

  private initTile(tile: Tile, tileElement: XmlElement): Tile {
    for (const cap of this.state.getCapabilities().toSeq()) {
      tile = cap.initTile(this.state, tile, tileElement);
    }
    return tile;
  }

  private createTile(tileId: string, tileElement: XmlElement): Tile {
    if (this.usedIds.has(tileId)) {
      throw new Error("Multiple occurences of id " + tileId + " in tile definition xml.");
    }
    this.usedIds.add(tileId);
    const tile = this.tileBuilder.createTile(tileId, tileElement, this.isTunnelActive(tileId));
    return this.initTile(tile, tileElement);
  }

  createTilePack(definitions: string[]): TilePack {
    const tilesCount = new Map<string, number>();
    const removedTiles = new Set<string>();
    const modifiers: FeatureModifier<unknown>[] = [];

    // --- pass 1: modifiers + tile-set refs ---
    for (const content of definitions) {
      const element = parseDocument(content).documentElement;

      elementStream(element.getElementsByTagName("modifier")).forEach((modifierEl) => {
        const selector = modifierEl.getAttribute("selector");
        let enabledBy: GameElementQuery | null = null;
        if (modifierEl.hasAttribute("enabled-by")) {
          enabledBy = new GameElementQuery(modifierEl.getAttribute("enabled-by"));
        }
        const scoringNl = modifierEl.getElementsByTagName("scoring");
        const scoringScript = scoringNl.length > 0 ? (scoringNl.item(0)!.textContent ?? null) : null;

        let modifier: FeatureModifier<unknown> | null = null;
        switch (modifierEl.getAttribute("type")) {
          case "+":
            modifier = new IntegerAddModifier(selector, enabledBy) as unknown as FeatureModifier<unknown>;
            break;
          case "all":
            modifier = new BooleanAllModifier(selector, enabledBy) as unknown as FeatureModifier<unknown>;
            break;
          case "any":
            modifier = new BooleanAnyModifier(selector, enabledBy) as unknown as FeatureModifier<unknown>;
            break;
        }
        if (modifier !== null) {
          modifier.setScoringScript(scoringScript); // inert (GraalVM scoring dropped)
          modifiers.push(modifier);
        }
      });

      elementStream(element.getElementsByTagName("tile-set")).forEach((tileSetElement) => {
        const tileSetId = tileSetElement.getAttribute("id");
        const setCount = this.tileSets.getOrElse(tileSetId, 0);
        if (setCount > 0) {
          elementStream(tileSetElement.getElementsByTagName("ref")).forEach((refElement) => {
            const tileId = refElement.getAttribute("tile");
            const tileCount = parseInt(refElement.getAttribute("count"), 10);
            const count = (tilesCount.get(tileId) ?? 0) + setCount * tileCount;
            tilesCount.set(tileId, count);
          });
          elementStream(tileSetElement.getElementsByTagName("remove")).forEach((removeElement) => {
            removedTiles.add(removeElement.getAttribute("tile"));
          });
        }
      });
    }

    this.tileBuilder.setExternalModifiers(modifiers);

    // --- pass 2: tiles ---
    for (const content of definitions) {
      const element = parseDocument(content).documentElement;
      elementStream(element.getElementsByTagName("tile")).forEach((tileElement) => {
        const tileId = tileElement.getAttribute("id");
        let count = tilesCount.get(tileId) ?? 0;
        if (count === 0 || removedTiles.has(tileId)) {
          return;
        }
        const override = this.tileOverrides?.[tileId];
        if (override !== undefined && override !== null) {
          count = override;
          if (count <= 0) return;
        }
        if (tileElement.hasAttribute("max")) {
          count = Math.min(count, attributeIntValue(tileElement, "max", 0)!);
        }
        let tile: Tile;
        try {
          tile = this.createTile(tileId, tileElement);
        } catch (ex) {
          if (ex instanceof RemoveTileException) return;
          throw ex;
        }
        const groupId = this.getTileGroup(tile, tileElement);
        let group = this.tiles.get(groupId);
        if (!group) {
          group = [];
          this.tiles.set(groupId, group);
        }
        for (let ci = 0; ci < count; ci++) group.push(tile);
      });
    }

    // sort groups + tiles for deterministic order (stable with same seed)
    let groups: VMap<string, TileGroup> = LinkedHashMap.empty<string, TileGroup>();
    const groupNames = Vector.ofAll(this.tiles.keys()).sorted();
    for (const name of groupNames) {
      const groupTiles = this.tiles.get(name)!;
      groups = groups.put(
        name,
        new TileGroup(name, Vector.ofAll(groupTiles).sortBy((t) => t.getId()) as Vector<Tile>, true),
      );
    }
    return new TilePack(groups as LinkedHashMap<string, TileGroup>, 0);
  }
}
