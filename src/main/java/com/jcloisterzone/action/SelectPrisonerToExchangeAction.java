package com.jcloisterzone.action;

import com.jcloisterzone.figure.Follower;
import io.vavr.collection.Set;

/**
 * Action is triggered in rare case when there is different follower classes
 * to exchange and owner can choose which one want to return.
 * Eg. opponent has captured both my big and small. When I capture
 * it's follower exchange happens immediately and I can choose which one should
 * be returned.
 *
 */
public class SelectPrisonerToExchangeAction extends AbstractPlayerAction<Follower> {

    private final Follower justCapturedFollower;

    public SelectPrisonerToExchangeAction(Follower justCapturedFollower, Set<Follower> options) {
        super(options);
        this.justCapturedFollower = justCapturedFollower;
    }

    public Follower getJustCapturedFollower() {
        return justCapturedFollower;
    }
}
