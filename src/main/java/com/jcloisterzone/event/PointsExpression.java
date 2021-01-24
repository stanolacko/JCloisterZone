package com.jcloisterzone.event;

import com.jcloisterzone.Immutable;
import io.vavr.collection.HashMap;
import io.vavr.collection.Map;

@Immutable
public class PointsExpression {

    private final int points;
    private final String name;
    private final Map<String, Integer> args;

    public PointsExpression(int points, String name, Map<String, Integer> args) {
        this.points = points;
        this.name = name;
        this.args = args;
    }

    public PointsExpression(int points, String name) {
        this(points, name, HashMap.empty());
    }

    public int getPoints() {
        return points;
    }

    public String getName() {
        return name;
    }

	public int getArg(String key) {
		return args.get(key).getOrElse(0);
	}

	public PointsExpression setArg(String key, int value) {
        Map<String, Integer> args = this.args.merge(HashMap.of(key, value));
		return new PointsExpression(points, name, args);
	}

    public Map<String, Integer> getArgs() {
        return args;
    }

    public PointsExpression merge(PointsExpression expr) {
        if (expr == null || expr.points == 0) {
            return this;
        }
        Map<String, Integer> args = this.args.merge(expr.args);
        return new PointsExpression(points + expr.points, name + '+' + expr.name, args);
    }

    public PointsExpression add(int points, Map<String, Integer> args ) {
        args = this.args.merge(args);
        return new PointsExpression(this.points + points, name, args);
    }

	public PointsExpression setName(String name) {
		return new PointsExpression(points, name, args);
	}
	
	public PointsExpression addPoints(int points) {
		return setPoints(this.points + points);
	}
	
	public PointsExpression setPoints(int points) {
		return new PointsExpression(points, name, args);
	}
}
