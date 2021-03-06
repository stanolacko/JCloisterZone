package com.jcloisterzone.feature;

import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.game.state.GameState;
import io.vavr.collection.Set;

public interface Completable extends Scoreable, NeighbouringFeature {

    boolean isOpen(GameState state);
    default boolean isCompleted(GameState state) {
        return !isOpen(state);
    }

    @Override
    Completable setNeighboring(Set<FeaturePointer> neighboring);
    PointsExpression getPoints(GameState state);

    /** get feature points as completed/incompleted (as is)
     *  and unaffected by Mage or Witch and little buildings
     */
    PointsExpression getStructurePoints(GameState state, boolean completed);
}
