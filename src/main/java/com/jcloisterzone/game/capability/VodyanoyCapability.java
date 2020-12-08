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
import com.jcloisterzone.feature.Vodyanoy;
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
import io.vavr.collection.Vector;
import io.vavr.Tuple2;
import java.util.*;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.w3c.dom.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class VodyanoyCapability extends Capability<Void> {

	private static final long serialVersionUID = 1L;

    @Override
    public Tile initTile(GameState state, Tile tile, Vector<Element> tileElements) {
        Vector<Element> vodyanoyEl = XMLUtils.getElementStreamByTagName(tileElements, "vodyanoy").toVector();
        assert vodyanoyEl.size() <= 1;
        if (vodyanoyEl.size() > 0) {
            Vodyanoy feature =  new Vodyanoy();
            tile = tile.setInitialFeatures(tile.getInitialFeatures().put(Location.CLOISTER, feature));
        }
        return tile;
    }

    public GameState onTilePlaced(GameState state, PlacedTile pt) {
        Set<Tuple2<Location, Vodyanoy>> vodyanoy = state.getTileFeatures2(pt.getPosition(), Vodyanoy.class).toSet();
        
        if (vodyanoy.size()==0) {
        	return state;
        }

        java.util.Set<Position> fps = new java.util.HashSet<>();

        fps.add(vodyanoy.get()._2.getPlace().getPosition());
        for(PlacedTile placedtile : state.getAdjacentAndDiagonalTiles(vodyanoy.get()._2.getPlace().getPosition())) {
        	fps.add(placedtile.getPosition());
        }

        Stream<Tuple2<Meeple, FeaturePointer>> meeples = Stream.ofAll(state.getDeployedMeeples())
        .filter(t -> fps.contains(t._2.getPosition()) && t._1 instanceof Follower)
//        .filter(t -> !t._2.isCityOfCarcassonneQuarter())
        .filter(t -> !pt.getPosition().equals(t._2.getPosition()));

        for(Tuple2<Meeple, FeaturePointer> trapMeeple : meeples) {
        	state = (
            	new TrapFollower((Follower) trapMeeple._1, vodyanoy.get()._2.getPlace())
	        ).apply(state);
        }

        return state;
    }

    @Override
    public boolean isMeepleDeploymentAllowed(GameState state, Position pos) {
        PlacedTile pt = state.getPlacedTiles().get(pos).getOrNull();
        return pt == null || state.getTileFeatures2(pos, Vodyanoy.class).toSet().size()==0;
    }

    @Override
    public GameState onTurnPartCleanUp(GameState state) {
    	return onTilePlaced(state,state.getLastPlaced());
    }

    public Set<Tuple2<Position, PlacedTile>> getVodyanoysPlacedTiles(GameState state) {
    	return state.getPlacedTiles()
    		.filter(t -> t._2.getTile().getId().equals("RU/V"))
    		.toSet();
    }
    
    public Stream<Tuple2<Meeple, FeaturePointer>> getAllTrappedMeeples(GameState state) {
    	Stream<Tuple2<Meeple, FeaturePointer>> meeples = Stream.ofAll(state.getDeployedMeeples())
                .filter(t -> t._1 instanceof Follower)
                .filter(t -> !t._2.getPosition().equals(state.getLastPlaced().getPosition()));
    	
    	for(Tuple2<Position, PlacedTile> vodyanoy: getVodyanoysPlacedTiles(state)) {
    		meeples = meeples
    			.filter(t -> t._2.getPosition().equals(vodyanoy._2.getPosition()));
    	}
    	
    	return meeples;
    }

    @Override
    public GameState onActionPhaseEntered(GameState state) {
        Set<Tuple2<Position, PlacedTile>> tiles = getVodyanoysPlacedTiles(state);

        Stream<Tuple2<Meeple, FeaturePointer>> meeples = getAllTrappedMeeples(state)
    		.filter(t -> t._1.getPlayer().equals(state.getTurnPlayer()));

        Set<MeeplePointer> options = meeples.map(MeeplePointer::new).toSet();
        if (options.isEmpty()) {
            return state;
        }

        return state.appendAction(new ReturnMeepleAction(options, ReturnMeepleSource.RUSSIANTRAP_RETURN));
    }

    @Override
    public GameState onFinalScoring(GameState state) {

        Stream<Tuple2<Meeple, FeaturePointer>> meeples = getAllTrappedMeeples(state);

        int points = -2;
        
        for(Tuple2<Meeple, FeaturePointer> meeple : meeples) {
        	Player player = meeple._1.getPlayer();
            state = (new AddPoints(player, points)).apply(state);
            ReceivedPoints rp = new ReceivedPoints(new PointsExpression(points, "vodyanoy"), player, meeple._2);
            state = state.appendEvent(new ScoreEvent(rp, false, true));
        }
        
        return state;
    }
}
