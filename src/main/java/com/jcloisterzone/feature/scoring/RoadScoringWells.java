package com.jcloisterzone.feature.scoring;

import org.pf4j.Extension;
import com.jcloisterzone.feature.scoring.RoadScoring;

@Extension
public class RoadScoringWells implements RoadScoring {

    public String getScoring() {
        return "Welcome";
    }

}
