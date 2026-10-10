# SWG-Source-swg-main (progression, cell 10)

Donor: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/figureOfMeritCombatSimulator.pl` | Licence: none stated in the donor (no licence file; `_RESTRICTED-NOTE.txt` says proprietary leaked official SWG source, no licence; restricted, clean-room only) | Perl (offline combat simulator) | symbol: none (the swing-time block is inline in the main loop, lines 345-418)

Checked: Read the whole simulator file (lines 1-434: template 1-60, hit and damage helpers 60-168, input and hash helpers 170-339, main loop 340-434). The swing-time block (376-381) is inline in the main loop, so its only caller is that loop. Not read: the live game server, because the src, dsrc, serverdata and stationapi folders are empty submodule mounts. So whether the game uses this curve is unknown. Confidence: moderate. The mechanism is read end to end, but the scope is the simulator's copy of the rule.

Best transferable idea: A swing time that a speed skill mod shortens toward a floor (exactly the base at zero, never below the floor), clamped at both ends, so one stat can speed attacks without reaching zero or blowing up on negative values.
Decision (proposed): adapt - Frankendom has no attack-speed stat yet; take the bounded shape, clamp both ends, keep the two curve values as engine constants, and store the mod once on the character record (one ledger).
Acceptance: A server test asserts that mod 0 gives the base swing time exactly, a large positive mod never gives a swing below the floor, a large negative mod is clamped, and the same mod gives the same swing time in a Pit fight and a zone fight (both call src/fight/swing.ts).

## 1. Mechanism

- The simulation keeps one running clock. Each sweep value starts it at zero (367). Every round is one swing: the clock advances by the weapon's base swing time (361) times a factor that depends on one speed skill mod read from the attacker (378-381).
- The factor is a blend (379-381): a base just under 1 raised to the power of the mod, plus a positive blend constant, divided by one plus the blend constant. A mod of 0 gives exactly 1, so no change. A positive mod gives less than 1 (faster swings) and approaches a floor of blend / (blend + 1) as the mod grows. A negative mod gives more than 1 (slower swings), and the factor grows without bound. No clamp on either side was found in 376-381.
- Order inside one round: (a) roll the swing (374), which does not change the clock; (b) read the mod, default 0 when absent (378); (c) advance the clock (381); (d) add the round's damage (384); (e) write the round's line with running figures (387), and on the last round the summary figures (391-400).
- Driving loop: there is no frame or step timer. The rounds loop runs a fixed round count from the input (372), so the clock is event-driven: each swing adds its own time. An outer loop (365-418) reruns the whole set once per value of one input attribute.
- Sweep rule (410-417): run the current value; if it is at or below max minus the step, add the step and run again, otherwise stop. Every run value stays at or below max. A start value already above max still runs once.

## 2. Key functions

- Swing-time block, inline in the main loop: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/figureOfMeritCombatSimulator.pl` 376-381 (mod read with default 0, the two curve values, the clock update).
- Rounds loop and accumulators: same file, 372-402. Damage per round at 384; the last-round damage-per-time figure at 397; per-minute figure at 398 divides by 60.
- Sweep: same file, 365 and 410-417 (value written back at 412).
- Input of the mod: template line 38 (a text input). It is parsed by the input reader (249-300) and stored by the hash writer (223-247). Read, not explained further.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor-specific values |
|---|---|
| Swing time = base swing time x factor(mod) | Base swing time is the weapon's own input (361), not a zone field |
| factor(mod) = (base^mod + blend) / (blend + 1); factor(0) = 1 | base: a literal just under 1; blend: a positive literal. Both values withheld (restricted), lines 379-380 |
| Floor = blend / (blend + 1), approached as the mod grows | Roughly half the base swing with the donor's blend (computed from the donor value; not copied) |
| Negative mod: factor grows without bound | None; no clamp in 376-381 |
| Mod read each round, default 0 | Default 0 (378) |
| Sweep one attribute from start to max by an increment | Increment and max are input fields (48-51) |
| Per-minute figure = per-time figure / 60 | 60 (398); the donor's time unit is not stated, so the 60 assumes seconds |

## 4. TypeScript sketch

simplified: the sketch keeps the curve for one swing. It adds a clamp on the mod at both ends (the donor has none) and a sweep helper. It omits the hit roll, the damage, the running DPS and per-minute figures, the output files and the input parser, and it has no round loop. Base and blend are illustrative values chosen here, not the donor's.

```ts
// Clean-room sketch: a swing time that a skill-like speed mod shortens toward a floor.
// Only the idea is taken. Base and blend are illustrative values chosen here, not the donor's.

interface SwingCurve {
  base: number;   // in (0, 1): how strongly each unit of mod shortens the swing
  blend: number;  // > 0: sets the floor, which is blend / (blend + 1)
}

const MOD_MIN = -5;  // our clamp: the idea has no ceiling for negative mods, so bound both ends
const MOD_MAX = 20;

// Multiplier on the base swing time. A mod of 0 gives 1; a positive mod moves toward the floor.
function swingMultiplier(mod: number, curve: SwingCurve): number {
  const m = Math.min(MOD_MAX, Math.max(MOD_MIN, mod));
  const decay = Math.pow(curve.base, m);
  return (decay + curve.blend) / (curve.blend + 1);
}

// Swing time in milliseconds for one swing of the duel step.
function swingMs(baseSwingMs: number, mod: number, curve: SwingCurve): number {
  return baseSwingMs * swingMultiplier(mod, curve);
}

// Tuning sweep: one row per mod value from start to max in steps (tooling, not runtime).
function sweepSwing(
  baseSwingMs: number, start: number, step: number, max: number, curve: SwingCurve
): Array<{ mod: number; swingMs: number }> {
  const rows: Array<{ mod: number; swingMs: number }> = [];
  for (let mod = start; mod <= max + 1e-9; mod += step) {
    rows.push({ mod, swingMs: swingMs(baseSwingMs, mod, curve) });
  }
  return rows;
}

const example: SwingCurve = { base: 0.9, blend: 1 };
console.log(swingMs(1000, 0, example), sweepSwing(1000, 0, 5, 20, example).length);
```

## 5. Lands in

- TARGET `src/fight/swing.ts` (new): the swing timing used by the duel step. Parity-checklist row 1 (duel step / sim). The sweep helper belongs in tooling or tests, not the runtime. The Frankendom repo was not read in this pass.
- Reuse tag: rewrite-from-idea (restricted: proprietary leaked source; clean-room only)
- Brief rule served: 2 (judge the idea; simple is not weak); 6 (timing loop read end to end: per-swing clock, no fixed step)

## 6. Gaps and risks

- The donor is the simulator's copy of the rule. The live server's use of the speed mod (and where mods are earned) is not in this donor, so this is not evidence of how the game behaves.
- Negative mods have no ceiling in the donor: the swing time grows without bound. Frankendom must clamp both ends (the sketch does, at values we chose).
- Progression proper is absent here: no XP, levels, or skill grants. Checklist row 18 (loot roll and XP award) is not covered by this donor.
- The floor and the clamp are design decisions. Designers must set them; they are engine constants, not zone data.
- One ledger: the mod must live once on the character record. The donor passes it as a simulator input, which would fork the value if copied as is.
- Server-verified kills: any swing timing that decides damage must be computed on the server. The Pit is a client and may only show the result.
- Many-on-one (MAX_ATTACKERS = 3): the donor keeps one clock per simulation. Each attacker needs its own clock in the engine; the donor does not show that.
- Units: the donor's time unit is not stated, and its per-minute figure assumes seconds. Frankendom must pick one unit and test it.

Reuse tag: rewrite-from-idea (restricted: proprietary leaked source; clean-room only)
Brief rule served: 2 and 6 (see section 5)
