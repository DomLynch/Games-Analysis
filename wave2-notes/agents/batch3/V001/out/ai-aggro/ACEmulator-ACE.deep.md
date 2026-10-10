# ACEmulator-ACE (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Monster_Awareness.cs` | Licence: AGPL-3.0 (LICENSE file: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3") | C# | symbol `Creature.FindNextTarget`


Checked: Read in full: `Monster_Awareness.cs` 1-508 (WakeUp, Sleep, tactic selection, FindNextTarget, GetAttackTargets, BuildTargetDistance, SelectWeightedDistance, CheckTargets, awareness ranges, AlertFriendly); not read: 509-538 (`FactionMob_CheckMonsters`). `Monster_Tick.cs` 1-176 (full). `Monster_Navigation.cs` 15-24, 236-256, 420-500 (leash, home radius, CheckMissHome, MoveToHome). `Creature_Combat.cs` 1111-1153 (AlertMonster and the exclude sets), 1311-1330 (monster-on-monster), 1355-1378 (retaliate helpers). `Player_Monster.cs` 30-53 (player attack hook). `Entity/DamageHistory.cs` 36-94 (LastDamager, TopDamager, Add). `Entity/Landblock.cs` 440-470 (the tick driver). `ACE.Common/ThreadSafeRandom.cs` 17-31 (int and float Next). `ACE.Common/Extensions/EnumHelper.cs` 12-15. `ACE.Entity/Enum/TargetingTactic.cs` and `Tolerance.cs` (enum values). `WorldObject.cs` 288-297 (IsVisibleTarget, read by grep window). Not read: `ObjMaint.GetVisibleTargetsValuesOfTypeCreature` and `ObjMaint.AddRetaliateTarget` bodies (physics layer), `GetDistanceToTarget`, `CancelMoveTo`, `EmoteManager` bodies. Confidence: high on the target-selection and leash order; high on the constants (each read on its line); medium on the physics visibility set, which decides what "visible" means in practice. Camera scope: not applicable.

Best transferable idea: Let a mob acquire a target only inside a short awareness radius but keep its current target out to a longer chase radius, and pick among several foes by a distance-weighted roll, so many-on-one aggro does not flicker.
Decision (proposed): adapt - take the acquire-small/keep-large hysteresis and the distance-weighted pick, but drive them from the engine's tick (src/fight) rather than a 5 s timer, which is too slow for a fast duel. The donor fixes the interval at 5.0 s, with a random alternative left commented out (128-129).
Acceptance: A server test asserts that an AI with awareness 18 does not acquire a foe at 20 units, keeps a current target at 90 units, drops it at 96, and that over 10,000 seeded rolls with foes at 1 and 3 units the near one is chosen about 75 percent of the time.

## 1. Mechanism

- Cadence. An awake monster's think runs every 0.2 s (`Monster_Tick.cs` 10, 34). The landblock walks a list kept in next-think order: it runs each creature whose time is due, removes it, and re-adds it at the end after its think (`Landblock.cs` 454-469). The loop has no per-tick budget; the stopwatch only measures it.
- Think order (`Monster_Tick.cs` 19-174), for an awake monster:
  (a) Dead monsters skip (47). An emote in progress skips (49).
  (b) `HandleFindTarget` (51): runs `FindNextTarget` only if the retarget time has come (`Monster_Awareness.cs` 118-119).
  (c) `CheckMissHome` (53): leash to home (see step 5).
  (d) No target and not returning: sleep (55-59).
  (e) If the target is dead, or not in the physics visible set and not a combat pet: `FindNextTarget` at once and return (71-75). This is a retarget that does not wait for the 5 s gate.
  (f) Otherwise turn, move or attack toward the target (not part of this cell).
- Retarget gate. `HandleFindTarget` returns early until `NextFindTarget` (118-119). `SetNextTargetTime` sets it to running time + 5.0 (128-131). The random 5-10 s interval is commented out (128).
- `FindNextTarget` (134-233), in order: pick a tactic (`SelectTargetingTactic`, 140), set the next find time (141), collect visible targets (143). If none: move home unless already returning (146-147), return false (149). Otherwise switch on the chosen tactic (165-220):
  - Random: distance-weighted pick over the visible set (176-177).
  - Focused: keep the current target (180-182).
  - LastDamager / TopDamager: the last or top damager from `DamageHistory`, if it resolves to a creature; otherwise the target is unchanged (184-196).
  - Weakest / Strongest: lowest or highest level (200-213). Nearest: closest (215-219).
  - A new target fires `EmoteManager.OnNewEnemy` (224-225).
- Tactic choice (`SelectTargetingTactic`, 84-112). The mob's `TargetingTactic` is a flag set. If it is None, the default is Random | TopDamager (100-101). The flags are listed with `GetFlags`, which includes None at index 0 (`EnumHelper.cs` 14). The code draws `ThreadSafeRandom.Next(1, Count-1)` (104), which is inclusive of both ends (`ThreadSafeRandom.cs` 30), so each set flag is equally likely each retarget.
- Visible set (`GetAttackTargets`, 238-277). A creature is skipped if it is not attackable and has no tactic, or if it is teleporting (245). The range test is the hysteresis: the current target uses `MaxChaseRangeSq` (96), any other creature uses `VisualAwarenessRangeSq` (18 by default) (248-254). Same-faction creatures are skipped unless provoked (258-263). `Tolerance.Target` keeps only the current target (266-267). `Tolerance.Monster` keeps only monsters, not players or combat pets (270-271).
- Distance-weighted pick (`BuildTargetDistance` 282-291, `SelectWeightedDistance` 296-324). Targets are sorted by distance. A single target is returned (298-299). Otherwise each target adds `1 - distance/total` to a running sum (316), and the roll is drawn over `[0, n-1)` (303-310; the float overload is uniform, `ThreadSafeRandom.cs` 17-20). The first target whose cumulative weight exceeds the roll is chosen (318-319). The weights sum to n-1, so the nearest target gets the largest share. Worked case (computed from the formula): foes at 1 and 3 units give weights 0.75 and 0.25; the near one is picked 75 percent of the time.
- Leash (`Monster_Navigation.cs` 239-253). While awake, a distance to target of 96 or more cancels the move and calls `FindNextTarget` (244-247). The donor does not clear `AttackTarget` here (see Simplified).
- Home radius (448-465, 467-499). Beyond `HomeRadius` (default 192, 430) from the home position, `CheckMissHome` calls `MoveToHome` (463-464). `MoveToHome` sets state Return, clears the target (474-475), and sets a 5 s cancel timer (485).
- Alert. `CheckTargets` waits 0.75 s after spawn (341), then `CheckTargets_Inner` finds the nearest creature in the visible set (players must be attackable, not teleporting, not hidden) and, if it is inside the visual range, calls `AlertMonster` on the spawning monster (346-370). `AlertMonster` (`Creature_Combat.cs` 1121-1153) wakes an idle monster that has no move tolerance: it sets the monster's target to the alerter and calls `WakeUp` (1139-1150). `AlertFriendly` (441-504): a monster that has a target wakes same-type or friend-type creatures inside the aural range (default: the visual range, 18), sets their target, and wakes them without a further alert (468-493). The cooldown is per target, two minutes (434-445), and is set only if someone was alerted (497-502).
- Monster-on-monster and player-on-monster. `Player_Monster.cs` 36-53: a player's attack on a non-awake monster sets the monster's target to the player and wakes it, unless the monster's tolerance has NoAttack or Monster (48, `PlayerCombatPet_RetaliateExclude`, `Creature_Combat.cs` 1111). `Creature_Combat.cs` 1311-1330 does the same for a monster attacking another monster, and adds retaliate targets for faction and foe types (1318-1323).
- Damage memory. `DamageHistory.Add` logs each hit and adds to a per-attacker total (`DamageHistory.cs` 82-94). `LastDamager` is the last negative-amount log entry (44). `TopDamager` is the highest total, with self included by default (62-66). Monster `TakeDamage` calls `DamageHistory.Add` (`Monster_Combat.cs` 386).

## 2. Key functions

- `Creature.FindNextTarget`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Monster_Awareness.cs` 134-233. Tactic switch and fallback home.
- `Creature.SelectTargetingTactic`: same file, 84-112. Uniform choice among set flags, default Random | TopDamager.
- `Creature.GetAttackTargets`: same file, 238-277. Visible set, with hysteresis and tolerance filters.
- `Creature.SelectWeightedDistance`: same file, 296-324. Inverse-share weighted pick.
- `Creature.AlertFriendly`: same file, 441-504. Wakes same-type creatures, 2-minute per-target cooldown.
- `Creature.FindNextTarget` callers: `Monster_Tick.cs` 73 (lost target) and `Monster_Navigation.cs` 247 (leash); `Monster_Awareness.cs` `HandleFindTarget` 116-122 (timer). Caller list by grep; the callers' bodies beyond these lines were not read.
- `Creature.Monster_Tick`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Monster_Tick.cs` 19-174.
- `Creature.Movement` (leash) and `CheckMissHome` / `MoveToHome`: `Monster_Navigation.cs` 239-253, 448-499.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Acquire inside a small radius, keep the current target out to a larger one (hysteresis) | Awareness 18 (theirs, Monster_Awareness.cs 377); chase 96 (theirs, Monster_Navigation.cs 21); scaled by a server multiplier `mob_awareness_range` (404) |
| Retarget on a fixed timer, plus at once when the target is lost or dead | Timer 5.0 s (theirs, 129); random 5-10 s commented out (128) |
| Distance-weighted random pick: weight 1 - share, weights sum to n-1 | None in the formula (the roll is over n-1, 310) |
| Pick one tactic per retarget, uniformly among the mob's flags | Default Random \| TopDamager when None (theirs, 101) |
| Leash: beyond a radius from home, walk back and clear the target | Home radius 192 (theirs, Monster_Navigation.cs 430); walk-home cancel 5 s (485) |
| Alert nearby same-type mobs, at most once per target per cooldown | Aural range defaults to visual (421); cooldown 2 min (theirs, 434); spawn-scan delay 0.75 s (341) |
| Think at a fixed interval, one creature at a time | Think interval 0.2 s (theirs, Monster_Tick.cs 10) |

## 4. TypeScript sketch

simplified: the sketch clears the target before the leash re-pick. The donor does not clear `AttackTarget` in the leash (Monster_Navigation.cs 244-247), and under the Focused tactic it keeps the old target (Monster_Awareness.cs 180-182), so a far target can stay set. The sketch drops the target to avoid that. It also omits the donor's visible-set filters for teleporting, tolerance (Target, Monster), faction and provoked targets, the non-attackable-with-tactic rule, the LastDamager and TopDamager fallbacks beyond "keep the target", the Weakest and Strongest cases, the EmoteManager calls, the 0.75 s spawn scan, the aural-range lookup, and the physics visibility set (the sketch uses plain distance). The distance-weighted pick and the 5 s gate follow the donor. THINK_S is declared for reference and not used.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Vec2 = { x: number; y: number };
const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

const RETARGET_S = 5;        // seconds between re-picks (engine constant)
const THINK_S = 0.2;         // awake think interval (engine constant)
const CHASE_RANGE = 96;      // current target stays in play out to this distance (units)
const AWARENESS_RANGE = 18;  // a new target must be inside this distance (units, zone data)
const HOME_RADIUS = 192;     // beyond this from home the mob walks back (units, zone data)
const ALERT_COOLDOWN_S = 120; // one alert per target per two minutes (engine constant)

type Tactic = 'random' | 'focused' | 'lastDamager' | 'topDamager' | 'nearest';
interface Foe { id: string; pos: Vec2; attackable: boolean; }
interface Mob {
  pos: Vec2; home: Vec2;
  tactics: Tactic[];                 // the mob's flag set; one is chosen per retarget
  target: Foe | null;
  lastDamager: Foe | null; topDamager: Foe | null;
  nextRetargetAt: number;
  state: 'idle' | 'awake' | 'return';
}

// Uniform choice among the mob's flags, each time it looks for a target.
function pickTactic(tactics: Tactic[], rand: () => number): Tactic {
  return tactics[Math.floor(rand() * tactics.length)];
}

// Distance-weighted pick: weight = 1 - (own distance / total distance); weights sum to n - 1.
function weightedByDistance(mob: Mob, foes: Foe[], rand: () => number): Foe {
  const ranked = foes.map(f => ({ f, d: dist(mob.pos, f.pos) })).sort((a, b) => a.d - b.d);
  if (ranked.length === 1) return ranked[0].f;
  const total = ranked.reduce((s, r) => s + r.d, 0);
  const roll = rand() * (ranked.length - 1);
  let acc = 0;
  for (const r of ranked) {
    acc += 1 - r.d / total;
    if (roll < acc) return r.f;
  }
  return ranked[0].f;          // rounding fallback: nearest
}

// Hysteresis: the current target is kept out to CHASE_RANGE; any other foe must be inside AWARENESS_RANGE.
function visibleFoes(mob: Mob, foes: Foe[]): Foe[] {
  return foes.filter(f => f.attackable &&
    dist(mob.pos, f.pos) <= (f === mob.target ? CHASE_RANGE : AWARENESS_RANGE));
}

// Retarget: 5 s gate (or called at once when the target is lost). No foe in view sends the mob home.
function findTarget(mob: Mob, foes: Foe[], now: number, rand: () => number): void {
  mob.nextRetargetAt = now + RETARGET_S;
  const vis = visibleFoes(mob, foes);
  if (vis.length === 0) {
    if (mob.state !== 'return') mob.state = 'return';
    mob.target = null;
    return;
  }
  switch (pickTactic(mob.tactics, rand)) {
    case 'random': mob.target = weightedByDistance(mob, vis, rand); break;
    case 'focused': break;                                  // keep the current target
    case 'lastDamager': mob.target = mob.lastDamager ?? mob.target; break;
    case 'topDamager': mob.target = mob.topDamager ?? mob.target; break;
    case 'nearest': mob.target = vis.reduce((a, b) => (dist(mob.pos, a.pos) <= dist(mob.pos, b.pos) ? a : b)); break;
  }
}

// Leash, run on each awake think: a target past CHASE_RANGE is dropped; a mob past HOME_RADIUS walks home.
function leash(mob: Mob, foes: Foe[], now: number, rand: () => number): void {
  if (mob.target && dist(mob.pos, mob.target.pos) >= CHASE_RANGE) {
    mob.target = null;
    findTarget(mob, foes, now, rand);
  }
  if (dist(mob.pos, mob.home) > HOME_RADIUS && mob.state !== 'return') {
    mob.state = 'return';
    mob.target = null;
  }
}

// Alert: a mob that takes a target wakes same-type mobs in range, at most once per target per cooldown.
function alertAllowed(lastAlertS: Map<string, number>, targetId: string, now: number): boolean {
  const t = lastAlertS.get(targetId);
  return t === undefined || now - t >= ALERT_COOLDOWN_S;
}
```

Typecheck: the sketch file with `export {};` appended was run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (engine target selection and leash, server side). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Shape to take: the 18/96 hysteresis, the distance-weighted pick over the first MAX_ATTACKERS foes, the leash to home, and the per-target alert cooldown for group wake-ups. Not the 5 s timer.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the target choice lives in the engine, not the client); MAX_ATTACKERS = 3 applies to the pick.

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. The sketch is written from the mechanism, not from the donor lines.
- MAX_ATTACKERS = 3 is not in the donor. The donor has no attacker cap in this file: every visible creature is a candidate, and the weighted pick chooses one. Frankendom must decide whether the cap bounds candidates before the pick (as the sketch assumes) or limits attackers after it. Do not let the pick grow past three attackers.
- Hate list: the donor's damage memory is `DamageHistory` (per-attacker totals, last and top damager). No threat multiplier appears in the lines read (`DamageHistory.cs` 36-94); its prune logic (166-208) was not read. Frankendom's many-on-one hate list should be treated as a new piece unless that prune logic shows one.
- Timer versus tick: a 5 s retarget suits open-world mobs but is too slow for a fast duel. The sketch keeps the gate for the reference; the engine should retarget on events (target lost, target dead, a new foe enters 18 units) and use the timer only as a backstop.
- Donor bug, read in source: the `TargetingTactic` setter (`Monster_Awareness.cs` 76) writes `(int)TargetingTactic`, which is the getter, so setting the property does not change it. Do not copy the setter pattern.
- Leash and Focused interact (see Simplified). Frankendom must clear or re-pick a target that leaves chase range, and must test that a Focused mob does not keep a far target.
- Alert cascades: `AlertFriendly` wakes creatures of the same type anywhere in aural range, and the donor's cooldown is per target only. A zone with many same-type mobs can wake a whole pack from one pull. Frankendom's zone population rules (row 23) should cap the wake, not only the cooldown.
- Physics dependency: "visible" is the physics visible-target set (`WorldObject.cs` 290-297), not a plain distance. Frankendom has no physics visibility; the 18 and 96 radii must be defined on plain distance and tested.
- Not read: the physics visible-set builder, `GetDistanceToTarget`, `CancelMoveTo`, `FactionMob_CheckMonsters` (509-538), and the EmoteManager bodies.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine: target choice in the engine, not the client); rules 7-9 n/a
