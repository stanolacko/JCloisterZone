
# JCloisterZoneEngine

JCloisterZoneEngine is backend for [FanCloisterZone](
https://github.com/fancarpedia/FanCloisterZone/) as fork of [JCloisterZone](https://github.com/farin/JCloisterZone).

## Branch layout

The engine has been rewritten from Java to TypeScript. The two implementations live on
separate branches:

| Branch   | Implementation      | Notes |
| -------- | ------------------- | ----- |
| `6.x`    | **Original Java**   | The reference implementation and source of truth for behaviour. Used to capture the golden test data. |
| `master` | **TypeScript port** | The active engine — a 1:1 behavioural port of the Java engine, validated byte-for-byte against it. |

The Java engine on `6.x` is authoritative: the TS port on `master` is verified by replaying
the saved games through both engines and comparing the full `GameState` JSON at every step.

### Pull Request Guidelines

To avoid mistakes, submit clean, focused, and ready-to-merge pull requests.

Before starting work, discuss your idea on our Discord server.

#### One Idea per Pull Request

* One bug, feature, or refactor only
* Do not mix unrelated changes

#### Clean Commits

* One logical change per commit
* Use clear commit messages
* Keep history readable (rebase/squash if needed)

#### Ready Before Review

* Review and test your code
* Follow project style
* Pull Request should be ready to merge, not a draft

#### Handle Feedback Properly

* Address all review comments
* Update existing commits (don’t just add fixes on top)

#### Keep Pull Requests Small

* Easy to review
* Split large changes into multiple PRs

#### Pull Request Description

Include:

* What problem it solves
* What was changed

## Development helpers (Java — `6.x` branch)

### Dump features map
```
    System.err.println("# features: " + state.getFeatureMap().mapValues(m -> m.toJavaMap()).toJavaMap());
```
### Get Feature object from FeaturePointer
```
    FeaturePointer fp;
    Feature feature = state.getFeature(fp);
```

### Get FeaturePointer for Feature
Usually is used feature pointer of figure placed on feature. This is for case, that feature is unoccupied, or it has no neutral figure there (like Witch/Mage).
```
    Feature f;
    FeaturePointer fp = state.getFeaturePointer(f);
```

### Traits - Append requested existing mechanics to Featuers / Figures / etc.
Traits are defined as 
```
com.jcloisterzone.game.capability.trait.RequiredStuffName
```
and used in object as 
```
class ObjectName implement RequiredStuffName
```

**Known traits**
_Official expansions:_
1. BuilderExtendable - each feature which is extendable by a Builder
2. UnaffectedByBarn - figure not affected by a Barn placement or by Field joining with a field with a Barn 
3. WagonEligible - if it is possible to place a Wagon to a feature

_Fan-expansions:_
1. FlowersBonusAffected - feature and special figure affected by Flowers on tiles during scoring
2. MeteoriteProtected - features protected agains Meteorite impact - all meeples and stuff placed there kept untouch
3. FeatureCompletionBlocker - contains `isFeatureCompletionBlocked()` to test if it not possible to complete a feature, like Tunnel token placement join and finish with 2nd road with Donkey.  

## TypeScript development (`master` branch)

The TS engine is a Node project (ESM, `"type": "module"`). The core under
`src/main/ts/com/jcloisterzone/` has **no Node imports** — it is portable/embeddable; only the
CLI host (`src/main/ts/cli/jcz-engine.ts`, compiled to `dist/cli/jcz-engine.js`) and the
test/golden tooling touch `node:*`.

### Requirements

* **Node.js >= 16**
* `npm install` (dev deps: TypeScript, Vitest, `@xmldom/xmldom`)
* To regenerate golden data you also need the **Java engine jar** (built from the `6.x`
  branch) and a JDK to run it.

### Commands

| Command | What it does |
| ------- | ------------ |
| `npm run typecheck` | `tsc --noEmit` — type-check only, no output. |
| `npm run build`     | Compile `src/main/ts` → `dist/` (incl. the CLI at `dist/cli/jcz-engine.js`). |
| `npm run build:bundle` | esbuild the engine into **one self-contained file** `bundle/jcz-engine.js` (the release artifact the client downloads). |
| `npm test`          | Run the Vitest suite (`vitest run`). |
| `npm run test:watch`| Vitest in watch mode. |
| `npm run engine`    | Start the engine CLI (`node dist/cli/jcz-engine.js`); add `-p <port>` for socket mode. |
| `npm run capture-golden` | Replay every `engine-tests/**/*.jcz` through the Java jar and write `*.golden.jsonl`. Requires `JCZ_JAR=<path to Engine.jar>`. |

### Running as a socket service (dev only)

For development you can run the engine as a socket service that speaks the same line
protocol as the Java client's `SocketEngine`. Build first, then start it on a port (e.g. 9001):

```bash
npm install
npm run build                       # compiles the CLI to dist/cli/jcz-engine.js
node dist/cli/jcz-engine.js -p 9001
```

It prints `#listening on port 9001` and accepts one JSON message per line per connection,
replying with one JSON line per response. Useful flags: `--log <file>` (record `>>` in / `<<`
out), `-v` (echo the same to stderr, `#`-prefixed so the client ignores it).

> **Note:** this is a plain TCP line socket for local development, **not** a hardened
> production WebSocket service.

### Release artifact (single-file bundle)

For distribution the engine ships as **one self-contained file** — the drop-in replacement
for `Engine.jar`:

```bash
npm run build:bundle        # → bundle/jcz-engine.js  (esbuild: engine + CLI + @xmldom inlined)
node bundle/jcz-engine.js -p 9001
```

It needs only a Node runtime — no `node_modules` (everything is inlined). Tile XMLs stay
external (loaded at runtime via `%load`, exactly like the jar). On a version tag,
`.github/workflows/release.yml` builds this bundle and attaches `bundle/jcz-engine.js` to the
GitHub release; the FanCloisterZone client pins a version by tag in its
`build-scripts/download-game-engine.js` (same mechanism it used for `Engine.jar`).

### How parity is verified

`src/main/ts/com/jcloisterzone/engine/state-parity.test.ts` replays each saved game
(`engine-tests/**/*.jcz`) through the TS engine in-process and deep-compares every emitted
`GameState` to the matching `*.golden.jsonl` (captured from the Java engine). **This is the
definition of done — identical JSON per step, not just final scores.**

### Adding a new feature (post-cutover)

After the cutover the Java engine is **frozen on `6.x`** — it will never grow new mechanics, so
it can no longer be the oracle for behaviour that only exists in TS. The Java-derived goldens
become a **frozen regression net** (they guard everything that was ported and never change),
and **you** become the oracle for anything new.

So `npm run typecheck && npm test && npm run build` on its own only proves *"I didn't break
existing behaviour."* It says nothing about whether a *new* feature is correct. For each new
feature, also do the following:

1. **Author a `.jcz` replay** that exercises the feature, and put human-written expected scores
   in its `test` block (e.g. `"assertions": ["Alice has 9 points"]`). `jcz.test.ts` checks
   these with no Java involved — this is your *correctness* check, which you verify by hand
   against the rules.
2. **Capture a TS golden** for it and review it once before committing:
   ```bash
   npm run build
   npm run capture-golden:ts -- <dir-or-test>.jcz   # writes <test>.golden.jsonl from the TS engine
   ```
   ⚠️ A TS golden is only as trustworthy as your review **at capture time** — eyeball the
   emitted states, confirm they're right, *then* commit. From then on `state-parity.test.ts`
   guards the full per-step state against regressions.
3. **Smoke-test against the real client:** `node dist/cli/jcz-engine.js -p 9001` and play the
   feature in FanCloisterZone for visual confirmation.

`capture-golden:ts` (TS engine, no jar) is the post-cutover counterpart of `capture-golden`
(Java jar). Only capture **new or intentionally-changed** tests with it — leave the existing
Java-derived goldens untouched so they keep catching regressions.

### Important gotchas

* **Rebuild `dist/` after engine changes.** Vitest runs the TS *source* directly, but the CLI
  *is* the compiled `dist/` (`dist/cli/jcz-engine.js`). `tsc --noEmit` does **not** emit, so run
  `npm run build` or the CLI will execute stale code.
* **When the Java engine (`6.x`) changes, re-sync the goldens.** Rebuild the jar
  (`mvn -DskipTests package`), then `JCZ_JAR=build/Engine.jar npm run capture-golden`, then
  run the suite — failing parity tests pinpoint exactly which behaviour to port.

### Interfaces & traits in TS (the `isInstanceOf…` convention)

Java uses `instanceof SomeInterface` to ask "does this feature / figure / message have
mechanic X?" (e.g. `instanceof WagonEligible`, `instanceof Completable`, `instanceof
Scoreable`). **TypeScript interfaces are erased at runtime, so a plain `instanceof` against an
interface is impossible.** So the rule is:

> Every Java `x instanceof SomeInterface` becomes `isInstanceOfSomeInterface(x)` in TS.

Each such interface ships a single **duck-typed guard**, declared once in the interface's own
module, that the rest of the code calls. There are two flavours, depending on the interface:

**1. Marker interfaces** (no other distinctive method) carry a **compiler-enforced marker
method**, and the guard duck-types on it:

```ts
// game/capability/trait/WagonEligible.ts
export interface WagonEligible extends Feature {
  isWagonEligible(): true;          // marker the interface requires
}
export function isInstanceOfWagonEligible(f: unknown): f is WagonEligible {
  return typeof (f as { isWagonEligible?: unknown } | null)?.isWagonEligible === "function";
}
```

**2. Interfaces with a distinctive required method** simply duck-type on that method — no
synthetic marker needed:

```ts
// feature/Scoreable.ts
export function isInstanceOfScoreable(f: unknown): f is Scoreable {
  return typeof (f as { getOwners?: unknown } | null)?.getOwners === "function";
}
```

A class opts in exactly like Java (`implements`); TypeScript then **forces** it to provide the
marker / method, so the runtime check stays automatic — no central list to maintain:

```ts
export class Road extends CompletableFeature<Road>
  implements BuilderExtendable, FlowersBonusAffected, WagonEligible /* … */ {
  isWagonEligible(): true { return true; }
  // …
}
```

**Every interface that Java checks with `instanceof` has such a guard.** The full set:

| Interface | Guard | Module | Duck-types on |
| --------- | ----- | ------ | ------------- |
| `Completable` | `isInstanceOfCompletable` | `feature/Completable.ts` | `isCompletable()` marker |
| `Structure` | `isInstanceOfStructure` | `feature/Structure.ts` | `getMeeples2()` + `isStructure() !== false` |
| `Scoreable` | `isInstanceOfScoreable` | `feature/Scoreable.ts` | `getOwners()` |
| `Monastic` | `isInstanceOfMonastic` | `feature/Monastic.ts` | `isMonastic()` marker |
| `NeighbouringFeature` | `isInstanceOfNeighbouringFeature` | `feature/NeighbouringFeature.ts` | `getNeighboring()` |
| `EdgeFeature` | `isInstanceOfEdgeFeature` | `feature/EdgeFeature.ts` | `closeEdge()` |
| `RangeFeature` | `isInstanceOfRangeFeature` | `feature/RangeFeature.ts` | `getRangeTilesWithFeature()` |
| `TrapFeature` | `isInstanceOfTrapFeature` | `feature/TrapFeature.ts` | `isTrapFeature()` marker |
| `WagonEligible` | `isInstanceOfWagonEligible` | `game/capability/trait/WagonEligible.ts` | `isWagonEligible()` marker |
| `BuilderExtendable` | `isInstanceOfBuilderExtendable` | `game/capability/trait/BuilderExtendable.ts` | `isBuilderExtendable()` marker |
| `UnaffectedByBarn` | `isInstanceOfUnaffectedByBarn` | `game/capability/trait/UnaffectedByBarn.ts` | `isUnaffectedByBarn()` marker |
| `FlowersBonusAffected` | `isInstanceOfFlowersBonusAffected` | `game/capability/trait/FlowersBonusAffected.ts` | `isFlowersBonusAffected()` marker |
| `MeteoriteProtected` | `isInstanceOfMeteoriteProtected` | `game/capability/trait/MeteoriteProtected.ts` | `meteoriteProtected()` marker |
| `FeatureCompletionBlocker` | `isInstanceOfFeatureCompletionBlocker` | `game/capability/trait/FeatureCompletionBlocker.ts` | `isFeatureCompletionBlocked()` |
| `TopLeftTranslatedFigurePosition` | `isInstanceOfTopLeftTranslatedFigurePosition` | `figure/TopLeftTranslatedFigurePosition.ts` | marker |
| `RandomChangingMessage` | `isInstanceOfRandomChangingMessage` | `io/message/RandomChangingMessage.ts` | `getRandom()` |

**The one exception:** `ReplayableMessage` is a **pure marker interface with no members**, so it
cannot be duck-typed. The TS engine treats every parsed game message as replayable and casts
(`msg as ReplayableMessage`) instead of guarding — this mirrors how `Engine.java` only ever asks
`instanceof ReplayableMessage` to decide whether to record a message in the replay.

**Rules:**
* The guard `isInstanceOfX` lives **once**, in interface `X`'s own module.
* It duck-types on a member the interface **requires** — a dedicated `isX(): true` marker for
  member-less interfaces, or an existing distinctive method otherwise — so `implements X` on a
  class is enough to make the runtime check pass, automatically, like Java.
* **Never hardcode a class list** inside a guard (unless the Java code itself does).
* This applies only to **erased interfaces**. For concrete classes, abstract classes, and enums,
  use native `instanceof` (e.g. `f instanceof Road`, `m instanceof CommitMessage`,
  `token instanceof TowerCapability.TowerToken`).

**Adding a new interface/trait** (mirrors Java):
1. Create `MyTrait.ts` with the `MyTrait` interface and the `isInstanceOfMyTrait()` guard
   (add an `isMyTrait(): true` marker if the interface has no distinctive method to key on).
2. Add `implements MyTrait` (+ the marker method) to each class that has the mechanic.
3. Replace each Java `instanceof MyTrait` with `isInstanceOfMyTrait(...)` at the call sites.
