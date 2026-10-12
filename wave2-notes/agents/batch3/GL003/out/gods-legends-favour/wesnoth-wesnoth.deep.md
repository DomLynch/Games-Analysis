# wesnoth-wesnoth (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` | Licence: GNU GPL v2 or any later version (attack.cpp header line 8 "either version 2 of the License, or (at your option) any later version"; COPYING line 1 "GNU GENERAL PUBLIC LICENSE") | C++ with WML schedule data | symbol `generic_combat_modifier`

Checked: Read in full: attack.cpp 176-212 (damage multiplier, resistance, rounding), 1490-1532 (combat_modifier, generic_combat_modifier); utils/math.hpp 46-82 (bounded_add, round_damage); tod_manager.cpp 55, 214-272 (illuminated time of day), 591-620 (liminal calibration); terrain/terrain.hpp 140-146 (terrain light); ai/contexts.cpp 1018-1034 (the AI's damage estimate, the only other reader of the ToD term). Read in part: data/core/macros/schedules.cfg (lawful_bonus lines grepped, slot definitions 1-130 read; DEFAULT_SCHEDULE composition 136-165 not read). Callers: battle_context unit-stats constructions at attack.cpp 257-258 and 319-320 pass no explicit lawful_bonus; no other caller passing it was found by grep (attack_prediction.cpp 2678 uses a different constructor, not read). Not read: fearless trait definition (is_fearless), under_leadership (leadership value), effective_damage_type (resistance table), the weapon alignment field, tod_manager.cpp 66 resolve_random body, the 'illuminates' WML values. Confidence: high on the alignment-by-time damage term and the rounding; medium on the illumination pass (read in full, but the ability values behind it were not read). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- Domain tag: each unit has an alignment (lawful, neutral, chaotic, liminal). A weapon can override it (attack.cpp 187: `weapon->alignment().value_or(u.alignment())`).
- Time term: the schedule gives each time slot a `lawful_bonus` (data/core/macros/schedules.cfg: morning, midday and afternoon +25 at lines 30, 39, 48; first watch, midnight and second watch -25 at 69, 81, 93; underground -25 at 115; deep underground -30 at 129; the second-watch hours at 208-256 are -25, and hours 5 and 6 step to -15 (268) and -5 (280)).
- Illumination (tod_manager.cpp 214-272): the slot's value is first passed through the terrain's light bounds (222, terrain.hpp 144 `bounded_add`). Then each unit within radius with an `illuminates` ability (radius default 1, or all map; line 237) adds its effect. The pass tracks the strongest positive and negative effect (249-252). It sets `net_darker = most_add < -most_sub` (257). The base is terrain light plus the strongest opposing effect (261). Each unit's effect is added to that base with bounds (264). The best result (brightest, or darkest when net darker) is returned as the location's lawful bonus. Opposing effects therefore partly cancel.
- Alignment sign (attack.cpp 1506-1530): lawful takes +L, neutral 0, chaotic -L, liminal `max_liminal - |L|` (1521). A fearless unit has its modifier clamped at zero (1527-1528).
- Liminal maximum: at setup, `max(25, calculate_best_liminal_bonus(schedule))` (tod_manager.cpp 55). The calibration (591-620) sums the fearless lawful and chaotic modifier over the whole cycle (target, 603). It then tries each |L| value in the schedule as the liminal maximum and keeps the one whose cycle sum is closest to the target (610-614). This makes the liminal alignment, over a full day, roughly neutral to the two sides.
- Damage (attack.cpp 184-210): the multiplier starts at 100 percent (184). It adds the alignment term (189, only when an explicit lawful bonus is passed; otherwise the illuminated term from 1493 and 1503 is used). It adds leadership (197-199, value not read). It multiplies by the resistance modifier (206). Then `round_damage(base, mult, 10000)` gives the hit (209). Slowed damage uses divisor 20000 (210).
- Rounding (utils/math.hpp 78-82): the rounding offset is divisor/2, minus one when the multiplier is above the divisor (so ties round down when amplifying). Result is `max(1, floor(base x bonus + rounding) / divisor)`; a zero base stays 0.

Order of operations for one hit: slot value, then terrain light bounds, then illuminators, then alignment sign, then fearless clamp, then the 100 base, then leadership, then resistance, then rounding with a minimum of 1.

## 2. Key functions

- `generic_combat_modifier` (alignment sign and fearless clamp): `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 1506-1530.
- `combat_modifier` (illuminated ToD for a hex, then the alignment sign): same file, about 1490-1504 (the header line above 1490 was not confirmed).
- Damage multiplier and rounding inside `battle_context_unit_stats`: same file, 184-210.
- `tod_manager::get_illuminated_time_of_day`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/tod_manager.cpp` 214-272.
- `tod_manager::calculate_best_liminal_bonus`: same file, 591-620; setup use at 55.
- `bounded_add`, `round_damage`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/utils/math.hpp` 46-82.
- AI estimate: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/contexts.cpp` 1018-1034.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Domain tag picks the sign of a time-of-day modifier: lawful +L, chaotic -L, neutral 0 | L = 25 (day), -25 (night), -30 (deep underground); schedules.cfg 30-129 |
| Liminal complement: max - abs(L), with max calibrated over the cycle | Floor 25 (tod_manager.cpp 55); calibration 591-620 |
| Fearless units never take a negative time modifier | Clamp at 0 (attack.cpp 1527-1528) |
| Multiplier in percent, then resistance, then round to a divisor | Base 100 (184); divisor 10000 (209); slowed divisor 20000 (210) |
| Rounding half up, but half down when amplifying; minimum 1 | Offset divisor/2 (math.hpp 80-81) |
| Light at a location: base, then a bounded effect from nearby sources | Default illuminator radius 1 (tod_manager.cpp 237) |

## 4. TypeScript sketch

simplified: the sketch ports the alignment sign, the fearless clamp, the liminal calibration over a schedule array, the illumination pass, bounded_add and round_damage. It omits the weapon-level alignment override (the caller passes the alignment), the leadership term (an argument in the donor, not read), the resistance table (resistPct is an argument; the donor's table was not read), the slowed-damage path, the drains and blows, and the ToD slot lookup (the slot's value is an argument). Illumination takes pre-computed effects instead of reading the ability values. Only `damageFor` is a direct use of the donor's order of steps.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Alignment = 'lawful' | 'neutral' | 'chaotic' | 'liminal';

export interface Slot { lawful: number; }   // time-of-day slot lawful_bonus, as data (donor schedules.cfg)

export interface Light { mod: number; min: number; max: number; radius: number; dist: number; }

// Donor utils/math.hpp bounded_add: a step that stops at max (up) or min (down).
export function boundedAdd(base: number, inc: number, max: number, min = 0): number {
  return inc >= 0 ? Math.min(base + inc, Math.max(base, max)) : Math.max(base + inc, Math.min(base, min));
}

// Donor tod_manager.cpp: the brightest or darkest of the illuminating units, applied on a base.
export function illuminatedLawful(terrainLight: number, lights: Light[]): number {
  const active = lights.filter((l) => l.dist <= l.radius);
  if (active.length === 0) return terrainLight;
  let mostAdd = 0;
  let mostSub = 0;
  for (const l of active) {
    if (l.mod > mostAdd) mostAdd = l.mod;
    else if (l.mod < mostSub) mostSub = l.mod;
  }
  const netDarker = mostAdd < -mostSub;
  const base = terrainLight + (netDarker ? mostAdd : mostSub);
  let best = terrainLight;
  for (const l of active) {
    const r = boundedAdd(base, l.mod, l.max, l.min);
    if (netDarker ? r < best : r > best) best = r;
  }
  return best;
}

// Donor attack.cpp generic_combat_modifier: alignment decides the sign; fearless clamps at zero.
export function genericModifier(lawful: number, a: Alignment, fearless: boolean, liminalMax: number): number {
  let b = 0;
  switch (a) {
    case 'lawful': b = lawful; break;
    case 'neutral': b = 0; break;
    case 'chaotic': b = -lawful; break;
    case 'liminal': b = liminalMax - Math.abs(lawful); break;
    default: b = 0;
  }
  return fearless ? Math.max(b, 0) : b;
}

// Donor tod_manager.cpp calculate_best_liminal_bonus: pick the liminal value whose summed effect over the cycle
// is closest to the fearless lawful/chaotic total. Donor uses max(25, result) at tod_manager.cpp:55.
export function bestLiminalBonus(schedule: Slot[]): number {
  let fearlessChaotic = 0;
  let fearlessLawful = 0;
  const bonuses = new Set<number>();
  for (const s of schedule) {
    fearlessChaotic += genericModifier(s.lawful, 'chaotic', true, 0);
    fearlessLawful += genericModifier(s.lawful, 'lawful', true, 0);
    bonuses.add(Math.abs(s.lawful));
  }
  const target = Math.max(fearlessChaotic, fearlessLawful);
  let delta = target;
  let result = 0;
  for (const b of bonuses) {
    let liminal = 0;
    for (const s of schedule) liminal += genericModifier(s.lawful, 'liminal', false, b);
    if (Math.abs(target - liminal) < delta) { result = b; delta = Math.abs(target - liminal); }
  }
  return result;
}

// Donor utils/math.hpp round_damage: half-up at or below the divisor, half-down above it; minimum 1 when base > 0.
export function roundDamage(base: number, bonus: number, divisor: number): number {
  if (base === 0) return 0;
  const rounding = Math.trunc(divisor / 2) - (bonus <= divisor || divisor === 1 ? 0 : 1);
  return Math.max(1, Math.trunc(Math.trunc(base * bonus + rounding) / divisor));
}

// Donor attack.cpp: multiplier starts at 100 (percent), adds the alignment-by-time term, then multiplies by resistance.
export function damageFor(base: number, lawful: number, a: Alignment, fearless: boolean, liminalMax: number, resistPct = 100): number {
  let mult = 100;
  mult += genericModifier(lawful, a, fearless, liminalMax);
  mult = Math.trunc(mult * resistPct);
  return roundDamage(base, mult, 10000);
}

export {};
```

Best transferable idea: give each domain tag (lawful, chaotic, neutral, liminal) a time-of-day modifier read from a per-zone schedule table, so a storm god's hits swing with the hour, and calibrate the liminal (balanced) value so its sum over the cycle is close to the fearless extremes.

Decision (proposed): adapt — take the tag-by-zone-clock shape as domain data for legends (a per-zone schedule row with a lawful value per slot), with the damage step capped to a small percent and the liminal calibration kept; the three defects below are fixed in the sketch and in the AI estimate; the illumination pass is kept only if a light-source ability exists in Frankendom.
Acceptance: a server test asserts that at a slot with lawful +25 a lawful hit deals 1.25 times base, a chaotic hit 0.75 times, a neutral hit 1.0 times and a liminal hit (max 25) 1.0 times; a fearless chaotic unit at +25 deals 1.0 times; and the AI damage estimate for the same slot matches the resolved hit within rounding.

## 5. Lands in

- TARGET `src/fight/domain.ts` (new: domain tag to damage modifier, called in the duel damage step; the zone schedule row is zone data). Zone rows say which slot each hour is.
- Parity-checklist row 13 (specials), per the GL hint. The damage call site is the duel step (row 1), but the cell names row 13 only, as the hint asks.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape only)
- Brief rule served: zones as data (the schedule is a zone row); one engine (the modifier lives in the server damage step, not in the client); licence rule 7 (read: GPL v2 or later, clean-room)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described mechanism; no donor line is copied.
- Defects, each kept with its idea:
  - D1 AI estimate liminal sign (ai/contexts.cpp 1032): the estimate uses `-(std::abs(lawful_bonus))` for liminal, which is the combat rule with a zero liminal maximum. Real combat uses `max_liminal - |L|` (attack.cpp 1521, with the maximum from 1503). Example: at a slot with L = 25 and maximum 25, real liminal is 0 and the estimate gives -25. So the AI under-rates liminal attackers by the liminal maximum. fix: pass `tod_manager.get_max_liminal_bonus()` into the estimate.
  - D2 AI estimate ignores the weapon alignment override (contexts.cpp 1025-1032 uses `un.alignment()` only), while combat uses `weapon->alignment().value_or(u.alignment())` (attack.cpp 187). fix: read the weapon's alignment first.
  - D3 explicit-lawful path passes 0 as the liminal maximum (attack.cpp 189): when a caller supplies `lawful_bonus`, liminal units get `-|L|`, not the calibrated complement. No caller in this tree was found that supplies it (dormant). fix: pass `tod_m.get_max_liminal_bonus()` there too.
- Design calls to confirm, not defects: the rounding offset is one lower above 100 percent (math.hpp 80), so amplified ties round down (keep and document); the illumination pass adds each source to the strongest opposing effect rather than to the terrain alone (tod_manager.cpp 261), so opposing sources partly cancel (keep only if Frankendom wants that).
- Frankendom risk: a plus or minus 25 percent swing per hour is large for a fair fight. Cap it per zone (a data field) and keep the server as the only place the damage is computed, so the client never sees a different number.
- Not read: fearless trait, leadership value, resistance table, weapon alignment field, schedule slots 136-256 beyond the lawful lines, the illumination ability values.

## 7. TABLE (gods-legends-favour rows 1-14)

Wesnoth has no gods, no favour resource and no patron system in the parts read. The grep for bless, shrine, temple, oath, relic, piety and deity returned zero src hits. Rows marked "not read" were found by name in the src tree but not opened.

| # | name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | favour per god | none found (grep favo: 10 src files, not read) | n/a | n/a | n/a | n/a | none found |
| 2 | blessings and curses | none found (grep curse: 8 src files, not read) | n/a | n/a | n/a | n/a | none found |
| 3 | patron choice and switch | none found | n/a | n/a | n/a | n/a | none found |
| 4 | domains as tags driving damage | alignment tag (lawful, neutral, chaotic, liminal) with per-slot time term | lawful +L, chaotic -L, neutral 0, liminal max - abs(L); x damage via 100 + term, then resistance | L from -30 to +25 (schedules.cfg 30-129); liminal max floor 25 | ToD slot changes per hour; illumination per hex | none on the value; the slot cycles | attack.cpp 1506-1530, 184-210; tod_manager.cpp 55, 591-620; schedules.cfg 30-129 |
| 5 | boons at thresholds | leadership aura from an adjacent unit (value not read); fearless clamp | leadership added to multiplier (attack.cpp 197-199); fearless max(b, 0) | leadership value not read | aura present or not | n/a | attack.cpp 197-199, 1527-1528 |
| 6 | legend signature powers | none found | n/a | n/a | n/a | n/a | none found |
| 7 | shapeshifting | not read (grep transform: 38 src files) | n/a | n/a | n/a | n/a | not read |
| 8 | avatars and summons | not read (grep summon: 7 src files) | n/a | n/a | n/a | n/a | not read |
| 9 | fate and luck | random start ToD roll at setup (body not read) | resolve_random chooses a start slot | n/a | once per scenario | n/a | tod_manager.cpp 66 (signature only) |
| 10 | underworld and death | underground slots with negative lawful bonus; death rules not read | underground L -25; deep underground L -30 | -25, -30 | enters or leaves underground | n/a | schedules.cfg 115, 129 |
| 11 | mounts as rewards | not searched | n/a | n/a | n/a | n/a | not searched |
| 12 | relics | none found (grep relic: 0) | n/a | n/a | n/a | n/a | none found |
| 13 | temples and shrines as zone rows | none found (grep shrine, temple: 0); heal grep 47 files, not read | n/a | n/a | n/a | n/a | not read |
| 14 | pantheon factions and realm pride | alignment is the closest per-unit tag; faction standing not read | n/a | n/a | n/a | n/a | not read |

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data (per-zone schedule row); one engine (damage stays server-side); licence rule 7
