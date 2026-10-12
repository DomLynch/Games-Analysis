# swgemu-Core3 (crafting-gathering-repair, cell 30)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/` (C++ objects, managers and combat; Lua data in `MMOCoreORB/bin/scripts/managers/`) | Licence: GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007 (root `COPYING`); `bin/scripts/managers/crafting/schematics.lua` header says LGPL, version 2 or later, with an Engine3 exception. Treated as copyleft (AGPL-3.0 governs the repository) | C++ + Lua + IDL | symbols `TangibleObjectImplementation::inflictDamage`, `TangibleObjectImplementation::repair`, `WearableObjectImplementation::repairAttempt`, `WeaponObjectImplementation::decay`, `CombatManager::getArmorObject`, `TangibleObject::getConditionReduction`, `ResourceSpawner::randomizeValue`, `RandomPool::update`, `SpawnDensityMap::getDensityAt`, `CraftingManagerImplementation::calculateExperimentationFailureRate`

Checked: Read in full or in the stated range: `objects/tangible/TangibleObjectImplementation.cpp` 961-1110 (max and damage setters, both `inflictDamage` overloads, `healDamage`) and 1326-1444 (`repair`); `objects/tangible/wearables/WearableObjectImplementation.cpp` 225-262 (`repairAttempt`); `objects/tangible/weapon/WeaponObjectImplementation.cpp` 712-770 (`repairAttempt`, `decay`); `managers/combat/CombatManager.cpp` 2314-2321 and 2540-2600 (per-hit armour and PSG wear); `objects/tangible/TangibleObject.idl` 820-841 (`isBroken`, `getConditionReduction`); `objects/tangible/wearables/ArmorObjectImplementation.cpp` 450-460 (only line 456 read); `managers/resource/resourcespawner/ResourceSpawner.cpp` 103-123, 366-374, 524, 564-640; `resourcepool/RandomPool.cpp` 1-120 (update path); `objects/resource/ResourceSpawnImplementation.cpp` 24-26, 185-230; `objects/resource/SpawnDensityMap.h` 104-152; `bin/scripts/managers/resource_manager.lua` (values by line via grep); `objects/tangible/tool/recycle/RecycleResourceTask.h` (whole file); `managers/crafting/CraftingManagerImplementation.cpp` 37-100 (only the failure, mitigation and luck lines). Camera scope: not applicable. Confidence: high on the armour wear, reduction, repair and weapon decay (every number read at its line); high on the resource shift, lifetime and density shape; medium on the density-to-harvest depletion (`extractResource` and `totalUnits` use not read past creation); not read: `SharedLabratory::calculateAssemblySuccess` and the tail of the crafting success function (lines 100-186), the draft-schematic recipe contents (binary `.iff` templates; only the index file `schematics.lua` was read), the `ResourceTree` values, and the complete `ArmorObject` getters.

## 1. Mechanism

**(a) Per-piece wear by hit location.** Armour is worn per piece. A hit picks the armour piece covering the hit location, at random among those covering it (`CombatManager.cpp` 2314-2321). After the armour step, the piece takes condition damage equal to 0.2 of the damage that got through (2593). A personal shield (the utility-belt PSG) takes the same 0.2 rule first (2565). The wear is added to the piece's damage counter (`TangibleObjectImplementation.cpp` 997). The armour and PSG calls pass `destroy = true` (2565, 2593), so the max-minus-one cap for normal hits (1000) is not applied to armour: the counter can reach max, and the piece is then disabled (1013-1016). What a disabled piece does to its armour getters was not read. An anti-decay kit blocks all condition damage (994).

**(b) Armour falls off as the piece wears.** `getConditionReduction` (`TangibleObject.idl` 830-841) takes `ratio = damage / max x 100`. Below 75% the reduction is 0. From 75% up it is `(ratio - 75) / 50`, so 0 at 75% and 0.5 at 100% (838). A broken piece (max below 2, or damage at or above max; 826) loses half its value (832). Each armour getter returns `value - reduction` (`ArmorObjectImplementation.cpp` 456). Weapons use the same curve for damage and speed (`WeaponObjectImplementation.cpp` 523-557, read only as call lines).

**(c) Repair is a roll with a tiered outcome.** A repair tool matching the object type is needed (`TangibleObjectImplementation.cpp` 1334-1400). No repair is possible when damage is 0 (1342) or when max minus damage is 0 or less (1348). The chance starts from `roll = random(100)` (1401). Then +35 if the player has the repair profession (1406), + skill modifiers (repair type, `crafting_repair`, `force_repair_bonus`; 1408-1411), times a tool-quality factor `1 - ((100 - q)/2)/100` (1414-1415), +15 near a matching station (1421), minus shock wounds / 2 (1425) and complexity / 3 (1428). Then: zero if max is below 20 or roll is below 5 (1431); 100 if roll is above 95 (1434-1435). The outcome is set by the chance (`WearableObjectImplementation.cpp` 231-248; the weapon copy at `WeaponObjectImplementation.cpp` 712-733 is identical): below 25, max becomes 1; 25-49, max x 0.65; 50-74, max x 0.80; 75 and up, max x 0.95. Every tier sets damage to 0. The repair spends one use of the tool (1441).

**(d) Weapons decay on use.** `decay` (`WeaponObjectImplementation.cpp` 736-766) rolls `random(100)` (741) against a chance of 5 (742), raised by 10 when the weapon has a powerup (744-745). When the roll is under the chance, it adds one condition point (765). A lightsaber sends the point to its crystals instead (748-758).

**(e) Gathering as data: resource types, attribute ranges and shifts.** Each resource type has attribute ranges. Each attribute value is `randomizeValue(min, max)` (`ResourceSpawner.cpp` 524, 597-621): uniform in `[min, max]`, with `min` capped at `lowerGateOverride` (601). When `spawnThrottling` is below 90, a breakpoint sits at `throttle% x (max - min) + min` (607); one draw in ten (`random(9) == 7`, 608) must land above it, and nine in ten must land below it. That skews quality down. Lifetime is random in units of `aveduration` (86400 s): organic 6-22 units (626), JTL 13-22 (629), other 6-11 (632), with the timestamp at 636. The pools are replaced on a timer: `shiftResources` (366) runs each pool's update. `RandomPool::update` (48-80) replaces each slot whose spawn is empty or no longer `inShift()` (63; `inShift` is `despawned > now`, `ResourceSpawnImplementation.cpp` 24-25) with a uniform draw from the included types (71). The pool has 27 slots (`resource_manager.lua` 114), and the shift interval is 7,200,000 ms (49).

**(f) Gathering as data: density maps per zone.** A resource spawn has a density map per zone. `getDensityAt(x, y)` (`SpawnDensityMap.h` 106-114) samples simplex noise at `(x*m, y*m, seed*m)`, clips negatives to 0, and multiplies by the map's `density`. `m` is 0.00015 for ore and 0.0006 otherwise (132, 134). `density` is drawn from a band by concentration: high 0.90-0.99 (138), medium 0.75-0.95 (141), low or default 0.50-0.75 (144). `totalUnits` is 5,000,000 to 10,000,000 (150). The spawn returns 0 for any point when the spawn is out of shift (`ResourceSpawnImplementation.cpp` 195-200).

**(g) Recycling is a resource conversion, not gear salvage.** `RecycleResourceTask::run` (`RecycleResourceTask.h` 34-127) takes a resource container, refuses already-recycled or wrong-type resources (50-110), gives the player the recycled (processed) version of the same quantity (114-117), then destroys the input. No armour or weapon is salvaged.

**(h) Crafting success (partly read).** Experimentation failure rate: `int(50 + (MA - 500)/40 + expPoints - 5 x points used)`, with `expPoints = expSkill / 10` (`CraftingManagerImplementation.cpp` 51-53). Assembly mitigation: `(assembly skill - 100 + city bonus) / 7` (74), plus a force term, clamped to 0-5 in the lines after it. Experimentation luck: `random(100) + city bonus` (97), and the top result needs a roll above `95 - expbonus - force skill` (99). The rest of the success path was not read.

**(i) Recipes as rows.** `bin/scripts/managers/crafting/schematics.lua` (line 44 onwards) is an index of draft-schematic template paths, one row each (`{path="object/draft_schematic/..."}`). The recipe contents (ingredients, counts, skills) are in the binary `.iff` templates, which were not read. The index file is 1,827 lines, one template path per row; the row count was not tallied exactly.

## 2. Key functions

- `TangibleObjectImplementation::setConditionDamage` (`TangibleObjectImplementation.cpp` 977-991) and `setMaxCondition` (961-975): the two stored values.
- `TangibleObjectImplementation::inflictDamage`, both overloads (993-1020 and 1022-1060): the wear add, the max-1 cap for non-destroying hits, the disabled state.
- `TangibleObjectImplementation::healDamage` (1092-1106): repair-by-heal lowers damage, never below zero.
- `CombatManager::getArmorObject` (2314-2321) and the per-hit wear (2565, 2593): where the wear lands.
- `TangibleObject::getConditionReduction` and `isBroken` (`TangibleObject.idl` 825-841).
- `TangibleObjectImplementation::repair` (1334-1444) and `WearableObjectImplementation::repairAttempt` (231-248).
- `WeaponObjectImplementation::decay` (736-766).
- `ResourceSpawner::randomizeValue` (597-621), `getRandomExpirationTime` (624-636), `shiftResources` (366-374).
- `RandomPool::update` (`resourcepool/RandomPool.cpp` 48-80).
- `SpawnDensityMap::getDensityAt` and `initialize` (`SpawnDensityMap.h` 106-152).
- `RecycleResourceTask::run` (`RecycleResourceTask.h` 34-127).

## 3. Numbers vs mechanism

| Quantity | Formula | Number range | file:line |
|---|---|---|---|
| Wear per hit | `0.2 x damage after armour` | 0.2 of the post-armour damage | CombatManager.cpp:2593 (PSG 2565) |
| Piece picked | random among pieces covering the hit location | 1 of n | CombatManager.cpp:2314-2320 |
| Armour hit path | `destroy = true`, so no max-1 cap; counter can reach max | counter up to max | CombatManager.cpp:2593; TangibleObjectImplementation.cpp:1013-1016 |
| Normal-hit cap (not used by armour) | counter stops at max - 1 when destroy is false | max - 1 | TangibleObjectImplementation.cpp:1000 |
| Disabled | counter reaches max | disabled flag set | TangibleObjectImplementation.cpp:1013-1016 |
| Armour loss ramp | `(ratio - 75)/50`, ratio = damage/max x 100 | 0 below 75%; 0.5 at 100% | TangibleObject.idl:835-838 |
| Broken floor | keep 50% of the value | 0.5 | TangibleObject.idl:826, 832 |
| Repair luck | `random(100)` | 0-100 | TangibleObjectImplementation.cpp:1401 |
| Repair profession | +35 | 35 | TangibleObjectImplementation.cpp:1406 |
| Tool quality | `chance x (1 - ((100-q)/2)/100)` | factor 0.5 to 1.0 (q 0 to 100) | TangibleObjectImplementation.cpp:1414-1415 |
| Station | +15 near a matching station | 15 | TangibleObjectImplementation.cpp:1421 |
| Fatigue and complexity | -shock/2, -complexity/3 | halved, third | TangibleObjectImplementation.cpp:1425, 1428 |
| Hard gates | 0 if max < 20 or roll < 5; 100 if roll > 95 | 20; 5; 95 | TangibleObjectImplementation.cpp:1431, 1434-1435 |
| Repair tiers | <25: max 1; 25-49: x0.65; 50-74: x0.80; 75+: x0.95; damage 0 | four tiers | WearableObjectImplementation.cpp:234-247; WeaponObjectImplementation.cpp:712-733 |
| Tool use per repair | one use | 1 | TangibleObjectImplementation.cpp:1441 |
| Weapon decay | one point if `random(100) < 5` (+10 with powerup) | 5% or 15% per action | WeaponObjectImplementation.cpp:741-745, 765 |
| Attribute draw | uniform in [min, max]; min capped at lowerGateOverride | lowerGate 1000 (config) | ResourceSpawner.cpp:601-604; resource_manager.lua:70 |
| Throttle | breakpoint at throttle% of range; 1 in 10 above | throttle 90 (config, range 10-90) | ResourceSpawner.cpp:607-608; resource_manager.lua:62 |
| Lifetime | organic 6-22, JTL 13-22, inorganic 6-11 units of 86,400 s | 1 unit = 1 day (config) | ResourceSpawner.cpp:626-636; resource_manager.lua:55, 57 |
| Pool shift | each slot replaced if empty or not in shift; every 7,200,000 ms | 27 slots; 2 h | RandomPool.cpp:63, 71; resource_manager.lua:49, 114 |
| Density at point | `max(0, simplex(x m, y m, seed m)) x density` | density 0.50-0.99 by band | SpawnDensityMap.h:109-114, 138-144 |
| Density scale | ore 0.00015; other 0.0006 | per unit of world space | SpawnDensityMap.h:132, 134 |
| Map total | 5,000,000 to 10,000,000 units | per map | SpawnDensityMap.h:150 |
| Experiment failure | `int(50 + (MA-500)/40 + expSkill/10 - 5 x points)` | MA is the weighted attribute | CraftingManagerImplementation.cpp:51-53 |
| Assembly mitigation | `(skill - 100 + city)/7`, clamp 0-5 | 0 to 5 | CraftingManagerImplementation.cpp:74 |
| Recycle | output quantity = input quantity | 1:1 | RecycleResourceTask.h:114-117 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the hit (wear after armour; the armour caller passes destroy = true, as the donor does, so the max-minus-one cap is off for armour), the reduction ramp, the repair chance order (bonuses, then the quality multiply truncated to a whole point, then the station and penalty terms, then the two hard gates), the tier outcome, and the weapon decay roll. It omits: the PSG and piece-picking code (the caller passes the piece and the post-armour damage), the disabled-state notifications and threat map, the anti-decay kit check, the repair-tool search and use count, the messages, the piercing and resist percentages, the lightsaber crystals, and the crafting and resource code. The donor's integer truncation is kept on the quality multiply and the penalty halvings, so the sketch matches the donor's arithmetic. Nothing is reordered.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Piece { maxCond: number; dmg: number; }

// Condition damage one hit adds to the piece at the hit location: 0.2 of the damage that got past the armour.
export function hitWear(damageAfterArmour: number): number {
  return damageAfterArmour * 0.2;
}

// Adds wear. A non-destroying hit stops at max - 1 (the piece is not disabled by a normal hit).
export function applyWear(p: Piece, wear: number, destroy: boolean): void {
  let nd = p.dmg + wear;
  if (!destroy && nd >= p.maxCond) nd = p.maxCond - 1;
  p.dmg = nd;
}

export function isBroken(p: Piece): boolean {
  return p.maxCond < 2 || p.dmg >= p.maxCond;
}

// Armour value left after wear: nothing lost below 75% damage, then a linear ramp to half
// the value at full damage. A broken piece keeps half the value.
export function armourAfterWear(value: number, p: Piece): number {
  if (isBroken(p)) return value - 0.5 * value;
  const ratio = (p.dmg / p.maxCond) * 100;
  if (ratio < 75) return value;
  const reduction = (ratio - 75) / 50; // 0 .. 0.5
  return value - reduction * value;
}

export interface RepairInput {
  roll: number;          // 0..100 luck roll
  hasProfession: boolean;
  skillMods: number;     // summed repair skill modifiers
  toolQuality: number;   // 0..100
  nearStation: boolean;
  shockWounds: number;
  complexity: number;
}

// Repair chance (0..100). Order as in the donor: roll, bonuses, quality multiply (truncated to whole
// points), station, fatigue and complexity penalties, then the hard gates.
export function repairChance(i: RepairInput, maxCond: number): number {
  let c = i.roll;
  if (i.hasProfession) c += 35;
  c += i.skillMods;
  const quality = 1 - ((100 - i.toolQuality) / 2) / 100;
  c = Math.trunc(c * quality);
  if (i.nearStation) c += 15;
  c -= Math.trunc(i.shockWounds / 2);
  c -= Math.trunc(i.complexity / 3);
  if (maxCond < 20 || i.roll < 5) c = 0;
  if (i.roll > 95) c = 100;
  return c;
}

// Outcome: damage is always cleared; the cap (max condition) is what the repair costs.
export function repairOutcome(p: Piece, chance: number): void {
  if (chance < 25) p.maxCond = 1;
  else if (chance < 50) p.maxCond = Math.trunc(p.maxCond * 0.65);
  else if (chance < 75) p.maxCond = Math.trunc(p.maxCond * 0.8);
  else p.maxCond = Math.trunc(p.maxCond * 0.95);
  p.dmg = 0;
}

// Weapon use decay: one condition point with a small chance per action (more with a powerup).
export function weaponDecayTick(roll: number, powerup: boolean): boolean {
  const chance = powerup ? 15 : 5;
  return roll < chance;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/gear-wear.ts` (proposed new module, fight-side): the per-hit wear on the piece at the hit location, the reduction ramp, and the repair tiers as one rule set. The hit call sits in the duel step (row 1), and the numbers are catalogue fields.
- PARITY ROW 21 (catalogue fields): max condition, the 75% ramp, the 0.2 wear share, the repair tiers and the weapon decay chance are item fields in Frankendom's catalogue, not engine code. Row 21 is the landing; the hit call and the duel step are not claimed as a row.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only).
- Brief rule served: 1 (one engine: wear is computed in the fight step, server-side); the catalogue numbers are data.

## 6. Gaps and risks

- AGPL-3.0: clean-room only, and a network-facing server licence. The sketch was written from the mechanism; no donor lines were translated.
- Per-hit wear picks one piece at random among pieces at the hit location (`CombatManager.cpp` 2320). Frankendom must make that choice from a server seed and record it, so a replay or a dispute can be checked.
- Integer truncation: the donor stores max condition and repair chance as ints, so the x0.65 / x0.80 / x0.95 tiers and the quality multiply truncate. The sketch keeps the truncation so the numbers match the donor. Decide whether Frankendom wants that or float values; both are defensible, but say which in the catalogue.
- The repair tier below 25 sets max to 1: a piece is effectively scrapped. Frankendom needs a designed floor or a visible warning, not the donor's silent drop.
- Disabling: armour hits pass `destroy = true` (2565, 2593), so a piece can reach max and be disabled mid-fight (1013-1016). The donor's answer is yes. Frankendom must decide whether a fight can disable a piece; if not, use the max-minus-one cap (1000) for armour hits and say so in the catalogue.
- Anti-decay kit (994) blocks all wear. If Frankendom wants a protection item, it is a catalogue flag, not a code branch.
- Weapon decay (5% per action, 15% with a powerup) is a per-action cost. Test it against the duel pace before adopting; expose the chance as data.
- Armour reduction is a fight-time value. The client shows condition; the server computes the number that counts. This matches the server-verified kills ruling.
- Gathering (section 1e-1f): the resource pools rotate every 2 hours and the density maps set node supply per zone. Frankendom has market OFF and no trading, so the rotating resource economy is out of scope. The density-by-noise shape could feed zone rows for nodes; that is a zone-rows decision, not a row 21 item. Parity row 23 (population) would be the landing if it is adopted.
- Crafting success (1h) was only partly read; the assembly success and the tail of the success path are not verified here.
- Recycling converts raw to processed resources 1:1; it is not gear salvage. The donor has no salvage of taken gear.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine; wear computed server-side in the fight step); row 21 catalogue fields

Best transferable idea: armour wears per piece at the hit location (0.2 of the post-armour damage), loses value only past 75% wear on a linear ramp to half at full wear, and is repaired by a roll: every repair clears the wear, and the roll decides how much cap the repair costs.
Decision (proposed): adapt — keep the per-hit wear share, the 75% ramp and the cap-based repair tiers as catalogue numbers; set the piece with a server seed and clear the donor's silent tier below 25 with a visible warning.
Acceptance: a fight test on a chest piece at 90% wear shows 70% of its armour value (0.3 reduction), and a repair with a 60 outcome leaves max at 80% of its old value with damage 0; both asserted on the server.
