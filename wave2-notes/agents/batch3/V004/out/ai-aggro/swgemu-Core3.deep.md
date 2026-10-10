# swgemu-Core3 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/tangible/threat/ThreatMap.cpp` (with ThreatMatrix.cpp, ThreatMap.h, ThreatStates.h; AI glue in `creature/ai/AiAgentImplementation.cpp`; behaviour tree in `MMOCoreORB/bin/scripts/ai/default.lua`) | Licence: GNU AGPL-3.0 (COPYING: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3"; MMOCoreORB/COPYING has the same header) | C++ with Lua behaviour trees | symbol `ThreatMap::getHighestThreatAttacker`

Checked: Read in full: ThreatMatrix.cpp (1-151), ThreatStates.h, ThreatMap.h (20-250). ThreatMap.cpp read at 1-237 and 525-650 (functions 238-524 not read). AiAgentImplementation.cpp read at 1547-1575, 1659-1694 (validateTarget, first half), 1907-1928, 2126-2168, 3891-3930, 4005-4130. FollowActions.h 25-130 and 166-217 (partly); Checks.cpp 236-245; default.lua 1-20 and 90-120 and 340-420 (targetDefault tree dumped with a script, order checked). Not read: the engine3 submodule (VectorMap insert order and System::random range are unverified: `MMOCoreORB/utils/engine3` is empty in this donor); ClearThreatStateTask; RemoveAggroTask; ThreatMapObserver; ThreatMap::addHeal body (650-671); CheckRandomLevel and CheckFollowAggression; AiBehaviorEvent body (it is the function that actually runs the tree); pack-notify LOS. No caller of `getTargetFromMap` was found in src or bin/scripts (grep), so that path may be dead code. Confidence: high on threat selection and reset order; medium on the tree's branch semantics (read from the Lua table, not run). camera_scope: n/a.

## 1. Mechanism

- Threat is kept per attacker in a map on each target (ThreatMap). Each direct hit adds its damage under the weapon's xp type and +1 aggro (ThreatMap.cpp 69-105, the `entry->addDamage` and `entry->addAggro(1)` lines at 102-103). The AI's damage overload that takes an xp string calls `addDamage` (AiAgentImplementation.cpp 4038-4044). The overload without an xp string adds aggro only, per its own comment, and it does not add damage (4023-4031).
- DOT is a special case. The DOT pack command calls `addDamage(creature, dotDMG, "dotDMG")` (DotPackCommand.h 245, 421; call sites only, bodies not read). So DOT damage DOES count toward threat. Loot excludes it: `getLootDamage` skips the "dotDMG" key (ThreatMap.h 134-152), while `getTotalDamage` counts every key (124-131).
- Becoming a defender also adds +1 aggro (`addDefender`, AiAgentImplementation.cpp 2134) and runs the pack alert (2137).
- Target choice has two paths. (a) The behaviour tree in default.lua (the template the donor ships; which creatures use it was not checked): in `targetDefault` (default.lua 374-425) the first choice is `GetProspectFromThreatMap` (line 380), which calls `getHighestThreatAttacker()` (FollowActions.h 36-48). If that fails, `GetProspectFromDefenders` runs unless the agent is FLEEING (385, 384). The prospect is then checked with `CheckTargetIsValid` (388; `validateTarget`, Checks.cpp 244). An invalid prospect is dropped (391). A valid one becomes the defender (393, FollowActions.h 215). (b) The C++ `getTargetFromMap` (1547-1575) adds a stricter gate: it adopts the top threat only if the target is under 128 units away and the agent took damage in the last 20 s (1550). No caller was found, so this gate is effectively unused in this donor.
- The selection itself is `getHighestThreatAttacker` (ThreatMap.cpp 530-600). First, if a previous pick is still alive and the `doEvaluation` timer has not run out, it returns that pick (541-545). Otherwise it rebuilds the matrix. The candidate loop (561-590) takes the attackers within 128 units that are attackable by the agent (572); creature candidates must also be alive and not incapacitated (578). `ThreatMatrix::add` puts each candidate into up to three maps: damage threat, aggro, and heal (ThreatMatrix.cpp 53-77). Damage threat is total damage minus the damage a reset has already spent (55, 59).
- `ThreatMatrix::getLargestThreat` (79-120) then picks the target. Taunt wins if any candidate holds the TAUNTED bit (82-83). Focus wins next, if a FOCUSED candidate exists (85-86). Otherwise the code builds a pool: top damage twice plus one random damage entry (90-94); top aggro twice plus one random aggro entry (96-100); top healer once (102-104). One pool slot is picked uniformly (106-107). The matrix is cleared at the end (118).
- After the pick the timer is restarted for 24 s (597, with EVALUATIONCOOLDOWN = 24000 at ThreatMap.h 166). Setting a unique state (TAUNTED 0x101, FOCUSED 0x102; ThreatStates.h 21-22) refuses a duplicate (ThreatMap.cpp 171), and it restarts the timer at once (196-197), so the next call re-evaluates.
- Reset (`removeAll`, ThreatMap.cpp 107-142). An entry is removed only when its key is null, the agent is gone, the planet differs, the force flag is set, or the attacker is dead or offline (127). Other entries are kept: their damage is marked spent (134), healing is cleared (135), and aggro is cleared (136). The matrix and the current pick are then dropped (140-141). `dropDamage` (ThreatMap.cpp 144-166) does the same for a single attacker, and `removeDefender` calls it (AiAgentImplementation.cpp 2147).
- Leash (`leash`, 1907-1928): removes the defender unless forced peace, clears patrol points and the follow object, sets LEASHING, erases `targetProspect`, clears the queue and DOTs, and calls `forcePeace` when asked.
- Pack alert (`notifyPackMobs`, 4052-4122): throttled to once per 30 s per agent (4055-4059). For each close creature (not dead, not a player, not in combat, same parent, attackable, has the PACK bit, not leashing, same social group, within `20 + level/100` units, +5 when AGGRESSIVE, with line of sight; 4073-4100), the alert sets that creature's defender to the attacker and starts its own 30 s throttle (4110-4118).
- Tick: the behaviour event is rescheduled after `Math::max(10, nextBehaviorInterval)` (3910-3912). The interval is 1000 ms for PATROLLING and RESTING, 700 ms for WATCHING, and 400 ms for every other movement state (3923-3929; idl 215-217). The event body that runs the tree was not read.

## 2. Key functions

- `ThreatMap::getHighestThreatAttacker`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/tangible/threat/ThreatMap.cpp` 530-600. The cache check, candidate filter, matrix build and timer restart.
- `ThreatMatrix::add` and `ThreatMatrix::getLargestThreat`: `.../threat/ThreatMatrix.cpp` 53-77 and 79-120. The three maps, taunt and focus override, the weighted pool, the uniform pick.
- `ThreatMap::addDamage` and `addAggro`: `.../threat/ThreatMap.cpp` 69-105 and 602-626. Per-hit threat and aggro, and the optional aggro timer.
- `ThreatMap::removeAll`: `.../threat/ThreatMap.cpp` 107-142. The reset that keeps entries but spends their damage.
- `ThreatMap::setThreatState`: `.../threat/ThreatMap.cpp` 168-205. Unique states, refusal, and the forced re-evaluation.
- AI glue: `AiAgentImplementation::addDefender` and `removeDefender` (`.../creature/ai/AiAgentImplementation.cpp` 2126-2168), `notifyPackMobs` (4052-4122), `leash` (1907-1928), `activateAiBehavior` (3891-3930).
- Behaviour tree: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/ai/default.lua` `targetDefault` (374-425); leaves in `.../creature/ai/bt/leaf/FollowActions.h` and `Checks.cpp`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-attacker hate table: damage, aggro and heal kept separately | Aggro +1 per hit (ThreatMap.cpp 103) and +1 per defender (AiAgentImplementation.cpp 2134) |
| Re-evaluate only when the last pick is dead or the timer has run out | Timer 24000 ms (ThreatMap.h 166, restarted at ThreatMap.cpp 597) |
| Candidates must be in range and attackable | Range 128 (ThreatMap.cpp 572); the same 128 in `validateTarget` (AiAgentImplementation.cpp 1671) |
| Reset spends damage so it stops counting as threat, but keeps the entry | Reset clears aggro and heal (ThreatMap.cpp 134-136) |
| Taunt and focus beat the weighted pool | Taunt over focus (ThreatMatrix.cpp 82-86) |
| Weighted pool: top damage x2, one random damage, top aggro x2, one random aggro, top healer x1 | Weights 2 / 1 / 2 / 1 / 1 (ThreatMatrix.cpp 91-104) |
| Uniform pick over the pool | The random range of `System::random` was not read (engine3 is empty) |
| Pack alert: nearby allies join, with a range and a throttle | Base 20 units, +level/100, +5 when aggressive (AiAgentImplementation.cpp 4092-4095); 30000 ms throttle (4059, 4114) |
| Behaviour tick by state | 400 / 700 / 1000 ms (AiAgent.idl 215-217) |

Note on ordering: the code treats the last element of each VectorMap as the largest key, so `elementAt(size - 1)` is the top. The insert order of VectorMap was not read (engine3 empty). The result is an assumption, not verified.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: spent damage is subtracted, the candidate filter runs before the pool, taunt and focus are applied after the pool is built (the donor applies them while building the matrix, same result), then the pick is cached for 24 s with a re-check that the pick is alive. It omits the setThreatState entry points and their durations, the heal input (`addHeal`), the dead or offline removal inside reset, planet checks, the pack alert, the 20 s adoption gate, and the DOT xp type (DOT with xp `dotDMG` is ordinary damage in the donor; the sketch's `tick` is only the no-xp path). The random source is injected as `rng` in [0, 1) because the donor's `System::random` range was not read. The sketch does not reproduce the donor's line-by-line code.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the mechanism shape, not a translation of the donor lines.
type Rng = () => number; // returns a number in [0, 1)

interface Entry {
  damage: number;   // damage counted since the start
  spent: number;    // damage that a reset has already spent; it stops counting as threat
  aggro: number;    // +1 per hit or tick; cleared by a reset
  heal: number;     // healing the attacker has done; cleared by a reset
  taunted: boolean;
  focused: boolean;
}

interface Body { alive: boolean; inRange: boolean; }

const EVALUATION_MS = 24000; // the donor's re-evaluation timer

class ThreatTable {
  private entries = new Map<string, Entry>();
  private current: string | null = null;
  private evalUntil = 0;

  private entry(id: string): Entry {
    let e = this.entries.get(id);
    if (e === undefined) {
      e = { damage: 0, spent: 0, aggro: 0, heal: 0, taunted: false, focused: false };
      this.entries.set(id, e);
    }
    return e;
  }

  hit(id: string, damage: number): void {
    const e = this.entry(id);
    e.damage += damage;
    e.aggro += 1;
  }

  tick(id: string): void {          // non-xp hit (the donor's no-xp overload): aggro only, no threat damage
    this.entry(id).aggro += 1;
  }

  reset(): void {                   // keep the entries, spend their damage, clear aggro and heal
    for (const e of this.entries.values()) {
      e.spent = e.damage;
      e.aggro = 0;
      e.heal = 0;
    }
    this.current = null;
  }

  // Keep the last pick while the timer runs and it is still alive; otherwise rebuild the pool.
  select(now: number, rng: Rng, body: (id: string) => Body | undefined): string | null {
    if (this.current !== null && now < this.evalUntil) {
      const b = body(this.current);
      if (b !== undefined && b.alive) return this.current;
    }

    const cands: Array<[string, Entry]> = [];
    for (const [id, e] of this.entries) {
      const b = body(id);
      if (b !== undefined && b.inRange && b.alive) cands.push([id, e]);
    }

    const byDamage = cands
      .map(([id, e]): [string, number] => [id, e.damage - e.spent])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id]): string => id);
    const byAggro = cands
      .filter(([, e]) => e.aggro > 0)
      .sort((a, b) => b[1].aggro - a[1].aggro)
      .map(([id]): string => id);
    const byHeal = cands
      .filter(([, e]) => e.heal > 0)
      .sort((a, b) => b[1].heal - a[1].heal)
      .map(([id]): string => id);

    const pool: string[] = [];
    if (byDamage.length > 0) {
      pool.push(byDamage[0], byDamage[0], byDamage[Math.floor(rng() * byDamage.length)]);
    }
    if (byAggro.length > 0) {
      pool.push(byAggro[0], byAggro[0], byAggro[Math.floor(rng() * byAggro.length)]);
    }
    if (byHeal.length > 0) {
      pool.push(byHeal[0]);
    }

    // Taunt beats focus; both beat the pool.
    let forced: string | null = null;
    for (const [id, e] of cands) if (e.taunted) forced = id;
    if (forced === null) for (const [id, e] of cands) if (e.focused) forced = id;

    const pick = forced !== null ? forced : pool.length > 0 ? pool[Math.floor(rng() * pool.length)] : null;
    this.current = pick;
    this.evalUntil = now + EVALUATION_MS;
    return pick;
  }
}
export {};
```

## 5. Lands in

- TARGET `src/fight/threat.ts` (new engine module: hate table and target pick, the many-on-one part of the fight loop). Parity-checklist row 4 (fight loop: aggro, chase, leash). The Frankendom repo was not opened in this pass, so there is no "today" file to name.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (many-on-one target choice lives in the engine); MAX_ATTACKERS = 3 is not in the donor (see gaps)

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the described mechanism.
- Random choice: the donor picks from a weighted pool with `System::random`. A server-verified kill and a fight record (row 19) need a replayable choice. Adopt a deterministic tiebreak (highest threat, then lowest id) and a seeded source if any randomness is kept.
- The 24-second hold: while the current target is alive, a second attacker that out-damages it waits up to 24 s to be picked. For a fast many-on-one fight this is far too slow. The donor's taunt and focus already re-evaluate at once (ThreatMap.cpp 196-197); the hold itself should be a data field that Frankendom sets short.
- No cap on candidates: the donor's matrix has no maximum attacker count (the candidate loop at ThreatMap.cpp 561-590 has no limit). Frankendom's MAX_ATTACKERS = 3 must cap the candidate list in the engine, not in the client.
- Two entry points disagree: the behaviour tree picks the top threat with no range or damage-window gate, while the C++ `getTargetFromMap` adds the 128 range and 20 s gates (AiAgentImplementation.cpp 1550). `getTargetFromMap` has no caller in this donor. Frankendom must pick one gate and test it.
- Donor bug: `ThreatMap::clearAggro` builds a new local `ThreatMapEntry` and clears that local (ThreatMap.cpp 639-648; the clear is at 646), so the stored aggro is not cleared. Do not copy this.
- DOT counts as threat but not as loot (ThreatMap.h 124-152). Frankendom has one ledger; if DOT is ever added to the threat table it needs an explicit flag, not a magic xp string.
- Units: the donor's 128 range and pack distances are in donor world units; the unit was not checked against Frankendom's zone units.

Best transferable idea: a per-attacker hate table where damage, aggro and heal are kept apart, the last pick is held until it dies or a timer runs out, and taunt or focus flags override the pick at once.
Decision (proposed): adapt - take the hate table, the taunt and focus override and the re-evaluate-on-state-change rule. Change the random pool to a deterministic tiebreak, cap candidates at MAX_ATTACKERS = 3, and shorten the 24 s hold for fast fights, because the donor's random pool and long hold do not give replayable, server-verified many-on-one fights.
Acceptance: In a 3-on-1 server test, when a second attacker's damage passes the boss's current target, the boss's target changes on the next server tick (not after a 24 s hold), a taunt flag changes it at once, and the test fails if the target is unchanged after two ticks with no taunt.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (many-on-one target choice lives in the engine); rule 4 (fight loop: aggro, chase, leash)
