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
 * Baba Yaga's hut from Russion Promos expansion.
 *
 * Implemented as separate feature type to be not involved in Cult shrine-cloister challenges.
 */
public class YagaHut extends TileFeature implements Completable, CloisterLike {

    private static final long serialVersionUID = 1L;
    private static final List<FeaturePointer> INITIAL_PLACE = List.of(new FeaturePointer(Position.ZERO, Location.CLOISTER));

    protected final Set<FeaturePointer> neighboring; //for wagon move

    public YagaHut() {
        this(INITIAL_PLACE, HashSet.empty());
    }

    public YagaHut(List<FeaturePointer> places, Set<FeaturePointer> neighboring) {
        super(places);
        this.neighboring = neighboring;
    }

    @Override
    public YagaHut setNeighboring(Set<FeaturePointer> neighboring) {
        if (this.neighboring == neighboring) return this;
        return new YagaHut(places, neighboring);
    }

    @Override
    public Set<FeaturePointer> getNeighboring() {
        return neighboring;
    }

    @Override
    public Feature placeOnBoard(Position pos, Rotation rot) {
        return new YagaHut(
            placeOnBoardPlaces(pos, rot),
            placeOnBoardNeighboring(pos, rot)
        );
    }

    @Override
    public PointsExpression getStructurePoints(GameState state, boolean completed) {
        Position p = places.get().getPosition();
        int emptyTiles = 8 - state.getAdjacentAndDiagonalTiles2(p).size();
        int points = 1 + emptyTiles;
        return new PointsExpression(points, "yaga-hut", HashMap.of("emptyTiles", emptyTiles));
    }

    public static String name() {
        return "Yaga's Hut";
    }

    protected Set<FeaturePointer> placeOnBoardNeighboring(Position pos, Rotation rot) {
        return neighboring.map(fp -> fp.rotateCW(rot).translate(pos));
    }
}
