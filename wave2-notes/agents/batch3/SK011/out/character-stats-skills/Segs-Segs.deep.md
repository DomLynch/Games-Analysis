# Segs-Segs (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/Segs-Segs/Servers/MapServer/WorldSimulation.cpp` | Licence: BSD-3-Clause (`/mnt/frankendom-donors/Segs-Segs/LICENSE.md`, "BSD 3-Clause License", SEGS Project 2006-2020; code may be adapted) | C++ | symbols `World::update`, `World::updateEntity`, `World::regenHealthEnd`, `World::checkActivationTimers`, `World::checkAutoToggleTimers`, `doPower`, `queuePower`, `changeHP`, `revivePlayer`

Checked: read `WorldSimulation.cpp` 28-57 (update loop), 179-230 (activation countdown), 252-268 (recharge countdown), 269-312 (toggles), 313-336 (buffs), 337-350 (regen), 375-428 (per-entity order). `DataHelpers.cpp` 740-760 and 798-812 (use gates, read in part), 850-972 (queuePower, queueRecharge, doPower spend), 1967-1990 (changeHP). `EntityHelpers.cpp` 254-305 (modifyAttrib), 603-630 (revive levels). `CharacterHelpers.cpp` 74-91 and 155-166. `Character.cpp` 580-590. `CharacterAttributes.h` (structure) and `.cpp` (serialization only). `Powers.h` 35-46. Confidence: high on the tick, regen and endurance-spend order; medium on the full use path (checkPower 721-791 and the rest of doPower 957-996 were not read in full). Not read: the power template values (EnduranceCost, RechargeTime, TimeToActivate per power are data); the per-level max tables (`AttribMaxTable`, its values are not in the donor snapshot: a grep of `Data/` found no match); `StrengthMaxTable` and `ResistanceMaxTable` (declared in `CharacterClass.h` 42-43; no read site found in this box); the network layer.

Best transferable idea: Gate a special on endurance at use time, make it wait out an activation delay, spend the cost once at fire time, then block re-use for a recharge time, with every countdown and regen step scaled by the measured frame time.
Decision (proposed): adapt — take the gate, activation, recharge and toggle-upkeep shape for Frankendom's specials (cost, delay and recharge as catalogue fields), and fix the donor's silent endurance clamp (re-check at fire, report shortfall) and its uncapped frame delta in the sketch.
Acceptance: A server test uses a special costing 25 endurance at 20 endurance and asserts it is refused with no state change; at 30 endurance it queues, fires once after its activation time with endurance down to 5, and a second use is refused until the recharge time has passed.

## 1. Mechanism

One fixed sequence per server tick, scaled by a measured frame time:

(a) Tick. `World::update` takes the delta between tick timestamps (the first tick uses 33 ms, line 36) and sets `sim_frame_time = delta / 1000` (43). The delta is not capped. Every live entity then runs in order (377-408): physics, effects, activation countdown, recharge countdown and toggle timers (players only), buff timers, delayed effects, collision, team cleanup, and last regen (407-408, only when not dead). Regen and countdowns use the same frame time.

(b) Use gate. `checkPower` (721-791) refuses a use when endurance is below the cost (748-755, with a floating message). `usePower` (792-813) checks again: target (802), endurance (804), power block, then `queuePower`. Queueing (851-892) pushes a queued power with its recharge time, activation time and activation period (861-863), and cancels other queued powers except the one already activating.

(c) Activation. In `checkActivationTimers` (179-250) the front queued power counts down by the frame time (210). When the countdown goes below zero it calls `doPower` and dequeues; toggles move to the auto list instead. Movement stops while casting.

(d) Fire and spend. `doPower` (910-996) checks the target (`checkPowerTarget`), sets stance, queues the triggered attack moves, queues a recharge only for click powers (948-950), and spends the cost (966): `setEnd(end - EnduranceCost)`. There is no second endurance check here. `setEnd` clamps at zero (CharacterHelpers 84-86), so a shortfall is lost silently.

(e) Recharge. `checkRechargeTimers` (252-266) counts the recharge down by the frame time (256) and removes the entry at zero or below.

(f) Toggles (upkeep). `checkAutoToggleTimers` (269-312): when the period timer is at or below zero it calls `doPower` (so each period spends the cost again) and adds one period (the timer does not catch up for missed periods). Each tick the toggle is switched off if endurance is below the cost (290).

(g) Regen. `regenHealthEnd` (337-350): health gains `maxHP x (Regeneration / 20 x frame / 12)` and endurance gains `maxEnd x (Recovery / 4.9 x frame / 12)`, each added only below max (345-348). So at a stored Regeneration of 1.0 the health rate is 1/240 of max per second; at Recovery 1.0 the endurance rate is 1/58.8 of max per second (arithmetic from the formula; the stored values are not read). Init multiplies Regeneration by four (CharacterHelpers 163), and the comment there says the base rate is 0.25.

(h) Death. `changeHP` (1967): HP is clamped to max; below 0.1 the character is marked dead, HP and endurance are set to zero (1978-1985). Revive (`revivePlayer`, EntityHelpers 603-630) sets HP and endurance by level: AWAKEN HP 0.25 (611); BOUNCE_BACK HP 0.5 (614); RESTORATION HP 0.75 (617); IMMORTAL_RECOVERY HP to max (620, endurance not changed); REGEN_REVIVE HP 0.75 (623) and endurance 0.5 (624); FULL HP and endurance to max (629 onward).

## 2. Key functions

- `World::update` (31-56): tick delta and frame time. `WorldSimulation.cpp` 31-43.
- `World::updateEntity` (375-428): fixed per-entity order; regen call at 407-408.
- `World::regenHealthEnd` (337-350): regen formula, clamped to max.
- `World::checkActivationTimers` (179-250): activation countdown at 210.
- `World::checkRechargeTimers` (252-266): recharge countdown at 256.
- `World::checkAutoToggleTimers` (269-312): toggle upkeep and the endurance switch-off at 290.
- `doPower` (DataHelpers.cpp 910-996): fire, recharge queue at 948-950, endurance spend at 966.
- `queuePower` (851-892): activation fields at 861-863.
- `changeHP` (DataHelpers.cpp 1967-1990): death at 1981-1985.
- `revivePlayer` (EntityHelpers.cpp 603-630): revive levels.
- `initializeCharacter` (CharacterHelpers.cpp 155-166): regeneration x4 at 163.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Tick-scaled regen, clamped to max | Health Regeneration / 20 / 12 per second, endurance Recovery / 4.9 / 12 per second (WorldSimulation 342-343) |
| Base regen scale | Stored Regeneration multiplied by 4 at init; comment "base regen rate is .25" (CharacterHelpers 163) |
| Use gate and spend | Gate at cost (DataHelpers 804); spend at cost with no re-check (966); clamp at zero (CharacterHelpers 86) |
| Activation delay | `TimeToActivate` counted down by the frame (WorldSimulation 210; DataHelpers 863) |
| Recharge | `RechargeTime` counted down by the frame (256), click powers only (948) |
| Toggle upkeep | `ActivatePeriod` per upkeep fire (DataHelpers 862; WorldSimulation 276-283); off below cost (290) |
| Death | HP below 0.1 (1981); endurance to zero (1985) |
| Revive levels | HP 0.25 / 0.5 / 0.75 / max; endurance 0.5 or max (EntityHelpers 611-630) |

### 3b. Catalogue rows (SK-FOCUS table format)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Max health | max hit points by combat level | `m_AttribMaxTable[0].m_HitPoints[combat_level]` | values not read (not in the donor snapshot) | none in code | Character.cpp 585 |
| Max endurance | max endurance by combat level | `m_AttribMaxTable[0].m_Endurance[combat_level]` | values not read | none in code | Character.cpp 586 |
| Regeneration (attribute) | health regen rate | health per second = max x Regeneration / 240 | stored value not read; init x4 (base 0.25 per comment) | none | WorldSimulation 342; CharacterHelpers 163 |
| Recovery (attribute) | endurance regen rate | endurance per second = max x Recovery / 58.8 | stored value not read | none | WorldSimulation 343 |
| Endurance cost | endurance per use or per toggle period | flat `EnduranceCost` | per power, data (not read) | refused below cost | DataHelpers 749, 804, 966 |
| Endurance discount | would reduce cost | none (TODO; listed as unimplemented) | n/a | n/a | DataHelpers 749 (TODO); EntityHelpers 256 |
| Activation time | delay between use and fire | `TimeToActivate` countdown | per power, data | none | WorldSimulation 210; DataHelpers 863 |
| Recharge time | block on reuse (click powers) | `RechargeTime` countdown | per power, data | none | WorldSimulation 256; DataHelpers 948-950 |
| Activation period (toggle) | seconds between upkeep fires | `ActivatePeriod` | per power, data | none | DataHelpers 862; WorldSimulation 276-283 |
| Death threshold | health that kills | below 0.1 | 0.1 | endurance zeroed on death | DataHelpers 1981-1985 |
| Revive fraction | health and endurance on revive | table by level, 0.25 to max | 0.25, 0.5, 0.75, max; endurance 0.5 or max | none | EntityHelpers 611-629 |
| Defense | one general defense value | single `m_Defense` (the comment says all types share it) | not read | none | EntityHelpers 272 |
| Strength, Resistance tables | declared per class | `StrengthMaxTable`, `ResistanceMaxTable` | not read | n/a | CharacterClass.h 42-43 (no read site found) |
| Luck | none found | no luck stat in the attribute struct; "Lucky" appears as a string at CharacterHelpers.cpp 233 (context not read) | none | n/a | CharacterAttributes.h 33-138 |

Not read in this pass, so no rows: damage types against defence (the 24-entry arrays exist in `CharacterAttributes.h`, use not read), armour per slot, weapon stats, skill systems, poise and stagger, magic schools and resistances, level-50 power budget, coach or stat-sheet view.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: regen per tick with the donor's two formulas, the use gate and spend, the activation and recharge countdowns, toggle upkeep (spend once per period, off below cost), revive fractions, and death at health below 0.1. It omits the network and client messages, the floating messages, the target and range checks, the triggered attack moves, the stance, the queue cancellation of other powers, the limited-charge powers, the group membership of toggles, the buff timers, the delayed effects, the collision step, the Endurance discount (unimplemented in the donor too), and the team cleanup. Two fixes are in the sketch: the frame time is capped at 0.25 s (`MAX_DT`), and `fire` re-checks endurance and reports the shortfall instead of clamping silently. The power costs, times and the max tables are parameters, not donor numbers.

```ts
// Licence: BSD-3-Clause (donor LICENSE.md). Written from the mechanism read in WorldSimulation.cpp, DataHelpers.cpp, EntityHelpers.cpp and CharacterHelpers.cpp; not a line-by-line translation.
// Frankendom target: src/fight/resources.ts (endurance gate, tick regen, activation, recharge and toggle upkeep).

export interface PowerData {
  cost: number;            // EnduranceCost (catalogue data)
  activateTime: number;    // TimeToActivate, seconds
  rechargeTime: number;    // RechargeTime, seconds (click powers)
  isToggle: boolean;
  activatePeriod: number;  // seconds between toggle upkeep fires
}

export interface Resource {
  hp: number; maxHp: number;
  end: number; maxEnd: number;
  dead: boolean;
}

// Fix (donor defect): the donor uses the raw measured frame time, with no cap.
export const MAX_DT = 0.25;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Regen per tick: health uses Regeneration/20, endurance uses Recovery/4.9, both over 12 (donor formula).
export function regenTick(r: Resource, regeneration: number, recovery: number, dtSec: number): void {
  if (r.dead) return;
  const dt = Math.min(dtSec, MAX_DT);
  r.hp = clamp(r.hp + r.maxHp * (regeneration / 20 * dt / 12), 0, r.maxHp);
  r.end = clamp(r.end + r.maxEnd * (recovery / 4.9 * dt / 12), 0, r.maxEnd);
}

// Use gate (donor usePower checks endurance against the cost before queuing).
export function canUse(r: Resource, p: PowerData): boolean {
  return r.end >= p.cost;
}

// Fire: spend the cost. Fix (donor defect): re-check here, because the donor spends without a re-check and the setter clamps at zero, losing the shortfall silently.
export function fire(r: Resource, p: PowerData): { fired: boolean; shortfall: number } {
  if (r.end < p.cost) return { fired: false, shortfall: p.cost - r.end };
  r.end -= p.cost;
  return { fired: true, shortfall: 0 };
}

// Countdowns: activation and recharge drop by the frame time (donor 210 and 256).
export interface Timers { activateLeft: number; rechargeLeft: number; }

export function tickTimers(t: Timers, dtSec: number): void {
  const dt = Math.min(dtSec, MAX_DT);
  t.activateLeft -= dt;
  t.rechargeLeft -= dt;
}

// Toggle upkeep: when the period timer reaches zero, fire once and add one period (donor checkAutoToggleTimers). Off when endurance is below the cost.
export interface ToggleState { on: boolean; periodLeft: number; }

export function toggleTick(r: Resource, p: PowerData, t: ToggleState, dtSec: number): void {
  if (!t.on) return;
  if (r.end < p.cost) { t.on = false; return; }
  if (t.periodLeft <= 0) {
    fire(r, p);
    t.periodLeft += p.activatePeriod;
  } else {
    t.periodLeft -= Math.min(dtSec, MAX_DT);
  }
}

// Revive fraction by level 1..6 (donor ReviveLevel: AWAKEN, BOUNCE_BACK, RESTORATION, IMMORTAL_RECOVERY, REGEN_REVIVE, FULL).
export const REVIVE_HP: Record<number, number> = { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1, 5: 0.75, 6: 1 };
export const REVIVE_END: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.5, 6: 1 };

// Health change. Donor changeHP: clamp to max; below 0.1 the character dies and endurance is zeroed.
export function setHpFromEvent(r: Resource, newHp: number): void {
  r.hp = Math.min(newHp, r.maxHp);
  if (r.hp < 0.1) {
    r.dead = true;
    r.hp = 0;
    r.end = 0;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/resources.ts` (new): endurance gate and spend at fire time, per-tick regen, activation, recharge and toggle upkeep as pure functions the server runs. Costs, times and periods are catalogue data.
- Parity-checklist row 21 (catalogue fields): `EnduranceCost`, `TimeToActivate`, `RechargeTime`, `ActivatePeriod`, the regen rates and the revive fractions become catalogue fields. The donor's special-move mechanics belong to row 13; this note claims row 21 only.
- today: not checked in this pass (the Frankendom repo was not opened).
- Reuse tag: rewrite-from-idea (BSD-3-Clause: adaptable; the sketch is written from the mechanism).
- Brief rule served: Frankendom rulings: one engine, server-verified state (the donor also keeps endurance on the server), data-driven values (row 21); rules 7-9 n/a.

## 6. Gaps and risks

- Defect, silent endurance clamp: `doPower` spends the cost at 966 without a re-check, and `setEnd` clamps at zero (CharacterHelpers 86). A power can therefore fire on less endurance than its cost and the shortfall is lost. Fix: re-check at fire time and report the shortfall (the sketch's `fire` does this).
- Defect, uncapped frame time: `sim_frame_time` (43) is the raw tick delta. A long stall gives one large regen step and a large countdown step; regen is clamped to max, but countdowns can finish early. Fix: cap the frame at 0.25 s for regen and timers (the sketch's `MAX_DT`).
- Hidden scale: `Regeneration` is multiplied by four at init (CharacterHelpers 163) with the comment "for some reason the base regen rate is .25". Fix: store the real per-second rate in data and drop the multiplier.
- Toggle upkeep does not catch up: when the period timer is at or below zero it fires once and adds one period (WorldSimulation 282-288), so a long stall gives fewer fires than the elapsed periods (WorldSimulation 276-283). This is a choice, not a bug, and the sketch keeps it. Record it in the test.
- Gap, endurance discount: the cost is flat (DataHelpers 749 TODO, 966 TODO); `endurancediscount` is in the unimplemented list (EntityHelpers 256). Frankendom needs a discount ledger if specials are to scale with gear.
- Gap, defence: one general defence value (EntityHelpers 272). The 24 damage and defence types exist in the struct (CharacterAttributes.h) but their use was not read. Frankendom cannot take this as a damage-type model.
- Death is a threshold (0.1 HP) with endurance zeroed (DataHelpers 1981-1985). The revive ladder (EntityHelpers 610-630) is the death presentation the donor offers; it is a data-shaped table Frankendom can keep.
- Not claimed for fast fights: the per-level max tables (values not in the snapshot) decide how fast a fight can run, and their values are needed before any number is chosen.

Reuse tag: rewrite-from-idea (BSD-3-Clause)
Brief rule served: Frankendom rulings (one engine, server-verified state, data-driven values); parity row 21
