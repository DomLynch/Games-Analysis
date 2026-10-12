# swgemu-Core3 (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/CreatureObjectImplementation.cpp` | Licence: AGPL-3.0 (repo `COPYING`, line 2 "Version 3, 19 November 2007"; Lua headers in `bin/scripts/managers/skill_mod_manager.lua` say LGPL-2 or later) | C++ and Lua | symbol `activateHAMRegeneration`, `inflictDamage`, `calculateCostAdjustment`, `fixHAM`

Checked: Read in full: `activateHAMRegeneration` (3197-3245), the second `inflictDamage` overload (body 1195-1220), `addWounds` (1403-1437), `calculateCostAdjustment` (4150-4157), `PlayerObjectImplementation::doRecovery` entry and its call to the regen (2367-2407), `activateRecovery` (2494-2501), `PlayerRecoveryEvent` (16-52), `PlayerManagerImplementation::checkEncumbrancies` (2376-2395), `applyEncumbrancies` (2450-2466), `fixHAM` (5024-5090), `DamageOverTime` fire and disease ticks (269-290, 377-390), `SkillManager::awardSkill` ledger (326-364, 420-440), `updateXpLimits` (788-837), `loadXpLimits` (202-227), `skill_mod_manager.lua` (50-71). Callers of `calculateCostAdjustment` checked by grep only (Berserk2, Formup, Boostmorale, Enragepets command headers; entertainer and droid sessions); combat-queue callers not read. Confidence: high for regen, hit clamp, cost scaling, encumbrance, XP caps. Medium for shock wounds: `addWounds` calls `addShockWounds(1, true)` under `doShockWounds` (read in body; that line is not receipted). Not read: level-to-HAM curves and skill-box definitions (in IFF datatables not in the box), weapon stats, speed and carry-weight (`calculateSpeed` at 1917 not read), the incapacitation task. camera_scope: not applicable (not camera).

Best transferable idea: Make action cost and regen depend on the character's own stat with a neutral point (300) and posture multipliers (kneel 1.25, sit 1.75), so stamina economy is data-driven per character instead of a flat cost table.
Decision (proposed): adapt — keep the stat-scaled cost and posture regen, but use one stamina pool and an engine-owned curve; drop the three-pool HAM model and the persistent wound heal accumulator, which Frankendom has no ruling for.
Acceptance: A server test: a swing with base cost 100 costs 50 at stamina 900 and 0 at stamina 1500; regen while sitting is 1.75 times standing for the same stamina and elapsed time.

## 1. Mechanism

- Driver: `PlayerRecoveryEvent` is a `Task(2000)` (`PlayerRecoveryEvent.h:21`) scheduled with `schedule(1000)` (`PlayerObjectImplementation.cpp:2500`). Each run calls `ghost->doRecovery(startTime.miliDifference())` (`PlayerRecoveryEvent.h:48`), so the regen uses measured elapsed milliseconds, not a fixed step. `doRecovery` calls `creature->activateHAMRegeneration(latency)` (`PlayerObjectImplementation.cpp:2407`).
- Order inside `activateHAMRegeneration` (3197): (a) return if incapacitated or dead (3198); (b) return for NPCs in combat, players are not blocked (3201); (c) `modifier = latency / 1000` seconds (3204); kneel x1.25 (3206-3207), sit x1.75 (3208-3209); (d) for each of health, action and mind: `tick = ceil(current secondary stat x 13/2100 x modifier)`, with the secondary being CONSTITUTION, STAMINA or WILLPOWER (3212-3217), then at least 1 (3219-3220); (e) `healDamage` each primary by its tick (3222-3224 region, not individually receipted); (f) `activatePassiveWoundRegeneration` (3235): skill mod `private_med_wound_health` adds `int(mod x 0.2)` to an accumulator, and at 100 one wound is healed from each of health, strength and constitution (3237-3241).
- Hit (second `inflictDamage` overload, 1191-1220): `newValue = current - (int)damage` (1203). If not destroy and newValue <= 0, newValue = 1 (1207). `avoid_incapacitation` skill mod also floors at 1 (1210). Secondaries (slot % 3 != 0) floor at 0 (1213). Observers for damage checkpoints run before `setHAM` (the checkpoint code is in the body, not receipted).
- Action cost: `calculateCostAdjustment(stat, base) = max(0, base - ((HAM(stat) - 300)/1200) x base)` (4151-4153). It uses the secondary stat that pays the cost: STRENGTH for health cost, QUICKNESS for action cost, FOCUS for mind cost (`Berserk2Command.h:43-45`, `FormupCommand.h:45-47`). Neutral at 300. At 900 the cost is half the base. At 1500 and above it is 0. Below 300 it rises, to 1.25 x base at 0.
- Armour encumbrance: equip gate `checkEncumbrancies` (2376) compares each armour encumbrance with the CURRENT secondary HAM (2377-2391). On equip, `applyEncumbrancies` (2450) adds encumbrance per group (HEALTH, ACTION, MIND, lines 2455-2457), lowers current and max of the secondaries (2458-2466). `fixHAM` (5024) rebuilds max as base + modifiers, then subtracts `getEncumbrance(group)` for secondaries (5084-5089).
- Battle fatigue (shock wounds): an integer 0 to 1000 (`addShockWounds` 728-737). Damage over time scales with it: disease tick damage = strength x (1 - absorb) x (1 + shock/100), with absorb capped at 50 percent (DamageOverTime 275, 387). Fire tick wounds scale the same way (284).
- Wounds (`addWounds` 1403-1437): a wound value is capped so that it is at most base - 1 (1427-1428). Wounds are a separate ledger from current HAM.
- Skill points: a pool that starts at 250 (`SkillManager.cpp:427`). Learning a skill withdraws its cost (364). A recount in `awardSkill` (427-437) rebuilds the expected pool as 250 minus every learned cost, and overwrites the stored value on mismatch (435-437). This is a reconcile step, not a hidden second ledger.
- XP caps: per XP type, the cap is the largest cap over the player's skill boxes that have a non-zero cap (807-820 region); defaults come from `datatables/skill/xp_limits.iff` (222, table not read). XP over the cap is clamped (831-833).
- Skill-mod clamps (lua 57-62): WEARABLE plus or minus 25, STRUCTUREMOD plus or minus 125, BUFFMOD plus or minus 125, ABILITYBONUSMOD plus or minus 125 (line 62).

## 2. Key functions

- `activateHAMRegeneration` in `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/CreatureObjectImplementation.cpp` 3197-3245. Regen per second with posture multipliers, passive wound heal.
- `inflictDamage` (second overload) in the same file, 1191-1220. Float damage truncated, floors at 1 or 0.
- `calculateCostAdjustment` in the same file, 4150-4157. Stat-scaled cost.
- `checkEncumbrancies` and `applyEncumbrancies` in `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/player/PlayerManagerImplementation.cpp` 2376-2466.
- `fixHAM` in the same file, 5024-5090. Max rebuild with encumbrance subtracted from secondaries.
- `doFireTick` and `doDiseaseTick` in `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/damageovertime/DamageOverTime.cpp` 269-290 and 377-390.
- `awardSkill` ledger and `updateXpLimits` in `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/skill/SkillManager.cpp` 326-440 and 788-837.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Regen per tick = ceil(current stat x rate x seconds x posture multiplier), minimum 1 | Rate 13/2100 per point per second (theirs, 3212-3217); kneel 1.25 (3207); sit 1.75 (3209); minimum 1 (3219-3220) |
| Action cost scaled by the paying stat, neutral point, linear, floor 0 | Neutral 300 and span 1200 (theirs, 4151); paying stat per action: STRENGTH, QUICKNESS, FOCUS (Berserk2Command.h:43-45) |
| Damage floors at 1 for primaries unless destroy; secondaries floor at 0 | Floor 1 and 0 (1207, 1213); avoid_incapacitation floor (1210) |
| Armour takes max away from the paying stat (encumbrance) | Encumbrance per armour piece comes from item data (ArmorObjectImplementation.cpp:379-386) |
| Damage over time scaled up by accumulated fatigue, absorption capped | Absorb cap 50 (275); fatigue factor (1 + shock/100) (387); shock cap 1000 (733) |
| Skill-point ledger recounted from a start pool | Start pool 250 (427) |
| Per-type XP cap from the max over owned boxes, defaults from table | Table values not read (xp_limits.iff) |

## 4. TypeScript sketch

simplified: the sketch keeps the regen tick, stat-scaled cost, primary and secondary floors, encumbrance on the secondary max, shock-scaled DoT, and the skill-point recount. It omits the three-pool HAM model (it uses one slot index), the wound ledger and wound heal accumulator, observers, the in-combat rule for players, the incapacitation and avoid_incapacitation branches beyond the floor, skill XP caps, and the posture-regen interaction with the healing calls. Fixes: the donor casts float damage to int before subtracting (1203); the sketch keeps the rounding to one step at the end. Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation.
type Slot = number; // 0..8; slot % 3 === 0 is a primary (HEALTH/ACTION/MIND), others are secondaries

const REGEN_PER_POINT_PER_SEC = 13 / 2100; // donor rate, per point of current secondary stat per second
const KNEEL_MULT = 1.25;
const SIT_MULT = 1.75;

// Regen tick for one pool, from the current value of the stat that feeds it (CON, STA or WIL).
function regenTick(currentStat: number, seconds: number, posture: "stand" | "kneel" | "sit"): number {
  const mult = posture === "sit" ? SIT_MULT : posture === "kneel" ? KNEEL_MULT : 1;
  const raw = Math.ceil(Math.max(0, currentStat) * REGEN_PER_POINT_PER_SEC * seconds * mult);
  return Math.max(1, raw); // donor: at least 1 per tick
}

// Action cost scaled by the stat that pays it. Neutral at 300; 0 at 1500 and above.
function scaledCost(baseCost: number, stat: number): number {
  const cost = baseCost - ((stat - 300) / 1200) * baseCost;
  return Math.max(0, cost);
}

interface HamState {
  cur: Record<Slot, number>;
  max: Record<Slot, number>;
  base: Record<Slot, number>;
  wounds: Record<Slot, number>;
  shock: number; // 0..1000
}

// One hit on one slot. Primaries floor at 1 unless destroy; secondaries floor at 0.
function applyHit(s: HamState, slot: Slot, dmg: number, destroy: boolean, avoidIncap: boolean): number {
  let v = s.cur[slot] - Math.round(dmg); // single rounding at the end
  if (!destroy && v <= 0) v = 1;
  if (avoidIncap && v <= 0) v = 1;
  if (slot % 3 !== 0 && v < 0) v = 0;
  s.cur[slot] = v;
  return v;
}

// Max of a secondary = base + modifiers - encumbrance of its group (group = floor(slot / 3)).
function secondaryMax(s: HamState, slot: Slot, modifiers: number, encumbrance: Record<number, number>): number {
  const group = Math.floor(slot / 3);
  return s.base[slot] + modifiers - (encumbrance[group] ?? 0);
}

// Disease-style damage over time: absorption cut (capped at 50 percent) and battle-fatigue amplification.
function dotDamage(strength: number, absorptionPct: number, shock: number, headroom: number): number {
  const absorb = Math.min(50, Math.max(0, absorptionPct));
  const raw = strength * (1 - absorb / 100) * (1 + shock / 100);
  return Math.min(Math.round(raw), headroom);
}

// Skill-point ledger: recount from the start pool minus each learned skill's cost; a mismatch resets the stored value.
function recountSkillPoints(stored: number, learnedCosts: number[], start = 250): { value: number; fixed: boolean } {
  const expected = learnedCosts.reduce((acc, c) => acc - c, start);
  return { value: expected, fixed: stored !== expected };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/stamina.ts` (new module): the stamina pool, the stat-scaled swing cost and the posture regen, all computed in the engine so the server verifies them. Parity-checklist row 3 (guard/parry/stamina).
- Data fields (zone data vs engine constant) are listed in the JSON sidecar. The neutral point and span are engine constants; the stamina max and regen per point are per-character or per-encounter data.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, server-verified pools); row 3

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism and was not translated.
- Frankendom has one stamina economy. The donor has three pools (health, action, mind), a wound ledger and a persistent wound heal accumulator. Only the stamina pool and the cost curve are proposed; the rest has no ruling and is out of scope.
- Defect 1: `inflictDamage` truncates float damage to int before subtracting (1203). Fix: keep the float, round once at the end (the sketch does this). Defect 2: the disease and fire ticks truncate with `(int)` (278, 387). Fix: the same single rounding.
- Risk: the equip gate compares CURRENT secondary HAM (2377), so a character who is hurt cannot equip armour. Fix or decide: gate on max or base if Frankendom allows equipping mid-fight; otherwise keep, and say so in the design.
- Risk: the donor lets players regenerate in combat but stops NPCs (3201). Frankendom must decide per encounter. Fix: make in-combat regen a data flag on the encounter, not a rule.
- Gap: the donor's level-to-HAM curve and skill-box definitions are in IFF tables that are not in the box, so the level-50 curve is not read.
- Gap: weapon stats, speed and carry weight are not read (`calculateSpeed` at 1917 not read).
- Gap: the incapacitation recovery task was not read.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine, server-verified pools); row 3

## SK table (stat and skill rows, donor numbers)

Donor has 9 HAM attributes (HEALTH, STRENGTH, CONSTITUTION, ACTION, QUICKNESS, STAMINA, MIND, FOCUS, WILLPOWER; `CreatureAttribute.cpp:11-19`). There is no luck, dexterity or intelligence attribute in this donor (checked the attribute constants). Magic and force-power stats: not read.

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| HEALTH, ACTION, MIND (primary pools) | current pool, paid by actions, filled by regen | current; max = base + modifiers - encumbrance (secondaries only) | not read (base curve not read) | floor 1 unless destroy | CreatureObjectImplementation.cpp:1203-1207 |
| STRENGTH, CONSTITUTION, QUICKNESS, STAMINA, FOCUS, WILLPOWER (secondaries) | feed regen and action cost; lowered by armour encumbrance | max = base + mods - encumbrance(group) | not read | floor 0 | PlayerManagerImplementation.cpp:5084-5089 |
| Health regen | heals HEALTH per tick | ceil(CON x 13/2100 x seconds x posture), min 1 | about 0.0062 per CON point per s; CON 300 gives 2 per s | min 1 per tick | CreatureObjectImplementation.cpp:3212-3220 |
| Action regen | heals ACTION per tick | ceil(STA x 13/2100 x seconds x posture), min 1 | same rate | min 1 | CreatureObjectImplementation.cpp:3215 |
| Mind regen | heals MIND per tick | ceil(WIL x 13/2100 x seconds x posture), min 1 | same rate | min 1 | CreatureObjectImplementation.cpp:3217 |
| Posture regen multiplier | scales regen | kneel x1.25; sit x1.75; stand x1 | 3 values | none | CreatureObjectImplementation.cpp:3206-3209 |
| Action cost (health, action, mind) | cost of a command, scaled by the paying stat | base x (1 - (stat - 300)/1200), min 0 | neutral at 300; 0 at 1500 and above; 1.25 x base at 0 stat | floor 0 | CreatureObjectImplementation.cpp:4151-4153; Berserk2Command.h:43-45 |
| Passive wound heal | heals one wound per 100 accumulated | accumulator += int(mod x 0.2) per regen tick | mod is private_med_wound_health | one wound per 100 | CreatureObjectImplementation.cpp:3237-3241 |
| Armour encumbrance | per armour piece, lowers secondary max and paying stat | applied through applyEncumbrancies; equip needs current secondary > encumbrance | per armour template value | equip gate on current HAM | PlayerManagerImplementation.cpp:2376-2391, 2450-2466 |
| Shock wounds (battle fatigue) | amplifies disease DoT damage and fire-tick wounds (fire scales wounds applied, not damage) | damage x (1 + shock/100) | 0 to 1000 | cap 1000 | CreatureObjectImplementation.cpp:728-737; DamageOverTime.cpp:387 |
| Absorption | cuts DoT damage | strength x (1 - absorb/100) | absorb 0 to 50 percent | cap 50 | DamageOverTime.cpp:275, 278 |
| Skill points | learn cost pool | 250 minus sum of learned costs; recount on mismatch | start 250 | none read | SkillManager.cpp:364, 427-437 |
| XP type cap | caps XP per type | cap = max over owned skill boxes; defaults from xp_limits.iff | defaults not read | XP over cap clamped | SkillManager.cpp:222, 807, 831 |
| Skill-mod clamp | bounds a modifier | clamp to [min, max] | WEARABLE -25..25; STRUCTUREMOD and BUFFMOD -125..125 | hard | skill_mod_manager.lua:57-61 |
| Level | sets level | setLevel does not change HAM in the body read | level-to-HAM curve not read | not read | CreatureObjectImplementation.cpp:634-652 |

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- No errors found; all cited lines and numbers verified against the donor.
- Missed: `skill_mod_manager.lua` also clamps ABILITYBONUSMOD (line 62) to plus or minus 125; the note listed three clamps. Confirmed.
- Missed: the fire tick applies shock to the wounds it applies (DamageOverTime.cpp 284), not to damage; the table row 'amplifies DoT damage' is only true of the disease tick (387). Confirmed.

Fixed 2026-10-12: clamp list gained ABILITYBONUSMOD; shock-wound table row split into disease damage vs fire wounds.
