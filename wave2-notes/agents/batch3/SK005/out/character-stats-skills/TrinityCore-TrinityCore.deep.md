# TrinityCore-TrinityCore (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/StatSystem.cpp` | Licence: GPL-2.0-or-later (per the file header: "either version 2 of the License, or (at your option) any later version"; the box's COPYING is GPL v2) | C++ | symbol `Player::UpdateStats`, `Unit::GetTotalStatValue`, `CalculateDiminishingReturns`, `Player::RegenerateHealth`, `Player::Regenerate`

Checked: Read in full: `Player::UpdateStats` (StatSystem.cpp 107-150), `GetHealthBonusFromStamina` and `UpdateMaxHealth` (285-327), `UpdateArmor` (255-283), `UpdateAttackPowerAndDamage` (354-377), `UpdateBlockPercentage` (490-504), `UpdateCritPercentage` (509-535), `CalculateDiminishingReturns` and the k and cap tables (596-698), `UpdateParryPercentage` and `UpdateDodgePercentage` (657-715), `UpdatePowerRegen` and `GetPowerRegen` (847-934). Read: `Unit::GetTotalStatValue` (Unit.cpp 9884-9897), `Player::Update` (Player.cpp 886-994, timer line only), `RegenerateAll`, `Regenerate`, `InterruptPowerRegen`, `RegenerateHealth` (Player.cpp 1560-1766), `GetDodgeFromAgility` (4998-5048, all commented out). Callers: `UpdateParryPercentage` and `UpdateDodgePercentage` are called from the all-stats pass (StatSystem.cpp 220-221); `InterruptPowerRegen` has one call site found by grep (Unit.cpp 6822, in `EnergizeBySpell`). Not read: the DB2 tables (stamina-to-HP ratio, class base mana, attack-power-per-stat, RegenPeace/RegenCombat, RegenInterruptTimeMS, ChrClasses AP coefficients) are loaded from client data not in this box; `GetRatingBonusValue` (Player.cpp 5139); the world config values behind `CONFIG_STATS_LIMITS_*`; the caller of `Player::Update`. Searched: "fatigue|encumbr" finds only the mirror (breath) timer, so there is no stamina economy or carry weight in this donor. Confidence: high on the order of steps and the regen and curve code (all read); medium on the in-combat regen branch, which I read but did not price. Donor is a WoW-style server (ratings, DB2 class tables); numbers below are the donor's own.

## 1. Mechanism

- Attribute pipeline. A stat change calls `Player::UpdateStats(stat)`. It takes the total from `Unit::GetTotalStatValue` (Unit.cpp 9884-9897): base is `base x basePct x totalPct`; the total part is `flat x (1 + statBonusPct) x totalPct`; the two are summed. Then it stores the integer stat, refreshes the buff mod, and cascades by a switch (StatSystem.cpp 124-143): agility recomputes crit for all types and dodge, plus melee and ranged attack power; stamina recomputes max health; intellect recomputes spell crit; strength recomputes melee attack power. Then armour, spell power and mana regen run.
- Max health. Flat base plus create health, times base pct, plus flat total plus `stamina x ratio`, times total pct (StatSystem.cpp 316-327). `ratio` comes from a per-level table; if the level has no row it falls back to 10 (288-294).
- Four chance stats, four shapes. Block is linear: 5 base, plus aura, plus rating, then a clamp (490-504). Parry and dodge use the soft-cap curve: `x' = c x / (x + c k)` (c = cap, k = per-class shape, x = rating chance), then the non-diminishing part is added outside the curve (616-634). Parry adds 5 plus aura as the non-diminishing part and is guarded by `cap > 0` (657-672). Dodge uses the same curve with no cap guard (699-710), and its agility term is commented out (Player.cpp 4998-5048). Melee crit is linear (flat + pct + rating) with a clamp only, no curve (509-535).
- Health regen runs on the player tick. `Player::Update(p_time)` adds the elapsed milliseconds to `m_regenTimer` (Player.cpp 994). `RegenerateAll` moves that into `m_regenTimerCount` and calls `RegenerateHealth` once per 2000 ms of accumulated time, but only when not in combat, or polymorphed, or `m_baseHealthRegen` is set, or an in-combat regen aura is present (1590-1594). Out of combat the per-tick amount is `0.015 x maxHP x rate` at level 15 and up, or `0.20 x maxHP / level x rate` below 15, then `x GetTotalAuraMultiplier(MOD_HEALTH_REGEN_PERCENT)` and `+ MOD_REGEN x 0.4` (1733-1735); in combat with the regen-during-combat aura it is the rate with that aura's percent applied (1738). Both branches are multiplied by 1.5 when not standing (1740-1741), and both then get the always-on additions `MOD_HEALTH_REGEN_IN_COMBAT` and `m_baseHealthRegen / 2.5` (1745-1746); a negative total returns (1748-1749); a polymorph fills a third of max HP per tick (1720). Then the fractional remainder is carried (1751-1759), except for a bug listed in section 6.
- Power regen is two numbers per power type: a "peace" rate and an "interrupted" rate (StatSystem.cpp 847-934). Interrupted means in combat, an interrupt-regen aura, or the power's `RegenInterruptTimeMS` window after an energize with the regen-interrupt flag (`InterruptPowerRegen` sets the timestamp and clears the fraction, Player.cpp 1696-1704). Inside the regen-interrupt window `GetPowerRegen` returns 0 outright (StatSystem.cpp 923-924), so the window term in its `interrupted` test (926-928) can never be true there; only the interrupt aura and combat select the interrupted rate. `UpdatePowerRegen` also has an early branch for `SPELL_AURA_PREVENT_REGENERATE_POWER` (about 856-862) that stops regen for the masked powers. Mana adds `basemana / 100` per second, times aura multipliers. Each frame, `Regenerate` computes `rate x 0.001 x elapsedMs + stored fraction`, applies the whole points, and stores the remainder (Player.cpp 1601-1670).

## 2. Key functions

- `Unit::GetTotalStatValue`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 9884-9897. The stat total formula.
- `Player::UpdateStats`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/StatSystem.cpp` 107-150. Cascade from one stat.
- `CalculateDiminishingReturns`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/StatSystem.cpp` 616-635. The soft-cap curve. Constants: k table 596-612, parry caps 638-655, dodge caps 680-698.
- `Player::UpdateParryPercentage` / `Player::UpdateDodgePercentage`: StatSystem.cpp 657-672 and 699-715.
- `Player::RegenerateAll` / `Player::Regenerate` / `Player::RegenerateHealth`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 1560-1598, 1601-1675, 1707-1766.
- `Player::UpdatePowerRegen` / `Player::GetPowerRegen`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/StatSystem.cpp` 847-934.

## 3. Numbers vs mechanism

The table is the catalogue view (SK focus): name | what it does | formula | number ranges | caps | file:line. The class coefficients and DB2 values are not in the donor; they are marked as such.

| Name | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Stat total (any attribute) | Final attribute value | (base x basePct x totalPct) + flat x (1 + statBonusPct) x totalPct | pct multipliers from auras and items (not read) | none in function | Unit.cpp:9884-9897 |
| Strength | Melee attack power | str x AttackPowerPerStrength + agi x AttackPowerPerAgility, each floored at 0 | per-class coefficients (DB2 ChrClasses, not in donor) | none in function | StatSystem.cpp:366-374 |
| Agility (ranged AP) | Ranged attack power | (level + agi) x RangedAttackPowerPerAgility | coefficient not in donor | none in function | StatSystem.cpp:377 |
| Agility (dodge) | Would add dodge from agility | commented out; only rating and aura count | (dead code) | n/a | Player.cpp:4998-5048 |
| Stamina | Max health | (flat + create) x basePct + flat x ... + stamina x ratio, then x totalPct | ratio per level from table; default 10 if no row | none in function | StatSystem.cpp:288-294, 316-327 |
| Armour from stat | Armour bonus from a stat | base armour + pct x stat (aura), then flat and pct totals | aura values (not read) | none in function | StatSystem.cpp:255-283, 266 |
| Block | Block chance | 5 + block aura + block rating (linear) | base 5 | clamp CONFIG_STATS_LIMITS_BLOCK (value not read) | StatSystem.cpp:490-504 |
| Parry | Parry chance | 5 + parry aura, plus curve(rating) with c = parry cap, k per class | c = 65.63 (warrior, paladin, DK, demon hunter), 145.56 (hunter, rogue, shaman), 90.64 (monk), 0 (priest, mage, warlock, druid, evoker, adventurer, traveler); k 0.956 to 1.0 | per-class c; clamp CONFIG_STATS_LIMITS_PARRY (not read) | StatSystem.cpp:638-672 |
| Dodge | Dodge chance | aura + curve(rating), c = dodge cap, k per class | c = 65.63 (warrior, paladin, DK), 116.89 (druid), 145.56 (hunter, rogue, shaman, monk, DH, evoker), 150.38 (priest, mage, warlock), 0 (adventurer, traveler); k 0.956 to 1.0 | clamp CONFIG_STATS_LIMITS_DODGE (not read); no cap>0 guard | StatSystem.cpp:680-715 |
| Melee crit | Crit chance | flat + pct + crit rating (linear) | none in function | clamp CONFIG_STATS_LIMITS_CRIT (not read) | StatSystem.cpp:509-535 |
| Health regen out of combat | HP per 2000 ms tick | level 15+: 0.015 x maxHP; below 15: 0.20 x maxHP / level; x rate; x aura pct (MOD_HEALTH_REGEN_PERCENT); + MOD_REGEN x 0.4; x1.5 if not standing (any branch); then + MOD_HEALTH_REGEN_IN_COMBAT + m_baseHealthRegen / 2.5 (always); call gate: not in combat, or polymorph, or base regen, or regen auras | per level (formula above) | none in function | Player.cpp:1729-1741 |
| Health regen in combat | HP per tick | only with a regen aura; base is the rate, then aura pct and `m_baseHealthRegen / 2.5` (in-combat branch not priced) | aura values (not read) | none | Player.cpp:1722-1746 |
| Mana regen | Mana per second | (peace or interrupted rate) + basemana / 100, times aura multipliers, times config rate | basemana per class per level (DB2/ObjectMgr, not in donor) | pool max | StatSystem.cpp:847-884; Player.cpp:1601-1625 |
| Regen interrupt | Pauses regen after energize | timestamp + RegenInterruptTimeMS; in combat or interrupt aura counts as interrupted | RegenInterruptTimeMS per power (DB2, not in donor) | none | Player.cpp:1696-1704; Unit.cpp:6822; StatSystem.cpp:926-930 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the stat total, the soft-cap curve (with a cap-zero guard the dodge path lacks), a health tick fed by a per-tick amount, and a per-frame power regen step. The health tick is corrected: it stores the sub-1 remainder even when the whole part is zero (the donor returns first, Player.cpp 1753-1759). It omits: the aura walk in UpdateStatBuffMod, the DB2 table lookups (ratio, basemana, RegenPeace/RegenCombat, RegenInterruptTimeMS), the peace/interrupted choice, the CenterPower drain branch, the in-combat aura branch, the polymorph branch, the haste TODO (StatSystem.cpp 853), the pet cascade, the config clamps, the rating-to-percent conversion (not read), and the 2000 ms accumulator (the sketch takes a per-tick amount instead).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface StatMods { base: number; basePct: number; flat: number; statBonusPct: number; totalPct: number; }

// Stat = (base * basePct) * totalPct + (flat * (1 + statBonusPct)) * totalPct
function statTotal(m: StatMods): number {
  const baseValue = m.base * m.basePct * m.totalPct;
  const totalValue = m.flat * (1 + m.statBonusPct) * m.totalPct;
  return baseValue + totalValue;
}

// Soft cap: x' = c*x / (x + c*k). Half the cap is reached at x = c*k. Flat part added after.
// Guard: a class with cap 0 has no rating path (donor only guards this for parry).
function softCapChance(cap: number, k: number, rating: number, flatPct: number): number {
  if (cap <= 0) return flatPct;
  const dr = rating > 0 ? (cap * rating) / (rating + cap * k) : 0;
  return flatPct + dr;
}

// Health: one tick per 2000 ms of accumulated time. The sub-1 remainder is carried in fraction.
interface HealthState { hp: number; maxHp: number; fraction: number; }
function healthTick(s: HealthState, perTickAmount: number): void {
  const add = perTickAmount + s.fraction;
  const whole = Math.trunc(add);
  s.fraction = add - whole; // stored even when whole is 0 (donor returns first and drops it)
  if (whole === 0) return;
  if (s.hp + whole < s.maxHp) { s.hp += whole; } else { s.hp = s.maxHp; s.fraction = 0; }
}

// Out of combat: 0.015 * maxHp per tick at level 15+, 0.20 * maxHp / level below 15; x1.5 when not standing.
function outOfCombatTick(maxHp: number, level: number, rate: number, standing: boolean): number {
  let amt = level < 15 ? (0.2 * maxHp / level) * rate : 0.015 * maxHp * rate;
  if (!standing) amt *= 1.5;
  return amt;
}

// Power: rate is per second, elapsed is the frame delta in ms (variable step). Fraction carried.
function powerRegen(cur: number, max: number, perSecond: number, elapsedMs: number, fraction: number):
  { value: number; fraction: number } {
  if (cur >= max) return { value: cur, fraction };
  const add = perSecond * 0.001 * elapsedMs + fraction;
  const whole = Math.trunc(add);
  const fits = cur + whole <= max;
  return { value: fits ? cur + whole : max, fraction: fits ? add - whole : 0 };
}
```

Checks on the sketch (run): typechecks with `tsc --noEmit --strict --target es2020` on the VPS (no errors). Hand-computed: `softCapChance(65.63144, 0.956, 10, 5)` = 5 + 9.022 = 14.02 (matches the donor curve for warrior parry at rating 10). A standing character at level 14 with 60 max HP: `outOfCombatTick` gives 0.857 per tick; the donor drops it forever, the sketch gives 1 HP on the second tick (4 s).

## 5. Lands in

- TARGET `src/fight/derived-stats.ts` (new, engine): stat totals, the soft-cap chance curve for parry and dodge, and the out-of-combat regen step. Derived values computed on the server once per change; the client only reads them.
- Parity-checklist row 21 (catalogue fields): the per-class k, caps and the regen rate fields become catalogue data, not constants. The per-tick call site belongs to the server tick (post-K item 3 sub-line: server tick: fixed step, input intake, per-tick NPC budget), not a row of its own.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape only).
- Brief rule served: 1 (one engine: derived stats computed in one place); rule 4 (server-verified) applies to where the value is computed; rules 7-9 n/a.

## 6. Gaps and risks

- Licence is GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect 1, health fraction dropped (Player.cpp 1751-1759): when `addValue` is below 1 HP, the function returns before `m_healthFraction` is stored, so the tick is lost and a per-tick rate under 1 HP never regenerates. Fix: store the remainder before the early return (the sketch does this). Real in TrinityCore's normal ranges only at low max HP or a rate below 1; it matters for a small-HP model. The power path does not have this bug (Player.cpp 1670 stores the fraction in both branches).
- Defect 2, dodge cap 0 (StatSystem.cpp 709, cap 0 for two class rows at 682-698): no `cap > 0` guard, so with rating 0 the curve computes 0/0 and returns NaN. Parry has the guard at line 662. Fix: guard like parry.
- Defect 3, agility-to-dodge is dead code (Player.cpp 4998-5048, body commented out). Agility gives no dodge in this donor. Fix for Frankendom: dexterity to dodge as a catalogue table, not code.
- Crit has a clamp but no soft cap; block is linear. Frankendom must pick one shape per chance stat and say why. Using the soft cap on parry and dodge only is the proposal.
- The `GetRatingBonusValue` conversion (Player.cpp 5139) and the config caps were not read. Frankendom has no rating items; do not copy rating or DB2 values.
- Ruling check: the mechanism is one function per stat total and one curve, which fits one-engine. The stance and guard economy (parity row 3) is not in these functions; the sitting multiplier (x1.5) is an out-of-combat posture, not a stance, and should be a state of the duel step, not the regen step.
- TODO left in the donor (StatSystem.cpp 853): haste changes do not refresh the regen flat modifier for some power types. Not copied.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: 1 (one engine computes derived stats once); rules 7-9 n/a

Best transferable idea: Derive each combat chance through one soft-capped curve with a per-class cap guard, and carry the fractional remainder of every per-tick regen so slow regen is exact over time.
Decision (proposed): adapt - the soft-cap curve for parry and dodge and the carried regen remainder fit the duel; the WoW rating tables, DB2 class numbers and the dead agility-dodge path do not.
Acceptance: A server test asserts parry at rating 10 with cap 65.63 and k 0.956 is 14.02 (5 + 9.02); a standing level-14 character with 60 max HP regains 1 HP on the second 2 s tick (4 s), never zero.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Out-of-combat regen formula and table row omitted RegenerateHealth terms: MOD_HEALTH_REGEN_PERCENT multiplier, MOD_REGEN x 0.4, the always-on MOD_HEALTH_REGEN_IN_COMBAT and m_baseHealthRegen/2.5, the x1.5 not-standing test on both branches, and the RegenerateAll call gate (Player.cpp 1590-1594). Confirmed (1722-1749).
- GetPowerRegen's window term in `interrupted` is unreachable because the window already returned 0 (923-924). Confirmed.
- Missed: UpdatePowerRegen SPELL_AURA_PREVENT_REGENERATE_POWER early branch; now in the mechanism line.
Fixed 2026-10-12: regen mechanism bullet, table row and the unreachable-term remark. Sketch unchanged (it takes a per-tick amount and already omits the aura branches).

