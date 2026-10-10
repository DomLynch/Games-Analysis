# Anuken-Mindustry (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/units/AIController.java` (also read: `ai/types/FlyingAI.java`, `ai/types/GroundAI.java`, `entities/Units.java`, `type/UnitType.java`, `content/UnitTypes.java` flag lines) | Licence: GPL-3.0 (`LICENSE` in the repo root is the GNU GPL version 3 text; project source headers not read) | Java | symbol `AIController.updateWeapons` / `FlyingAI.findMainTarget`

Checked: `AIController.java` read at 20-45, 110-216 and 255-305 (retarget gate, main target, mount targets, invalid check, closest-target base). `FlyingAI.java` read at 1-80 (main-target chain and mount override). `GroundAI.java` read in full. `Units.java` read at 151-166 and 257-300 (invalidate test, closest target). Flags on unit types read by line for 6 unit types (flare, horizon, zenith, antumbra, eclipse, quad). Not read: `Interval` (arc library, not in the donor; the retarget gate assumes "fires once per interval" and this is not verified), `Units.closestEnemy` body, `indexer.findEnemyTile`, the game loop that drives `Time.delta`. Cell = category_no 2. Hint file `ControlPathfinder.java` is pathfinding for player-commanded units, not aggro: not the target code. Confidence high on the target chain and the mount split; medium on the timer semantics. camera_scope: n/a.

## 1. Mechanism

- Two targets per unit. The main target (`target`) is where the unit goes and what it faces. Each weapon mount has its own target, picked from the mount's own position and range. This is the key split.
- Retarget gate: `retarget()` returns `timer.get(timerTarget, target == null ? 40 : 90)` (AIController.java 285-287). Read as: idle units re-pick every 40 ticks, engaged units every 90 ticks (1.5 s at 60 ticks/s), if `Interval.get` fires once per interval (`Interval` is not in the donor and was not read). `resetTimers` gives the first pick a random phase: 0 to 40 ticks (39-40). When a Healthc target dies, `targetInvalidated` sets the timer so the next update re-picks at once (168-170).
- Order each update: `updateTargeting()` runs before `updateMovement()` (54-55). In `updateWeapons` (defined at 172; called from `updateTargeting` at 116; the body starts at 174): (a) `ret = retarget()` (174); (b) if `ret`, `target = findMainTarget(unit.x, unit.y, unit.range(), ...)` (176-177); (c) `invalid(target)` drops a dead or foreign target (138: `invalidateTarget` with no range, so the main target is not dropped for being far away); (d) per mount, unless `singleTarget`, `mount.target = findTarget(mountX, mountY, wrange, ...)` on the retarget tick (211-212); (e) a mount target that fails `checkTarget` at the mount's range is cleared (215-216).
- Main target for flying units (`FlyingAI.findMainTarget`, 42-72):
  1. The closest enemy core is looked up (43). If it is within `range` of the unit, it wins (45-46).
  2. If `randomWaveAI` is on: up to 5 tries of a random flag from `randomTargets` (13, 49-53), then the closest in range.
  3. Otherwise walk `unit.type.targetFlags` in order (61). A `null` entry means the closest enemy in range (62-63); a flag entry means the closest active enemy building with that flag, with no range limit (66).
  4. If nothing matched, return the core (72), even if it is far.
- Mount target for flying units (`FlyingAI.findTarget`, 34-38): take the main target computed from the mount's position and range. If that is out of the mount's range, use the closest enemy in range instead (37-38). So a flying unit can fly toward a far flagged building (movement, 22-23: `moveTo(target, unit.type.range * 0.8f)`) while its guns shoot whatever is in range.
- Closest in range (base `target`, AIController 281-282 and `Units.closestTarget` 272-281): enemy units first (275, `closestEnemy`), then enemy buildings (279, `findEnemyTile` with the building sort). The range test is in `invalidateTarget` (152-153).
- Per-type data: `UnitType.targetFlags` defaults to `{null}` (type/UnitType.java 361). Each flying type sets its own order (UnitTypes.java): flare `{generator, null}` (1055), horizon `{factory, null}` (1105), zenith `{launchPad, storage, battery, null}` (1152), antumbra `{generator, core, null}` (1199), eclipse `{reactor, battery, core, null}` (1275), quad `{battery, factory, null}` (1493).
- Ground units use the base `findTarget`, which is the closest enemy in range (AIController 293-294 default; GroundAI does not override it). GroundAI sets `target = core` when the core is within `range / 1.3` plus half the core size (29-30), and walks the flowfield to the core unless within half its range (38). (GroundAI pathfinding body: not read.)
- Time: the no-target timer uses `Time.delta` (180, `noTargetTime += Time.delta`). GroundAI accumulates stuck time with `Time.delta` too. The loop that sets `Time.delta` was not read, so this is variable-step in the donor code (not verified how it is driven).

## 2. Key functions

- `AIController.retarget` and `updateWeapons`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/units/AIController.java` 174-216 (gate, main pick, invalid, per-mount pick and drop) and 285-290 (gate interval and default main target).
- `FlyingAI.findTarget` and `FlyingAI.findMainTarget`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/types/FlyingAI.java` 34-72.
- `Units.closestTarget`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/Units.java` 272-281.
- `Units.invalidateTarget`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/Units.java` 151-158.
- Per-type flag orders: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/content/UnitTypes.java` 1055, 1105, 1152, 1199, 1275, 1493.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-level target: a far "where to go" target and an in-range "what to hit" target per weapon | Mount test is the mount's own range (theirs, FlyingAI.java 37-38) |
| Priority list per enemy type, with a nearest-in-range fallback as an entry in the list | Order per unit type (theirs, UnitTypes.java 1055-1493); default `{null}` (theirs, type/UnitType.java 361) |
| Re-pick on a timer that is longer when engaged (sticky target) | 40 ticks idle, 90 ticks engaged (theirs, AIController.java 286) |
| Random phase so units do not all re-pick on the same tick | 0-40 ticks for the first pick (theirs, AIController.java 40) |
| Dead target forces an immediate re-pick | Reset to -1 (theirs, AIController.java 169) |
| Core takes priority when in range, otherwise the list | Core test is the unit's range (theirs, FlyingAI.java 45-46) |
| Ground core override at range / 1.3 and stop at half range | 1.3 and 0.5 (theirs, GroundAI.java 29, 38) |
| Move to 80% of range from the target | 0.8 (theirs, FlyingAI.java 23) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (core in range first, then the flag chain in order with `null` as nearest-in-range, then the core; the mount test is the mount's range, else nearest in range), and the 40/90-tick gate. It omits the random-wave mode (5 random flags), the `invalid()` check, the `targetUnderBlocks` and `underBullets` filters, the building `active` rule is one flag (donor: items present or not idle, plus `targetable`), the ground-unit path, `Units.closestEnemy` details (not read), the random phase, and the forced re-pick on target death. The `retargetDue` counter assumes "fires once per interval" for the arc `Interval` class, which was not read.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pt { x: number; y: number; }
interface Thing extends Pt {
  id: string;
  flags: string[];      // block flags, e.g. "generator", "factory", "core"
  active: boolean;      // has items or is not idle (donor: targetFlagActive)
}
interface World {
  enemyUnits: Thing[];       // hostile units
  enemyBuildings: Thing[];   // hostile buildings
}

// null in a flag list means "closest enemy in range, units first, then buildings".
type FlagChain = (string | null)[];

// Donor numbers (AIController.java 40, 286; FlyingAI.java 53).
const RETARGET_TICKS_IDLE = 40;     // no target
const RETARGET_TICKS_ENGAGED = 90;  // has a target

function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function within(a: Pt, b: Pt, r: number): boolean { return dist(a, b) <= r; }

function closestInRange(from: Pt, world: World, range: number): Thing | undefined {
  const units = world.enemyUnits.filter(u => within(from, u, range));
  const pick = (list: Thing[]) => list.reduce<Thing | undefined>(
    (best, t) => (best === undefined || dist(from, t) < dist(from, best) ? t : best), undefined);
  return pick(units) ?? pick(world.enemyBuildings.filter(b => within(from, b, range)));
}

function closestWithFlag(from: Pt, world: World, flag: string): Thing | undefined {
  // no range limit here, as in the donor (targetFlagActive)
  const list = world.enemyBuildings.filter(b => b.flags.includes(flag) && b.active);
  return list.reduce<Thing | undefined>(
    (best, t) => (best === undefined || dist(from, t) < dist(from, best) ? t : best), undefined);
}

// Main target: core in range first, then walk the flag chain in order, then the core.
export function findMainTarget(from: Pt, range: number, core: Thing | undefined,
                               chain: FlagChain, world: World): Thing | undefined {
  if (core && within(from, core, range)) return core;
  for (const flag of chain) {
    const hit = flag === null ? closestInRange(from, world, range) : closestWithFlag(from, world, flag);
    if (hit) return hit;
  }
  return core;
}

// Weapon mount target: the main target if it is inside the mount's range, else the closest in range.
export function findMountTarget(mountPos: Pt, mountRange: number, main: Thing | undefined,
                                world: World): Thing | undefined {
  if (main && within(mountPos, main, mountRange)) return main;
  return closestInRange(mountPos, world, mountRange);
}

// Retarget gate: a tick counter that fires after 40 ticks idle or 90 ticks engaged.
export function retargetDue(ticksSinceLast: number, hasTarget: boolean): boolean {
  return ticksSinceLast >= (hasTarget ? RETARGET_TICKS_ENGAGED : RETARGET_TICKS_IDLE);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the engine's AI brain). Parity-checklist row 2 (AI brain). The retarget gate is a fight-loop cadence, so it also touches row 4; the note cites row 2 only.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the target choice is server-side data, not a client decision); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism.
- The flag lists are per unit type, which suits Frankendom's enemy archetypes (rules: zones as data). The donor's list order is a fixed priority, with no score. Frankendom needs a rule for when two entries both match (the donor takes the first).
- The core-first rule is space-game specific (a "core" building). Frankendom would need an objective marker with the same role, defined per zone.
- Timers are in ticks with `Time.delta`. Frankendom's server must use the fixed step (server tick: fixed step, input intake, per-tick NPC budget). A 40/90-tick cadence means something different if the server rate changes. `Interval` (arc) was not read, so its exact firing rule is not verified.
- The donor retargets by timer, not on hits. A fast duel needs a forced re-pick on a hit or a lost line of sight; the donor forces it only on a dead target (`targetInvalidated`).
- Chase and leash: flying units chase at 80% of range (FlyingAI 23); ground units walk the flowfield to the core (not read). No leash to the zone is shown here.
- Frankendom's MAX_ATTACKERS = 3 is not in the donor. The main-vs-mount split does not cap how many units pick one target; that stays a separate engine rule.

Best transferable idea: give each enemy type an ordered list of target kinds (an objective first, then the nearest player), and let its weapons shoot the nearest in-range target while its body heads for the main target.
Decision (proposed): adapt — keep the two-level split and the per-type priority list as zone data; drop the core-in-range rule and the random-wave mode, which are space-game specific.
Acceptance: a server test with an archetype whose target list is ["objective", null] and a player 3 m away while the objective is 40 m away: the main target is the objective (the unit moves toward it) and its weapon fires at the player; with no objective present the unit picks the player.
