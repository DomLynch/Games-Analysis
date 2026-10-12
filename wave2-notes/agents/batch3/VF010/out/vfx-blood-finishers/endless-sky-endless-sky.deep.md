# endless-sky-endless-sky (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` (hint file `source/Effect.cpp` is the effect data loader; only its licence header was read) | Licence: GPL-3.0-or-later (`license.txt`, "Version 3, 29 June 2007"; `source/Effect.cpp` header "either version 3 of the License, or (at your option) any later version"). Clean-room: shape only | C++ | symbol `Ship::StepDestroyed`

Checked: Read in full: `Ship::StepDestroyed` (Ship.cpp 4768-4852), `Ship::CreateExplosion` (5751-5783), the knockout line `minimumHull` (4644-4662), the disable and recovery block (5036-5085), `Ship::Fire` death blast (2717-2718), `Ship::SelfDestruct` (3235-3239), `Ship::Disable` (3216-3221). Callers: `StepDestroyed` is called from `Ship::Move` (2076-2080). Not read: `Effect.cpp` body, `Entity.cpp` status sparks (`DoStatusSparks` / `CreateSparks`, 439-520; grep only, so the hit-spark path is not covered), the `BoardingPanel.cpp` self-destruct caller (353; grep only), `Ship::Move` beyond 2070-2082, and the frame or step rate of the engine loop. The rule "one call per frame" is an assumption: the engine step rate was not read. Confidence: high on the order of steps and the knockout formula; medium on how often `StepDestroyed` runs.

Best transferable idea: Turn a kill into a timed sequence: a per-step spawn chance that rises by one each step until a fixed count is reached, then one final burst, with a downed state before death whose line is a formula of max hull.
Decision (proposed): adapt - take the downed state (one DISABLE event on crossing the line, the unit stops fighting) and the ramped death sequence as client presentation driven by one server death event. Do not take the cargo and flotsam drop (that belongs to loot, parity row 18), the physics debris, or the self-destruct ramp that starts at full rate.
Acceptance: In the Pit, a gladiator that crosses its knockout line fires exactly one DISABLE event on the server and stays downed until a finishing blow; that blow sends exactly one death event, and each client plays the burst ramp from it (a server test asserts one event in each case).

## 1. Mechanism

- Knockout line (`minimumHull`, Ship.cpp 4644-4662). Units marked never-disabled get line 0 (4647-4648). An absolute threshold attribute, if present, sets the line directly (4651-4653). Otherwise a transition value `1 / (1 + 0.0005 * max hull)` (4657) blends the fraction between 0.5 (small hulls, transition near 1) and 0.1 (very large hulls, transition near 0) (4658-4659). If the percent attribute is set, it is used instead (capped at 1). The line is `max(0, floor(max hull x fraction + flat bonus))` (4660). Evaluated on the VPS with node from this formula: max hull 100 gives 48, 1000 gives 366, 100000 gives 10784.
- Disabled state, each step (5036-5085). Recovery runs first: if disabled and a recovery time is set, a counter goes up (5038); when it reaches the recovery time and the unit can pay the cost, the cost is spent, the counter resets, the hull is raised to `max(hull, 1.5 x line)` capped at max (5042-5047), and the unit is no longer disabled (5048). Then the step records `wasDisabled = hull < line` (5053), applies status effects, clamps energy and fuel, and handles heat overheat damage (5055-5073). The DISABLE event fires once, on the step the hull first drops below the line (5075-5076). The DESTROY event fires once when the unit is first destroyed (5077-5078). Then the disabled flag is recomputed from the hull, overheat and crew (5085).
- Death sequence (`StepDestroyed`, 4768-4852). It returns 1 when finished, -1 while dying and 0 otherwise (4766-4767). While not yet dead it returns 0 before any of this (4770-4771). Once the explosion count equals the total (or the unit is being forgotten) (4778), it creates the final debris: smoke effects, count = mass x 0.07 (4786-4798). Then half the total explosions are spread out at once (4800-4801), then the data's final explosions are placed at the unit's position (4802-4803). Cargo survives as flotsam with a 25 percent binomial chance (4806-4809), and ammunition with a default 5 percent (4811-4821). The unit is removed (4838-4840).
- Dying step (4846-4848). Each step the explosion rate goes up by one (4846) and an explosion is created when `Random::Int(1024) < rate` (4847-4848). So the chance per step is rate / 1024 and it rises by 1/1024 each step. An explosion is created only on success (`CreateExplosion` increments the count at 5779).
- Explosion placement (`CreateExplosion`, 5751-5783). Up to 10 random points inside the unit's bounding box are tried (5757-5759); a point is used only if it is inside the outline mask (5761). Each explosion's type is drawn by weight from the `explode` data counts (5764-5771; the total is the sum of those counts, 809). With a spread flag, the explosion's velocity is the unit's velocity plus a random offset up to 4 percent of width plus height (5772-5777).
- Final blast. When the explosion count reaches the total, `Fire` emits the base model's death weapon as a projectile at the unit's position (2717-2718, 926). This is a separate weapon, not part of the sequence.
- Self-destruct. `SelfDestruct` marks the unit destroyed and sets the rate to 1024 (3235-3238), so the very next step has a chance of 1025 out of 1024 and an explosion happens on every step.
- Disable outside combat. `Disable()` clamps the hull to half the line and sets the disabled flag (3216-3221).

## 2. Key functions

- `Ship::StepDestroyed`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 4768-4852.
- `Ship::CreateExplosion`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 5751-5783.
- Knockout line and disable/recovery: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 4644-4662 and 5036-5085.
- Death blast and self-destruct: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 2717-2718, 3235-3238.
- Caller: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Ship.cpp` 2076-2080.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Knockout line as a fraction of max hull, falling with size | 0.5 for small, 0.1 for very large, via `1 / (1 + 0.0005 x max hull)` (Ship.cpp 4657-4659); floored, plus a flat bonus (4660) |
| Downed state fires one event on crossing | DISABLE on crossing (5075-5076) |
| Recovery raises the hull above the line | 1.5 x line (5047) |
| Burst ramp: chance rises each step | +1 rate per step; chance rate / 1024 (4846-4847) |
| Burst count | Sum of `explode` data counts (809) |
| Burst placement | 10 tries inside the outline (5757-5761) |
| Half the bursts spread out at the end | Total / 2 (4800) |
| Final blast at the end of the count | Count equals total (2717-2718) |
| Wreck cargo survival | 25 percent (4807); ammunition 5 percent (4821) |
| Self-destruct starts at full rate | 1024 (3238) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside a step (recovery, then the disabled-crossing check, then the death sequence with the rate step before the roll), and the knockout formula. It omits the never-disabled and absolute-threshold options, the status effects, the overheat and crew terms, the destroy event, the wreck debris and the cargo and flotsam drops, the placement mask (a callback stands in for it), the explosion weights, the velocity spread, and the death weapon projectile. One difference from the donor: the sketch's spawn callback returns whether it succeeded and the caller increments the count, which is the same as the donor's `CreateExplosion` but makes the count rule visible. The helper `knockoutLine` returns 48 for 100 max hull and 366 for 1000 when the percent is 0 and the bonus is 0 (checked on the VPS with node).

```ts
// Licence: GPL-3.0-or-later (donor, license.txt Version 3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// Knockout line: the hull level below which a unit is disabled (donor: minimumHull).
// The fraction falls from 50% of max hull for small hulls toward 10% for very large ones (donor curve).
function knockoutLine(maxHull: number, percent: number, hullBonus: number): number {
  const transition = 1 / (1 + 0.0005 * maxHull);
  const fraction = percent > 0 ? Math.min(percent, 1) : 0.1 * (1 - transition) + 0.5 * transition;
  return Math.max(0, Math.floor(maxHull * fraction + hullBonus));
}

// DISABLE fires once, on the frame the hull first drops below the line (donor: wasDisabled).
function crossedKnockout(prevLevel: number, nowLevel: number, line: number): boolean {
  return !(prevLevel < line) && nowLevel < line;
}

// Recovery: after the recovery timer runs out and the cost can be paid, the hull is raised
// to 1.5 x the line (capped at max) and the unit is no longer disabled (donor: recovery block).
function tryRecover(level: number, line: number, maxHull: number, counter: number, recoveryTime: number, canPay: boolean): { level: number; disabled: boolean; counter: number } {
  const next = counter + 1;
  if (next >= recoveryTime && canPay) {
    return { level: Math.min(Math.max(level, line * 1.5), maxHull), disabled: false, counter: 0 };
  }
  return { level, disabled: true, counter: next };
}

interface Death { rate: number; count: number; total: number; }

// One frame of the dying sequence. The per-frame chance is rate / 1024 and rises by one step each frame,
// so the explosions speed up. The count moves only when a spawn succeeds.
// When the total is reached, half the total is spread out at once, then the sequence reports done.
function stepDying(d: Death, roll: () => number, spawn: (spread: boolean) => boolean): "dying" | "done" {
  if (d.count === d.total) {
    const half = Math.floor(d.total / 2);
    for (let i = 0; i < half; i++) {
      if (spawn(true)) d.count += 1;   // donor: the counter can pass the total here
    }
    return "done";
  }
  d.rate += 1;
  if (Math.floor(roll() * 1024) < d.rate) {
    if (spawn(false)) d.count += 1;
  }
  return "dying";
}

// The final blast fires on the frame the explosion count reaches the total (donor: Fire()).
function finalBlastDue(d: Death): boolean {
  return d.count === d.total;
}

// Self-destruct starts the rate at the maximum, so an explosion is due every frame from the start.
function selfDestruct(d: Death): void {
  d.rate = 1024;
}

// Example use, so the file type-checks under --strict.
const line = knockoutLine(100, 0, 0);
const cross = crossedKnockout(60, 40, line);
const rec = tryRecover(20, line, 100, 4, 5, true);
const death: Death = { rate: 0, count: 0, total: 6 };
let spawned = 0;
let frames = 0;
while (stepDying(death, () => 0.5, () => { spawned += 1; return true; }) === "dying" && frames < 1000) {
  frames += 1;
}
const blast = finalBlastDue(death);
void cross; void rec; void spawned; void blast;
```

## 5. Lands in

- TARGET `src/fight/finisher.ts` (new; the knockout line, the downed state and the single finishing kill are engine state, and the burst ramp is a client presentation driven by one server death event). Parity-checklist row 9 (finishers).
- today: not read in this pass (Frankendom repo not opened). The rulings say kills are server-verified, so the death event is one server event and the bursts are client-only.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: rule 1 (one engine: the downed state and the kill are engine state changes); the burst ramp is presentation only, as in the donor (its explosions are visuals and do not change the ship's state).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- Timing is random: explosion points are random with 10 tries (Ship.cpp 5757-5761), so the burst count per step is not fixed. Derived, not run: if every roll spawned, the expected number of steps to 20 bursts is about 202 (computed on the VPS from the rate formula). The real rate is lower because a failed placement does not count. The figure is the sum of the per-step chances, evaluated with node on the VPS; it is not a simulation of the donor.
- The counter can pass the total: the final spread bursts also increment the count (Ship.cpp 4800-4801 with 5779). The donor does not depend on it, but a Frankendom test should not assume count equals total after the final step.
- The death blast is a separate weapon projectile (Ship.cpp 2717-2718). Frankendom's finishing blow must be its own server hit, not an area blast, unless the Pit rules allow an area finisher; this donor does not settle that.
- Wreck cargo and flotsam (Ship.cpp 4804-4831) have no place in the Pit. Loot belongs to parity row 18; do not add it here.
- The knockout curve (0.0005, 10 to 50 percent) is a balance curve. Frankendom should take the line as zone data per gladiator class, with this curve as one possible default.
- Frame rate: the rate ramp is counted per `StepDestroyed` call. Frankendom must use its own fixed step; the donor's step rate was not read.
- Not read: the status-spark path (Entity.cpp 439-520), so the hit-spark side of the topic is not covered by this note. The Effect.cpp body was not read.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN.
- Errors: none; 809 in the table is a line number (explosionTotal += count), not a sum.
- Missed: none significant.
