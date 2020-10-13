package com.jcloisterzone.feature;

import com.jcloisterzone.board.Position;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.game.capability.LittleBuildingsCapability;
import com.jcloisterzone.game.capability.LittleBuildingsCapability.LittleBuilding;
import com.jcloisterzone.game.state.GameState;
import io.vavr.collection.HashSet;
import io.vavr.collection.Map;
import io.vavr.collection.Seq;
import io.vavr.collection.Set;

/**
 * Any feature completed when it is surrounded by eight land tiles.
 */
public interface CloisterLike extends Completable {

    @Override
    default boolean isOpen(GameState state) {
        return state.getAdjacentAndDiagonalTiles2(getPosition()).size() < 8;
    }

    default Position getPosition() {
        return getPlaces().get().getPosition();
    }

    @Override
    default Set<Position> getTilePositions() {
        return HashSet.of(getPosition());
    }

    @Override
    default PointsExpression getPoints(GameState state) {
        return getStructurePoints(state, isCompleted(state)).merge(getLittleBuildingPoints(state));
    }

    @Override
    default PointsExpression getLittleBuildingPoints(GameState state) {
        Map<Position, LittleBuilding> buildings = state.getCapabilityModel(LittleBuildingsCapability.class);
        if (buildings == null) {
            return null;
        }
        Position cloisterPos = getPosition();
        Seq<LittleBuilding> buildingsSeq = buildings.filterKeys(pos ->
            Math.abs(pos.x - cloisterPos.x) <= 1 && Math.abs(pos.y - cloisterPos.y) <= 1
        ).values();

        return LittleBuildingsCapability.getBuildingsPoints(state, buildingsSeq);
    }

}
