package com.jcloisterzone.reducers;

import com.jcloisterzone.Player;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.feature.Farm;
import com.jcloisterzone.game.state.GameState;
import io.vavr.collection.HashMap;
import io.vavr.collection.Map;

public class ScoreFarm extends ScoreFeature {

    protected Map<Player, PointsExpression> playerPoints = HashMap.empty();

    public ScoreFarm(Farm feature, boolean isFinal) {
        super(feature, isFinal);
    }

    @Override
    protected PointsExpression getFeaturePoints(GameState state, Player player) {
        PointsExpression value = getFeature().getPoints(state, player);
        playerPoints = playerPoints.put(player, value);
        return value;
    }

    @Override
    public PointsExpression getFeaturePoints() {
        throw new UnsupportedOperationException("Call getFeaturePoints() with player argument");
    }

    @Override
    public PointsExpression getFeaturePoints(Player player) {
        return playerPoints.get(player).getOrNull();
    }

    @Override
    public Farm getFeature() {
        return (Farm) super.getFeature();
    }

}
