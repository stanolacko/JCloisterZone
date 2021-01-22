package com.jcloisterzone.game.capability.scoring;

import org.pf4j.Extension;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.feature.Road;
import com.jcloisterzone.feature.scoring.RoadScoring;
import com.jcloisterzone.game.state.GameState;

import io.vavr.collection.*;

@Extension
public class RoadScoringWells implements RoadScoring {

    public PointsExpression setScoring(GameState state, Road road, boolean completed, PointsExpression pe) {
        System.out.println(">>> Begin Scoring Wells");
        System.out.println(">>> No wells on road");
        System.out.println(">>> End Scoring Wells");
        return pe;
    }

}
