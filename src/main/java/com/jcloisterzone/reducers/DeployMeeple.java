package com.jcloisterzone.reducers;

import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.event.MeepleDeployed;
import com.jcloisterzone.event.PlayEvent.PlayEventMeta;
import com.jcloisterzone.feature.Structure;
import com.jcloisterzone.figure.DeploymentCheckResult;
import com.jcloisterzone.figure.Meeple;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.capability.VodyanoyCapability;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.game.state.PlacedTile;
import io.vavr.Tuple2;
import io.vavr.collection.LinkedHashMap;
import io.vavr.collection.Set;

public class DeployMeeple implements Reducer {

    private final Meeple meeple;
    private final FeaturePointer fp;

    public DeployMeeple(Meeple meeple, FeaturePointer fp) {
        this.meeple = meeple;
        this.fp = fp;
    }

    @Override
    public GameState apply(GameState state) {
        Structure feature = state.getStructure(fp);
        if (feature == null) {
            throw new IllegalArgumentException("There is no feature on " + fp);
        }

        DeploymentCheckResult check = meeple.isDeploymentAllowed(state, fp, feature);
        if (!check.result) {
            throw new IllegalArgumentException(check.error);
        }

        LinkedHashMap<Meeple, FeaturePointer> deployedMeeples = state.getDeployedMeeples();
        FeaturePointer movedFrom = deployedMeeples.get(meeple).getOrNull();
        state = state.setDeployedMeeples(deployedMeeples.put(meeple, fp));
        state = state.appendEvent(
            new MeepleDeployed(PlayEventMeta.createWithActivePlayer(state), meeple, fp, movedFrom)
        );

        for (Capability cap : state.getCapabilities().toSeq()) {
        	if (cap instanceof VodyanoyCapability) {
        	    for (Tuple2<Position, PlacedTile> t : ((VodyanoyCapability) cap).getVodyanoysPlacedTiles(state)) {
	                state = cap.onTilePlaced(state, t._2);
	            };
        	}
        }
        return state;
    }

}
