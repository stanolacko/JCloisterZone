package com.jcloisterzone.game.state;

public enum Flag {
    // Cleared at the turn end
    RANSOM_PAID, BAZAAR_AUCTION, TUNNEL_PLACED,

    // Cleared at the turn part end
    PORTAL_USED, NO_PHANTOM, FLYING_MACHINE_USED, 
    
    // Set when the river's volcano lake (the forced-last river tile) is placed; consumed at the
    // turn end to grant the placing player another turn. Cleared at the turn end.
    RIVER_VOLCANO_DOUBLE_TURN
}