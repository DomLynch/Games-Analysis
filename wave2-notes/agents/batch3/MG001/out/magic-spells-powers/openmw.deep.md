# openmw (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/spellresistance.cpp` | Licence: GPL-3.0 (root LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; spellresistance.cpp has no per-file header). Clean-room, shape only; no line translation. | C++ | symbol `getEffectMultiplier` (with `getEffectResistance`, `getSpellSuccessChance` in spellutil.cpp, `CastSpell::cast` in spellcasting.cpp)

Checked: Read in full: `spellresistance.cpp` (all 96 lines); `spellutil.cpp` 23-40, 42-94 (cost), 220-300 (base chance and success gate); `spellcasting.cpp` 330-390 (CastSpell::cast for spells); `worldimp.cpp` 2835-2890 (startSpellCast: magicka and fatigue spend) and 2893-2975 (World::castSpell: targeting and the cast call); `character.cpp` 1540-1570 and 1640-1655 (when the cast fires); `creaturestats.cpp` 39-53 (fatigue term) and 397-415 (magicka maximum); `actors.cpp` 110-120 and 900-910 (magicka per hour of sleep). Read in part: `spelleffects.cpp` 360-384 (resist application) and 325-360 (reflect and absorb rolls, read by grep at 348 and 355); `spelleffects.cpp` 580-630 (mind and summon dispatch only). Candidate files opened for the resistance topic: spellresistance.cpp, spellutil.cpp, spellcasting.cpp, spelleffects.cpp, creaturestats.cpp, worldimp.cpp, character.cpp. Confidence: high for the success gate, the cost path and the resist formula as written (every line of those functions read); high that the magnitude branch returns a 0..1 fraction (line 68 and the use at line 26 are both read). Not run in the game, so the effect size of the unit issue is inferred from the code. Not read: `Misc::Rng` (the roll generator), the GMST values (fFatigueBase, fFatigueMult, fEffectCostMult, fPCbaseMagickaMult and similar live in game data, not the donor), `activespells.cpp` stacking, the bodies of Charm, Frenzy, Calm and the summon functions (`summoning.cpp`), projectile code (`launchMagicBolt`), and `getHitContact`. Camera: not applicable (magic note).

## 1. Mechanism

- Cast start (`World::startSpellCast`, worldimp.cpp 2835-2890): if the selected spell costs more than the caster's current magicka, the cast is refused (2853). Otherwise magicka is reduced by the spell cost (2870) and fatigue is reduced by `cost * (fFatigueSpellBase + encumbrance * fFatigueSpellMult)` (2881). This happens before the success roll, so a failed cast still costs magicka and fatigue. Caveat: the donor comment at worldimp 2873 says both fFatigueSpell GMSTs are 0 in vanilla, so the fatigue spend is a data-driven option and is zero unless the game data sets it; the magicka spend is always active.
- Cast release (`character.cpp` 1652 and the call at 1168; `World::castSpell`, worldimp.cpp 2893): for random attack animations the cast fires at once (1652, "No release text key to use"). Other casts are released from the animation (the 1168 call site; its text-key condition was not read). The target is the focus object for the player (2917), or the actor hit contact within `fCombatDistance` times the weapon or hand reach (2928; combat.cpp 665-670). Then `CastSpell::cast` runs (worldimp 2975 calls it; spellcasting.cpp 330).
- Success gate (`CastSpell::cast`, spellcasting.cpp 350-352): chance = `getSpellSuccessChance(spell, caster, cap=true, checkMagicka=false)`. The roll is `roll0to99`; the cast fails when roll >= chance. Inside the chance function (spellutil.cpp 267-300) the early exits come first: a Power gives 100 or 0 by `canUsePower` (277-278), godmode gives 100 (280-281), silence gives 0 (283), and any spell type other than a normal Spell (abilities, curses, diseases) returns 100 (286-287), so only normal spells ever roll. Then the magicka test (289) is only used when `checkMagicka` is set (it is not set on this path); a spell with the always-succeed flag gives 100 (292); otherwise `chance = (base - soundMagnitude) * fatigueTerm` (295-297), clamped to 0..100 when capped (299-300). Before the spend, `startSpellCast` also refuses an already-used Power (worldimp 2860-2865).
- Base chance (`calcSpellBaseSuccessChance`, spellutil.cpp 220-264). For each effect: `x = duration (floored to 1 unless the effect is AppliedOnce, 232-233) * 0.1 * baseCost * 0.5 * (min + max) + area * 0.05 * baseCost`, times 1.5 for a target-range effect (238-239), times `fEffectCostMult` (245). The margin is `s - x` where `s = 2 * skill(school)` (247-248). The effect with the smallest margin sets `lowestSkill = s`. Then `base = lowestSkill - spellCost + 0.2 * willpower + 0.1 * luck` (262).
- Fatigue term (creaturestats.cpp 39-53): `fFatigueBase - fFatigueMult * (1 - current/max)`, with the normalised ratio set to 1 when max is 0 (44). It multiplies the success chance (297) and the resist threshold (47).
- Resist (`getEffectMultiplier` 19-26; applied at spelleffects.cpp 374-376): the surviving share of a magnitude is `1 - resistance / 100` (26). If the effect has no resistance attribute, resistance is 0 (33-34). Otherwise:
  - threshold `x = (willpower + 0.1 * luck) * fatigueTerm` (47);
  - for a spell cast by an actor, `x *= 50 / uncappedCastChance` (52-54), so easy-to-cast spells are harder to resist;
  - roll = uniform 0..100 (57); a no-magnitude effect subtracts the attribute resistance from the roll (59);
  - if `x <= roll`, the roll part is 0 (61-62);
  - otherwise a no-magnitude effect is fully resisted (66), and a magnitude effect gets `roll / min(x, 100)` (68), see section 6;
  - the total is `min(rollPart + attributeResist, 100)` (71).
  - Attribute resistance (spellresistance.cpp 75-93): resistance-effect magnitude minus weakness-effect magnitude, plus the matching shield for fire, shock and frost damage (83, 87 onwards).
  - A total of 100 removes the effect and shows the "resisted" message (spelleffects.cpp 376).
- Reflect and absorb (spelleffects.cpp 348, 355): each is a percent roll `roll0to99 < activeEffect.mMagnitude`, so the chance is the reflect or absorb magnitude.
- Magicka pool (`recalculateMagicka`, creaturestats.cpp 402-415): `max = (fPCbaseMagickaMult, or fNPCbaseMagickaMult for NPCs, + 0.1 * FortifyMaximumMagicka) * intelligence`. When max changes, current scales with the old ratio (412-415).
- Rest (actors.cpp 117, 907): magicka restored per hour of sleep is `fRestMagicMult * intelligence`.

## 2. Key functions

- `getEffectMultiplier`, `getEffectResistance`, `getEffectResistanceAttribute`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/spellresistance.cpp` 19-96. The resist chain.
- `calcEffectCost` and `getTotalCost` and `calcSpellCost`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/spellutil.cpp` 23-94. Cost per effect (method-dependent), sum with range multiplier, autocalc or fixed.
- `calcSpellBaseSuccessChance` and `getSpellSuccessChance`: spellutil.cpp 220-300. Base chance and the success gate.
- `CastSpell::cast(const ESM::Spell*)`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/spellcasting.cpp` 330-389. The roll and the power-once rule.
- `World::startSpellCast`, `World::castSpell`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/worldimp.cpp` 2835-2890 and 2893-2975.
- `CreatureStats::getFatigueTerm`, `recalculateMagicka`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/creaturestats.cpp` 39-53 and 402-415.

## 3. Numbers vs mechanism

The reusable algorithm: one percent roll per cast, a threshold from the caster's own skill margin, the cost and a stamina (fatigue) multiplier, clamped to 0..100. The game constants are the GMST values, which the donor does not ship; the constants written in code are listed below.

TABLE (magic mechanisms; cost column = magicka unless stated):

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Magicka pool | max magicka | `(fPCbaseMagickaMult or fNPCbaseMagickaMult + 0.1 * FortifyMaxMagicka) * Intelligence` | base from GMST (not in donor); fortify adds 0.1 per point | n/a | n/a | current scales with max | creaturestats 405-414 |
| Magicka rest | magicka per hour of sleep | `fRestMagicMult * Intelligence` | GMST | n/a | per hour slept | clamp in setCurrent not read | actors 117, 907 |
| Effect cost | cost of one effect | `0.5*(min+max) * 0.1*baseCost * duration + 0.05*area*baseCost`, times fEffectCostMult | min and max floored at 1 for spells (cost path only); duration floored at 1 unless AppliedOnce (59-60); no-magnitude and no-duration effects use 1 (48-52) | magicka (autocalc) | n/a | per-effect floor at 0 is applied in getTotalCost (29), not here | spellutil 51-55, 78-83 |
| Spell cost | total of effects | sum of effect costs; target-range effects x1.5; rounded | per effect | magicka | n/a | autocalc or fixed | spellutil 29, 34, 91-93 |
| Fixed cost | spell with autocalc off | `mCost` | per spell record | magicka | n/a | n/a | spellutil 88-89 |
| Cast gate: magicka | refuse when short | `current < cost` refused at cast start | cost as above | magicka checked | at cast start | none | worldimp 2848-2853 |
| Cast spend | magicka and fatigue spent before the roll | `magicka -= cost`; `fatigue -= cost * (fFatigueSpellBase + enc * fFatigueSpellMult)` | encumbrance 0..1 | magicka and fatigue | at cast start | a failed cast still spends | worldimp 2870, 2881 |
| Base success | skill margin for the spell | `lowestSkill - cost + 0.2*WIL + 0.1*LUCK`, lowest school margin `2*skill - x` | 0.2 WIL, 0.1 LUCK | none | n/a | none | spellutil 220-264 (262) |
| Success gate | cast roll | roll 0..99 fails when `roll >= chance` | chance in 0..100 (capped) | none | cast time = animation (not read) | clamp 0..100 | spellcasting 350-352; spellutil 299-300 |
| Fatigue multiplier | stamina scales success and resist | `(fFatigueBase - fFatigueMult * (1 - cur/max)) * chance` | cur/max 0..1; max 0 gives 1 | none | n/a | none | creaturestats 44, 52; spellutil 297 |
| Silence | blocks casting | chance 0 | 0 or magnitude | none | n/a | none | spellutil 283 |
| Sound | cast penalty | chance minus Sound magnitude | magnitude as percent points | none | n/a | none | spellutil 295 |
| Always succeed | flag | chance 100 | flag | none | n/a | none | spellutil 292 |
| Power | once per 24 h | cannot be used again in 24 h | 24 h | none | 24 h | one use | spellcasting 369-371 |
| Target (player) | focus object | `getFocusObject()` | n/a | none | n/a | none | worldimp 2917 |
| Target (actor) | melee hit contact | `getHitContact(actor, fCombatDistance)` | fCombatDistance times reach | none | n/a | none | worldimp 2928; combat 665-670 |
| Resist threshold | caster-scaled | `(WIL + 0.1*LUCK) * fatigue * 50 / castChance` | 50 is the scale | none | n/a | uncapped cast chance | spellresistance 47, 52-54 |
| Resist roll | uniform | `rollClosedProbability * 100` | 0..100 | none | n/a | none | spellresistance 57 |
| No-magnitude resist | all or nothing | roll below threshold means 100 | 0 or 100 | none | n/a | none | spellresistance 59, 61-62, 66 |
| Magnitude resist | partial, as written | `roll / min(x,100)` (fraction) then read as percent | at most about 1 point (see section 6) | none | n/a | total capped at 100 | spellresistance 68, 71, 26 |
| Attribute resist | resist minus weakness plus shield | sum of magnitudes | 0..100 | none | n/a | total capped at 100 | spellresistance 75-93 (83) |
| Full resist | effect removed | multiplier == 0 | 0 | none | n/a | none | spelleffects 375-376 |
| Reflect | redirect a spell | `roll0to99 < reflect magnitude` | percent | none | n/a | reflect rules beyond this check not read | spelleffects 348 |
| Absorb | take a spell | `roll0to99 < absorb magnitude` | percent | none | n/a | none | spelleffects 355 |
| Frenzy / Calm | dispatch to a helper with AiSetting::Fight and the magnitude (Calm negated) | dispatch only | magnitude | none | n/a | helper body not read | spelleffects 585-593 |
| Charm | dispatch only | dispatch only | n/a | none | n/a | body not read | spelleffects 610 |
| Summons | dispatch list of summon effects | dispatch only | n/a | none | n/a | body (summoning.cpp) not read | spelleffects 628-641 |
| Dispel | removes whole spells | dispatch only | n/a | none | n/a | body not read | spelleffects 454-455 |

Which numbers suit a fast mobile fight: one 0..100 roll per cast, a skill margin built from the caster's own skill, and a stamina multiplier (fatigue) are cheap and readable on a phone. The magicka pool per intelligence point is a straight multiplier (creaturestats 414). The per-effect cost numbers (0.1, 0.05, 1.5) are the parts a designer would tune; they are fine for a duel only if costs are scaled to the fight length (the donor's costs are tuned to Morrowind's game-hour timescale, not seconds).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of the success gate (silence, magicka test, always-succeed, penalty, fatigue, cap) and of the resist chain (threshold, caster scale, roll, roll-under test, roll part, attribute part, cap). It omits the early exits for godmode, Power and non-Spell types (which return before any roll), the reflect and absorb rolls, the shield terms, the other cost methods (potions and enchantments) and the duration offset and minimum area of the player method, the GMST lookups (the values are inputs), and the NoMagnitude subtraction. It differs from the donor in one place on purpose: the magnitude roll part is returned as a percent (`100 * roll / threshold`), where the donor returns a 0..1 fraction that the caller reads as a percent.

```ts
// Licence: GPL-3.0 donor (clean-room). Sketch written from the described mechanism, not a translation of the donor lines.
export interface CasterStats {
  schoolSkill: number;   // skill in the spell's school (the donor uses 2 * skill as the margin base)
  willpower: number;
  luck: number;
  fatigueTerm: number;   // fatigue ratio mapped to a multiplier (donor: fFatigueBase - fFatigueMult * (1 - normalised))
  magicka: number;
  silenced: boolean;
  soundBonus: number;    // magnitude of a Sound effect: subtracts from the chance
}

export interface EffectTerm {
  min: number;
  max: number;
  baseCost: number;
  duration: number;
  area: number;
  targetRange: boolean;  // donor: target range multiplies the margin by 1.5
  appliedOnce?: boolean; // donor: AppliedOnce effects skip the duration floor
  hasMagnitude?: boolean; // donor: false (NoMagnitude) means magnitude 1
  hasDuration?: boolean;  // donor: false (NoDuration) means duration 1
}

// Cost of one effect (the donor's GameSpell method: no duration offset, no minimum area).
// Floors as the donor: magnitude min and max at 1, duration at 1 unless appliedOnce; no-magnitude/no-duration effects use 1.
export function effectCost(e: EffectTerm, costMult: number): number {
  const minM = Math.max(1, e.hasMagnitude === false ? 1 : e.min);
  const maxM = Math.max(1, e.hasMagnitude === false ? 1 : e.max);
  let dur = e.hasDuration === false ? 1 : e.duration;
  if (!e.appliedOnce) dur = Math.max(1, dur);
  let x = 0.5 * (minM + maxM);
  x *= 0.1 * e.baseCost;
  x *= dur;
  x += 0.05 * e.area * e.baseCost;
  return x * costMult;
}

// Spell cost: sum of effect costs, each floored at 0, target-range effects x1.5, rounded.
export function spellCost(effects: EffectTerm[], costMult: number): number {
  let total = 0;
  for (const e of effects) {
    const c = Math.max(0, effectCost(e, costMult));
    total += e.targetRange ? c * 1.5 : c;
  }
  return Math.round(total);
}

// Base success chance: the effect with the smallest (2*skill - margin) sets the school. Donor: calcSpellBaseSuccessChance.
export function baseChance(effects: { skill: number; margin: number }[], cost: number, c: CasterStats): number {
  let best = Number.MAX_VALUE;
  let lowest = 0;
  for (const e of effects) {
    const s = 2 * e.skill;
    if (s - e.margin < best) {
      best = s - e.margin;
      lowest = s;
    }
  }
  return lowest - cost + 0.2 * c.willpower + 0.1 * c.luck;
}

// Cast gate. Roll is success when roll (0..99) is below the chance. Donor: getSpellSuccessChance and CastSpell::cast.
export function castChance(c: CasterStats, base: number, cost: number, opts: { alwaysSucceeds: boolean; checkMagicka: boolean; cap: boolean }): number {
  if (c.silenced) return 0;
  if (opts.checkMagicka && cost > 0 && c.magicka < cost) return 0;
  if (opts.alwaysSucceeds) return 100;
  const chance = (base - c.soundBonus) * c.fatigueTerm;
  return opts.cap ? Math.min(100, Math.max(0, chance)) : Math.max(0, chance);
}

// Resistance removed from one magnitude effect, in percent (0..100).
// threshold: the caster's uncapped cast chance; rnd: uniform 0..100; attrResist: resist minus weakness (0..100).
// FIX vs donor: the roll term is returned as a percent. The donor returns roll / threshold (0..1) and then reads it as a percent.
export function magnitudeResistPercent(c: CasterStats, threshold: number, rnd: number, attrResist: number): number {
  let x = (c.willpower + 0.1 * c.luck) * c.fatigueTerm;
  if (threshold > 0) x *= 50 / threshold;     // easy spells are harder to resist, hard spells easier
  if (x <= rnd) return Math.min(attrResist, 100);  // roll beats the threshold: no roll resistance
  const fromRoll = (100 * rnd) / Math.min(x, 100); // FIX: percent (donor: rnd / min(x, 100), a 0..1 fraction)
  return Math.min(fromRoll + attrResist, 100);
}

// Surviving share of a magnitude effect (0..1). Zero share means fully resisted.
export function survivingShare(resistPercent: number): number {
  return 1 - resistPercent / 100;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/openmw-cast-resist.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/cast-gate.ts` (new module). One place for the cast: magicka and stamina check, one success roll per cast, cost from the spell's effect data, and one resist step per magnitude effect. The server runs it; the client shows the chance.
- Parity-checklist row 13 (specials). Spells and special moves share one cost and gate path.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine: one gate per cast), row 13; rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the formula shape and is not a translation.
- Defect 1, units (kept idea, fixed in the sketch). `spellresistance.cpp` 68 writes `roll / min(x, 100)`, which is a 0..1 fraction (because roll is below x in that branch). Line 26 reads the result as a percent (`1 - resistance / 100`). So for a magnitude effect the roll part is at most about 0.01 of the multiplier, and only the attribute resistance can reach 100 and remove the effect (spelleffects 376). As written, the roll does almost nothing to damage and healing. Fix: percent (`100 * roll / x`); the test is that a roll just under the threshold removes almost all of a magnitude effect and a roll near 0 removes none. I did not run the game to confirm the donor's effective behaviour.
- Defect 2, two magnitude rules (kept idea, fixed by one cost function). The cost path floors min and max at 1 for spells and uses magnitude 1 for effects without one (spellutil 51-55). The success path does not: `calcSpellBaseSuccessChance` reads `mMagnMin` and `mMagnMax` directly and has no NoMagnitude check (228-237). So a spell's price and its success chance can be computed from different magnitudes (duration is floored the same way in both, 59-60 and 232-233). Fix: one `effectCost` used for both.
- Failed casts cost magicka and fatigue (worldimp 2870-2881 before the roll in spellcasting 352). Frankendom's stamina (row 3) can keep this rule: a failed special costs stamina, and the server applies it once.
- No diminishing returns for crowd control: a grep for "diminish" over `apps/openmw/mwmechanics` returns nothing. So the donor does not provide a CC ladder; Frankendom's Proof 3 ladder has no OpenMW counterpart.
- Interrupts: not found in this read. Nothing in the cast path (spellcasting 330-390) cancels a cast once `CastSpell::cast` runs. Whether a hit or a move cancels the animation before the release was not read.
- Mind control and PvP: Frenzy and Calm dispatch to a helper with AiSetting::Fight and the magnitude (spelleffects 588, 593); Charm is dispatched at 610. The helper and Charm bodies were not read, so the donor's PvP consent and duration rules are unknown. Frankendom needs its own rules (no control of a flagged-off player; duration cap).
- Summons and dispatch: the summon list (spelleffects 628-641) is only dispatched here; the summoning code (`summoning.cpp`) was not read, so leash, upkeep and kill ownership are not claimed.
- Timescale: spell costs and durations are tuned to Morrowind game hours and minutes; a fast mobile fight needs the cost and duration data rescaled.

Best transferable idea: a cast is one 0..100 roll against a chance built from the caster's own skill margin minus the spell cost, plus willpower and luck, multiplied by a stamina term, and a failed cast still costs the magicka and stamina.
Decision (proposed): adapt - take the one-roll cast gate and stamina multiplier into `src/fight/cast-gate.ts`; fix the donor's magnitude units so the resist roll is a percent, and use one cost function for both price and chance.
Acceptance: a server test with school skill 50, willpower 50, luck 0, fatigue term 1 and spell cost 20 asserts a 90% success chance (2 x 50 - 20 + 0.2 x 50); with fatigue term 0.5 the chance is 45%; and a magnitude spell with attribute resist 0 and a roll just under the threshold removes almost all of its magnitude.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
Brief rule served: 1 (one engine), 13 (specials)

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Success gate omitted the early exits: Power (spellutil 277-278), godmode (280-281) and non-Spell types (286-287) return before any roll. Confirmed.
- Effect cost omitted the duration floor (59-60, 232-233) and hasMagnitude/hasDuration defaults (48-52); the TS effectCost did not apply the min/max floor at 1 (53-57). Confirmed.
- Missed: worldimp 2873 comment says both fFatigueSpell GMSTs are 0 in vanilla (no fatigue loss); startSpellCast 2860-2865 refuses an already-used Power before the spend. Confirmed.

Fixed 2026-10-12: added the early-exit list to the success gate and the sketch caveat; added duration floor and no-magnitude/duration defaults to the cost table, Defect 2 and the sketch effectCost (work/openmw-cast-resist.ts updated, typechecked); added the fatigue-GMST-zero caveat and the Power refusal before spend.
