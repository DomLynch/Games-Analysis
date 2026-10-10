# SWG-Source-swg-main (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/figureOfMeritCombatSimulator.pl` | Licence: none stated in the file (header is blank); donor root `_RESTRICTED-NOTE.txt` says proprietary, no licence, so restricted and clean-room only | Perl | symbol: hit-resolution block, lines 77-135, and damage draw, lines 137-168

Checked: Read the whole file (lines 1-434) and the damage-draw block (137-168). Confidence high on what the code computes and the order of steps. Medium on whether live game combat uses the same rules: this is an offline figure-of-merit simulator for the designers, and the live server source is not in this donor (the `src`, `dsrc`, `serverdata` and `stationapi` submodule folders are empty on the VPS).

Best transferable idea: a duel hit chance that climbs in fixed bands, where each extra band costs more gap than the last, clamped between a floor and a ceiling, tested with a seeded balance run.
Decision (proposed): adapt - take the banded hit-chance shape and the seeded balance test; do not adopt the Perl tool itself, because the live roll must be server-side and our engine already owns the duel step.
Acceptance: a server test with a seeded RNG shows equal attack and defence gives the base chance, each band adds its fixed step, every gap from -50 to +50 units stays inside the min and max clamp, and 10,000 seeded duels give the same hit count on every run.

camera_scope: not applicable (combat cell).

## 1. Mechanism

- Offline simulator. Each run resolves a sequence of attacks from one attacker against one defender, prints one row per attack (time, hit, damage, armour reduction, net damage, running DPS, running DPM, running hit rate, total damage), and can sweep one attribute across a range, writing a summary file.
- Order of steps per attack (lines 374-387): (a) resolve the hit (hit roll first, then damage only on a hit); (b) read the weapon's rate and the attacker's speed modifier, then advance the clock (377-381); (c) add to the running totals (383-384); (d) compute the armour reduction on the damage (385) and print the row (387). The printed time is the time before the interval was added, while DPS divides by the time after the advance (387). The hit is decided before the clock moves; the totals are added before the armour column is computed.
- Hit chance (lines 92-125): gap = attacker attack value minus defender defence value, divided by a scale unit (92-94). The chance starts at a base value (106). The loop then walks up (or down, for a negative gap) in bands of a fixed chance step (108-120). Band k costs k gap units, so the k-th band needs more gap than the one before; reaching band k costs k(k+1)/2 units in total. Progress into the next band is linear (117). The loop bound is set by how far the base is from the minimum, in steps (107), so the step count is capped. Finally the chance is clamped to a min and a max (122-123). The roll is a near-uniform draw on a 1-100 scale compared with the chance (125).
- Damage (lines 128-129, 137-168): drawn only on a hit. The centre is 0.5 plus the unscaled gap divided by a damage scale (128), clamped to a fixed range (145-146). The point at that centre within [min, max] is the midpoint (155). If the midpoint falls outside the range, the range is shrunk on the far side by the overshoot (the high end is lowered, or the low end raised) and the midpoint is put on that edge; the window does not move as a whole (157-158). Then three nested uniform draws: one between the low end and the midpoint (160), one between the midpoint and the high end (161), and a final one between those two (163). The result clusters near the midpoint, so a large attack advantage moves the typical hit up the weapon's damage range. If min is greater than max, the draw is reflected (148-153, 165).
- Armour (385): net damage = damage minus damage times an effectiveness value on a fixed-point scale. It is an output column only and does not change the hit roll.
- Attack interval (361, 378-381): the interval is the weapon's rate multiplied by a factor. The factor is (decay^points + offset) / (offset + 1), where decay and offset are fixed constants (379-380). At zero speed points the factor is 1. More points shorten the interval with diminishing returns, approaching a floor of offset / (offset + 1). So it is a soft cap on attack speed.
- Outputs (387, 397-399): DPS = total damage / elapsed time; DPM = DPS / 60; hit rate = hits so far / rounds so far.
- Sweep (406-412): after each batch of rounds, the named attribute is raised by a step until it reaches a maximum, and the summary records one line per value.

## 2. Key functions

- Hit resolution, band loop and clamp: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/figureOfMeritCombatSimulator.pl` 77-135.
- Damage draw (nested uniform inside a window shrunk around a shifted midpoint): same file 137-168.
- Attack loop: same file 365-412 (rounds, interval, armour column, running totals, sweep).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit chance climbs in fixed bands from a stat gap; the k-th band costs k gap units; clamped to [min, max] | Base, min and max chance; chance step per band; gap units per band (theirs, lines 60-65; values withheld, restricted) |
| Damage centre moves with the advantage; the window is shrunk so the centre stays inside the range; nested draws cluster near the centre | Damage scale that converts the raw gap into a centre shift (theirs, line 65; value withheld); centre clamp range (lines 145-146, values withheld) |
| Armour reduces the hit as a fraction, output only | Effectiveness fixed-point scale (theirs, line 385; withheld) |
| Attack interval with diminishing speed returns and a floor | Decay base and offset (theirs, lines 379-380; withheld) |
| Running DPS, DPM and hit rate as totals | None (the arithmetic) |
| Hit is decided before the clock moves; damage only on a hit | None (order of steps) |

## 4. TypeScript sketch

simplified: re-expresses the band loop as a closed form (a triangular cost per band) that matches the donor's band result for the gaps I checked by hand (0, 1 unit, 3 units, and a capped large gap). It omits: the donor's integer rounding of the damage midpoint; the donor's offset on the hit roll (the sketch uses a plain [0,1) draw times 100); the reflected draw used when min is greater than max (the sketch expects ordered bounds); the rand-zero edge noted in section 6; the output rows, running totals and sweep; the crit, knockback and miss effects, which the donor does not model. It reorders nothing in the resolution itself. The tuning numbers in the example call are our placeholders, not the donor's.

```ts
// Licence: restricted (donor is leaked proprietary source, no licence).
// clean-room: written from the described mechanism (banded hit chance, nested damage draw, armour fraction, interval decay). No donor code, constants or identifiers.
// Numbers below are placeholders chosen for this sketch, not the donor's.
export {};

type Rng = () => number; // uniform in [0, 1)

interface ChanceTuning {
  basePct: number;   // hit chance (percent) when attack equals defence
  minPct: number;    // floor
  maxPct: number;    // ceiling
  bandUnits: number; // attack-minus-defence points per gap unit
  bandPct: number;   // chance points per full band
}

// Gap is measured in units. Band k costs k units (1, 2, 3, ...), so reaching band k
// costs k(k+1)/2 units in total: each extra band is harder than the last.
// Partial progress into the next band is linear. The chance is then clamped.
function hitChancePct(gap: number, t: ChanceTuning): number {
  const sign = Math.sign(gap);
  const units = Math.abs(gap) / t.bandUnits;
  const maxBands = Math.ceil((t.basePct - t.minPct) / t.bandPct);

  let full = 0;
  while (full < maxBands - 1 && units > ((full + 1) * (full + 2)) / 2) {
    full += 1;
  }
  let pct = t.basePct + sign * full * t.bandPct;
  if (full < maxBands - 1) {
    const used = (full * (full + 1)) / 2;
    pct += sign * ((units - used) / (full + 1)) * t.bandPct;
  }
  return Math.min(t.maxPct, Math.max(t.minPct, pct));
}

// Hit roll. Sketch uses a plain [0,1) draw; the donor adds 1 to a [0,99) draw (see omissions).
function rollHit(gap: number, t: ChanceTuning, rng: Rng): boolean {
  return rng() * 100 < hitChancePct(gap, t);
}

// Damage is drawn only on a hit. shift = raw gap / damage scale, so 0 means centred.
// The midpoint of [lo, hi] moves with the shift. If it leaves the range, the range is shrunk
// on the far side by the overshoot so the midpoint sits on the edge. Then: a point between lo and mid, a point between mid
// and hi, and a final point between those two. That concentrates results near the midpoint.
function rollDamage(lo0: number, hi0: number, shift: number, rng: Rng): number {
  let lo = Math.min(lo0, hi0);
  let hi = Math.max(lo0, hi0);
  const dist = Math.min(2, Math.max(-1, 0.5 + shift));
  let mid = lo + (hi - lo) * dist;
  if (mid < lo) { hi += mid - lo; mid = lo; }
  if (mid > hi) { lo += mid - hi; mid = hi; }
  const a = lo + rng() * (mid - lo);
  const b = mid + rng() * (hi - mid);
  return a + rng() * (b - a);
}

// Armour soaks a fixed fraction of the hit. Stored as a 0..1 fraction here.
function armourSoak(damage: number, armourFraction: number): number {
  return damage * armourFraction;
}

// Attack interval: each speed point multiplies the interval by decay^points, and the
// result approaches a floor (a soft cap on attack speed) instead of reaching zero.
function attackInterval(baseInterval: number, speedPoints: number, decay: number, floor: number): number {
  return baseInterval * (floor + (1 - floor) * Math.pow(decay, speedPoints));
}

// Example tuning (our numbers): base 75, min 50, max 95, 10 gap units per band, 5 points per band.
const tune: ChanceTuning = { basePct: 75, minPct: 50, maxPct: 95, bandUnits: 10, bandPct: 5 };
void tune; void rollHit; void rollDamage; void armourSoak; void attackInterval;
```

## 5. Lands in

- TARGET `src/fight/resolve.ts` (new engine module, duel resolution): hit chance from the attack-defence gap, the damage draw on a hit, and the armour fraction. Parity-checklist row 1 (duel step / sim). The roll is made on the server with the engine's seeded RNG, so the client only displays the result.
- The attack interval with its floor sits in the same module under row 1, as a weapon-rate rule.
- Test: a seeded balance run in the test suite, which is the one place the donor's offline tool maps onto our code.
- Reuse tag: rewrite-from-idea (restricted; clean-room only)
- Brief rule served: 1 (one combat core: the sim calls the engine's own resolve function, it is not a second copy); server-verified rolls.

## 6. Gaps and risks

- Restricted licence: no code, constants or identifiers from the donor appear in this note or the sketch. The batch folder's receipts file holds short exact quotes purely as proof of reading, and nothing from it is copied into the engine.
- Not the live rules: this is the designers' offline simulator. The live server source is absent from this donor, so whether live combat matches these bands cannot be checked here.
- The roll is compared on a 1-100 scale with an offset, so a stated chance c gives about (c - 1) / 99 in practice (computed from the code). At a 75 percent chance that is about 74.7 percent. Frankendom should state the roll rule in one place and test it.
- Perl's documented behaviour (Perl docs, not read in this donor) is that rand(0) acts like rand(1). If the midpoint lands exactly on the top of the range, the top nested draw can step past the maximum by up to one unit. The sketch clamps instead. Not tested here.
- MAX_ATTACKERS = 3: a many-on-one fight runs this resolution once per attacker per defender per tick, so the cap must be tested with the duel, not only one pair.
- Weapon damage range, rate and armour values are per-item data; the band size and the damage scale are fixed engine rules. Keep those two apart so a zone or item edit cannot change the ladder.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** 1) Damage section says the window 'slides so the midpoint sits on that edge'; the code (lines 157-158) does not slide it, it shrinks the window by the overshoot on the far side (max reduced or min raised) and puts mid on the edge. The sketch code does this correctly; only the prose and sketch comment are wrong. 2) Order of steps: note lists armour (c) before totals/print (d); in the file the totals are added at 383-384, armour computed at 385, then print (387); the printed time is the pre-advance time. Harmless. Verified: whole file 434 lines, header blank, hit-chance band loop 106-123 (cost k per band, bound from base-min over step, partial linear at 117, loop cap), roll 125 giving (c-1)/99, damage dist and clamp 128/145-146, midpoint 155, three nested draws 160-163 with int-rounded midpoint, inversion 148-153/165, interval formula 379-381 (floor and closed form in sketch equal), armour 385 output only, sweep 406-412, summary, restricted note matches; src/dsrc/serverdata/stationapi are empty. My hand check finds the closed-form band loop in the sketch equals the donor loop including the loop-bound edge cases (base==min, cap on full bands).

**Missed:** Printed row time is the time before the interval is added, while DPS divides by the time after (387).
