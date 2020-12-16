package com.jcloisterzone.feature;

import com.jcloisterzone.board.Location;
import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.Rotation;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.game.state.GameState;
import io.vavr.collection.HashMap;
import io.vavr.collection.HashSet;
import io.vavr.collection.List;
import io.vavr.collection.Set;

/**
 * Vodyaony from Russion Promos expansion.
 */
public class Vodyanoy extends Trap {

    private static final long serialVersionUID = 1L;
    private static final List<FeaturePointer> INITIAL_PLACE = List.of(new FeaturePointer(Position.ZERO, Location.CLOISTER));

    public Vodyanoy() {
        this(INITIAL_PLACE);
    }

    public Vodyanoy(List<FeaturePointer> places) {
        super(places);
    }
    
    @Override
    public Feature placeOnBoard(Position pos, Rotation rot) {
        return new Vodyanoy(
            placeOnBoardPlaces(pos, rot)
        );
    }

    public static String name() {
        return "Vodyanoy";
    }
}
