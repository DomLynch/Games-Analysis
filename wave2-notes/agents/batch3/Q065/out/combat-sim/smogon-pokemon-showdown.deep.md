# smogon-pokemon-showdown (combat-sim, cell 3)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle-actions.ts` | Licence: MIT (repo LICENSE: "The MIT License (MIT)", Copyright (c) 2011-2026 Guangcong Luo and other contributors; code may be adapted) | TypeScript | symbol `BattleActions.getDamage` (with `modifyDamage`)

Checked: `getDamage` is defined at battle-actions.ts 1572 and read in full through its closing brace (1572-1709). `modifyDamage` is at 1711 and read in full through its closing brace (1711-1829, including the `return tr(baseDamage, 16);` line at 1828). Also read: the stage multiplier in `calculateStat` (pokemon.ts 560-590, the boost table and floor steps); the `modify` fixed-point helper (battle.ts 2336-2347); `randomizer` (battle.ts 2395-2398); `random(n)` semantics (prng.ts 86-91); `trunc` (dex.ts 365-368). The one caller I read: `getSpreadDamage` (battle-actions.ts 1137), its per-target loop 1141-1146 with the call at 1145; the rest of `getSpreadDamage` was not read. Not read: the `runEvent` dispatch and the handlers of the event hooks (ModifyCritRatio, BasePower, ModifyAtk/Def, WeatherModifyDamage, ModifySTAB, ModifyDamage, Damage, CriticalHit), `target.damage()` (where HP is reduced and clamped; only its call site, battle.ts 2141), `runEffectiveness`, `runImmunity`, `getMoveHitData`, the Parental Bond and protect-bypass details beyond the multipliers, the Tera and Stellar branch bodies beyond the lines quoted. Callers: I searched `getDamage(` in sim/battle-actions.ts and sim/battle.ts only. Confidence high on the order of operations and the numbers of the core formula; medium on what happens after `target.damage()`. camera_scope: n/a.

## 1. Mechanism

- Entry: `getDamage` (1572) is called once per target from the loop in `getSpreadDamage` (battle-actions.ts 1145). It returns a number (damage), 0, undefined (no damage, not an error), or false (immune; the `runImmunity` check is at 1589).
- Order inside `getDamage`:
  (a) Fixed results: OHKO moves return max HP (1593); a damage callback (1594) or a fixed damage (1595-1597) returns directly.
  (b) Base power: the callback if any, then clamped to at least 1 (1603-1608); base power 0 returns undefined.
  (c) Crit ratio (1611): the move's `critRatio` plus any `ModifyCritRatio` event, clamped 0..4 from gen 6 (1616), or 0..5 for gen 5 and older (1613). The denominators table is `[0, 16, 8, 4, 3, 2]` for gen 5 and older (1614), `[0, 16, 8, 2, 1]` for gen 6 (1618), and `[0, 24, 8, 2, 1]` for gen 7 and later (1620). A crit roll is made only when the ratio is non-zero (1627-1628): `randomChance(1, critMult[critRatio])`, so stage 1 crits 1 time in 24, stage 2 in 8, stage 3 in 2, and stage 4 always. A move with a forced crit (`willCrit`) skips the roll (1626).
  (d) A crit fires a `CriticalHit` event (1632-1634). Then the `BasePower` event runs after the crit roll (1637).
  (e) Stat boosts: a crit ignores the attacker's negative attack stages and the defender's positive defence stages (1673-1676). Attack and defence are read from `calculateStat` with the stage (1689-1690), which multiplies or divides by a table `[1, 1.5, 2, 2.5, 3, 3.5, 4]` at stages 0..6 and floors (pokemon.ts 583-589).
  (f) Base damage (1705): `int(int(int(2 * level / 5 + 2) * power * attack) / defense) / 50)`, every step truncated.
  (g) `modifyDamage` (1711) applies, in order: +2 (1718); spread modifier 0.75 (0.5 in free-for-all) for multi-target moves (1722); Parental Bond 0.25 from gen 7 and 0.5 before (1727); a `WeatherModifyDamage` priority event (handlers not read); crit ×1.5 from gen 6 (2 before) (1738), truncated; random factor 85..100 percent (1742, `randomizer` 2397); STAB ×1.5 through the fixed-point `modify` (1752-1754); type effectiveness: each super-effective step doubles (1790), each resisted step halves with truncation (1797), the total is clamped to -6..6 (1784); burn halves physical damage (1805) unless the user has Guts, and from gen 6 also unless the move is Facade (1803-1806); gen 5 sets 0 to 1 before the final modifier (1810); a `ModifyDamage` event; a protect bypass ×0.25 (1817); a landed attack that is 0 returns 1 in every generation except 5 (`gen !== 5`, 1825; gen 5 instead sets 0 to 1 earlier, before the final modifier, 1810); the result is truncated to 16 bits (1828).
- Tick: none. This is a pure function of the current state plus one random draw per random step (crit and the 85..100 roll). It is called from the move's hit step, once per target.
- Number system: the donor's `trunc` is `num >>> 0` (dex.ts 367), an unsigned 32-bit truncation, and `modify` uses 1/4096 fixed-point multipliers with round-to-nearest (battle.ts 2345-2346). These two details decide the exact integers.

## 2. Key functions

- `getDamage`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle-actions.ts` 1572-1709. Immunity, fixed results, base power, crit ratio and roll, stat stages, base formula.
- `modifyDamage`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle-actions.ts` 1711-1829. Modifiers in order: +2, spread, crit, random, STAB, type, burn, minimum 1, 16-bit truncation.
- `randomizer`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` 2395-2398. Damage times (100 minus a 0..15 roll), over 100.
- `modify`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` 2336-2347. Fixed-point multiply.
- `calculateStat`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/pokemon.ts` 560-590. Stage multiplier table.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Crit as a ladder of stages, each a 1-in-N chance, top stage always crits | Denominators `[0, 24, 8, 2, 1]` (battle-actions.ts 1620); older table `[0, 16, 8, 4, 3, 2]` (1614) |
| Crit ignores the attacker's negative offence stages and the defender's positive defence stages | Rule (1673-1676) |
| Stage multipliers for attack and defence, -6..+6 | `[1, 1.5, 2, 2.5, 3, 3.5, 4]` (pokemon.ts 583), floor (587) |
| Level-scaled base formula, truncated at each step, +2 | `2 * level / 5 + 2` (1705), `/ 50` (1705), `+ 2` (1718) |
| Crit multiplier | 1.5 from gen 6, 2 before (1738) |
| Random roll as a percent band | 85..100 from `random(16)` (battle.ts 2397) |
| STAB as a 1.5 multiplier | 1.5 (1754) |
| Type effect as doublings and halvings per step | Per-step doubling (1790), halving (1797) |
| Burn halves physical damage | 0.5 (1805) |
| Spread modifier for multi-target hits | 0.75 doubles, 0.5 free-for-all (1722) |
| Landed attack does at least 1 damage (every gen except 5, which does it earlier at 1810) | 1 (1825) |
| Final 16-bit truncation | 16 bits (1828) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the core formula: base formula with truncation, +2, crit ×1.5, the random 85..100 band, STAB as a fixed-point 1.5, type doublings and halvings, burn as a fixed-point 0.5, minimum 1, and the 16-bit final truncation. The caller passes the stage-adjusted attack and defence (it does not call `calculateStat`) and the crit and random rolls (it does not roll them). For zero base power it returns 0; the donor returns undefined there (no damage, no error). It omits the event hooks (ModifyCritRatio, BasePower, ModifyAtk and Def, ModifySTAB, ModifyDamage, weather, Parental Bond, protect bypass, Stellar and Tera), the spread modifier, the Guts and Facade exceptions to burn, the Tera 60 base-power floor, the gen-5 branch and the older crit tables, the confusion path, and the HP clamp in `target.damage()`. The crit stage ladder and the stage table are kept as data.

```ts
// Licence: MIT (donor). Shape of the donor's damage order, re-expressed in our own code; no donor lines copied.
const tr = (x: number): number => x >>> 0;             // unsigned 32-bit truncation, as the donor's trunc()
const tr16 = (x: number): number => (x >>> 0) % 65536;  // 16-bit wrap on the final damage, as the donor's tr(x, 16)

// Fixed-point multiply: modifier in 1/4096 units, result rounded to nearest (donor modify()).
function modify(value: number, mult: number): number {
  const modifier = tr(mult * 4096);
  return tr((tr(value * modifier) + 2048 - 1) / 4096);
}

// Attack and defence stages -6..+6, applied to the raw stat before the damage formula.
const STAGE = [1, 1.5, 2, 2.5, 3, 3.5, 4];
function applyStage(stat: number, stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? Math.floor(stat * STAGE[s]) : Math.floor(stat / STAGE[-s]);
}

// Crit stage 1..4 means a 1-in-N chance, N = CRIT_DENOM[stage]; stage 4 always crits.
const CRIT_DENOM = [0, 24, 8, 2, 1];

interface Hit {
  level: number;
  basePower: number;
  attack: number;      // stage-adjusted attacking stat, from the caller
  defense: number;     // stage-adjusted defending stat, from the caller
  stab: boolean;       // attacker shares the move's type
  typeSteps: number;   // +n = n doublings (super effective), -n = n halvings (resisted), clamped by caller
  burnedPhysical: boolean;
}

interface Rolls {
  crit: boolean;       // already rolled by the caller with CRIT_DENOM
  randomStep: number;  // 0..15, damage is then 85..100 percent
}

function computeDamage(h: Hit, r: Rolls): number {
  if (h.basePower <= 0) return 0;
  // int(int(int(2 * L / 5 + 2) * P * A / D) / 50), then +2
  let dmg = tr(tr(tr(tr((2 * h.level) / 5 + 2) * h.basePower * h.attack) / h.defense) / 50);
  dmg += 2;
  if (r.crit) dmg = tr(dmg * 1.5);                       // crit multiplier (gen 6+ value)
  dmg = tr(tr(dmg * (100 - r.randomStep)) / 100);        // random factor, 85..100 percent
  if (h.stab) dmg = modify(dmg, 1.5);
  for (let i = 0; i < h.typeSteps; i++) dmg *= 2;
  for (let i = 0; i > h.typeSteps; i--) dmg = tr(dmg / 2);
  if (h.burnedPhysical) dmg = modify(dmg, 0.5);
  if (dmg === 0) return 1;                               // a landed attack does at least 1
  return tr16(dmg);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the engine damage step): parity-checklist row 1 (duel step / sim). The stage table, the crit ladder and the type steps are engine rules, so they sit in the duel step. Frankendom's current layout was not re-checked for this note.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed, shape taken, no lines copied)
- Brief rule served: 1 (one combat core, two clients); rule 5 (server-verified kills: the rolls come from the server seed)

Best transferable idea: a fixed integer damage order (base, +2, crit, a 85..100 roll, type steps, minimum 1) with crit as a ladder of stages, where every step is data and the server draws the rolls.
Decision (proposed): adapt — take the order, the crit ladder and the stage table as data; reject the 16-bit wrap and the unsigned truncation, which can turn a large hit into a small one, and reject the per-ability event hooks unless a zone needs them.
Acceptance: a server test: with a fixed seed, two identical hits at stage 0 deal the same integer; a stage-4 crit always crits; a resisted landed hit (one halving) is never 0; a hit whose result would exceed 65535 is clamped, not wrapped.

## 6. Gaps and risks

- MIT: adaptation allowed. The sketch re-expresses the order; no lines are copied.
- The 16-bit final truncation (battle-actions.ts 1828) and the unsigned `trunc` (dex.ts 367) can wrap a large value to a small one. Frankendom must clamp instead. The sketch keeps the wrap only to show the donor's behaviour; the acceptance test rejects it.
- Level scaling: the formula uses a level from 1 to 100. Frankendom has no levels in that sense yet, so the level term must be a zone or progression value (not read: how Frankendom's progression maps to it).
- Spread modifier: a multi-target hit takes 0.75 in doubles and 0.5 in free-for-all (1722). Frankendom's many-on-one fights (MAX_ATTACKERS = 3) can use a sweep as the spread case; the number is zone data, not an engine constant.
- Crit and random rolls: the donor draws them from its PRNG (battle.ts 2397 uses `this.random`, and the PRNG is prng.ts). Frankendom's kills are server-verified, so the rolls must come from the server seed; the PRNG's seeding was not read here.
- Events: all modifiers (abilities, items, weather, terrain) run through `runEvent`, which was not read. Frankendom's one-engine rule means these become data fields on the duel, not hooks; the event system is out of scope for this note.
- The donor's `target.damage()` clamps HP and reports the result (battle.ts 2141); not read here, so what the hit reports after clamping is (not read).
- Balance numbers (the 85..100 band, the 1.5 and 0.5 multipliers, the crit ladder) are the donor's game design. Frankendom must set its own values through the data fields and test them, not copy them.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** (1) Note: 'a landed attack that is 0 returns 1 from gen 6 (1825)'; code is 'gen !== 5 && !baseDamage' i.e. every gen except 5 (battle-actions.ts 1825). (2) Burn: note says halves physical unless Guts; code also exempts Facade from gen 6 (1803-1806). Verified OK: getDamage 1572, crit tables 1614/1618/1620, crit-ignores-stages 1673-1676, base formula 1705, +2 1718, spread 0.75/0.5 1722, bond 0.25/0.5, crit 1.5/2 1738, randomizer 100-random(16), STAB, type clamp -6..6 1784, 16-bit trunc 1828, modify() rounding, trunc = >>>0, stage table pokemon.ts 583-589, MIT.

**Missed:** Tera 60 BP floor and Stellar STAB (2x / 4915/4096) are in the file; sketch lists Tera/Stellar as omitted. Nothing else.
