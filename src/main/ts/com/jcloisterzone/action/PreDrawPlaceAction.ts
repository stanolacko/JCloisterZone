import { AbstractPlayerAction } from "./AbstractPlayerAction.js";

/** "Place a tile from your pre-draw hand." Carries no options: the engine doesn't know the secret
 *  hand (Approach A) — the owning client lists its own held tiles and sends a PLACE_PREDRAWN. */
export class PreDrawPlaceAction extends AbstractPlayerAction<void> {
  constructor() {
    super(null);
  }
}
