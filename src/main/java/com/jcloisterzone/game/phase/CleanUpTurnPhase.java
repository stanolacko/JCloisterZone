package com.jcloisterzone.game.phase;

import com.jcloisterzone.board.TilePack;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.capability.AbbeyCapability;
import com.jcloisterzone.game.capability.BazaarCapability;
import com.jcloisterzone.game.capability.BazaarCapabilityModel;
import com.jcloisterzone.game.capability.BazaarItem;
import com.jcloisterzone.game.state.Flag;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.random.RandomGenerator;
import com.jcloisterzone.reducers.SetNextPlayer;
import io.vavr.collection.HashSet;
import io.vavr.collection.Queue;

/**
 * real end of turn and switch to next player
 */
public class CleanUpTurnPhase extends Phase {

    private AbbeyEndGamePhase abbeyEndGamePhase;
    private Phase endPhase;

    public CleanUpTurnPhase(RandomGenerator random, Phase defaultNext) {
        super(random, defaultNext);
    }

    public void setAbbeyEndGamePhase(AbbeyEndGamePhase abbeyEndGamePhase) {
        this.abbeyEndGamePhase = abbeyEndGamePhase;
    }

    public void setEndPhase(Phase endPhase) {
        this.endPhase = endPhase;
    }

    @Override
    public StepResult enter(GameState state) {
        for (Capability<?> cap : state.getCapabilities().toSeq()) {
            state = cap.onTurnCleanUp(state);
        }

        // The river's volcano lake grants its placer another turn — capture before flags are wiped.
        boolean riverVolcanoDoubleTurn = state.getFlags().contains(Flag.RIVER_VOLCANO_DOUBLE_TURN);

        if (!state.getFlags().isEmpty()) {
            state = state.setFlags(HashSet.empty());
        }

        Integer endPlayerIdx = state.getCapabilityModel(AbbeyCapability.class);
        if (endPlayerIdx != null) {
            // end game abbey state is in progress
            return next(state, abbeyEndGamePhase);
        }

        BazaarCapabilityModel bazaarModel = state.getCapabilityModel(BazaarCapability.class);
        Queue<BazaarItem> bazaarSupply = bazaarModel == null ? null : bazaarModel.getSupply();
        TilePack tilePack = state.getTilePack();
        if (tilePack.isEmpty() && bazaarSupply == null) {
            return next(state, endPhase);
        } else {
            // Skip advancing the player when the volcano lake was just placed — same player again.
            if (!riverVolcanoDoubleTurn) {
                state = (new SetNextPlayer()).apply(state);
            }
            return next(state);
        }
    }
}
