package com.jcloisterzone.game.capability;

import com.jcloisterzone.Player;
import com.jcloisterzone.action.MeepleAction;
import com.jcloisterzone.board.Corner;
import com.jcloisterzone.board.Location;
import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.feature.Farm;
import com.jcloisterzone.figure.Barn;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.Rule;
import com.jcloisterzone.game.state.GameState;
import io.vavr.Predicates;
import io.vavr.Tuple2;
import io.vavr.collection.Set;
import io.vavr.collection.Stream;

/**
 * @model FeaturePointer: ptr to just placed Barn
 */
public final class BarnCapability extends Capability<FeaturePointer> {

	private static final long serialVersionUID = 1L;


    @Override
    public GameState onActionPhaseEntered(GameState state) {
        Player player = state.getPlayerActions().getPlayer();

        Barn barn = player.getMeepleFromSupply(state, Barn.class);
        if (barn == null) {
            return state;
        }

        Position pos = state.getLastPlaced().getPosition();

        // By convention barn action contains feature pointer which points to
        // left top corner of tile intersection
        //      |
        //      |
        //  ----+----
        //      | XX
        //      | XX
        Set<FeaturePointer> options = Stream.of(
            pos,
            new Position(pos.x + 1, pos.y),
            new Position(pos.x, pos.y + 1),
            new Position(pos.x + 1, pos.y + 1)
        )
            .map(p -> getCornerFeature(state, p))
            .filter(Predicates.isNotNull())
            .filter(t -> {
                if ("occupied".equals(state.getStringRule(Rule.BARN_PLACEMENT))) {
                    return true;
                }
                return t._2.getSpecialMeeples(state)
                    .find(Predicates.instanceOf(Barn.class))
                    .isEmpty();
            })
            .map(Tuple2::_1)
            .toSet();

        if (options.isEmpty()) {
            return state;
        }

        return state.appendAction(new MeepleAction(barn, options));
    }

    @Override
    public GameState onTurnPartCleanUp(GameState state) {
        return setModel(state, null);
    }

    private Tuple2<FeaturePointer, Farm> getFarmLocationPartOf(GameState state, FeaturePointer fp) {
        return state.getFeatureMap()
            .find(t -> fp.isPartOf(t._1))
            .map(t -> t.map2(f -> (Farm) f))
            .getOrNull();
    }

    private boolean containsCorner(Tuple2<FeaturePointer, Farm> t, Corner c) {
        return t != null && t._1.getLocation().getCorners().contains(c);
    }

    private Tuple2<FeaturePointer, Farm> getCornerFeature(GameState state, Position pos) {
        Tuple2<FeaturePointer, Farm> t;
        t = getFarmLocationPartOf(state, new FeaturePointer(new Position(pos.x - 1, pos.y - 1), Location.SL));
        if (!containsCorner(t, Corner.SE)) return null;
        t = getFarmLocationPartOf(state, new FeaturePointer(new Position(pos.x, pos.y - 1), Location.WL));
        if (!containsCorner(t, Corner.SW)) return null;
        t = getFarmLocationPartOf(state, new FeaturePointer(new Position(pos.x - 1, pos.y), Location.EL));
        if (!containsCorner(t, Corner.NE)) return null;
        t = getFarmLocationPartOf(state, new FeaturePointer(pos, Location.NL));
        if (!containsCorner(t, Corner.NW)) return null;
        return t;
    }
}