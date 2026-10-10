# jynew-jynew (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/LuaScripts/Jyx2Battle/DamageCaculator.lua` | Licence: file header says MIT, but the top-level `LICENSE` says code and resources are not permitted without authorisation (unclear, treated as restricted) | Lua (called from C#) | symbol `damage.GetSkillResult`

Checked: `damage.GetSkillResult` read in full (lines 149-285); the ordinary-attack branch (DamageType 0, lines 157-240) read end to end. Also read: the C# caller `BattleLoop.cs` 255-290, result application `AIResult.cs` 154-176, the hurt lines 237-238, and the distance helper `BattleBlockVector.cs` 43-52. Hinted file `AttackInfoText.prefab` not read (the list's hint; not the damage mechanism). Not read: `GetTotalWuXueChangShi`, `GetExtraAttack`, `GetWeaponProperty`, `GetSkillLevelInfo`, `calMaxLevelIndexByMP`, the values of `MAX_HURT` and `MAX_ROLE_ATK_POISON` (GameSettings), how `rst.poison` is applied in `AIResult.Run`, and the enclosing block of `AIResult.cs` 237 (confirmed only from its closing braces). Other callers (`XiakeUIPanel.cs` 496 and 531, `AIManager.lua` 760) found by grep only. Confidence high on the order of the basic-attack steps and the numbers; medium on how poison is applied.

## 1. Mechanism

- One pure-ish function computes the result of one attacker hitting one target. The C# battle loop calls it once per living target in the skill's cover blocks (`BattleLoop.cs` 255-279), then `result.Run()` applies it. Callers for all uses: `BattleLoop.cs:265` (read); `XiakeUIPanel.cs:496,531` and `AIManager.lua:760` (grep only, purpose not read).
- The function branches on skill type. This note covers type 0 (ordinary attack). Types 1-5 (inner-energy drain, poison, detox, heal, hidden weapon) share the function but are not described here.
- Type 0, order of steps:
  (a) Out of energy: if the attacker's Mp is at or below the skill's MpCost, return damage `1 + rnd(0..9)` and stop (165-168). No injury, no poison.
  (b) Attack total: `((Attack - weapon - armour) * 3 + skill level attack) // 2 + weapon + armour + extra(skill) + team wuxue` (171). Defence total: `Defence + team wuxue of the target` (174).
  (c) Main formula: `v = (attack - defence*3) * 2 // 3 + rnd(0..19) - rnd(0..19)` (177). Lua `//` is floor division. The two random terms are a difference of two uniform integers, so the noise runs -19..19. This is not a hit roll: nothing can miss.
  (d) Chip rule: if v <= 0, `v = attack // 10 + rnd(0..3) - rnd(0..3)` (181-183).
  (e) If v is still <= 0, v = 0 and the bonuses are skipped. Otherwise (this includes chip damage) v += attacker stamina (Tili) // 15 + target injury (Hurt) // 20 (187-194).
  (f) Distance: grid distance is Manhattan, `|dx| + |dy|` (BattleBlockVector.cs 48-52). For RECT and RHOMBUS area covers the cover block's distance to the target is added (199-202). If dist <= 10: `v = v * (100 - (dist-1)*3) // 100`, which is 100% at 1 step and 73% at 10 (209-211). Otherwise `v = v * 2 // 3` (213-214).
  (g) Floor: if v < 1 then v = 1 (218-219). A basic attack that reaches this point always deals at least 1.
  (h) Outputs: `rst.damage = v` (222); injury gain `rst.hurt = v // 10` (225). Poison: `add = level_index * skill Poison + attacker AttackPoison` (229). It is applied only if `AntiPoison <= add` and `AntiPoison <= 90` (234), with amount `Limit(add // 15, 0, MAX_ROLE_ATK_POISON)` (236).
- Application (`AIResult.cs`): if damage > 0, target `Hp -= damage` (159); attacker `ExpGot += 2 + damage / 5` (166); if target Hp <= 0, attacker `ExpGot += target Level * 10` (168-169). Injury: `target Hurt += rst.hurt` (237), clamped to 0..MAX_HURT (238).
- No hit roll, no miss, no crit in this function. The "MISS" label shows only when the displayed damage is <= 0 (`BattleRole.cs` 177-187, grep only). A comment at `BattleRole.cs` 176 says there is no MISS in this logic.

## 2. Key functions

- `damage.GetSkillResult`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/LuaScripts/Jyx2Battle/DamageCaculator.lua` 149-285. The basic-attack branch is 157-240.
- Attack and defence totals: same file, 171-174.
- Main formula, chip rule, bonuses: same file, 177-194.
- Distance falloff and minimum: same file, 209-219. Distance helper: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameBattle/BattleBlockVector.cs` 43-52.
- Result application: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameBattle/AIResult.cs` 154-176 (Run), 237-238 (injury).
- Caller: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameBattle/BattleLoop.cs` 255-279.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Net attack minus scaled defence, scaled by 2/3, plus symmetric noise | defence multiplier 3; scale 2/3; noise is rnd(0..19) minus rnd(0..19) (177) |
| Chip damage when the main result is not positive | attack // 10; noise rnd(0..3) minus rnd(0..3) (183) |
| Bonuses on any positive hit (including chip) | attacker stamina // 15; target injury // 20 (194) |
| Grid distance falloff | cut at distance 10; 3 percentage points per step, starting at 100% at 1 step; beyond 10, factor 2/3 (209-214) |
| Minimum damage | 1 (218) |
| Injury gained by target | damage // 10 (225) |
| Poison gate and amount | apply if target AntiPoison <= level and <= 90; amount level // 15, clamped to MAX_ROLE_ATK_POISON (value not read) (234-236) |
| Out-of-energy hit | 1 + rnd(0..9) (167) |
| Kill reward | attacker ExpGot += target Level * 10 (169) |

## 4. TypeScript sketch

simplified: the sketch keeps the ordinary-attack steps in donor order (energy check, main formula, chip rule, bonuses, distance falloff, minimum 1) and takes the attack and defence totals already computed. It omits the area-cover distance addition, the poison result, the injury cap, the XP and kill reward, the inner-energy and other skill types, and the team-wuxue and weapon/armour terms (they sit inside the input totals). It does not reorder anything. The RNG is `Math.random` for the sketch only; a server needs a seeded RNG.

```ts
// Licence: restricted (donor header says MIT; top-level LICENSE does not permit use). Clean-room sketch of the described shape, not a translation.
// clean-room
export interface Fighter {
  attack: number;   // total attack after weapon, armour, skill and team terms
  defence: number;  // total defence after armour and team terms
  stamina: number;  // used in the positive-hit bonus
  injury: number;   // accumulated injury (0..max)
  energy: number;   // inner energy now
}

export interface BasicHit { damage: number; injuryGain: number; }

// Integer floor division, like Lua's // operator.
const fdiv = (a: number, b: number): number => Math.floor(a / b);

// Uniform integer in [lo, hi], inclusive.
const randInt = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));

export function resolveBasicHit(a: Fighter, d: Fighter, gridDistance: number, energyCost: number): BasicHit {
  // Out of energy: a weak hit with no injury.
  if (a.energy <= energyCost) return { damage: 1 + randInt(0, 9), injuryGain: 0 };

  // Main formula, then the chip rule when it is not positive.
  let v = fdiv((a.attack - d.defence * 3) * 2, 3) + randInt(0, 19) - randInt(0, 19);
  if (v <= 0) v = fdiv(a.attack, 10) + randInt(0, 3) - randInt(0, 3);

  // Only a positive hit gets the stamina and injury bonuses.
  if (v <= 0) v = 0;
  else v = v + fdiv(a.stamina, 15) + fdiv(d.injury, 20);

  // Distance falloff: 100% at 1 step, -3 points per step up to 10 steps; beyond 10 steps, 2/3.
  v = gridDistance <= 10 ? fdiv(v * (100 - (gridDistance - 1) * 3), 100) : fdiv(v * 2, 3);

  // Minimum damage of one.
  if (v < 1) v = 1;

  return { damage: v, injuryGain: fdiv(v, 10) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/q069-jynew-basic-hit.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step, the one place health changes). Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room shape only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Licence unclear: the file header says MIT; the top-level `LICENSE` says the code and resources may not be used without authorisation. Clean-room only, shape not text.
- Grid distance is a turn-based cell count. Frankendom duels are real time, so the falloff only transfers if we define a duel range band. Do not port cells.
- One engine, server-verified kills: the donor runs this in the client battle loop and applies it directly (`AIResult.cs` 159). Frankendom must run it on the server; the client never sends a damage number.
- One ledger: XP and the kill reward are inside `Run()` (`AIResult.cs` 166-169). Keep the XP award on the row 18 path, not in the damage step.
- No hit roll or guard: this function has no miss, dodge or block. Guard and parry must resolve in the duel step (row 3) before damage; a parried hit should never reach `resolveBasicHit`.
- Many-on-one: this resolves one attacker against one target; the caller loops over cover blocks. MAX_ATTACKERS = 3 must be enforced by the engine, not here.
- The donor has a console god-mode flag (`Jyx2Console.cs` 80) that resets team-0 HP inside `Run` (`AIResult.cs` 172-174). Do not port it.
- Per-turn poison and passive injury bleed are not in this file (its header says so). `RunPosionHurtLogic` in `BattleLoop.cs` 112-125 was only grep-read.
- Chance and noise come from `Math.random` style RNG in the donor. Frankendom needs a seeded server RNG so a fight can be replayed (row 19).
- All constants are global, not per zone. To be zone-tunable they become data fields with these defaults.

Best transferable idea: a two-pass damage formula (main result, then a chip floor, then a minimum of 1) lets a weak hit always do something without a miss roll.
Decision (proposed): adapt - keep the main formula with a chip floor, positive-hit bonuses and minimum 1 damage; change the grid falloff to a duel range band, move the roll to a seeded server RNG, and put guard/parry before damage.
Acceptance: a server test with noise forced to 0 asserts attack 40 vs defence 10 deals 6, attack 20 vs defence 20 deals 2 (chip), and attack 0 vs defence 0 deals 1 (minimum); a parried hit never reaches the damage step.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** none found; every line number and formula in the type-0 branch (165-240), Manhattan distance, AIResult.Run exp/hurt, licence conflict (MIT header vs LICENSE) match exactly

**Missed:** calMaxLevelIndexByMP makes level_index depend on current MP (line 155) which affects poison add; note lists it as not read; AIResult.cs 172-175 god-mode Whosyourdad
