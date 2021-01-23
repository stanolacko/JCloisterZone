package com.jcloisterzone.game.capability.scoring;

import org.pf4j.Extension;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.feature.Road;
import com.jcloisterzone.feature.scoring.RoadScoring;
import com.jcloisterzone.game.state.GameState;

import io.vavr.collection.*;

@Extension
public class RoadScoringInn implements RoadScoring {

    public PointsExpression setScoring(GameState state, Road road, boolean completed, PointsExpression pe) {
        System.out.println(">>> Begin Scoring Inn, current points: " + pe.getPoints());
    	if (road.isInn()) {
            System.out.println(">>> Inn on road");
        	pe = pe.setArg("inn", 1);
    		if (completed) {
                System.out.println(">>> Road completed, points +1 " + pe.getArg("tiles"));
                pe = pe.addPoints(pe.getArg("tiles")); // +1 pet tile
    		} else {
                System.out.println(">>> Road is not completed, points = 0");
                pe = pe.setPoints(0);
                pe = pe.setName("road.incomplete-inn");
    		}
    	} else {
            System.out.println(">>> No inn on road");
    	}
        System.out.println(">>> End Scoring Inn, ending points: " + pe.getPoints());
        return pe;
    }

}
