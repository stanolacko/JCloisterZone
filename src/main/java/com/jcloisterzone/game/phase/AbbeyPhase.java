package com.jcloisterzone.game.phase;

import com.jcloisterzone.Player;
import com.jcloisterzone.action.TilePlacementAction;
import com.jcloisterzone.board.PlacementOption;
import com.jcloisterzone.board.Rotation;
import com.jcloisterzone.game.Capability;
import com.jcloisterzone.game.RandomGenerator;
import com.jcloisterzone.game.capability.*;
import com.jcloisterzone.game.capability.AbbeyCapability.AbbeyToken;
import com.jcloisterzone.game.state.ActionsState;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.reducers.PlaceTile;
import com.jcloisterzone.io.message.PlaceTileMessage;
import io.vavr.collection.Array;
import io.vavr.collection.Stream;

import java.util.Arrays;

@RequiredCapability(AbbeyCapability.class)
public class AbbeyPhase extends Phase {

    public AbbeyPhase(RandomGenerator random) {
        super(random);
    }

    @Override
    public StepResult enter(GameState state) {
        BazaarCapabilityModel bazaarModel = state.getCapabilityModel(BazaarCapability.class);
        BuilderState builderState = state.getCapabilityModel(BuilderCapability.class);
        boolean bazaarInProgress = bazaarModel != null &&  bazaarModel.getSupply() != null;
        boolean builderSecondTurnPart = builderState == BuilderState.SECOND_TURN;
        boolean hasAbbey = state.getPlayers().getPlayerTokenCount(state.getPlayers().getTurnPlayerIndex(), AbbeyToken.ABBEY_TILE) > 0;
        if (hasAbbey && (builderSecondTurnPart || !bazaarInProgress)) {
            GameState _state = state;
            Stream<PlacementOption> options = state.getHoles()
                .flatMap(t ->
                    Array.ofAll(Arrays.asList(Rotation.values()))
                    .map(r -> new PlacementOption(t._1, r, null))
                )
                .filter(tp -> {
                    for (Capability<?> cap : _state.getCapabilities().toSeq()) {
                        if (!cap.isTilePlacementAllowed(_state, AbbeyCapability.ABBEY_TILE, tp)) return false;
                    }
                    return true;
                });

            if (!options.isEmpty()) {
                TilePlacementAction action = new TilePlacementAction(
                    AbbeyCapability.ABBEY_TILE,
                    options.toSet()
                );

                state = state.setPlayerActions(new ActionsState(
                    state.getTurnPlayer(),
                    action,
                    true
                ));

                return promote(state);
            }
        }
        return next(state, TilePhase.class);
    }

    @PhaseMessageHandler
    public StepResult handlePlaceTile(GameState state, PlaceTileMessage msg) {
        if (!msg.getTileId().equals(AbbeyCapability.ABBEY_TILE_ID)) {
            throw new IllegalArgumentException("Only abbey can be placed.");
        }

        Player player = state.getActivePlayer();
        state = state.mapPlayers(ps ->
            ps.addTokenCount(player.getIndex(), AbbeyToken.ABBEY_TILE, -1)
        );

        state = (new PlaceTile(AbbeyCapability.ABBEY_TILE, msg.getPosition(), msg.getRotation())).apply(state);
        state = clearActions(state);

        return next(state, ActionPhase.class);
    }
}
