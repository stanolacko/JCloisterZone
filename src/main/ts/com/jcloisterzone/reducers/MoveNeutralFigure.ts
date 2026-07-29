import type { Player } from "../Player.js";
import type { BoardPointer } from "../board/pointer/BoardPointer.js";
import { MeeplePointer } from "../board/pointer/MeeplePointer.js";
import { NeutralFigureMoved } from "../event/NeutralFigureMoved.js";
import { PlayEventMeta } from "../event/PlayEvent.js";
import type { Meeple } from "../figure/Meeple.js";
import type { NeutralFigure } from "../figure/neutral/NeutralFigure.js";
import type { GameState } from "../game/state/GameState.js";
import type { Reducer } from "./Reducer.js";

/** Moves a neutral figure to a pointer (or removes it when pointer is null). */
export class MoveNeutralFigure implements Reducer {
  constructor(
    private readonly figure: NeutralFigure<BoardPointer>,
    private readonly pointer: BoardPointer | null,
    private readonly triggeringPlayer: Player | null = null,
  ) {}

  apply(state: GameState): GameState {
    let nfState = state.getNeutralFigures();
    const deployed = nfState.getDeployedNeutralFigures();
    const from = deployed.get(this.figure).getOrNull();

    nfState = nfState.setDeployedNeutralFigures(
      (this.pointer === null
        ? deployed.remove(this.figure)
        : deployed.put(this.figure, this.pointer)) as typeof deployed,
    );

    state = state.setNeutralFigures(nfState);

    // capture the meeple the figure was placed next to (while it is still on the board), so the UI
    // can show it later even if it gets removed — see NeutralFigureMoved.hostMeeple
    let hostMeeple: Meeple | null = null;
    if (this.pointer instanceof MeeplePointer) {
      const targetId = this.pointer.getMeepleId();
      if (targetId !== null) {
        for (const t of state.getDeployedMeeples()) {
          if (t._1.getId() === targetId) {
            hostMeeple = t._1;
            break;
          }
        }
      }
    }

    state = state.appendEvent(
      new NeutralFigureMoved(
        PlayEventMeta.createWithPlayer(this.triggeringPlayer),
        this.figure,
        from,
        this.pointer,
        hostMeeple,
      ),
    );
    return state;
  }
}
