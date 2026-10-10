# freeorion-freeorion (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/combat/CombatSystem.cpp` | Licence: GPL-2.0 (`/mnt/frankendom-donors/freeorion-freeorion/default/COPYING` line 9: "Everything else is licensed under the GNU General Public License, Version 2."; not "or later") | C++ | symbol `AttackShipShip`

Checked: Confidence high on the ship-vs-ship damage line (`AttackShipShip` 356-390), the bout loop (`AutoResolveCombat` 1849-1908, `CombatRound` 1672-1848), target choice (`ShootAllWeapons` 1350-1472), the shot list (`ShipWeaponsStrengths` 838-884) and the bout-end cull (`CullTheDead` 1062-1140). Medium on whether the meters feeding these values have other modifiers: the capacity and shots meters are set by effects in scripting, which I did not read. Not read: `Ship::WeaponPartShipDamage` (universe), `AttackShipPlanet` and `AttackPlanetShip` bodies, `AttackShipFighter`, `LaunchFighters` (1514), the RNG helpers (`RandInt`, `Seed`, `RandomShuffle`). `combat/CombatDamage.cpp` (read 1-140) holds per-ship damage totals for estimates; the damage that is applied is in `CombatSystem.cpp`. Candidates opened: CombatSystem.cpp, CombatDamage.cpp, CombatEvents.cpp, universe/Universe.cpp, universe/Ship.cpp, default/COPYING.

## 1. Mechanism

- Entry: `AutoResolveCombat` (CombatSystem.cpp 1849). If `RULE_RESEED_PRNG_SERVER` is set (default true, Universe.cpp 77), the seed is `base_seed = 123454321` (1863) plus a hash of the galaxy seed string and the first object id plus the turn (1864-1866). Each bout then calls `Seed(base_seed + bout)` (1880), so every bout is reproducible from the same inputs.
- Bouts: `for bout = 1 .. RULE_NUM_COMBAT_ROUNDS` (1878). The default is 4, with a validator range of 2 to 20 (combat/CombatEvents.cpp 27 and 29). Before each bout, the loop stops if `CanSomeoneAttackSomething` (1884) finds no empire with an attacker or an unlaunched armed fighter (body 1047-1060). That check does not test targets; the code's own TODO says so (1054).
- `CombatRound` (1672): it takes a snapshot of the valid attackers (1687) and shuffles it with `RandomShuffle` (1216). Planets fire first (1705-1728, before the comment at 1729), so a planet's defence meter is not yet reduced by the shots that follow. Then each ship and fighter in the shuffled list fires if `ObjectCanAttack` says so (1736). `ObjectCanAttack` (816-837) needs an armed ship (`IsArmed`, which needs a direct-weapon part with capacity above zero, universe/Ship.cpp 238-239) and a fleet that is not passive (827). It does not test structure.
- Shots: `ShipWeaponsStrengths` (838-884) gives one entry per shot. The shot power is the current capacity meter (863). The shot count is the secondary-stat meter (864), and the loop at 870 adds one entry per shot.
- Target: `ShootAllWeapons` (1350) builds the candidate set from all objects not in the state's destroyed-id set (1428). It filters by the species targeting condition, then the weapon's condition. It picks one target uniformly with `RandInt(0, n-1)` (1457). Each shot therefore makes its own target roll.
- Damage: `Attack` (776) dispatches by object type; ship to ship goes to `AttackShipShip` (795). There the shield is the target's current shield meter (373). `damage = max(0, power - shield)` (380). If damage is above zero, structure drops by that amount at once (383). The event records power, shield and damage. Damage is applied in place, so a later shot in the same bout sees the lower structure. (The "SimultaneousEvents" name refers to event grouping. The ship path has no deferral that I read.)
- Death: after all attacks in the bout, `CullTheDead` (1841 call; body 1062-1140) marks ships with structure at or below zero (1125) as destroyed, and deletes destroyed fighters. The destroyed-id set that the target pool reads is written only inside `CullTheDead` (1074). So within a bout, a ship already at zero structure is still in the target pool and still fires (its attacker slot comes from the bout-start snapshot, 1687, and `ObjectCanAttack` does not test structure).
- Fighters: launched only in bouts before the last one (1762), so a launch cannot attack in the final bout.
- End: fighters recover (`RecoverFighters`, called from 1896). Meters are backpropagated at the end of each `CombatRound`.

Tick: this is a turn-based auto-resolve, not a real-time loop. One call resolves the whole combat; each bout is a step. There is no fixed or variable frame step.

## 2. Key functions

- `AutoResolveCombat`: `/mnt/frankendom-donors/freeorion-freeorion/combat/CombatSystem.cpp` 1849-1908 (seed 1863-1866, bout loop 1878-1881, stop test 1884).
- `CombatRound`: same file, 1672-1848 (shuffle 1687, planets first 1705-1716, ship and fighter loop 1736, launches 1762, cull 1841).
- `ShootAllWeapons`: same file, 1350-1472 (candidate pool 1428, `RandInt` 1457, `Attack` call after).
- `AttackShipShip`: same file, 356-390 (shield 373, damage 380, structure 383).
- `Attack` dispatch: same file, 776-800 (ship to ship at 795).
- `ObjectCanAttack`: same file, 816-837.
- `ShipWeaponsStrengths`: same file, 838-884 (power 863, shots 864, per-shot entries 870).
- `CullTheDead`: same file, 1062-1140 (state set 1074, destruction test 1125).
- Rule defaults: `/mnt/frankendom-donors/freeorion-freeorion/combat/CombatEvents.cpp` 24-29 (rounds 4, range 2-20); `/mnt/frankendom-donors/freeorion-freeorion/universe/Universe.cpp` 74-78 (reseed default true).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Flat per-shot reduction, floored at zero: `damage = max(0, power - shield)` | None in the function; the shield value is the target's current meter (373, 380) |
| One attack entry per shot, each with its own random target | Shot count from the secondary stat meter (864, 870) |
| Shots applied in place; a later shot sees the new structure | None (383) |
| Destroyed when structure is at or below zero, removed at bout end | Threshold 0 (1125) |
| Fixed bout count, early stop when nobody can hit anybody | 4 bouts by default, range 2 to 20 (CombatEvents.cpp 27, 29) |
| Seeded PRNG per bout for replay | Base seed 123454321 (1863); reseed flag default true (Universe.cpp 77) |
| Planets fire before ships so their defence is still full | Ordering rule (1705-1716) |
| Fighters launch only before the last bout | Condition `bout < NUM_COMBAT_ROUNDS` (1762) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: shuffled attackers, static units first, one target roll per shot, damage applied in place, and a cull at bout end. Its early-stop test is stricter than the donor's: it needs a hostile pair that can hit, while the donor's `CanSomeoneAttackSomething` checks only for attackers (see Section 1). It omits the species targeting condition and the weapon's targeting condition (the sketch uses a side test), the `ObjectCanAttack` planet defence test (the sketch uses an `armed` flag), fighters and hangars entirely, stealth and visibility, the destroyed-object knowledge lists, the seeded PRNG (the sketch takes an injected `rand`), the per-bout meter backpropagation, and the fighter recovery at the end. The shot power is fixed per bout in the sketch; the donor re-reads the capacity meter each bout.

```ts
// Licence: GPL-2.0 (donor, default/COPYING line 9). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rand = () => number;

interface Unit {
  id: number;
  side: number;
  structure: number;
  shield: number;     // flat reduction per shot (donor: the shield meter's current value)
  armed: boolean;
  shots: number[];    // power of each shot this bout; one entry per shot, each with its own target roll
  isStatic: boolean;  // static emplacements act first (donor: planets)
}

interface Attack { attacker: number; target: number; power: number; shield: number; damage: number; }
interface Bout { attacks: Attack[]; culled: number[]; }

function shuffle<T>(xs: T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One bout. The attacker list is a snapshot taken at bout start, shuffled, static units first.
// Damage lands at once, so later shots in the bout see the lower structure.
// The target pool excludes units culled at an earlier bout only; a unit killed earlier in
// this bout can still be shot and can still fire until the bout-end cull.
function runBout(units: Map<number, Unit>, culledBefore: Set<number>, rand: Rand): Bout {
  const bout: Bout = { attacks: [], culled: [] };
  const live = [...units.values()].filter(u => !culledBefore.has(u.id));
  const shuffled = shuffle(live, rand);
  const order = [...shuffled.filter(u => u.isStatic), ...shuffled.filter(u => !u.isStatic)];

  for (const attacker of order) {
    if (!attacker.armed) continue;
    for (const power of attacker.shots) {
      const pool = live.filter(t => t.side !== attacker.side && !culledBefore.has(t.id));
      if (pool.length === 0) break;
      const target = pool[Math.floor(rand() * pool.length)];
      const damage = Math.max(0, power - target.shield);
      if (damage > 0) target.structure -= damage;
      bout.attacks.push({ attacker: attacker.id, target: target.id, power, shield: target.shield, damage });
    }
  }

  for (const u of live) if (u.structure <= 0) bout.culled.push(u.id);
  return bout;
}

// Whole combat: up to `rounds` bouts (donor default 4), stopping early when no side can hit the other.
function resolve(units: Map<number, Unit>, rounds: number, rand: Rand): Bout[] {
  const culled = new Set<number>();
  const log: Bout[] = [];
  for (let b = 1; b <= rounds; b++) {
    const live = [...units.values()].filter(u => !culled.has(u.id));
    const canHit = live.some(a => a.armed && a.shots.length > 0 && live.some(t => t.side !== a.side));
    if (!canHit) break;
    const bout = runBout(units, culled, rand);
    for (const id of bout.culled) culled.add(id);
    log.push(bout);
  }
  return log;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/bouts.ts` (new module, engine duel step): one resolver for every attacker, flat shield per shot, one random target roll per shot, damage applied in place, death checked at the step end. Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one engine (one dispatch and one damage function for every attacker type, `Attack` 776-800) and a reproducible sim (seeded PRNG per bout, 1863-1880)

## 6. Gaps and risks

- GPL-2.0 (not "or later"): clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The donor is a turn-based galaxy battle, not a real-time duel. A bout is a whole-round step, so the sketch maps to a fixed server step (row 18 sub-line "server tick: fixed step") only if Frankendom runs the duel in discrete steps. Do not port the bout count as a fight timer.
- Units that reach zero structure keep firing and keep being targeted until the bout-end cull (1062-1140, 1687, 816-837). In a fast duel this is a bug to avoid, not a rule to copy. Frankendom needs one explicit choice (instant out, or end-of-step out) and a test for it.
- No cap on attackers per target. The random pick does not limit how many shots land on one unit. Frankendom's MAX_ATTACKERS = 3 must be enforced in the engine's attacker set, not left to the random roll.
- The shield here is a flat per-shot subtraction with no pool. Frankendom's guard and stamina (row 3) are different mechanisms. Do not merge them.
- Determinism: the donor seeds from the galaxy seed, first object id and turn. Frankendom's replay (row 19) needs its own seed chain (fight id, tick, attacker ids). The donor shows the shape, not the constants.
- Planets-first ordering only matters where a static attacker's output depends on a meter that earlier shots reduce. Frankendom has no such unit in the duel; keep the rule for zone turrets only, if they exist.
- Not read, so not claimed: `AttackShipPlanet`, `AttackShipFighter`, `LaunchFighters`, the RNG helpers, and the scripting effects that set capacity and shots.
- Best transferable idea: resolve each attacker's shots one at a time against a snapshot of the living, with one target roll per shot and a flat shield subtraction, then cull at the step end.
