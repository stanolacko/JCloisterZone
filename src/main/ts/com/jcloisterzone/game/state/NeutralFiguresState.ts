import { LinkedHashMap } from "../../../../io/vavr/Map.js";
import type { Position } from "../../board/Position.js";
import type { BoardPointer } from "../../board/pointer/BoardPointer.js";
import type { FeaturePointer } from "../../board/pointer/FeaturePointer.js";
import type { BigTop } from "../../figure/neutral/BigTop.js";
import type { Count } from "../../figure/neutral/Count.js";
import type { Courier } from "../../figure/neutral/Courier.js";
import type { BlackFairy } from "../../figure/neutral/BlackFairy.js";
import type { Donkey } from "../../figure/neutral/Donkey.js";
import type { Dragon } from "../../figure/neutral/Dragon.js";
import type { Fairy } from "../../figure/neutral/Fairy.js";
import type { Mage } from "../../figure/neutral/Mage.js";
import type { NeutralFigure } from "../../figure/neutral/NeutralFigure.js";
import type { Witch } from "../../figure/neutral/Witch.js";

type DeployedMap = LinkedHashMap<NeutralFigure<BoardPointer>, BoardPointer>;

/** Immutable state of all neutral figures and where they are deployed. */
export class NeutralFiguresState {
  constructor(
    private readonly dragon: Dragon | null = null,
    private readonly fairy: Fairy | null = null,
    private readonly mage: Mage | null = null,
    private readonly witch: Witch | null = null,
    private readonly count: Count | null = null,
    private readonly bigtop: BigTop | null = null,
    private readonly donkey: Donkey | null = null,
    private readonly courier: Courier | null = null,
    private readonly blackFairy: BlackFairy | null = null,
    private readonly deployedNeutralFigures: DeployedMap = LinkedHashMap.empty<
      NeutralFigure<BoardPointer>,
      BoardPointer
    >(),
  ) {}

  private copy(overrides: Partial<{
    dragon: Dragon | null;
    fairy: Fairy | null;
    mage: Mage | null;
    witch: Witch | null;
    count: Count | null;
    bigtop: BigTop | null;
    donkey: Donkey | null;
    courier: Courier | null;
    blackFairy: BlackFairy | null;
    deployedNeutralFigures: DeployedMap;
  }>): NeutralFiguresState {
    return new NeutralFiguresState(
      overrides.dragon !== undefined ? overrides.dragon : this.dragon,
      overrides.fairy !== undefined ? overrides.fairy : this.fairy,
      overrides.mage !== undefined ? overrides.mage : this.mage,
      overrides.witch !== undefined ? overrides.witch : this.witch,
      overrides.count !== undefined ? overrides.count : this.count,
      overrides.bigtop !== undefined ? overrides.bigtop : this.bigtop,
      overrides.donkey !== undefined ? overrides.donkey : this.donkey,
      overrides.courier !== undefined ? overrides.courier : this.courier,
      overrides.blackFairy !== undefined ? overrides.blackFairy : this.blackFairy,
      overrides.deployedNeutralFigures ?? this.deployedNeutralFigures,
    );
  }

  setDragon(dragon: Dragon | null): NeutralFiguresState {
    return this.copy({ dragon });
  }
  setFairy(fairy: Fairy | null): NeutralFiguresState {
    return this.copy({ fairy });
  }
  setBlackFairy(blackFairy: BlackFairy | null): NeutralFiguresState {
    return this.copy({ blackFairy });
  }
  setMage(mage: Mage | null): NeutralFiguresState {
    return this.copy({ mage });
  }
  setWitch(witch: Witch | null): NeutralFiguresState {
    return this.copy({ witch });
  }
  setCount(count: Count | null): NeutralFiguresState {
    return this.copy({ count });
  }
  setBigTop(bigtop: BigTop | null): NeutralFiguresState {
    return this.copy({ bigtop });
  }
  setDonkey(donkey: Donkey | null): NeutralFiguresState {
    return this.copy({ donkey });
  }
  setCourier(courier: Courier | null): NeutralFiguresState {
    return this.copy({ courier });
  }
  setDeployedNeutralFigures(deployedNeutralFigures: DeployedMap): NeutralFiguresState {
    return this.copy({ deployedNeutralFigures });
  }

  getById(figureId: string): NeutralFigure<BoardPointer> | null {
    const all = [
      this.dragon,
      this.fairy,
      this.mage,
      this.witch,
      this.count,
      this.bigtop,
      this.donkey,
      this.courier,
      this.blackFairy,
    ];
    for (const fig of all) {
      if (fig !== null && figureId === fig.getId()) {
        return fig as unknown as NeutralFigure<BoardPointer>;
      }
    }
    return null;
  }

  private deploymentOf(fig: NeutralFigure<BoardPointer> | null): BoardPointer | null {
    if (fig === null) return null;
    return this.deployedNeutralFigures.get(fig).getOrNull();
  }

  getDragon(): Dragon | null {
    return this.dragon;
  }
  getDragonDeployment(): Position | null {
    const bp = this.deploymentOf(this.dragon as unknown as NeutralFigure<BoardPointer>);
    return bp !== null ? bp.getPosition() : null;
  }
  getFairy(): Fairy | null {
    return this.fairy;
  }
  getFairyDeployment(): BoardPointer | null {
    return this.deploymentOf(this.fairy as unknown as NeutralFigure<BoardPointer>);
  }
  getBlackFairy(): BlackFairy | null {
    return this.blackFairy;
  }
  getBlackFairyDeployment(): BoardPointer | null {
    return this.deploymentOf(this.blackFairy as unknown as NeutralFigure<BoardPointer>);
  }
  getMage(): Mage | null {
    return this.mage;
  }
  getMageDeployment(): FeaturePointer | null {
    return this.deploymentOf(this.mage as unknown as NeutralFigure<BoardPointer>) as FeaturePointer | null;
  }
  getWitch(): Witch | null {
    return this.witch;
  }
  getWitchDeployment(): FeaturePointer | null {
    return this.deploymentOf(this.witch as unknown as NeutralFigure<BoardPointer>) as FeaturePointer | null;
  }
  getCount(): Count | null {
    return this.count;
  }
  getCountDeployment(): FeaturePointer | null {
    return this.deploymentOf(this.count as unknown as NeutralFigure<BoardPointer>) as FeaturePointer | null;
  }
  getBigTop(): BigTop | null {
    return this.bigtop;
  }
  getBigTopDeployment(): Position | null {
    return this.deploymentOf(this.bigtop as unknown as NeutralFigure<BoardPointer>) as Position | null;
  }
  getDonkey(): Donkey | null {
    return this.donkey;
  }
  getDonkeyDeployment(): Position | null {
    return this.deploymentOf(this.donkey as unknown as NeutralFigure<BoardPointer>) as Position | null;
  }
  getCourier(): Courier | null {
    return this.courier;
  }
  getCourierDeployment(): FeaturePointer | null {
    return this.deploymentOf(this.courier as unknown as NeutralFigure<BoardPointer>) as FeaturePointer | null;
  }

  getDeployedNeutralFigures(): DeployedMap {
    return this.deployedNeutralFigures;
  }
}
