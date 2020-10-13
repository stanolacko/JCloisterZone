package com.jcloisterzone.feature;

import com.jcloisterzone.board.Edge;
import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.Rotation;
import com.jcloisterzone.board.ShortEdge;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.event.PointsExpression;
import com.jcloisterzone.game.Rule;
import com.jcloisterzone.game.capability.TradeGoodsCapability.TradeGoods;
import com.jcloisterzone.game.state.GameState;
import io.vavr.Tuple2;
import io.vavr.collection.*;

public class City extends CompletableFeature<City> {

    private static final long serialVersionUID = 1L;

    private final Set<Tuple2<ShortEdge, FeaturePointer>> multiEdges; // HS.CC!.v abstraction, multiple cities can connect to same edge
    private final int pennants;
    private final int extraPoints;
    private final Map<TradeGoods, Integer> tradeGoods;
    private final boolean besieged, cathedral, princess, castleBase;


    public City(List<FeaturePointer> places, Set<Edge> openEdges, int pennants, int extraPoints) {
        this(places, openEdges, HashSet.empty(), HashSet.empty(), pennants, extraPoints, HashMap.empty(), false, false, false, false);
    }

    public City(List<FeaturePointer> places,
            Set<Edge> openEdges, Set<FeaturePointer> neighboring,
            Set<Tuple2<ShortEdge, FeaturePointer>> multiEdges,
            int pennants,
            int extraPoints,
            Map<TradeGoods, Integer> tradeGoods, boolean besieged, boolean cathedral, boolean princess,
            boolean castleBase) {
        super(places, openEdges, neighboring);
        this.multiEdges = multiEdges;
        this.pennants = pennants;
        this.extraPoints = extraPoints;
        this.tradeGoods = tradeGoods;
        this.besieged = besieged;
        this.cathedral = cathedral;
        this.princess = princess;
        this.castleBase = castleBase;
    }

    @Override
    public City merge(City city) {
        assert city != this;
        return new City(
            mergePlaces(city),
            mergeEdges(city),
            mergeNeighboring(city),
            mergeMultiEdges(city),
            pennants + city.pennants,
            extraPoints + city.extraPoints,
            mergeTradeGoods(city),
            besieged || city.besieged,
            cathedral || city.cathedral,
            princess || city.princess,
            castleBase && city.castleBase
        );
    }

    @Override
    public City mergeAbbeyEdge(Edge edge) {
        return new City(
            places,
            openEdges.remove(edge),
            neighboring,
            multiEdges.filter(me -> !me._1.equals(edge)),
            pennants,
            extraPoints,
            tradeGoods,
            besieged ,
            cathedral,
            princess,
            castleBase
        );
    }

    @Override
    public City setOpenEdges(Set<Edge> openEdges) {
        return new City(
            places,
            openEdges,
            neighboring,
            multiEdges,
            pennants,
            extraPoints,
            tradeGoods,
            besieged ,
            cathedral,
            princess,
            castleBase
        );
    }

    @Override
    public Feature placeOnBoard(Position pos, Rotation rot) {
        return new City(
            placeOnBoardPlaces(pos, rot),
            placeOnBoardEdges(pos, rot),
            placeOnBoardNeighboring(pos, rot),
            placeOnBoardMultiEdges(pos, rot),
            pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase
        );
    }

    protected Map<TradeGoods, Integer> mergeTradeGoods(City city) {
        return tradeGoods.merge(city.tradeGoods, (a, b) -> a + b);
    }

    public City setMultiEdges(Set<Tuple2<ShortEdge, FeaturePointer>> multiEdges) {
        if (this.multiEdges == multiEdges) return this;
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    public Set<Tuple2<ShortEdge, FeaturePointer>> getMultiEdges() {
		return multiEdges;
	}

    @Override
    public City setNeighboring(Set<FeaturePointer> neighboring) {
        if (this.neighboring == neighboring) return this;
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    public boolean isBesieged() {
        return besieged;
    }

    public City setBesieged(boolean besieged) {
        if (this.besieged == besieged) return this;
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    public boolean isCathedral() {
        return cathedral;
    }

    public City setCathedral(boolean cathedral) {
        if (this.cathedral == cathedral) return this;
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    public boolean isPrincess() {
        return princess;
    }

    public City setPrincess(boolean princess) {
        if (this.princess == princess) return this;
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    public boolean isCastleBase() {
        return castleBase;
    }

    public City setCastleBase(boolean castleBase) {
        if (this.castleBase == castleBase) return this;
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    public int getPennants() {
        return pennants;
    }

    public int getExtraPoints() { return extraPoints; }

    public Map<TradeGoods, Integer> getTradeGoods() {
        return tradeGoods;
    }

    public City setTradeGoods(Map<TradeGoods, Integer> tradeGoods) {
        return new City(places, openEdges, neighboring, multiEdges, pennants, extraPoints, tradeGoods, besieged, cathedral, princess, castleBase);
    }

    @Override
    public PointsExpression getStructurePoints(GameState state, boolean completed) {
        boolean tinyCity = false;
        int tileCount = getTilePositions().size();


        if (cathedral && !completed) {
            return new PointsExpression(0, "city.incomplete-cathedral");
        }

        Map<String, Integer> args = HashMap.of(
                "tiles", tileCount,
                "pennants", pennants,
                "extraPoints", extraPoints
        );

        int pointsPerUnit = 2;
        if (completed && tileCount == 2 && "2".equals(state.getStringRule(Rule.TINY_CITY_SCORING))) {
            tinyCity = true;
            pointsPerUnit = 1;
        } else{
            if (besieged) {
                args = args.put("besieged", 1);
                pointsPerUnit--;
            }
        }

        if (cathedral) {
            pointsPerUnit++;
            args = args.put("cathedral", 1);
        }

        if (!completed) {
            pointsPerUnit--;
        }

        int points = pointsPerUnit * (tileCount + pennants) + extraPoints;
        String name = "city";
        if (tinyCity) {
            name = "city.tiny";
        } else {
            if (!completed) name = "city.incomplete";
        }
        return new PointsExpression(points, name, args);
    }

    @Override
    public PointsExpression getPoints(GameState state) {
        PointsExpression basePoints = getStructurePoints(state, isCompleted(state));
        return getMageAndWitchPoints(state, basePoints).merge(getLittleBuildingPoints(state));
    }


    public static String name() {
        return "City";
    }

    protected Set<Tuple2<ShortEdge, FeaturePointer>> mergeMultiEdges(City city) {
    	return multiEdges.addAll(city.multiEdges);
    }

    protected Set<Tuple2<ShortEdge, FeaturePointer>> placeOnBoardMultiEdges(Position pos, Rotation rot) {
    	return multiEdges.map(t -> {
    		ShortEdge edge = t._1.rotateCW(Position.ZERO, rot).translate(pos);
    		FeaturePointer fp = t._2.rotateCW(rot).translate(pos);
    		return new Tuple2<>(edge, fp);
    	});
    }
}
