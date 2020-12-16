package com.jcloisterzone.game.capability;

import com.jcloisterzone.Player;
import com.jcloisterzone.XMLUtils;
import com.jcloisterzone.action.ReturnMeepleAction;
import com.jcloisterzone.board.Location;
import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.Tile;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.board.pointer.MeeplePointer;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.event.ScoreEvent;
import com.jcloisterzone.event.ScoreEvent.ReceivedPoints;
import com.jcloisterzone.feature.*;
import com.jcloisterzone.feature.Solovei;
import com.jcloisterzone.feature.Scoreable;
import com.jcloisterzone.figure.Follower;
import com.jcloisterzone.figure.Meeple;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.state.ActionsState;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.game.state.PlacedTile;
import com.jcloisterzone.reducers.AddPoints;
import com.jcloisterzone.reducers.TrapFollower;
import com.jcloisterzone.io.message.ReturnMeepleMessage.ReturnMeepleSource;
import io.vavr.collection.HashMap;
import io.vavr.collection.HashSet;
import io.vavr.collection.Map;
import io.vavr.collection.Set;
import io.vavr.collection.Stream;
import io.vavr.collection.Stream.Empty;
import io.vavr.collection.Vector;
import io.vavr.Tuple2;
import java.util.*;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.w3c.dom.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SoloveiCapability extends Capability<Void> {

	private static final long serialVersionUID = 1L;

    @Override
    public Tile initTile(GameState state, Tile tile, Vector<Element> tileElements) {
        Vector<Element> soloveiEl = XMLUtils.getElementStreamByTagName(tileElements, "solovei").toVector();
        assert soloveiEl.size() <= 1;
        if (soloveiEl.size() > 0) {
            Solovei feature =  new Solovei();
            tile = tile.setInitialFeatures(tile.getInitialFeatures().put(Location.CLOISTER, feature));
        }
        return tile;
    }

    public GameState onTilePlaced(GameState state, PlacedTile pt) {
        Set<Tuple2<Location, Solovei>> solovei = state.getTileFeatures2(pt.getPosition(), Solovei.class).toSet();
        
        if (solovei.size()==0) {
        	return state;
        }

        Set<Tuple2<Location, Road>> road = state.getTileFeatures2(pt.getPosition(), Road.class).toSet();
        
        Stream<Tuple2<Meeple, FeaturePointer>> meeples = road.get()._2.getMeeples2(state)
            .filter(t -> !pt.getPosition().equals(t._2.getPosition()));

        for(Tuple2<Meeple, FeaturePointer> trapMeeple : meeples) {
        	state = (
            	new TrapFollower((Follower) trapMeeple._1, solovei.get()._2.getPlace(), new Integer(0), new Integer(0))
	        ).apply(state);
        }

        return state;
    }

    @Override
    public boolean isMeepleDeploymentAllowed(GameState state, Position pos) {
        PlacedTile pt = state.getPlacedTiles().get(pos).getOrNull();
        return pt == null || state.getTileFeatures2(pos, Solovei.class).toSet().size()==0;
    }

    @Override
    public GameState onTurnPartCleanUp(GameState state) {
    	return onTilePlaced(state,state.getLastPlaced());
    }

    public Set<Tuple2<Position, PlacedTile>> getSoloveisPlacedTiles(GameState state) {
    	return state.getPlacedTiles()
//    		.filter(t -> t._2.getTile().getId().equals("RU/SRFr"))
       		.filter(t -> state.getTileFeatures2(t._1, Solovei.class).toSet().size()>0)
    		.toSet();
    }
    
    public Stream<Tuple2<Meeple, FeaturePointer>> getAllTrappedMeeples(GameState state) {
    	Set<Position> soloveis = getSoloveisPlacedTiles(state)
    			.map(t -> t._1).toSet();
    	
    	Stream<Tuple2<Meeple, FeaturePointer>> meeples = Stream.ofAll(state.getDeployedMeeples())
                .filter(t -> t._1 instanceof Follower)
                .filter(t -> !t._2.getLocation().isCityOfCarcassonneQuarter())
    			.filter(t -> soloveis.contains(t._2.getPosition()));
    	
    	return meeples;
    }

    @Override
    public GameState onActionPhaseEntered(GameState state) {
        Set<Tuple2<Position, PlacedTile>> tiles = getSoloveisPlacedTiles(state);

        Stream<Tuple2<Meeple, FeaturePointer>> meeples = getAllTrappedMeeples(state)
    		.filter(t -> t._1.getPlayer().equals(state.getTurnPlayer()))
        	.filter(t -> !t._2.getPosition().equals(state.getLastPlaced().getPosition()));

        Set<MeeplePointer> options = meeples.map(MeeplePointer::new).toSet();
        if (options.isEmpty()) {
            return state;
        }

        return state.appendAction(new ReturnMeepleAction(options, ReturnMeepleSource.RUSSIANTRAP_RETURN));
    }
}
