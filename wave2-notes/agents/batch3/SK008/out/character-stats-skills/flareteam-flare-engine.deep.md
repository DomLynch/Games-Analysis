# flareteam-flare-engine (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` (`calcBase` 985-1003, `applyEffects` 1024-1072, `recalc` 947-983), with the bonus stack in `src/EffectManager.cpp` and the hit and damage pipeline in `src/Entity.cpp` (`takeHit` 319 on, read to 506) | Licence: GPL-3.0 (`COPYING`; per-file headers "either version 3 of the License") | C++ | symbol `StatBlock::calcBase`

Checked: Read in full: `StatBlock::calcBase` (985-1003), `StatBlock::applyEffects` (1024-1072), `StatBlock::recalc` (947-983), the regen block of `StatBlock::logic` (1136-1166), `Stats.h` enum (20-45), `StatBlock.h` `get_primary` (196-197), the effect accumulation in `EffectManager.cpp` (355-380 reset; 440-500 accumulation), `Entity::takeHit` (319 on, read to 506: target filters, reflect, accuracy and avoidance, absorb and block, crit, overhit, miss, the damage ledger), `XPScaling.cpp` (whole file, 178 lines), `mods/default/engine/` primary_stats.txt, damage_types.txt, resource_stats.txt (example only, commented), combat.txt (commented examples only), death_penalty.txt. Callers: `calcBase` is called only from `applyEffects` (1046). `applyEffects` is called from `StatBlock.cpp` 873 (not traced), `recalc` (965), `logic` (1100), and `Avatar.cpp` 1059 and 1127 (not traced). Confidence: high on the stat stack, the order of operations, and the hit and damage pipeline. Medium on the regen unit (the rate is per frame at `max_frames_per_sec`, and `resting_hp_regen_seconds` is parsed with `Parse::toDuration`, which I did not read). Not read: the defaults for `min_overhit_damage`, `max_overhit_damage`, `min_miss_damage`, `max_miss_damage`, `min_absorb`, `max_absorb` (only the code uses are read), `EngineSettings::XPTable::getLevelXP`, the XP table values (not in the default mod), the class data format for `stat_per_level` and `stat_per_primary` values (the keys are read in `StatBlock.cpp` 300-380; the values live in enemy and hero files outside this box), and the timed-effect code. camera_scope: not applicable (not a camera cell). The donor has no stamina or stance pool in the engine; its resource-stat system is generic (see table).

## 1. Mechanism

- Each derived stat is built the same way (`StatBlock::calcBase`, 985-1003):
  - (a) Level term: `lev0 = max(level - 1, 0)` (987), and `base = starting + lev0 * per_level` (991). Level 1 gets the starting value.
  - (b) Primary term: for each primary stat j (physical, mental, offense, defense: `mods/default/engine/primary_stats.txt`), `spent = max(get_primary(j) - 1, 0)` (996) and `base += spent * per_primary[j]` (1001). The first point in each primary is free. `get_primary(j)` is the player's allocated points plus effect bonuses (`StatBlock.h` 196-197). Points come from `stat_points_per_level`, default 1 (`StatBlock.cpp` 102).
  - (c) Effects: `current = (base + bonus) * bonus_multiplier` (1049). `bonus` is the sum of every additive effect magnitude (`EffectManager.cpp` 479), `bonus_multiplier` is the product of every multiplicative effect (477), and both are reset to 0 and 1 in `EffectManager::clearStatus` (355, 372). Where `clearStatus` is called is in `EffectManager.cpp` 349, 391 and 710 (the callers were not read). Primary bonuses are summed as whole numbers (494, `static_cast<int>`).
  - (d) Floors: HP max and MP max are never below 1 (1053 and the MP line after it). Current HP and MP are clamped to the new max (`applyEffects` 1027-1040 stores the previous values; the clamp follows).
- Order of a level-up (`recalc` 947-983): level is clamped to at least 1 (962-963), then `applyEffects` runs, then HP and MP refill only if not a level-up or if the restore flag is set (967 and the MP line after it).
- Regen (`logic` 1136-1166), per frame:
  - Enemies out of combat (not hero, not ally) heal to full over `resting_hp_regen_seconds` (1139-1142; default 5 s, line 162).
  - Everyone else (in combat, or heroes and allies) gets `HP_REGEN / 60` per second, applied per frame (1146). MP uses `MP_REGEN / 60` per second (1154). The frame length is `1 / max_frames_per_sec`, so regen is fixed-step, not delta-time.
- Hit check (`Entity::takeHit`, 319 on; read to 506). Order:
  - (a) Filters: target category, power filter, dead targets, movement type, walls, invincibility, aggro beacon (about 322-366).
  - (b) Reflect for missiles (`REFLECT` chance, 368-386).
  - (c) Accuracy: the power may change accuracy (multiply, add or absolute; 390-396). `true_avoidance = 100 - (accuracy - avoidance)` (403). If that is below 0 the hit may overhit (404). The value is clamped to the file's `avoidance_percent` range (405; default 0-100). The miss roll is `true_avoidance` percent (408).
  - (d) Damage: each damage part is rolled between its min and max (416), resisted by type (428). Absorb is rolled between `ABS_MIN` and `ABS_MAX` (434). It is clamped to `min_absorb..max_absorb` percent of the incoming damage, or to `min_block..max_block` if the target is blocking (438-447). It is raised to 1 when it rounds to 0 (454). It is subtracted (457); if damage reaches 0 it stays 1 when the max absorb is below 100 (unless the power ignores zero damage).
  - (e) Crit: chance is the power's `crit_chance` modified by the power (484-487). It adds `trait_crits_impaired` if the target is stunned or slowed (484-485). A crit multiplies damage by `min_crit..max_crit` percent (490; default min 200, `EngineSettings.cpp` 360). Otherwise an overhit multiplies by the overhit range (496). A miss multiplies by the miss range (503). Then the damage is rounded (506).

## 2. Key functions

- `StatBlock::calcBase`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 985-1003. Level and primary terms. Read in full.
- `StatBlock::applyEffects`: same file, 1024-1072. Calls `calcBase` at 1046 and applies `(base + bonus) * mult` at 1049.
- `StatBlock::recalc`: same file, 947-983. Level floor, `applyEffects`, refill rule on level-up.
- Bonus stack: `/mnt/frankendom-donors/flareteam-flare-engine/src/EffectManager.cpp` 355-380 (reset), 440-500 (accumulation; the additive and multiplicative branches at 477-479, the primary branch at 494).
- Hit and damage: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` `Entity::takeHit` 319 on (read to 506).
- XP scaling: `/mnt/frankendom-donors/flareteam-flare-engine/src/XPScaling.cpp` `load` 48-130 (tables; gaps filled from the level above at 119-124), `getMultiplier` 136-178.

## 3. Numbers vs mechanism

Each row: name | what it does | formula | number ranges | caps | file:line.

| Stat or term | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Primary stats | Four allocated attributes | physical, mental, offense, defense (ids) | 4 primaries (data file) | points per level default 1 | primary_stats.txt 2, 10, 14; StatBlock.cpp 102 |
| Free first point | Points above 1 count | spent = max(points - 1, 0) | 0 and up | none | StatBlock.cpp 996 |
| Per-level term | Growth per level | starting + (level - 1) * per_level | per value from enemy or hero file (not in this box) | level floor 1 | StatBlock.cpp 962, 987, 991 |
| Per-primary term | Growth per allocated point | + spent * per_primary[j] | per value from file (not in this box) | none | StatBlock.cpp 996, 1001; StatBlock.h 196-197 |
| Additive bonus | Items, timed effects | bonus += magnitude | effect magnitudes (data) | none | EffectManager.cpp 479 |
| Multiplicative bonus | Items, timed effects | mult *= magnitude (starts at 1) | e.g. 1.5 for +50% | none | EffectManager.cpp 372, 477 |
| Primary bonus | Whole points from effects | primary_additional += int(magnitude) | whole numbers | truncates toward zero | EffectManager.cpp 376, 494 |
| Stat formula | Final derived value | (base + bonus) * mult | any | HP and MP max >= 1 | StatBlock.cpp 1049, 1053 |
| HP max, MP max | Pools | derived as above | data | min 1 | StatBlock.cpp 1053; Stats.h 25 |
| Accuracy | Attacker's hit rating | 100 baseline; power may multiply, add or set it | rating (percent) | none | Stats.h 29; Entity.cpp 390-396 |
| Avoidance | Defender's rating | subtracted from accuracy | rating (percent) | clamp below | Stats.h 30; Entity.cpp 403 |
| Miss chance | Chance a hit is avoided | true_avoidance = 100 - (accuracy - avoidance), clamped to file range (default 0 to 100) | 0 to 100 percent | avoidance_percent min,max (EngineSettings.cpp 357, 393) | Entity.cpp 403-408 |
| Overhit | Bonus when accuracy outruns avoidance | if true_avoidance < 0, overhit with chance abs(true_avoidance) | percent of overflow | none | Entity.cpp 404, 496 |
| Miss damage | Glancing hit | damage * random(min_miss, max_miss) / 100 | defaults not read | none | Entity.cpp 503 |
| Absorb | Armour soak | random(ABS_MIN, ABS_MAX), clamped to min..max percent of the hit | percent of damage; file default not read | absorb_percent min,max (commented example: 0,90) | Entity.cpp 434, 438-447; combat.txt 1 (commented) |
| Block absorb | Soak while blocking | same clamp, using block_percent | commented example 0,100 | block_percent min,max | Entity.cpp 438; combat.txt 3 (commented) |
| Minimum damage | Keep 1 damage | if absorb cuts to 0 and max_absorb < 100, damage is 1 | 1 | none | Entity.cpp 457-470 (approx.) |
| Crit chance | Chance of a crit | percent chance (crit_chance times power modifier) | percent | none | Entity.cpp 484-487 |
| Crit against impaired | Extra crit chance on stunned or slowed targets | + trait_crits_impaired if target stun or speed < 100 | per power (data) | none | Entity.cpp 484-485 |
| Crit damage | Crit multiplier | damage * random(min_crit, max_crit) / 100 | min 200 default; max not read | none | Entity.cpp 490; EngineSettings.cpp 360 |
| Resist by damage type | Per type resist | applyResistToDamage(i, part) | per type (data) | none | Entity.cpp 428 |
| Damage types | Melee, ranged, mental | min and max per type | three types in default mod | none | damage_types.txt 2, 16 |
| HP regen (combat, heroes) | Regen per second | HP_REGEN / 60 per second, per frame | data | none | StatBlock.cpp 1146 |
| HP rest (enemies out of combat) | Full heal over time | HP_MAX / resting seconds per frame | default 5 s | none | StatBlock.cpp 162, 1139-1142 |
| MP regen | Mana regen | MP_REGEN / 60 per second | data | MP max | StatBlock.cpp 1154 |
| Resource stat (generic) | Stamina-like pool | file defines base, regen (ticks per minute), steal, heal, costs | example commented out | none | resource_stats.txt 2-24 (commented) |
| XP scaling by enemy level | Reward multiplier | absolute multiplier by enemy level | file tables (not in box) | clamped at table ends | XPScaling.cpp 83, 136-152 |
| XP scaling by level gap | Reward multiplier | relative multiplier for (enemy level - player level) | file tables (not in box) | clamped at table ends | XPScaling.cpp 162-166 |
| Gap fill | Missing levels in an XP table | copy the next level up | none | none | XPScaling.cpp 119-124 |
| Death penalty | Losses on death | currency 50 percent; total XP 0; XP since level-up 0; random item off; permadeath off | 0 to 100 percent | none | death_penalty.txt 8, 11, 14 |
| Level | Character level | from XP table (not read) | not read | max level from table (not read) | EngineSettings.h 310 (declaration only) |

Not in this donor's default mod: a stamina pool, poise, stun ladder, skill trees, a crafting or skill point curve. The stamina example in `resource_stats.txt` is commented out.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (level term, then points above the first, then (base + add) * mult, then the floor). It takes the bonuses already summed (add and mult), so it omits the effect manager, the per-frame reset and the whole-point truncation of primary bonuses (it takes whole numbers in `pointBonus`). It omits the regen, the hit check and the XP scaling. The example numbers are invented for the check; they are not donor values, because the default mod has no class stats.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism; no donor lines translated.
// clean-room
// Derived stat = (base + bonuses) * multiplier, with base built from level and primary points.
interface StatSpec {
  starting: number;      // value at level 1 with no points
  perLevel: number;      // added for each level above 1
  perPrimary: number[];  // added for each point above the first in each primary stat
}

interface Effects {
  add: number;           // sum of additive bonuses (items, timed effects)
  mult: number;          // product of multiplicative bonuses, starts at 1
}

// One derived value. Order matches the donor: base from level, then points, then (base + add) * mult, then the floor.
function derivedStat(
  spec: StatSpec,
  level: number,
  points: number[],        // points spent in each primary stat
  pointBonus: number[],    // whole-point primary bonuses from effects
  fx: Effects,
  floorAtOne: boolean,     // HP and MP max never go below 1
): number {
  const lev0 = Math.max(level - 1, 0);
  let base = spec.starting + lev0 * spec.perLevel;
  for (let j = 0; j < points.length; j++) {
    const spent = Math.max(points[j] + pointBonus[j] - 1, 0); // the first point is free, as in the donor
    base += spent * spec.perPrimary[j];
  }
  let value = (base + fx.add) * fx.mult;
  if (floorAtOne) value = Math.max(value, 1);
  return value;
}

// Example values for the check only. They are NOT donor numbers: the donor's default mod has no class stats.
const hpSpec: StatSpec = { starting: 10, perLevel: 2, perPrimary: [4, 0, 0, 0] };
export const exampleHp: number = derivedStat(hpSpec, 3, [3, 1, 1, 1], [0, 0, 0, 0], { add: 5, mult: 1.5 }, true);
// Expect: lev0 2 -> 14; spent 2 in physical -> +8 = 22; (22 + 5) * 1.5 = 40.5
export {};

```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed. Run with `node` on the VPS: `exampleHp` is 40.5 (by hand: lev0 2 gives 14; 2 spent points in physical at 4 each adds 8, so 22; (22 + 5) * 1.5 = 40.5).

## 5. Lands in

- TARGET `src/fight/stats.ts` (new): one derived-stat function (the stack in section 1) used by the duel step and the character sheet. Parity-checklist row 21 (catalogue fields): per-level and per-primary values are catalogue fields, and the stack is their only reader. The batch hint was row 21; row 21 is correct here.
- Reuse tag: adapt-idea (GPL-3.0; clean-room, shape only, no line translated). The stack shape is the idea; the names and values are ours.
- Brief rule served: 1 (one engine: one function computes every derived stat, one ledger); rule 7 (licence: clean-room); SK-FOCUS 1 (derived stats), 9 (level scaling as data) and 11 (the sheet is a readout of the same function).

## 6. Gaps and risks

- Fixed step, not delta-time: regen and rest heal are per frame at `max_frames_per_sec`. That is correct for a fixed server tick and wrong for a variable client frame. Frankendom's server runs a fixed step; the client must not run its own regen.
- Whole-point primary bonuses: `bonus_primary` is `static_cast<int>(magnitude)` (`EffectManager.cpp` 494). A fractional primary bonus is truncated toward zero, so 0.5 gives 0 and -0.5 gives 0. Fix: keep primary bonuses as whole points on purpose (our rule) and reject fractional values at load.
- Hit formula: accuracy 100 is the baseline (true_avoidance = 100 - (accuracy - avoidance)). A value of 100 with 0 avoidance gives a 0 percent miss chance. This is a readable design; our duel step needs one rule for it, and the server rolls it (kills are server-verified).
- Absorb rounding: absorb is raised to 1 when it rounds to 0 (`Entity.cpp` 454), and damage is kept at 1 when max absorb is below 100. Both are rules for the one damage ledger (row 1 in parity); we copy the intent (never zero, when the max says so), not the details.
- One ledger: the derived stats are one function, and the sheet, the duel and the server must all read it. The donor keeps `applyEffects` as the only writer of `current`; keep that.
- Not in this donor: stamina, poise, stance, or magic pools. The generic resource example is commented out. Frankendom's stamina economy comes from the Veloren read; resistances and elemental types here are per type only.
- Data not in box: the per-level and per-primary values and the XP tables live outside this repo's default mod. We cannot quote their numbers.

Best transferable idea: one function builds every derived stat from level, spent points and summed bonuses, in a fixed order, with a floor, so a character sheet and a fight read the same numbers.
Decision (proposed): adopt — the stack (base from level and points, then additive and multiplicative bonuses, then a floor) is the simplest honest way to get derived stats from attributes; take it as is, with whole-point primaries and our own names.
Acceptance: a server test computes HP for level 3 with 3 physical points, starting 10, per-level 2, per-physical 4, +5 additive and x1.5 multiplicative, and expects 40.5; the character sheet shows the same number the duel uses.

Reuse tag: adapt-idea (GPL-3.0; clean-room, shape only)
Brief rule served: 1 (one engine); 7 (licence: clean-room)
