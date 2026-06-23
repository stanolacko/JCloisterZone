import type { Position } from "../../board/Position.js";
import type { Rotation } from "../../board/Rotation.js";
import { AbstractMessage } from "./AbstractMessage.js";
import type { ReplayableMessage } from "./ReplayableMessage.js";

/** PLACE_PREDRAWN — place a tile the player held in their (server-secret) pre-draw hand. Unlike
 *  PLACE_TILE, the tile is identified by id and drawn from the pack on placement (it was never the
 *  public "drawn tile"); the server has already revealed it to everyone. */
export class PlacePreDrawnMessage extends AbstractMessage implements ReplayableMessage {
  static readonly command = "PLACE_PREDRAWN";

  constructor(
    private readonly tileId: string,
    private readonly rotation: Rotation,
    private readonly position: Position,
  ) {
    super();
  }

  getTileId(): string {
    return this.tileId;
  }
  getRotation(): Rotation {
    return this.rotation;
  }
  getPosition(): Position {
    return this.position;
  }
}
