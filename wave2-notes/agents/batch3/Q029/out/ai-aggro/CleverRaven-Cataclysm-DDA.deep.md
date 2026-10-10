# CleverRaven-Cataclysm-DDA (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monmove.cpp` | Licence: CC-BY-SA 3.0 (as read, LICENSE.txt line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License") | C++ | symbol `monster::plan`

Checked: Read in full: `monster::plan` (monmove.cpp 558-923), `monster::rate_target` (374-410), the `monster_plan` constructor (443-472), `monster::anger_hostile_seen` (474-493), `monster::attitude` (monster.cpp 1753-1922), `monster::process_triggers` (1934-1991), the move loop (do_turn.cpp 315-345), the type fields (mtype.h 484-495, 580-586), `logarithmic_range` (cata_utility.cpp 166-197), `x_in_y` (rng.cpp 126-129). Also read: `is_fleeing` (monster.cpp 1679-1705) and `attitude_to` (1707-1751). Not read: `sees()` (the line-of-sight check), the body of `process_trigger` (1994 on), `on_load` beyond the anger block (4234-4300 read in part; anger block 4273-4297 read), `get_moving_vehicle_targets`. Confidence: high on order of operations and on the attitude thresholds; high on the throttle (the curve endpoints and the skip rule are read); medium on the on-load catch-up only because the rest of `on_load` was not read. camera_scope: not applicable (ai-aggro cell). Candidate files opened: 9 (monmove.cpp, monster.cpp, mtype.h, monster.h, do_turn.cpp, cata_utility.cpp, rng.cpp, LICENSE.txt, and the trigger names read through monmove.cpp).

## 1. Mechanism

- Each monster carries two integers, `anger` and `morale`, both clamped to -100..100 (monster.cpp:1990). Each has a resting value taken from the monster type: `anger` starts at `type->agro` (monster.cpp:274), and the type's comment reads "chance will attack [-100,100]" (mtype.h:491). A separate boolean, `aggro_character`, records whether the monster has been provoked into treating the player as a target. It is copied from the type at construction (monster.cpp:320). The type comment reads "Do we indiscriminately attack characters, or should we wait until one annoys us?" (mtype.h:584), and the default is `true` (mtype.h:585).
- The mechanism runs in four places:
  (A) `monster::plan()` (monmove.cpp:558-923) runs once per action from the move loop, before `move()` (do_turn.cpp:333). It raises anger from triggers and picks a target and a destination.
  (B) `monster::attitude()` (monster.cpp:1753-1922) is a function of anger, morale, hp and the aggro flag. It returns IGNORE, FOLLOW, FLEE or ATTACK.
  (C) `monster::process_triggers()` (monster.cpp:1934-1991) runs once per action after `move()` (do_turn.cpp:339). It moves anger toward the baseline and can clear the aggro flag.
  (D) `monster::on_load()` applies the same decay in bulk for the elapsed turns when a monster is loaded again (monster.cpp:4273-4297).
- Order inside (A), as the code runs:
  1. `mood = attitude()` is read first (monmove.cpp:565), before any trigger in this call.
  2. Player branch, only when the player is visible (573-574). The player becomes the first candidate (579) and `fleeing` comes from `is_fleeing` (578). (a) If not fleeing and anger is at most 20, anger rises by the seen gain (580-581). The seen gain is rng 0..2 per call, and only for types with the HOSTILE_SEEN trigger (451-452). (b) The seen latch: `anger_hostile_seen` (474) sets `aggro_character` with chance anger/200 (482), but not while fleeing. (c) Near band, rating at most 5 (586): if anger is at most 30 (587), anger rises by 5 (588), and only for types with HOSTILE_CLOSE (450). The latch then fires with chance anger/100 (590). Fear types lose 5 morale in this band (459, 595).
  3. Other candidates. NPCs are scanned in an unthrottled loop (621-670). Reachable creatures are scanned in the loop at 685-725, which is throttled (see below). Each candidate gets `rate_target`. A strictly lower rating replaces the target (708). Equal ratings are a uniform reservoir pick, `one_in(valid_targets)` (704; the same pattern in the NPC loop at 636). The NPC loop also switches on faction hate and on a fleeing rule (641-646 region).
  4. Wounded target (monmove.cpp 872-882). When the chosen target is not friendly and its hp is at most 70 percent (873), and anger is at most 40 (874), anger rises by 10 minus hp_pct/10, which is +3 to +10 (875). The latch then fires with chance anger/100 (876). This is a provocation by the target's wounds. In a fight the target is usually the player.
  5. Movement (846-849). A HOSTILE, non-fleeing target gives destination = target (847). A fleeing monster sets destination = pos - target + pos (849), which mirrors the target through the monster. Fliers choose a z-level (853-866, read, not transcribed).
  6. Counter (747-752). With no target, `turns_since_target` rises by 1 per call, capped at 1800 (750). With a target, it resets to 0 (752).
- Throttle (675-684). `factor = 1 - logarithmic_range(0, 1800, turns_since_target)`. The range function returns 1.0 at or below 0 and 0.0 at or above 1800 (cata_utility.cpp:179-181), with a normalised logistic in between (190-196). The skip interval is `trunc(600 * factor)` (681). The creature scan at 685 runs only when skip is 0 or `turns_since_target % skip == 0` (684). So a monster with a target, or one that just lost it, scans on every call. A monster with no target for a long time scans only every 600th call. The NPC loop is not gated.
- Attitude (B), in the donor's order (monster.cpp 1753-1922):
  1. Not `aggro_character`, the target is not a monster, and no anger-relation trait: IGNORE (1804-1805).
  2. Effective anger and morale take trait effects first (pheromones, discord, terrifying; read at 1808-1875, not transcribed).
  3. Morale below 0: FOLLOW if morale + anger > 0 and hp is above a third of max, else FLEE (1897-1901).
  4. Anger at most 0: FLEE if hp is at most 60 percent of max, else IGNORE (1904-1910).
  5. Anger below 10: FOLLOW (1912-1913).
  6. KEEP_DISTANCE flag and closer than tracking distance: FLEE (1916-1918).
  7. Otherwise ATTACK (1921).
  Monster-to-monster: neutral if morale is below 0 or anger is below 10 (1727).
- Decay (C): if anger differs from baseline, a 1-in-4 roll passes, and either the gap is more than 15 or a 1-in-2 roll passes, anger moves one point toward baseline (1973-1981). When anger is at baseline and the type's `aggro_character` is false, the aggro flag clears with chance 1 - anger/100 (1983-1985). For types left at the default `true`, the flag never clears on this path.
- On load (D): the elapsed turns `dt` are taken from `last_updated` (4244). When the gap is more than 15, up to dt/4 steps are applied, each costing 4 turns (4277-4279). The remainder moves 1 point per 8 turns (4287-4291): above baseline falls by ceil(dt/8), below baseline rises by dt/8.

## 2. Key functions

- `monster::plan`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monmove.cpp` 558-923. Read in full. Raises anger from triggers, picks the target and the destination, applies the wounded-target rule and the throttle.
- `monster::rate_target`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monmove.cpp` 374-410. Read in full. Non-smart: integer distance, cut at the best so far. Smart (PRIORITIZE_TARGETS): distance divided by power, with +2 power when the other monster is hostile (401-406).
- `monster_plan` constructor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monmove.cpp` 443-472. Read in full. Turns the type's trigger flags into per-call values: near gain 5 (450), fear 5 (459), seen gain rng 0..2 (451-452), initial best-so-far = sight range, or 8.6 when smart (466).
- `monster::anger_hostile_seen`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monmove.cpp` 474-493. Read in full. Seen latch, chance anger/200, not while fleeing.
- `monster::attitude`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monster.cpp` 1753-1922. Read in full. The ordered thresholds in section 1.
- `monster::process_triggers`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monster.cpp` 1934-1991. Read in full. Per-action decay (1973-1981) and latch reset (1983-1985).
- `monster::on_load`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monster.cpp` 4234-4297. Elapsed-time catch-up for anger (4273-4297). The rest of the function not read.
- Move loop: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/do_turn.cpp` 329-341. Calls `plan()` (333) then `process_triggers()` (339) once per action.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A per-enemy meter that rises on triggers and decays toward a resting value | Resting value is the type's `agro` (mtype.h:491, a per-type field); clamp -100..100 (monster.cpp:1990) |
| Threshold gates: a gain only applies below a cap | Seen gain only while anger is at most 20 (monmove.cpp:580); near gain only while at most 30 (587); wounded gain only while at most 40 (874) |
| Proximity band on the rating | Band at 5 (monmove.cpp:586) |
| Near gain, given only to types with the trigger | 5 (monmove.cpp:450) |
| Seen gain, random per call | rng 0..2 (monmove.cpp:451-452) |
| Provocation chance equal to the meter over the cap | anger/200 for seen (monmove.cpp:482); anger/100 for near (590) and wounded (876) |
| Wounded target adds more anger | Target hp at most 70 percent (873); gain 10 minus hp_pct/10 (875), i.e. +3 to +10 |
| Attack line and follow line | Anger 10 (monster.cpp:1912, 1921) |
| Flee rules | Morale below 0 (1897); anger at most 0 with hp at most 60 percent (1905) |
| Decay rate and band | 1 in 4 per action (monster.cpp:1973); 15 as the band, else 1 in 2 (1974) |
| Catch-up after time away | 4 turns per step beyond the band (monster.cpp:4277-4279); 8 turns per step inside it (4287-4291) |
| Target rating | Smart: distance / (power, plus 2 if hostile); initial best 8.6 (monmove.cpp:401-406, 466) |
| Scan throttle | 1800 calls to saturate; skip interval 600 (monmove.cpp:675-676) |

## 4. TypeScript sketch

simplified: the sketch runs the triggers before `attitude()`, but the donor reads its mood before the triggers and uses it only for the flee flag, so a faithful copy must read attitude first. It merges the player and the other candidates into one list and seeds the reservoir with no player-first bonus. It omits: morale effects beyond the near fear loss; the weakness fear and placate branches; the NPC faction-hate and fleeing switch rules; trait and mutation branches (pheromones, discord, terrifying); vehicle targets; the KEEP_DISTANCE flag; `is_fleeing`'s morale cap and flier height penalty (the sketch uses flat distance 4 for follow); the flier z-level choice; patrols, swarms and group morale; and the donor's separate call counts. The caller must set `latched` from `typeAggro` at spawn (donor monster.cpp:320).

```ts
// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Attitude = 'ignore' | 'follow' | 'flee' | 'attack';
type Pt = { x: number; y: number };
type Roll = () => number; // uniform in [0, 1)

interface Triggers { seen: boolean; close: boolean; weak: boolean; fear: boolean; }

interface Foe {
  anger: number;      // -100..100, resting value is `baseline`
  morale: number;     // -100..100
  baseline: number;   // the type's resting anger
  latched: boolean;   // has been provoked into treating the player as a target
  typeAggro: boolean; // type setting: true = attacks characters at once; false = waits to be provoked
  hp: number;
  maxHp: number;
}

interface Sight { dist: number; seen: boolean; targetHpPct: number; } // targetHpPct: the player's hp percent

// Chance x over y; with x <= 0 this can only fire on an exact zero roll.
const chance = (x: number, y: number, roll: Roll): boolean => roll() <= x / y;
const randInt02 = (roll: Roll): number => Math.floor(roll() * 3); // 0, 1 or 2

// One planning call's triggers against the player. Simplified: the weak branch only adds anger (the donor's weak fear and placate branches are omitted), and everything runs in this one call.
function applyTriggers(f: Foe, s: Sight, t: Triggers, fleeing: boolean, roll: Roll): void {
  if (!s.seen) return;
  if (!fleeing && f.anger <= 20) f.anger += t.seen ? randInt02(roll) : 0;
  if (!fleeing && t.seen && chance(f.anger, 200, roll)) f.latched = true;
  if (s.dist <= 5) {
    if (f.anger <= 30 && t.close) f.anger += 5;
    if (t.close && chance(f.anger, 100, roll)) f.latched = true;
    if (t.fear) f.morale -= 5;
  }
  const hpPct = s.targetHpPct;
  if (t.weak && hpPct <= 70 && f.anger <= 40) {
    f.anger += 10 - Math.floor(hpPct / 10);
    if (chance(f.anger, 100, roll)) f.latched = true;
  }
}

// Donor attitude order: unprovoked -> ignore; morale below 0 -> follow or flee; anger at or below 0 -> flee when hurt, else ignore; anger under 10 -> follow; else attack.
function attitude(f: Foe): Attitude {
  if (!f.latched) return 'ignore';
  if (f.morale < 0) return f.morale + f.anger > 0 && f.hp > f.maxHp / 3 ? 'follow' : 'flee';
  if (f.anger <= 0) return f.hp <= 0.6 * f.maxHp ? 'flee' : 'ignore';
  if (f.anger < 10) return 'follow';
  return 'attack';
}

// Once per action, after the move: step anger one point toward the baseline, then clear the latch when calm.
function decay(f: Foe, roll: Roll): void {
  if (f.anger !== f.baseline && roll() < 0.25 && (Math.abs(f.anger - f.baseline) > 15 || roll() < 0.5)) {
    f.anger += Math.sign(f.baseline - f.anger);
  }
  if (f.anger === f.baseline && f.latched && !f.typeAggro && !chance(f.anger, 100, roll)) {
    f.latched = false;
  }
}

interface Cand { id: number; dist: number; seen: boolean; power: number; hostile: boolean; }

// Donor rate_target: smart = distance / power (hostile +2); plain = integer distance. Out of range or unseen = Infinity.
function rate(c: Cand, best: number, smart: boolean): number {
  if (c.dist <= 0 || !c.seen) return Infinity;
  if (!smart) return c.dist < best ? c.dist : Infinity;
  const p = c.power + (c.hostile ? 2 : 0);
  return p > 0 ? c.dist / p : Infinity;
}

// Lowest rating wins; equal ratings are a uniform reservoir pick (donor one_in(valid)).
function pickTarget(cands: Cand[], maxSight: number, smart: boolean, roll: Roll): number | null {
  let best = smart ? 8.6 : maxSight;
  let target: number | null = null;
  let valid = 0;
  for (const c of cands) {
    const r = rate(c, best, smart);
    if (r === best) { valid++; if (roll() < 1 / valid) target = c.id; }
    if (r < best) { target = c.id; best = r; valid = 1; }
  }
  return target;
}

// Donor: a chasing foe heads for the target; a fleeing one mirrors the target through itself (pos - dest + pos).
// A follow-state foe counts as fleeing within 4 tiles (donor is_fleeing).
function moveGoal(att: Attitude, dist: number, self: Pt, target: Pt): Pt | null {
  if (att === 'attack') return target;
  const fleeing = att === 'flee' || (att === 'follow' && dist <= 4);
  return fleeing ? { x: 2 * self.x - target.x, y: 2 * self.y - target.y } : null;
}

// Donor throttle: turnsSinceTarget counts planning calls with no target (capped at 1800).
// curve is 1 at 0 and 0 at 1800 (a normalised logistic). Scan every call near 0, every 600 calls at 1800.
function shouldScan(turnsSinceTarget: number, curve: (t: number) => number): boolean {
  const skip = Math.trunc(600 * (1 - curve(turnsSinceTarget)));
  return skip === 0 || turnsSinceTarget % skip === 0;
}
function nextTurnsSinceTarget(prev: number, foundTarget: boolean): number {
  return foundTarget ? 0 : Math.min(prev + 1, 1800);
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module, proposed name; Frankendom's current file layout was not read). One engine-side meter per enemy (anger, morale, latched), the attitude function, and the rating and reservoir pick for target choice. The engine decides ATTACK, FOLLOW, FLEE or IGNORE; the client only shows the state. Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only; no lines copied)
- Brief rule served: 1 (one engine decides aggro and target choice; the client only renders the state). Many-on-one target choice lives in the engine, as the brief's rulings say.

## 6. Gaps and risks

- CC-BY-SA 3.0 is copyleft. The sketch is written from the behaviour described above, and no donor line is copied. Frankendom should not paste or port the donor code.
- Determinism. The donor draws on the global RNG each action (`x_in_y`, `one_in`, `rng`). Frankendom's server-verified kills need the same result on the server and on replay, so the chance rolls need a seeded stream per fight, or fixed thresholds. The sketch takes a `roll` function so a seeded stream can be passed in.
- Time units. The donor's unit is one action of one monster, not a fixed tick. The decay chance (1 in 4 per action) and the 1800-call throttle are not seconds. Frankendom's fixed-step loop needs these rates re-based to ticks. The throttle exists to save CPU across thousands of monsters; a fight has at most a few enemies, so it is not needed here (reject for now).
- Many-on-one. The donor has no cap on attackers; each monster decides alone. Frankendom's MAX_ATTACKERS = 3 must be a second gate in the engine, applied after `attitude()` returns ATTACK. The donor gives no pattern for the cap, only the reservoir pick for ties.
- The latch never clears for default types. Once provoked, such a monster stays latched, so it either attacks (anger 10 or more) or follows (anger below 10, never IGNORE). Frankendom needs one written rule for when an enemy gives up (leash, row 4).
- Zone data. The donor keeps `agro`, the trigger flags and the gains in the monster type JSON. Frankendom should keep the baseline and any per-encounter gains as zone data, and the gates (20, 30, 40), the attack line (10) and the band (15) as engine constants.
- The wounded-target rule makes monsters angrier when the player is at 70 percent hp or less. That is a design choice for Frankendom to make on purpose, not a neutral default. It is cheap to keep behind a data flag.
- Off-screen catch-up. The donor applies decay for elapsed turns when a monster reloads (monster.cpp:4273-4297). This is the same idea as the zone population rule (row 23): enemies that have been away decay toward their baseline on reload. Frankendom's zones were not checked for whether they unload.
- Not read: `sees()`, the body of `process_trigger` (1994 on), the rest of `on_load`, the trait branches in detail.

Best transferable idea: An enemy keeps a bounded anger meter with threshold gates, decays toward its resting value, and the engine picks the lowest-rated visible target with a uniform reservoir tie-break.
Decision (proposed): adapt - take the meter, the gates, the attack line and the reservoir pick; drop the global random rolls (use a seeded stream) and the per-call throttle, and add the MAX_ATTACKERS = 3 gate in the engine after attitude.
Acceptance: A server test with decay disabled asserts that a foe at anger 0 facing a player at 60 percent hp gains 4 per action and attacks on the third action (anger 12), while a foe facing a player at full hp gains nothing.

Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only)
Brief rule served: 1 (one engine decides aggro and target choice; the client only renders the state)
