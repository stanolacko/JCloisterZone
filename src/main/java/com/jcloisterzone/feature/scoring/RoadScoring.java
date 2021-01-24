package com.jcloisterzone.feature.scoring;

import org.pf4j.ExtensionPoint;

import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.feature.Road;
import com.jcloisterzone.game.state.GameState;

import io.vavr.collection.*;

public interface RoadScoring extends ExtensionPoint {
    PointsExpression setScoring(GameState state, Road road, boolean completed, PointsExpression pe);
}
