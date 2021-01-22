package com.jcloisterzone.feature.scoring;

import org.pf4j.ExtensionPoint;

<<<<<<< Upstream, based on 16ac62b4f0a1e913a7149de4a33db83ebbe531fa
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.feature.Road;
import com.jcloisterzone.game.state.GameState;

import io.vavr.collection.*;

public interface RoadScoring extends ExtensionPoint {
    PointsExpression setScoring(GameState state, Road road, boolean completed, PointsExpression pe);
=======
public interface RoadScoring extends ExtensionPoint {
	String getScoring();
>>>>>>> b83991e RoadScoring - added road scoring, renaming added import java defs
}
