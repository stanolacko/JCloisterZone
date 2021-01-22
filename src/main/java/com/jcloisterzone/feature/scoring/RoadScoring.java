package com.jcloisterzone.feature.scoring;

import org.pf4j.ExtensionPoint;

public interface RoadScoring extends ExtensionPoint {
	String getScoring();
}
