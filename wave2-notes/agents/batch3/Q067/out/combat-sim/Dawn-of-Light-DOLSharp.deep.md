# Dawn-of-Light-DOLSharp (combat-sim, cell 3)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameLiving.cs` | Licence: GPL-2.0 (`LICENSE` is GNU GPL Version 2, June 1991; per-file header in `gplheader.txt`) | C# | symbol `CalculateEnemyAttackResult` (damage in `MakeAttack` 1615)

Checked: The hint was "INFERRED", so I searched for melee damage and found `GameLiving.cs`. Read: 860-1050 (attack speed, `AttackDamage`, `UnstyledDamageCap`, `GetArmorAbsorb`, `GetWeaponSkill`), 1609-1619 (`MakeAttack` overloads), 1700-1850 (damage and crit path), 3200-3250 (crit), 3267-3300, 3400-3545, 3600-3680, 3680-3800 (bladeturn), 3810-3891 (parry), 3893-3945 (block, to the miss-chance line), 6436-6446 (`GamePlayer` crit override, first lines only), `Util.cs` 198-204. Not read: `GameLiving.cs` 3300-3400 (effect loop and bodyguard), 3546-3599 (dashing tail), 3800-3809, 3946 to the end of `TryBlock`, the rest of the `GamePlayer` crit override, how `CriticalDamage` is added to the total, and the default values of `MISSRATE_REDUCTION_PER_ATTACKERS`, `EVADE_CAP` and `PARRY_CAP` (only their declarations were grepped, `serverproperty/ServerProperties.cs` 932-1919). Confidence: high on the order of the defence rolls and the damage arithmetic (read in code order); medium on the parts above that were not read. Depth thin. Camera: not applicable.

## 1. Mechanism

Order of operations for one melee swing against one defender, as the code runs:

1. Target checks, then the attack result is decided by `CalculateEnemyAttackResult` (`GameLiving.cs` 1719). The file's own comment gives the intended order: "Intercept, Evade, Parry, Block (Shield), Guard, Hit/Miss, and then Bladeturn" (3273). The code follows that order.
2. Special defences first (3279-3287 read as declarations; the bodyguard and the effect loop were not read): phase shift gives Missed (3412-3413), grapple gives Grappled (3415-3416), brittle guard gives Missed (3418-3426), intercept redirects the hit to the interceptor and returns HitUnstyled (3428-3434).
3. Defences are skipped when the defender is mezzed, stunned or sitting (3290, 3443). Otherwise:
   - Evade (3445-3448; `TryEvade` 3736-3796). The chance is the defender's raw evade value, and the 0.03 damping, 0.001 scale, con term, floor and cap are applied only when that value is above zero (3770). A player with Advanced Evade (or Combat Awareness, or Rune of Utter Agility) gets it directly (3756-3759). Other players need the attacker in front (180 degrees) plus an evade buff or the Evade ability (3760-3764). NPCs need the attacker in front (180 degrees) (3767-3768). It is reduced by 0.03 per extra attacker in raw units (3772-3773), scaled by 0.001 (3775), then gets 0.01 times the attacker con term (3776; the term is `-GetConLevel`, 3438). A ranged attack divides by 5 (3783-3784). Floor 0.01 (3786-3787). Cap: `EVADE_CAP` for player against player, else 0.995 (3788-3791). Dual wield subtracts 0.25 with a floor of 0 (3793-3795).
   - Parry, melee only (3450-3456; `TryParry` 3810-3891). Base is the raw parry value when the defender has the Parry spec or a parry buff, has a weapon, and the attacker is in front (120 degrees) (3850-3857). A BladeBarrier gives 0.90 and skips the rest (3846-3849, 3860-3863). Overwhelm lowers the parry chance afterwards (3884-3888). With more than one attacker the raw value is divided by `attackerCount / 2` in integer division (3866-3867). Then scaled by 0.001 (3869), then 0.05 times the con term added (3870). Floor 0.01, cap `PARRY_CAP` (RvR) or 0.995 (3872-3877). All of this runs only when the parry value is above zero and the defender is not stunned or sitting (3864); a defender without the spec or buff has a chance of exactly 0, not 0.01.
   - Block (3458-3463; `TryBlock` 3893-3945). A player needs the Shield ability, a shield in the left hand, and the attacker in front (120 degrees) (3921-3928). Raw chance = block stat x shield quality x 0.01 (3927). If the defender is a player and attackers exceed the shield size (small 1, medium 2, large 3, `Type_Damage`), the chance is multiplied by `shieldSize / attackerCount` in integer division, which is 0 once attackers exceed the shield size (3942-3943). Then scaled by 0.001 (3945), plus 0.05 times the con term (3949), floored at 0.01, capped by `BLOCK_CAP` when an attacker player is involved (3953-3954), or by 0.8, 0.9 or 0.99 for small, medium or large shields when an NPC attacks (3955-3960). So a zeroed shield factor leaves the block at the 0.01 floor (or the con term), not at 0.
4. Guard and dashing defence (3468-3545): a shielded guard with its own chance formula, floor 0.01, cap 0.6 against players (3502-3505), and halved for dual wield (3513). Only the first part was read.
5. Miss roll (3600-3678). Base 20 when the attacker is a player, else 25 (3601). Less the attacker's ToHitBonus (3602). NPC level modifiers (3604-3613). Less `MISSRATE_REDUCTION_PER_ATTACKERS` times (attackers - 1) unless it is player against player (3617-3619). Armour and weapon bonuses (3622-3644). Style bonus (3645-3648). Sitting halves it (3671-3673). Then `Util.Chance(missrate)` (3676). The miss rate also has a group branch for a grouped player attacking an NPC (3604-3610). After the miss roll the result still checks `IsRandomFumble` (Fumbled) and `IsRandomMiss` (Missed) at 3681-3685, before the bladeturn. `Util.Chance` is a percent compare: `chancePercent >= Random(1, 100)` (`Util.cs` 200-203).
6. Bladeturn (3701-3725) after a hit. A melee hit penetrates when `!Util.ChanceDouble(caster level / attacker level)` (3713-3714). Otherwise the bladeturn absorbs the blow and the result is Missed (3721-3726).
7. Damage on a hit (1719-1844). Base `damage = AttackDamage(weapon) * effectiveness` (1725). `AttackDamage` is `(1 + Level/3.7 + Level^2/175) * AttackSpeed * 0.001`, times `1 + MeleeDamage%` for melee (870-897). `AttackSpeed` is floored at 500 (863). NPCs above a start level get a per-level add (1727-1734; the gate is the mob-only test at 1729-1730). Armour: `damage *= (WeaponSkill + 90.68) / (targetAF + 20*4.67)` (1773). `WeaponSkill = (int)((Level+1) * 2.56 * (1 + (weapon stat-50)*0.005) * Level * 2 / 50)`, where the weapon stat comes from `GetWeaponStat(weapon)`, not always Str (1041-1044). Absorb: `damage *= 1 - min(0.85, absorb)` (1782), where absorb is `1 - (1-bonus)(1-baseByLevel)(1-con)(1-AFbuff)` with base 0.27, 0.19 or 0.10 at level 30, 20 or 10 (1006-1035). A Badge of Valor inverts it (1776-1778). Random band: `lowerboundary` = clamp((spec level - 1) * 50 / (target level + 1) + 75, 75, 125) (1770-1772), then `damage *= (lowerboundary + Random(50)) * 0.01` (1784); `Util.Random(max)` is `Next(max + 1)` (`Util.cs` 167-170), so the add is 0 to 50 inclusive. Resists are subtracted (1785-1797). Truncate to int (1798). Cap: `min(damage, (int)(UnstyledDamageCap * effectiveness))` where `UnstyledDamageCap` is `AttackDamage * (2.82 + 0.00009 * AttackSpeed)` (1802, 908). PvP and PvE melee multipliers (1804-1811). A zero hit becomes 1 (1832-1834).
8. Crit (1852-1854; `GetMeleeCriticalDamage` 3220-3234). On a hit, `Util.Chance(AttackCriticalChance)`. If it passes, the crit is a random value from 10% of damage (`MinMeleeCriticalDamage` 0.1, 3211, 3228) to the damage, halved when the target is a player (3224-3226, 3230). The `GamePlayer` override returns 0 when the target has triple wield (6441). How the crit is added to the total was not read.

Two things in the code are integer effects, not the comments' intent. The parry divisor `attackerCount / 2` is an integer, so 2 or 3 attackers both divide by 1 (3866-3867). The block factor `shieldSize / attackerCount` is an integer, so it is 0 once attackers exceed the shield size (3943); the 0.01 floor then still applies. See section 6.

## 2. Key functions

- `CalculateEnemyAttackResult`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameLiving.cs` 3267-3733 (read through 3733 as the return, with 3300-3400 not read). Defence order and miss roll.
- `TryEvade`: `.../GameLiving.cs` 3736-3796. Evade chance and attacker damping.
- `TryParry`: `.../GameLiving.cs` 3810-3891. Parry chance and integer divisor.
- `TryBlock`: `.../GameLiving.cs` 3893-3945 (to the scaling line; the end not read). Block chance and integer shield factor.
- `MakeAttack` (7-argument overload): `.../GameLiving.cs` 1615 onwards. Damage on hit, cap, crit assignment (1719-1854).
- `AttackDamage`, `UnstyledDamageCap`, `GetArmorAbsorb`, `GetWeaponSkill`: `.../GameLiving.cs` 870-899, 906-909, 1006-1036, 1041-1045.
- `GetMeleeCriticalDamage`: `.../GameLiving.cs` 3220-3234; `GamePlayer` override `.../GamePlayer.cs` 6436-6441.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed order of defence rolls: evade, parry, block, guard, then miss | Order is in the comment (3273) and the code (3445-3676) |
| Each defence chance = raw stat x 0.001 + 0.05 or 0.01 times a con term, floored and capped | Floors 0.01, cap 0.995, RvR caps `EVADE_CAP` and `PARRY_CAP` (values not read); con factors 0.01 (evade), 0.05 (parry) |
| Damping per extra attacker | Evade: 0.03 raw per extra attacker (3773), negligible after scaling. Parry: divide by `attackers/2` (3867). Block: factor `shield/attackers` (3943). Miss: `MISSRATE_REDUCTION_PER_ATTACKERS` (value not read) |
| Miss roll | Base 20 (player attacker) or 25 (3601) |
| Damage = base x (weapon skill + 90.68) / (AF + 93.4) x (1 - min(0.85, absorb)) x band | 90.68 and 20*4.67 (1773); absorb cap 0.85 (1782); band 75-125 base, plus 0-50 inclusive (1770-1784) |
| Weapon skill | 2.56 (`bs`, 1043); 50 (weapon-stat offset), 0.005 per point (1044) |
| Absorb by level | 0.27 at 30, 0.19 at 20, 0.10 at 10 (1030-1032); AF buff cap 150*1.25*1.25 (1024) |
| Attack speed floor | 500 ms (863) |
| Damage cap | `AttackDamage * (2.82 + 0.00009 * AttackSpeed)` (908), times effectiveness (1802) |
| Crit | Min 0.1 of damage (3211); max halved vs players (3225) |
| Bladeturn | Penetrate when `!ChanceDouble(caster level / attacker level)` (3713) |

## 4. TypeScript sketch

simplified: the sketch keeps the defence order (evade, parry, block, miss), the per-defence damping as written (including the two integer divisions), and the damage arithmetic (weapon skill over armour factor, absorb with its 0.85 cap, the random band, and the cap). It follows the donor gates: a defence chance is 0 unless the defender has the ability and the attacker is in the arc (the caller passes 0 raw for evade, parry or block when not), and the scaling, con term, floor and cap apply only when the raw value is above zero. Block uses the 0.05 con term, the 0.01 floor and a cap passed in (`BLOCK_CAP`, not read; the NPC-attacker shield caps are omitted). It omits: the random fumble and random miss checks, the grouped-player miss bonus, the special defences (phase shift, grapple, brittle guard, intercept, bodyguard), the guard and dashing defence, the sitting and stun gates, the style bonuses, the ranged evade divisor, the dual-wield penalties, the bladeturn, the NPC level increase, the resists, the PvP and PvE multipliers, the 1-damage floor, and the crit. The `rng` stands in for `Util.Chance`, which is a percent compare on an int (`Util.cs` 203). The evade, parry and block rolls use the raw stat and the con term as the donor adds them.

```ts
// Licence: GPL-2.0 (donor LICENSE, GNU GPL v2). Clean-room sketch of the shape only; not a translation.

type Result = "Evaded" | "Parried" | "Blocked" | "Missed" | "Hit";

interface Defender {
  evadeRaw: number;      // defence stat, raw units (scaled by 0.001 below); 0 when the defender lacks the ability or the attacker is outside the arc
  parryRaw: number;      // 0 when the defender has no Parry spec or buff, no weapon, or the attacker is outside the arc
  conLevel: number;      // the donor passes -GetConLevel(attacker) (3438); sign convention not read
  blockRaw: number;      // block stat times shield quality factor, raw units; 0 when no shield or the attacker is outside the arc
  shieldSize: number;    // 1 small, 2 medium, 3 large
  isPlayer: boolean;
}

interface Strike {
  melee: boolean;
  attackers: number;     // enemies currently attacking this defender
  attackerIsPlayer: boolean;
  toHitBonus: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// Defences are tried in order. Each returns a chance from 0 to 1; rng() decides.
function resolveSwing(d: Defender, s: Strike, rng: () => number, missReductionPerAttacker: number, blockCap: number): Result {
  const extra = Math.max(0, s.attackers - 1);

  // 1. Evade: many-attacker penalty is 0.03 in raw units, which is 0.00003 after scaling.
  // The donor applies scaling, con term, floor and cap only when the raw value is above zero (3770).
  if (d.evadeRaw > 0) {
    let evade = d.evadeRaw - extra * 0.03;
    evade = evade * 0.001 + 0.01 * d.conLevel;
    evade = clamp(evade, 0.01, 0.995);
    if (rng() < evade) return "Evaded";
  }

  // 2. Parry (melee only). Divisor is attackers / 2 in integer division, floor 1.
  if (s.melee && d.parryRaw > 0) {
    let parry = d.parryRaw;
    if (s.attackers > 1) parry /= Math.max(1, Math.trunc(s.attackers / 2));
    parry = parry * 0.001 + 0.05 * d.conLevel;
    parry = clamp(parry, 0.01, 0.995);
    if (rng() < parry) return "Parried";
  }

  // 3. Block (shield). Once attackers exceed shield size the factor is an integer 0, but the con term and the 0.01 floor still apply.
  if (d.blockRaw > 0) {
    let block = d.blockRaw;
    if (d.isPlayer && s.attackers > d.shieldSize) block *= Math.trunc(d.shieldSize / s.attackers);
    block = block * 0.001 + 0.05 * d.conLevel;
    block = clamp(block, 0.01, blockCap);
    if (rng() < block) return "Blocked";
  }

  // 4. Miss roll, percent. Starts at 20 (player attacker) or 25, reduced per extra attacker in PvE.
  let missPct = (s.attackerIsPlayer ? 20 : 25) - s.toHitBonus;
  if (!(d.isPlayer && s.attackerIsPlayer)) missPct -= extra * missReductionPerAttacker;
  if (rng() * 100 < missPct) return "Missed";

  return "Hit";
}

// Damage on a hit: weapon skill against armour factor, absorb capped at 0.85, a random band, then the cap.
// `cap` is UnstyledDamageCap times effectiveness in the donor (1802).
function hitDamage(raw: number, weaponSkill: number, armourFactor: number, absorb: number, bandLow: number, cap: number): number {
  let dmg = raw * (weaponSkill + 90.68) / (armourFactor + 20 * 4.67);
  dmg *= 1 - Math.min(0.85, absorb);
  dmg *= (bandLow + Math.floor(Math.random() * 51)) * 0.01;   // bandLow in percent; donor Util.Random(50) is 0..50 inclusive
  return Math.min(Math.trunc(dmg), Math.trunc(cap));
}
export { resolveSwing, hitDamage };
```

## 5. Lands in

- TARGET `src/fight/resolve.ts` (the duel step's swing resolution: defence order, then the damage formula, one result per swing). Parity-checklist row 1 (duel step / sim). The defence chances and the many-attacker dampers also bear on row 3 (guard / parry / stamina) and on the MAX_ATTACKERS = 3 rule, but the row named here is 1.
- Reuse tag: adapt-from-idea (GPL-2.0: clean-room, shape only; the sketch is clean-room)
- Brief rule served: 1 (one combat core, two clients)

## 6. Gaps and risks

- Under Frankendom's MAX_ATTACKERS = 3, the donor's integer divisors make 2 and 3 attackers behave the same for parry (divisor 1 at 3866-3867) and set the shield factor to 0 at 2 or more attackers against a small shield (1) and at 3 or more against a medium one (2) (3943), which leaves the block at the 0.01 floor (3949-3952) rather than at 0. Those are donor choices. Frankendom must pick the values it wants and test them, not inherit the quirk.
- The evade attacker damping is 0.03 raw units (3773), which is 0.00003 after scaling (3775). It is numerically negligible as written, so it is not a real many-on-one rule in the donor. Frankendom should not copy it as a model.
- All defence and miss chances are rolls per swing with `rng`, and the donor decides them in the swing's own call. Frankendom's rules are server-verified kills and a server tick: the roll must be on the server, once per swing, with a seeded or logged source.
- The `ad.Damage` read at 1793 happens before 1798 assigns it (no assignment in the lines read, 1719-1792). The value used in that line was not traced, so the second resist term is not established here.
- RvR caps (`EVADE_CAP`, `PARRY_CAP`), `MISSRATE_REDUCTION_PER_ATTACKERS` and the crit add-in were not read. Their values and how crit joins the total are open.
- Zones as data: the base 20/25 miss, the 0.85 absorb cap, the 0.1 crit floor and the 90.68 and 93.4 terms are donor constants. In Frankendom they are engine constants for the shape, and the per-character stats are the data fields.
- The donor is GPL-2.0. Only the shape is taken, written clean-room.

Best transferable idea: each defence (evade, parry, block) is a separate roll in a fixed order, and each is damped by how many enemies attack the defender, though the donor's damping is integer-divided and partly negligible.
Decision (proposed): adapt - keep the fixed roll order and the per-defence damping as data, but set the values deliberately for MAX_ATTACKERS = 3 instead of copying the integer divisions, which make 2 and 3 attackers identical for parry and drop the block to the 1 percent floor for small shields at 2 attackers.
Acceptance: a server test with 3 attackers on one defender gives the designed parry and block values (not the 1 percent floor for a small shield), and a swing resolves in the fixed order evade, parry, block, miss with one roll each.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) Random band: `damage *= (lowerboundary + Util.Random(50)) * 0.01` (GameLiving.cs 1784) and Util.Random(max) = RandomGen.Next(max+1) (Util.cs 167-170) so the add is 0..50 INCLUSIVE; note says 'plus 0-49' and sketch uses floor(random*50). (2) Sketch deviates from donor on defence gates, undisclosed in its omit list: evade only runs if the defender has Advanced Evade/buff/ability and attacker is in the 180 deg front arc (3756-3768) and the 0.01 floor / con term apply only when evadeChance>0 (3770-3792); parry needs Parry spec or buff + weapon + 120 deg arc (3850-3857), floor only when >0 (3864-3878); sketch gives every defender a >=1% evade and parry and applies the con term to a zero chance. Block (3946-3960) does have con term 0.05, 0.01 floor and BLOCK_CAP, which the note says it did not read and the sketch omits. (3) Cap is `(int)(UnstyledDamageCap(weapon) * effectiveness)` (1802), note shows cap without the effectiveness factor. (4) GetWeaponSkill uses GetWeaponStat(weapon) not Str (1044). Verified OK: defence order comment 3273 and code 3445-3463, defenseDisabled 3290, intercept/phase/grapple/brittle 3412-3434, evade numbers 0.03/0.001/0.01/5/0.995/-0.25 (3773-3795), parry integer divisor attackerCount/2 (3867), 0.05 con (3870), BladeBarrier 0.90, block shieldSize/attackerCount integer (3943), guard cap 0.6 and halving (3504, 3513), miss 20/25 (3601), toHit (3602), sitting >>1 (3673), Chance = >= Random(1,100) (Util.cs 202), bladeturn 3713, absorb tiers and cap 0.85 (1030-1032, 1782), AF 90.68/93.4 (1773), lowerboundary (1770-1772), damage cap 2.82+0.00009*speed (908), speed floor 500 (863), crit 3220-3234 and GamePlayer triple-wield (6441), ad.Damage-before-assign observation (1793) is correct.

**Missed:** After the miss roll the code still checks ad.IsRandomFumble -> Fumbled and ad.IsRandomMiss -> Missed (3681-3685) before bladeturn; not in note's order of operations. Miss roll also has an Attackers-based group bonus branch for grouped players (3604-3610).
