package com.jcloisterzone.game.capability.scoring;

import org.pf4j.Extension;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.feature.Road;
import com.jcloisterzone.feature.scoring.RoadScoring;
import com.jcloisterzone.game.state.GameState;

import io.vavr.collection.*;

@Extension
public class RoadScoringLabyrinth implements RoadScoring {

    public PointsExpression setScoring(GameState state, Road road, boolean completed, PointsExpression pe) {
        System.out.println(">>> Begin Scoring Labyrinth, current points: " + pe.getPoints());
    	if (road.isLabyrinth()) {
            System.out.println(">>> Labyrinth on road");
            if (completed) {
            	int meeplesCount = road.getMeeples(state).size();
            	pe = pe.setArg("meeples", meeplesCount);
            	pe = pe.addPoints(2 * meeplesCount);
            }
    	} else {
            System.out.println(">>> No Labyrinth on road");
    	}
        System.out.println(">>> End Scoring Labyrinth, ending points: " + pe.getPoints());
        return pe;
    }

}
