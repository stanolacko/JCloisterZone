package com.jcloisterzone.action;

import com.jcloisterzone.board.pointer.MeeplePointer;
import io.vavr.collection.Set;

public class FairyNextToAction extends AbstractPlayerAction<MeeplePointer> {

    private final String figureId;

    public FairyNextToAction(String figureId, Set<MeeplePointer> options) {
        super(options);
        this.figureId = figureId;
    }

    public String getFigureId() {
        return figureId;
    }
}
