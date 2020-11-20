package com.jcloisterzone.game.phase;

import com.jcloisterzone.Player;
import com.jcloisterzone.board.Location;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.feature.Completable;
import com.jcloisterzone.feature.Farm;
import com.jcloisterzone.feature.Feature;
import com.jcloisterzone.figure.Follower;
import com.jcloisterzone.game.RandomGenerator;
import com.jcloisterzone.game.Rule;
import com.jcloisterzone.game.capability.CountCapability;
import com.jcloisterzone.game.capability.CountCapabilityModel;
import com.jcloisterzone.game.state.GameState;
import com.jcloisterzone.reducers.DeployMeeple;
import com.jcloisterzone.io.message.DeployMeepleMessage;
import io.vavr.collection.HashSet;
<<<<<<< Upstream, based on 16ac62b4f0a1e913a7149de4a33db83ebbe531fa
import io.vavr.collection.List;
=======
>>>>>>> ead5e0c fix move from market queater before final scoring

import java.util.function.Function;

@RequiredCapability(CountCapability.class)
public class CocFinalScoringPhase extends AbstractCocScoringPhase {

    public CocFinalScoringPhase(RandomGenerator random) {
        super(random);
    }

    @Override
    public StepResult enter(GameState state) {
        CountCapabilityModel model = state.getCapabilityModel(CountCapability.class);
        state = state.setCapabilityModel(CountCapability.class, model.setFinalScoringPass(HashSet.empty()));
<<<<<<< Upstream, based on 16ac62b4f0a1e913a7149de4a33db83ebbe531fa
        return nextPlayer(state, state.getTurnPlayer(), true);
    }

    @Override
    protected List<Location> getValidQuerters(GameState state) {
        if (state.getStringRule(Rule.COC_FINAL_SCORING).equals("market-only")) {
            return List.of(Location.QUARTER_MARKET);
        } else {
            return Location.QUARTERS;
=======
        return super.enter(state);
    }

    @Override
    protected StepResult nextPlayer(GameState state, Player player, boolean actionUsed) {
        CountCapabilityModel model = state.getCapabilityModel(CountCapability.class);
        if (!actionUsed) {
            model = model.setFinalScoringPass(model.getFinalScoringPass().add(player));
            state = state.setCapabilityModel(CountCapability.class, model);
>>>>>>> ead5e0c fix move from market queater before final scoring
        }
<<<<<<< Upstream, based on 16ac62b4f0a1e913a7149de4a33db83ebbe531fa
    }

    @Override
    protected StepResult nextPlayer(GameState state, Player player, boolean actionUsed) {
        CountCapabilityModel model = state.getCapabilityModel(CountCapability.class);
        if (!actionUsed) {
            model = model.setFinalScoringPass(model.getFinalScoringPass().add(player));
            state = state.setCapabilityModel(CountCapability.class, model);
        }
=======
>>>>>>> ead5e0c fix move from market queater before final scoring

        Player next = player;
        while (model.getFinalScoringPass().size() != state.getPlayers().length()) {
            next = next.getNextPlayer(state);
            if (!model.getFinalScoringPass().contains(next)) {
                StepResult res = processPlayer(state, next);
                if (res == null) {
                    model = model.setFinalScoringPass(model.getFinalScoringPass().add(next));
                    state = state.setCapabilityModel(CountCapability.class, model);
                } else {
                    return res;
                }
            }
        }

        return endPhase(state);
    }

    @Override
    protected Function<Feature, Boolean> getAllowedFeaturesFilter(GameState state) {
        return f -> {
            if (f instanceof Farm) {
                return true;
            }
            if (f instanceof Completable) {
                return !((Completable)f).isCompleted(state);
            }
            throw new UnsupportedOperationException();
        };
    }


}
