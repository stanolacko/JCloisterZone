package com.jcloisterzone.game.capability;

import com.jcloisterzone.Immutable;
import com.jcloisterzone.XMLUtils;
import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.Tile;
import com.jcloisterzone.board.TileGroup;
import com.jcloisterzone.board.TileModifier;
import com.jcloisterzone.board.TilePack;
import com.jcloisterzone.board.TilePackBuilder;
import com.jcloisterzone.figure.neutral.Dragon;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.capability.RiverCapability;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.game.state.PlacedTile;
import com.jcloisterzone.random.RandomGenerator;
import com.jcloisterzone.reducers.MoveNeutralFigure;
import io.vavr.collection.Vector;
import org.w3c.dom.Element;

/**
 * @model Vector<Position> : visited tiles
 */
@Immutable
public class DragonCapability extends Capability<Vector<Position>> {

    private static final long serialVersionUID = 1L;

    public static final TileModifier VOLCANO = new TileModifier("Volcano");
    public static final TileModifier DRAGON_TRIGGER = new TileModifier("DragonTrigger");

    public static final int DRAGON_MOVES = 6;
    public static final String TILE_GROUP_DRAGON = "dragon";

    @Override
    public Tile initTile(GameState state, Tile tile, Element tileElement) {
        if (!XMLUtils.getElementStreamByTagName(tileElement, "volcano").isEmpty()) {
            tile = tile.addTileModifier(VOLCANO);
        }
        if (!XMLUtils.getElementStreamByTagName(tileElement, "dragon").isEmpty()) {
            tile = tile.addTileModifier(DRAGON_TRIGGER);
        }
        return tile;
    }

    @Override
    public String getTileGroup(Tile tile) {
        return tile.hasModifier(DRAGON_TRIGGER) ? TILE_GROUP_DRAGON : null;
    }


    @Override
    public GameState onStartGame(GameState state, RandomGenerator random) {
        state = state.mapNeutralFigures(nf -> nf.setDragon(new Dragon("dragon.1")));
        state = state.mapTilePack(pack -> pack.deactivateGroup(TILE_GROUP_DRAGON));
        state = setModel(state, Vector.empty());
        return state;
    }

    @Override
    public GameState onTilePlaced(GameState state, PlacedTile pt) {
        // A volcano summons the dragon onto the placed tile immediately (this is always correct,
        // even for the River II volcano lake tile RI.2/I.v).
        if (pt.getTile().hasModifier(VOLCANO)) {
            state = (
                new MoveNeutralFigure<>(state.getNeutralFigures().getDragon(), pt.getPosition())
            ).apply(state);
        }
        // Shuffle the dragon deck into the pack once the dragon is out - but NOT while the River is
        // still being built. The river enforces its order solely by keeping "default" deactivated
        // until the river->river-lake->default chain drains; activating the dragon group mid-river
        // would leak the whole P&D deck into the forced river draw. So defer until "default" is active
        // (river finished). In a non-river game "default" is active from the start, so this fires on
        // the volcano tile exactly as before.
        TilePack pack = state.getTilePack();
        TileGroup dragonGroup = pack.getGroup(TILE_GROUP_DRAGON);
        if (dragonGroup != null
                && !dragonGroup.isActive()
                && state.getNeutralFigures().getDragonDeployment() != null) {
            TileGroup defaultGroup = pack.getGroup(TilePackBuilder.DEFAULT_TILE_GROUP);
            boolean riverFinished = defaultGroup == null || defaultGroup.isActive();
            if (riverFinished) {
                state = state.mapTilePack(p -> p.activateGroup(TILE_GROUP_DRAGON));
            }
        }
        return state;
    }

    @Override
    public boolean isMeepleDeploymentAllowed(GameState state, Position pos) {
        return !pos.equals(state.getNeutralFigures().getDragonDeployment());
    }
}
