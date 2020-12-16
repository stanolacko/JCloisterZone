package com.jcloisterzone.reducers;

import com.jcloisterzone.Player;
import com.jcloisterzone.board.pointer.BoardPointer;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.board.pointer.MeeplePointer;
import com.jcloisterzone.event.PlayEvent.PlayEventMeta;
import com.jcloisterzone.event.MeepleDeployed;
import com.jcloisterzone.event.MeepleReturned;
import com.jcloisterzone.feature.Feature;
import com.jcloisterzone.feature.Structure;
import com.jcloisterzone.figure.Builder;
import com.jcloisterzone.figure.Follower;
import com.jcloisterzone.figure.Meeple;
import com.jcloisterzone.figure.Pig;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.game.state.NeutralFiguresState;
import com.jcloisterzone.reducers.UndeployMeeple;

import io.vavr.collection.LinkedHashMap;
import io.vavr.collection.Stream;
import io.vavr.Tuple2;

public class TrapFollower implements Reducer {

    private final Follower follower;
    private final FeaturePointer fp;
    private final Integer ransomValue;
    private final Integer finalScoringValue;

    public TrapFollower(Follower follower, FeaturePointer fp, Integer ransomValue, Integer finalScoringValue) {
    	this.follower = follower;
    	this.fp = fp;
    	this.ransomValue = ransomValue;
    	this.finalScoringValue = finalScoringValue;
    }

    @Override
    public GameState apply(GameState state) {

    	LinkedHashMap<Meeple, FeaturePointer> deployedMeeples = state.getDeployedMeeples();
        FeaturePointer movedFrom = deployedMeeples.get(follower).getOrNull();
        Player owner = follower.getPlayer();
        state = state.setDeployedMeeples(deployedMeeples.put(follower, fp));
        deployedMeeples = state.getDeployedMeeples();
        PlayEventMeta metaPlayer = PlayEventMeta.createWithActivePlayer(state);
        state = state.appendEvent(
            new MeepleDeployed(metaPlayer, follower, fp, movedFrom)
        );
        Structure feature = (Structure) state.getFeature(movedFrom);
        Stream<Tuple2<Meeple, FeaturePointer>> threatened = feature.getMeeples2(state)
            .filter(m -> (m._1 instanceof Pig) || (m._1 instanceof Builder))
            .filter(m -> m._1.getPlayer().equals(owner));

        for (Tuple2<Meeple, FeaturePointer> t : threatened) {
            if (feature.getFollowers(state).find(f -> f.getPlayer().equals(owner)).isEmpty()) {
                state = state.setDeployedMeeples(deployedMeeples.remove(t._1));
                state = state.appendEvent(
                    new MeepleReturned(metaPlayer, t._1, t._2, true)
                );
            }
        }

        NeutralFiguresState nfState = state.getNeutralFigures();
        BoardPointer fairyPtr =  nfState.getFairyDeployment();
        if (fairyPtr instanceof MeeplePointer) {
            MeeplePointer mp = (MeeplePointer) fairyPtr;
            if (follower.getId().equals(mp.getMeepleId())) {
                mp = new MeeplePointer(mp.asFeaturePointer(), null);
                nfState = nfState.setDeployedNeutralFigures(nfState.getDeployedNeutralFigures().put(nfState.getFairy(), mp));
                state = state.setNeutralFigures(nfState);
            }
        }
        
        return state;
    }
}
