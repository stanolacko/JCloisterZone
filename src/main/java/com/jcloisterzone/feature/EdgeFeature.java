package com.jcloisterzone.feature;

import com.jcloisterzone.board.Edge;
import com.jcloisterzone.board.pointer.FeaturePointer;

/** feature laying on tile edge, triggers open edge close or feature merge on tile placement */
public interface EdgeFeature<T extends EdgeFeature<?>> extends Feature {

    T closeEdge(Edge edge);

    default boolean isMergeableWith(EdgeFeature<?> other) {
        return getClass().equals(other.getClass());
    }

    default FeaturePointer getProxyTarget() {
        return null;
    }
}
