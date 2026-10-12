# WarEmu-WarEmu (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Interfaces/StatsInterface.cs` (C#; also `World/Objects/Unit.cs`, `World/Interfaces/CombatInterface.cs`, `World/Interfaces/ItemsInterface.cs`, `Managers/CharMgr.cs`, `World/Objects/Creature.cs`, `World/Objects/Player.cs`, `World/Abilities/Ability.cs`, `World/Abilities/AbilityInterface.cs`, `World/Abilities/Handlers/Entries/FleeAbilityHandler.cs`, `World/Abilities/Handlers/DealDamagesHandler.cs`, `Common/Database/GameData.cs`, `Common/Database/World/Characters/CharacterInfo_stats.cs`) | Licence: GPL-2.0-or-later as read in the one header I opened (`Common/Database/World/Characters/CharacterInfo_stats.cs` 3-16: "either version 2 of the License, or (at your option) any later version"). No LICENSE file at the repo root (checked to depth 2) and the files I read in WorldServer have no header. Treat as copyleft: clean-room | C# | symbols `StatsInterface.CalculDamage`, `StatsInterface.CalculReduce`, `Unit.Strike`, `Unit.UpdateActionPoints`, `CharMgr.GetCharacterInfoStats`

Checked: Read in full: `StatsInterface.cs` (188 lines), `Unit.cs` 290-384 (AP and HP regen, Strike), `CombatInterface.cs` 66-200 (player and AI melee loop, fighting state), `ItemsInterface.cs` 228-315 (cooldown, attack time, damage, armour, equip), `Creature.cs` 55-95 (wounds), `CharMgr.cs` 110-186 (stat rows, gap fill, cache keys), `Player.cs` 572-600 (level-up stat diff), `DealDamagesHandler.cs` 142-157, `Ability.cs` 117-130, `AbilityInterface.cs` 239-249, `FleeAbilityHandler.cs` 60-68, `GameData.cs` 307-326 (Stats enum). Confidence: high for the AP pool, swing gate and reduction formula (read end to end, with call sites). Medium for the damage formula units: the `Dps` and `Speed` item units come from the item table, which is not in the repo (not read). Not read: the stat-row data itself (DB; no SQL in the repo), the `DealDamages` body, the bonus-type handlers (`BONUSTYPES_*`), the parry/block/evade code (declared, not implemented in the read path), the full `Item_Info` loader. Camera: not applicable. camera_scope: not applicable.

Best transferable idea: a stamina economy as one capped pool (250) that regenerates in fixed steps, is spent per ability at cast time with a plain "cost <= pool" gate, pauses its regen while a global cooldown is active, and is zeroed by flee with a long regen lockout.
Decision (proposed): adapt - take the action-point pool as Frankendom's stamina shape (cap, fixed regen, cost gate, global-cooldown pause, flee lockout) and set every number as data; do not copy the melee swing gate (its x5 and x10 timers disagree, see D2) and do not copy the reduction formula (D1, fixed in the sketch).
Acceptance: a server test asserts that a 100-AP ability at 200 AP leaves 100 AP, that AP rises by 25 per 1000 ms when no global cooldown is active and by 0 on a 300 ms retry while one is, and that a flee sets AP to 0 with no regen for 10000 ms.

## 1. Mechanism

- Stat sheet: each stat slot has a base value and a bonus value (`StatsInterface.cs` 14-15); total = base + bonus (56). Equipment adds its stat list into the bonus (`ItemsInterface.cs` 304-312); the item stat list merges duplicate keys by summing (`Item_Info.cs` 142-145). The Stats enum has 21 slots (`GameData.cs` 307-320), 16 named: STRENGTH 1, AGILITY 2, WILLPOWER 3, TOUGHNESS 4, WOUNDS 5, INITIATIVE 6, WEAPONSKILL 7, BALLISTICSKILL 8, INTELLIGENCE 9, BLOCKSKILL 10, PARRYSKILL 11, EVADESKILL 12, DISRUPTSKILL 13, SPIRITRESIST 14, ELEMENTALRESIST 15, CORPOREALRESIST 16.
- Health comes from WOUNDS: `MaxHealth = total WOUNDS x 10` (`StatsInterface.cs` 114). `TotalHealth = MaxHealth + BonusHealth` (`Unit.cs` 308). Out of combat, every 4000 ms (`Unit.cs` 37), health regains `TotalHealth / 8` (328-333); the regen is skipped while `IsFighting()` (328).
- Fighting state: `ResetFightingState` sets `FightingStateTime = now + 2000` (`CombatInterface.cs` 82-88). Four call sites (544, 565, 574, 583) call it; the enclosing functions were not read. The flag clears in `Update` after it passes (90-96).
- Creature wounds: `GenerateWounds(level, rank) = (95*(level+1) + 5.5*level + [rank>0] rank*5.85*level*52) / 10` (`Creature.cs` 63-70). Level is a random roll in the proto's min..max range (88), then `WOUNDS` is set and `Health = TotalHealth` (89-91).
- Player melee (`CombatInterface.cs` 104-171). Polled every tick. When the swing timer is not ready, it moves forward 100 ms and retries (119, 123). The swing needs the target inside a 110 arc (125). Distance < 5 is melee (142); ranged is distance < 90 with the ranged slot free (154). Main-hand is used if its cooldown has elapsed, else off-hand (144-152). With no weapon at all, it does an unarmed `Strike` and sets `NextAttackTime = now + Speed(200) x 10` = 2000 ms (130-137).
- Armed swing: `Strike`, then `NextAttackTime = now + Time x 5` (163) and the item cooldown `Time x 10` (164), where `Time` is the item's `Speed` (250-258; unarmed default 200). With Speed 200 the swing gate is 1000 ms and the main-hand cooldown is 2000 ms, so the main-hand can only swing every 2 s, and the off-hand fills the gap if it is equipped. The x5/x10 mismatch looks unintended (D2).
- Creature melee (`CombatInterface.cs` 176-199): AI swing gate `NextAttackTime = now + 2000` (196) at reach 5 (193).
- Damage per player swing (`StatsInterface.CalculDamage`, 127-146): `(STR/10 + W) x (Speed/100)`, where `W = weapon Dps / 10`, and for the main-hand slot only, `W x 0.45` (138-140, 145). Speed/100 turns the item speed into seconds, so a 2-second weapon scales the per-second figure by 2 (the item table units are not in the repo).
- Damage per creature swing (`CalculDamage`, 149-155): `20 + 5*level + 10*rank`; plus 8 per level above the target; minus 3 per level below the target.
- Reduction (`CalculReduce`, 161-184): player = `TOUGHNESS/5 + equipped_armour/(level*1.1)`, with the comment `// TODO : Parry Skill et autre` (171-176). Creature = flat 25 (180). Parry, block, evade and disrupt are declared in the enum but no code reads them on this path.
- `Strike` (`Unit.cs` 365-384): reduction is capped at 75 (376). Then `RealDamage = Damage - (reduce/100 * reduce)` (378), which is quadratic in the reduction, not a percentage (D1). Floor 2 (379-380). Then the attack movement and `DealDamages` (382-383).
- Ability damage (`DealDamagesHandler.cs` 147-153): `GetDamage(0) + level*5.82`; if max range <= 5, also `+ STR/5` (151) and `+ (weapon Dps x 0.1) x (cast time x 0.001)` (152). The same `STR/5` term is in `DamageOverTimeHandler.cs` 102 and the two zone handlers (`DealDamagesZoneHandler.cs` 147, `DealDamagesWhenHitHandler.cs` 88).
- Action points (AP), the stamina economy: `MaxActionPoints = 250` (`Unit.cs` 299). The setter clamps to the max (285-288). Regen: every `ACTION_REGEN_TIME = 1000` ms (38) add 25 (357), clamped to max (359-360). If a global cooldown is active, the next check is 300 ms later and nothing is added (347-349).
- AP spend: the cast gate is `ApCost > AP` returns "not enough AP" (`AbilityInterface.cs` 241-242). On cast, `ActionPoints -= ApCost` (`Ability.cs` 126) after the cast check passes.
- Flee (`FleeAbilityHandler.cs` 65-66): AP is set to 0 and `ResetNextActionPoints(10000)` sets `NextApRegen = now + 10000` (`Unit.cs` 303-306), so AP does not regrow for 10 s.
- Steal AP buff (`StealsActionPointsBuff.cs` 67-75): moves AP from target to caster; the caster side is clamped by the AP setter (`Unit.cs` 285-288), not by the buff.
- Stat rows (data): `characterinfo_stats` table, columns CareerLine, Level, StatId, StatValue (`CharacterInfo_stats.cs` 28-60). Rows are not in the repo.
- Gap fill on load (`CharMgr.cs` 131-148): for each career, stat and level 2..40: if the value does not rise above the previous level, or the rise is more than 40, and a row two levels back exists, it is replaced with `previous + (previous - two-levels-back) + 1`. Then, if the value still does not rise above previous, it becomes `previous + 3` (this last check runs even with no two-back row; a jump over 40 with no two-back row is left as it is).
- Level up (`Player.cs` 581-600): `ApplyLevel` reads that level's rows, computes the increase per stat (`Diff`) for the level-up message, writes the new base values, then `ApplyStats` (599).
- Armour: `GetEquipedArmor` sums the `Armor` of every equipped slot (`ItemsInterface.cs` 295-302).
- Magic and mental: INTELLIGENCE (9), WILLPOWER (3), SPIRIT / ELEMENTAL / CORPOREAL RESIST (14-16) and DISRUPT (13) are declared in the enum (`GameData.cs` 313-324) and as bonus types (257-258, 303-304). In the donor, no code outside the enum reads them (checked with a grep for each name). Luck: no stat, no hit.

## 2. Key functions

- `StatsInterface.CalculDamage` `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Interfaces/StatsInterface.cs` 127-160.
- `StatsInterface.CalculReduce` same file 161-184.
- `StatsInterface.ApplyStats` 109-123 and `GetTotalStat` 54-57: the stat total and the health cap.
- `Unit.Strike` `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Unit.cs` 365-384.
- `Unit.UpdateHealth` 322-341 and `Unit.UpdateActionPoints` 343-362.
- `CombatInterface.Update` `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Interfaces/CombatInterface.cs` 90-174 (player melee loop); `AttackAI` 176-200.
- `ItemsInterface.GetAttackTime` 250-259, `GetAttackDamage` 260-268, `GetEquipedArmor` 295-303, `EquipItem` 304-315.
- `CharMgr.LoadCharacterInfoStats` `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/Managers/CharMgr.cs` 110-152 and `GetCharacterInfoStats` 168-186.
- `Player.ApplyLevel` `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Player.cs` 581-600.

## 3. Numbers vs mechanism

Stat table (name | what it does | formula | number ranges | caps | file:line)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| STRENGTH (1) | melee damage, ability damage | `(STR/10 + W) x Speed/100`; ability `+STR/5` (range <= 5); DoT and zone `+STR/5` | STR is a UInt16 total; no ranges in code (rows are data) | none in code | StatsInterface.cs 136, 145; DealDamagesHandler.cs 151; DamageOverTimeHandler.cs 102 |
| TOUGHNESS (4) | damage reduction | `TOU/5` in reduction | UInt16 | reduction capped at 75 (Strike) | StatsInterface.cs 170-171; Unit.cs 376 |
| WOUNDS (5) | health pool | `MaxHealth = WOUNDS x 10`; creature `WOUNDS = (95(L+1) + 5.5L + rank*5.85*L*52)/10` | creature example: level 10, rank 0 = (1045 + 55)/10 = 110 wounds, 1100 health | none | StatsInterface.cs 114; Creature.cs 63-70 |
| ARMOUR (equipped sum) | reduction | `armour / (level*1.1)` added to reduction | per item `Armor` (item table, not read) | none | StatsInterface.cs 173-174; ItemsInterface.cs 295-302 |
| WEAPON DPS and SPEED | swing damage | `W = Dps/10`, main-hand `W x 0.45`; swing gate `Speed x 5`; item cooldown `Speed x 10`; unarmed Speed 200 | unarmed 200 (2 s cooldown) | none | StatsInterface.cs 138-145; CombatInterface.cs 137, 163-164; ItemsInterface.cs 250-268 |
| AGILITY (2), INITIATIVE (6), WEAPONSKILL (7), BALLISTICSKILL (8) | declared; no reader found on the paths read | - | - | - | GameData.cs 307-326 |
| BLOCK/PARRY/EVADE/DISRUPT (10-13) | declared; parry "TODO" in reduction | - | - | - | GameData.cs 313-324; StatsInterface.cs 176 |
| INTELLIGENCE (9), WILLPOWER (3), RESISTS (14-16) | declared; no reader found | - | - | - | GameData.cs 307-326, 257-258, 303-304 |
| AP pool | stamina economy | regen +25 every 1000 ms; paused (300 ms retry) under global cooldown; cost gate `cost <= AP`; `AP -= cost` | max 250; cost per ability `ApCost` (data) | cap 250 | Unit.cs 37-38, 287-299, 343-362; Ability.cs 126; AbilityInterface.cs 241-242 |
| Flee lockout | stamina reset | AP = 0; regen delayed 10000 ms | 10000 ms | - | FleeAbilityHandler.cs 65-66; Unit.cs 303-306 |
| HP regen | out of combat health | every 4000 ms, `+TotalHealth/8`, not while fighting; fighting = 2000 ms after last event | 4000 ms; 1/8 | - | Unit.cs 37, 322-341; CombatInterface.cs 87 |
| Stat levels | per-level stat rows | rows per career, stat, level 2..40; gap fill rule | levels 2..40 | jump > 40 treated as a fault | CharMgr.cs 131-148; CharacterInfo_stats.cs 28-60 |

Reusable algorithm | game constants (summary)
- A capped pool with a fixed-step regen, a cost check before spend, a regen pause under a shared cooldown, and a timed lockout after an escape.
- A total = base + sum of equipment bonuses per stat slot.
- Per-level stat rows with a monotone repair rule (the gap fill).

## 4. TypeScript sketch

simplified: keeps the donor's order for the stamina pool (the cost check before the spend; regen gate; global-cooldown retry; cap at max) and the flee lockout. It omits: the per-ability cooldowns, the Steal AP buff, the melee swing and its x5/x10 gate, the creature damage and reduction, and the stat rows and gap fill. The reduction is the PERCENT form, not the donor's `Damage - reduce^2/100` (defect D1 is fixed in the sketch), keeps the donor's cap of 75 and its floor of 2.

```ts
// Licence: GPL-2.0-or-later (donor, per the CharacterInfo_stats.cs header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface ApPool { ap: number; max: number; nextRegenMs: number; }

const AP_REGEN_MS = 1000;      // donor ACTION_REGEN_TIME
const AP_REGEN_GAIN = 25;      // donor +25 per regen
const AP_GLOBAL_RETRY_MS = 300; // donor retry while a global cooldown is active

// Regen step: add AP on the fixed interval, or retry in 300 ms while a global cooldown holds.
function tickAp(p: ApPool, nowMs: number, globalCooldownActive: boolean): void {
  if (nowMs < p.nextRegenMs) return;
  if (globalCooldownActive) {
    p.nextRegenMs = nowMs + AP_GLOBAL_RETRY_MS;
    return;
  }
  p.nextRegenMs = nowMs + AP_REGEN_MS;
  p.ap = Math.min(p.max, p.ap + AP_REGEN_GAIN);
}

// Cast: the gate is checked first, then the cost is taken (donor order).
function spendAp(p: ApPool, cost: number): boolean {
  if (cost > p.ap) return false;
  p.ap -= cost;
  return true;
}

// Flee: AP goes to zero and regen waits for lockMs (donor 10000).
function flee(p: ApPool, nowMs: number, lockMs: number): void {
  p.ap = 0;
  p.nextRegenMs = nowMs + lockMs;
}

// Reduction as a percent, capped at 75, floored at 2 (donor cap and floor; percent form is the fix).
function reducedDamage(raw: number, reduce: number): number {
  const r = Math.min(75, reduce);
  const out = raw * (1 - r / 100);
  return out < 2 ? 2 : out;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/stamina.ts` (new: the AP-style pool, its regen gate, cost check and flee lockout as data). Parity-checklist row 3 (guard / parry / stamina). The stat-sheet catalogue fields (total = base + equipment bonus, WOUNDS x 10 health, per-level rows) land under row 21 (catalogue fields).
- Server tick sub-line (row 18 / post-K item 3): the AP regen and the global-cooldown retry run on the fixed server step with an accumulator per entity.
- Fast mobile fight fit: the AP numbers suit a fast fight. At 250 max and +25 per second, an empty pool refills in 10 s, and sustained spending is capped at 25 AP per second (the ApCost values are data not in the repo, so casts per second were not computed). The 1-2 s swing and the 2 s main-hand cooldown are in the same range. The 75 reduction cap and the 2 damage floor suit a many-hit duel.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the pool and its gates live in the engine, values in data); rule 7 (copyleft, shape only)

## 6. Gaps and risks

- GPL-2.0-or-later (one header read; no repo LICENSE found): clean-room only. The sketch is written from the mechanism.
- D1 (`Unit.cs` 378): `RealDamage = Damage - (reduce/100 * reduce)` subtracts reduce squared over 100 instead of taking a percentage. At reduce 50 it removes 25 damage points, not half the hit. Fix: `raw * (1 - reduce/100)` with the cap at 75 (`Unit.cs` 376). Keep the idea (a capped reduction from toughness and armour); fix the formula.
- D2 (`CombatInterface.cs` 163-164): the swing gate is `Speed x 5` but the item cooldown is `Speed x 10`. Result: a main-hand weapon can only swing every `Speed x 10` ms, and the gate is set to half that. Whether the off-hand fill is intended was not confirmed. Fix: one timer (`Speed x 10`) and an explicit off-hand rule.
- D3 (`CharMgr.cs` 171 and 183): `(ushort)((int)CareerLine << 8 + (int)Level)` parses in C# as `CareerLine << (8 + Level)` because shift binds looser than addition. For Level 8 to 23 the shifted value has 16 or more zero low bits, so the ushort cast gives 0 for every career: all those levels share one cache key. Above 23 the C# shift count wraps, which is also wrong. Also at low levels the key is not unique (career 1 level 1 and career 2 level 0 both give 512). So `GetCharacterInfoStats` can return another career's or level's rows. This is a high-severity defect found by reading only (not run). Fix: key on a tuple `(career, level)`, or on `(career << 8) | level` in an int.
- D4 (`StatsInterface.cs` 117-118): inside `ApplyStats`, the `else if (MaxHealth <= 0)` only runs when health is not above max. A zero max with health above zero leaves max at 0. Fix: clamp max to at least 1 before the health clamp.
- Frankendom rulings: AP is part of the one engine (`src/fight/stamina.ts`) and the server checks every cast cost and every regen; the client only shows the pool. The donor's per-ability cooldown is a separate timer and should stay separate (one ledger for AP, one for cooldowns).
- Not read: the stat-row data (no SQL in the repo), the parry/block/evade implementation (declared but not in the read path), the `BONUSTYPES_*` handlers, the full item loader, the `DealDamages` body beyond the lines cited, the 4 `ResetFightingState` callers' enclosing functions. Not searched: magic schools, luck (no such stat).
