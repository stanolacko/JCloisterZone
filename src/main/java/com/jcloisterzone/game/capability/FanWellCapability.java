package com.jcloisterzone.game.capability;

import static com.jcloisterzone.XMLUtils.attributeIntValue;

import org.w3c.dom.Element;

import com.jcloisterzone.XMLUtils;
import com.jcloisterzone.board.Tile;
import com.jcloisterzone.board.TileModifier;
import com.jcloisterzone.feature.Feature;
import com.jcloisterzone.feature.Road;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.state.GameState;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import io.vavr.collection.Vector;

public class FanWellCapability extends Capability<Void> {

    protected final transient Logger logger = LoggerFactory.getLogger(getClass());

	private static final long serialVersionUID = 1L;

	public static final TileModifier FAN_WELL = new TileModifier("FanWell");

    @Override
    public Feature initFeature(GameState state, String tileId, Feature feature, Element xml) {
        if (feature instanceof Road) {
            feature = ((Road) feature).setWell(attributeIntValue(xml, "wells", 0));
        }
        return feature;
    }
}
