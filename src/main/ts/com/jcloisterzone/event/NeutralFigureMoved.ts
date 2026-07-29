import type { BoardPointer } from "../board/pointer/BoardPointer.js";
import type { Meeple } from "../figure/Meeple.js";
import type { NeutralFigure } from "../figure/neutral/NeutralFigure.js";
import { PlayEvent, type PlayEventMeta } from "./PlayEvent.js";

/** A neutral figure (fairy/dragon/...) moved from one pointer to another. */
export class NeutralFigureMoved extends PlayEvent {
  static readonly simpleName = "NeutralFigureMoved";

  constructor(
    metadata: PlayEventMeta,
    private readonly neutralFigure: NeutralFigure<BoardPointer>,
    private readonly from: BoardPointer | null,
    private readonly to: BoardPointer | null,
    // the meeple the figure was placed next to, captured now (while it is on the board) so the UI can
    // still show it after it is removed — without the client having to parse/guess its type. TS-only.
    private readonly hostMeeple: Meeple | null = null,
  ) {
    super(metadata);
  }

  getFrom(): BoardPointer | null {
    return this.from;
  }
  getTo(): BoardPointer | null {
    return this.to;
  }
  getNeutralFigure(): NeutralFigure<BoardPointer> {
    return this.neutralFigure;
  }
  getHostMeeple(): Meeple | null {
    return this.hostMeeple;
  }
}
