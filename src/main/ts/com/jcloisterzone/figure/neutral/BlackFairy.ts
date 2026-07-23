import type { BoardPointer } from "../../board/pointer/BoardPointer.js";
import { NeutralFigure } from "./NeutralFigure.js";

export class BlackFairy extends NeutralFigure<BoardPointer> {
  static readonly simpleName = "BlackFairy";
  constructor(id: string) {
    super(id);
  }
}
