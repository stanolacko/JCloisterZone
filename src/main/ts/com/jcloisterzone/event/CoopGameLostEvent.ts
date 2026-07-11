import type { Player } from "../Player.js";
import { PlayEvent, PlayEventMeta } from "./PlayEvent.js";

/** Keep Building (cooperative variant): the turn player neither enlarged an occupied
 *  completable feature nor occupied a new one — the game is over and everyone loses. */
export class CoopGameLostEvent extends PlayEvent {
  static readonly simpleName = "CoopGameLostEvent";

  constructor(
    meta: PlayEventMeta,
    private readonly player: Player,
  ) {
    super(meta);
  }

  getPlayer(): Player {
    return this.player;
  }
}
