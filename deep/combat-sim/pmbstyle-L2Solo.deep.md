# pmbstyle-L2Solo (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Attack.js` | Licence: Apache-2.0 | JavaScript | symbol `Attack.meleeHit`

Checked: 101-279 (verified, read in full). Hit chance is in `Formulas.calcHitChance` (`/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Formulas.js` 332-349); the melee damage formula is `calcMeleeDamage` (Formulas.js 279-293); the damage step is `prepareMeleeHit` (Attack.js 1065-1110). Also read: `calcHitChance` 332-349, `calcMeleeDamage` 279-293, `rollShieldUse` 317-330 and `prepareNpcMeleeHit` 1112-1152.

## 1. Mechanism

- `meleeHit(session, creature)` (Attack.js 101-279) runs for one swing. It returns early if the PvP handoff or participant checks block it (102-107). If the target is out of range, it schedules a move (an approach) and returns (117-127). Bow attacks respect a reload gate and consume an arrow (111-116, 128). A loaded soulshot is consumed here (130-148).
- Attack timing comes from attack speed (150-156): melee draw time is 0.644 of the cycle and the cycle comes from `calcMeleeAtkTime`; bows use a reuse-delay formula (`calcBowAttackTimes`).
- Every roll is made at swing start, before the impact timer: each target (primary, then polearm secondary targets) gets `Formulas.calcHitChance` (165) and then `prepareMeleeHit` (167), which is called unconditionally and returns damage 0 with the miss flag itself when the hit did not land (1066-1071). The chance = (80 + 2 x (accuracy - evasion)) x 10, times a modifier (+3 or -3 for a height difference over 50; +10 from behind; +5 when the attacker is not in the target's front arc; -10 at night), clamped to 200..980 per mille, then hit if chance >= rng() x 1000 (335-348). Secondary targets lose damage: the multiplier starts at 0.85 and is divided by 1.15 after each secondary target (163, 169-172).
- If it hits, `prepareMeleeHit` (1065-1110) rolls shield defence (`rollShieldUse`, 317-330: needs a shield rate and a facing attacker; rate scaled by DEX and by 1.3 against bows; a perfect-block roll, otherwise a normal success adds the shield's defence to pDef), a critical roll against the situational rate per mille (`rollCritical` 313-315, rate from 1178-1188), and computes `calcMeleeDamage` (279-293): `70 x pAtk / pDef` (pAtk doubled for a soulshot); a critical gives `2 x critMul x (70 x pAtk / pDef) + critAdd x 70 / pDef`; all times `1 + variation / 100` where the variation is a random integer in -pAtkRnd..+pAtkRnd. The result is rounded after the weapon-vulnerability, undead, race and PvP multipliers. A perfect block sets damage to 1 (1091-1092).
- Impact happens after a timer of the draw time (194-242): the target is re-checked (participants, curse block, dead, melee range), then `hit` applies damage and then damage absorb (heal-on-hit) and a critical fires weapon special effects (216-234). A miss or zero damage records aggression and the primary prints "missed". The next swing is queued at the full cycle time (244-278).
- Tick: per swing from a queued timer; the donor is a bot-capable server actor.

## 2. Key functions

- `Attack.meleeHit`: `Attack.js` 101-279. Swing entry, range, timing, per-target hit, scheduling of impact.
- `Formulas.calcHitChance`: `Formulas.js` 332-349. Per-mille hit chance with position modifiers.
- `Formulas.calcMeleeDamage`: `Formulas.js` 279-293. Base formula with critical and variation.
- `Attack.prepareMeleeHit`: `Attack.js` 1065-1110. Shield, critical, damage, flags.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit chance = base + k x (accuracy - evasion), scaled by a position modifier, clamped, one roll | Base 80, k = 2, scale 10, clamp 200-980 (theirs, Formulas.js 335, 347) |
| Height and facing modifiers on the hit chance | +3 or -3 height over 50, +10 behind, +5 not in front, -10 night (theirs, 338-344) |
| Damage = attack / defence times a constant, times a random variation | 70 (theirs, 285, 289); variation pAtkRnd percent (theirs, 280) |
| Secondary targets take a shrinking share of damage | 0.85 then divided by 1.15 per target (theirs, Attack.js 163, 171) |
| Crit doubles the multiplier and adds a flat term | Crit multiplier 2 and crit add (theirs) |
| Shield: a perfect block sets damage to 1 | Shield rates (theirs, from item data) |

## 4. TypeScript sketch

simplified: omits soulshot doubling, shield rolls and the perfect block, the critical roll itself (the sketch takes `crit` as an input), the weapon, undead, race and PvP multipliers, rounding, the ranged and timing paths, and the gate and impact timers. The variation is applied as a plain percent here; the donor draws an integer in -pAtkRnd..+pAtkRnd.

```ts
// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; lifting the donor lines is permitted, but this sketch is not a copy.
type Roll = () => number; // uniform in [0, 1)

// Per-mille hit chance: base plus scaled accuracy margin, times a position modifier, clamped.
function hitChancePerMille(accuracy: number, evasion: number, positionPct: number): number {
  let chance = (80 + 2 * (accuracy - evasion)) * 10;
  chance *= positionPct / 100;
  return Math.max(200, Math.min(980, chance));
}

function landsHit(accuracy: number, evasion: number, positionPct: number, roll: Roll): boolean {
  return hitChancePerMille(accuracy, evasion, positionPct) >= roll() * 1000;
}

// Damage: attack over defence times a constant, times a random variation in percent.
function meleeDamage(pAtk: number, pDef: number, variationPct: number, crit: boolean, critMul: number, critAdd: number): number {
  let d = (70 * pAtk) / pDef;
  if (crit) d = 2 * critMul * d + (critAdd * 70) / pDef;
  return d * (1 + variationPct / 100);
}

// Secondary targets take a shrinking share of the primary damage.
function secondaryShare(index: number): number {
  return index === 0 ? 1 : 0.85 / Math.pow(1.15, index - 1);
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): the per-mille hit gate with a position modifier is a candidate shape. Frankendom's hit gate is already in `stepDuel` (`src/duel.ts` line 221, checked in worktree `frankendom-backend`, commit 46e670530); compare first.
- today: `src/duel.ts` (moving).
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The formula is an MMO stat table (accuracy, evasion, pAtk, pDef, shield rates). None of it is a Frankendom catalogue field (checklist row 21); do not import these constants.
- Timing is server-side and uses a timer queue. Frankendom's hit timing is the 60 Hz step; the bow reuse and draw timings do not apply.
- Secondary-target falloff is a polearm rule that hits several targets in one swing; Frankendom's rulings cap attackers on one target at MAX_ATTACKERS = 3 (`src/fight/world.ts` line 22), and there is no multi-target swing today.
- Every roll is made at swing start with `Math.random`, and the damage lands later at impact. Frankendom's verifier replays a seeded stream, so rolls would have to come from the one seeded stream and be fixed when the swing starts.
- The donor is a server actor with bot hooks. The server parts (range chase, shot reloads, aggression records) are not part of the shared engine.
