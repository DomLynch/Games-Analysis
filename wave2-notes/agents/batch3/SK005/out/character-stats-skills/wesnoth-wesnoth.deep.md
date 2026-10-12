# wesnoth-wesnoth (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/abilities.cpp` | Licence: GPL-2.0-or-later (file header: "either version 2 of the License, or (at your option) any later version"; the box's COPYING is GPL v2) | C++ | symbol `effect::effect`, `effect::effect_impl`, `unit::resistance_value`, `round_damage`

Checked: Read in full: `effect::effect` and `effect::effect_impl` (units/abilities.cpp 2170-2346, the composition order and the clamp); `round_damage` (utils/math.hpp 78-82); the damage multiplier block (actions/attack.cpp 184-210, the damage-type and resistance lines 205-210); `unit::resistance_value` (units/unit.cpp 1811-1823); the XP helpers (game_config.hpp 49-56, game_config.cpp 44); the award lines (actions/attack.cpp 1117-1118, 1296-1297, 1365-1371); `unit_type::experience_needed` (units/types.cpp 539-551); the advance gate (units/unit.hpp 191; actions/advancement.cpp 359); the XP-colour thresholds (units/unit.cpp 1239-1241); the trait blocks in data/core/macros/traits.cfg (128-221, the lines quoted); two unit records (data/core/units/goblins/Spearman.cfg, Wolf_Rider.cfg). Callers of `effect` that I did not read in full (grep only): actions/attack.cpp 1476, 1483; actions/heal.cpp 198, 213; tod_manager.cpp 242; units/attack_type.cpp 695. Callers of `resistance_value` read: units/attack_type.cpp 808 (via `effective_damage_type`). Not read: the movement-type resistance table behind `resistance_against`; `combat_modifier` (time-of-day values); leadership values; the advancement body after the gate at 359; the other traits (healthy only by its hit-point lines, 237-243; fearless, feral, weak, slow, loyal; dextrous and strong were read). Searched for the tick: none needed (turn-based game, no tick loop in these functions). Confidence: high on the composition order, the damage path and the XP numbers (read); medium on the clamp defect in section 6 (reasoned from the std::clamp signature, not executed; the WML test that covers the path does not fit my reading, so it is unresolved).

## 1. Mechanism

- A unit's value (for example a resistance, or any `value` in an ability) is built by one composition function, not by a chain of ad-hoc adds. `effect::effect` (abilities.cpp 2170-2190) groups the active abilities by `priority` into an ordered map (2179-2185). It walks the groups in ascending priority (2188-2190); each group starts from the previous group's composite (`value = composite_value_`).
- Inside one group (`effect_impl`, 2194-2286), each ability has a source id (its `id`, or `name`, 2210). For each source id only the strongest `add` survives (2253: a later value replaces the stored one only if larger), the strongest `sub`, the strongest `multiply` and the strongest `divide`. Different source ids stack. So two copies of the same trait do not add; a trait and a gear item do.
- Caps: a group records the smallest `max_value` and the largest `min_value` across its abilities (2240 onward). A `value` (set) ability replaces the base: the first one sets both a max and a min, later ones raise the max or lower the min, and the base becomes `max(setMax, 0) + min(setMin, 0)` (2206-2224, 2285-2294); most resistance abilities are written this way. A `cumulative` value is summed on top (2217-2221, 2318-2321; skipped in the sketch). A multiply or divide below 100 does apply: the donor keeps the largest value per source starting from nothing, not from 100 (2267-2284).
- Composite: `multiplier` is the product of (multiply/100) over sources (2308); `divisor` the product of (divide/100) (2313); composite_double = (valueSet + sum(add) - sum(sub)) x multiplier / divisor (2336), where valueSet is the base `def` unless a set `value` ability replaced it (see above). Then the clamp (2338-2344), then `std::round` to an integer (2345). The result is the next group's `def`.
- Resistance is built on this stack. `unit::resistance_value` (unit.cpp 1811-1823) starts from the movement-type base `res` (1813), keeps only the resistance abilities whose filter matches (1814-1817), builds `unit_abilities::effect` on the damage-taken scale `100 - res` (1818-1819), and returns `100 - composite` (1821). The value is a percent of damage taken (100 = normal).
- Damage: `attack` builds `damage_multiplier = 100` (attack.cpp 184), adds time-of-day through `generic_combat_modifier` (lawful bonus) or `combat_modifier` (186-194), adds leadership (197-200), then multiplies by the resistance percent (206). `round_damage(base, multiplier, 10000)` gives the normal damage and `round_damage(base, multiplier, 20000)` the slowed damage (209-210). Both are the same formula with two divisors; `slow_damage` is the damage the unit deals while it is slowed (half of the normal damage), not damage it takes.
- XP: a kill gives the attacker `kill_xp(defender level)` = 8 x level, and 4 at level 0 (attack.cpp 1117; game_config.hpp 51; game_config.cpp 44). Every fight gives each side `combat_xp(opponent level)` = 1 x opponent level (attack.cpp 1296-1297), added after the fight (1365, 1371).
- Advancement gate: a unit may advance when XP >= max XP and it can advance (unit.hpp 191). Max XP is the type's `experience` (default 500, types.cpp 370) scaled by the match's experience modifier: `(experience x modifier + 50) / 100`, at least 1 (types.cpp 541-545 for the call; 542 for the formula).

## 2. Key functions

- `effect::effect` and `effect::effect_impl`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/abilities.cpp` 2170-2346. The stat-modifier stack (priority groups, named sources, caps, composite, round).
- `round_damage`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/utils/math.hpp` 78-82. Round to nearest, ties toward the base, minimum 1 for a non-zero base.
- Damage multiplier: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 184-210, inside the constructor `battle_context_unit_stats::battle_context_unit_stats` (76-238).
- `unit::resistance_value`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/unit.cpp` 1811-1823.
- XP: `/mnt/frankendom-donors/wesnoth-wesnoth/src/game_config.hpp` 49-56; award lines in `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 1117, 1296-1297, 1365-1371.

## 3. Numbers vs mechanism

The table is the catalogue view (SK focus): name | what it does | formula | number ranges | caps | file:line. Values come from the code or the data files read; anything else is marked.

| Name | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Stat / value stack | Any unit value built from sources | ((valueSet + sum add - sum sub) x prod(mul/100) / prod(div/100)), groups by priority; valueSet = def unless a set value replaces it | add/sub: integers; mul/div in percent (100 = x1) | per-group min and max (max = smallest, min = largest across abilities) | abilities.cpp:2170-2345 |
| Named-source rule | Stops stacking of one source | per source id: strongest add, sub, mul, div only; different ids stack | - | - | abilities.cpp:2210, 2253 |
| Max HP (trait bonus) | Hit points from traits | strong: +1 total; resilient: +4 total and +1 per level; healthy: +1 total and +1 per level; quick: -5% total | per trait as listed | - | traits.cfg:144; 213, 218; 181 (healthy block not read in full) |
| Hit points (type) | Base hit points per unit type | data field | goblin Spearman 18 | - | data/core/units/goblins/Spearman.cfg:8 |
| Movement | Extra movement | +1 with quick | goblin Spearman movement 5 (data) | - | traits.cfg:177 |
| Melee damage per strike | Flat damage per blow | +1 with strong (melee only) | per trait | - | traits.cfg:140 |
| Ranged damage per strike | Flat damage per blow | +1 with dextrous (ranged only) | per trait | - | traits.cfg:158-161 |
| Max XP to advance | Experience needed | (experience x modifier + 50) / 100, at least 1; intelligent: max XP -20% | experience default 500; goblin Spearman 18 (level 0), Wolf Rider 34 (level 1); modifier 100 default | min 1 | types.cpp:370, 541-545; traits.cfg:197; data Spearman.cfg:11; Wolf_Rider.cfg:24 |
| Kill XP | XP for the killer | 8 x defender level; 4 at level 0 | kill_experience = 8 (code default) | - | game_config.hpp:51; game_config.cpp:44; attack.cpp:1117 |
| Combat XP | XP for each side, every fight | 1 x opponent level | combat_experience = 1 (code default) | - | game_config.hpp:56; attack.cpp:1296-1297, 1365, 1371 |
| Damage multiplier | Percent scale on base damage | (100 + time of day + leadership) x resistance percent | ToD and leadership values not read | - | attack.cpp:184, 200, 206 |
| Resistance | Percent of damage taken | 100 - composite over base from movement type | base from movement type (not read) | per ability max_value / min_value | unit.cpp:1811-1821 |
| Damage rounding | Final damage | round(base x mult / divisor), toward base at a tie; divisor 10000 normal, 20000 slowed | - | at least 1 for non-zero base | math.hpp:78-81; attack.cpp:209-210 |
| XP colour bands | Readout: how close to advancing | near if XP to go <= 8; mid <= 16; far <= 24 (kill_experience x 1, 2, 3) | kill_experience 8 | - | unit.cpp:1239-1241 |
| Advancement gate | When a unit may advance | XP >= max XP and can advance | - | - | unit.hpp:191; advancement.cpp:359 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: groups in ascending priority, each group reading the previous result; per named source the strongest add, sub, mul and div (a mul or div under 100 applies, as in the donor); the set-value base (max of sets above zero plus min of sets below zero); caps as the donor's three branches; composite = (base + adds - subs) x mul / div; round at the end. Differences: (a) add and sub are assumed non-negative magnitudes (sub is a magnitude, the donor stores it negative and sums it); (b) it drops the donor's `cumulative` values; (c) it drops the divide-by-zero log (a zero divide is skipped); (d) it uses the corrected clamp argument order clamp(value, min, max), not the donor's order (see section 6); (e) `roundDamage` is a copy of the donor's integer rule, not a fix; it is kept because it is the tie rule the donor uses.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Mod {
  source: string;   // named source id: one source's best add/mul/div wins, different sources stack
  priority: number; // groups apply in ascending priority; each group sees the previous result
  add?: number;     // integer points
  sub?: number;     // integer points, magnitude
  mul?: number;     // percent, 100 = x1.0
  div?: number;     // percent, 100 = x1.0
  set?: number;     // donor `value`: replaces the base (max of sets above zero plus min of sets below zero)
  max?: number;     // cap contributed by this source
  min?: number;     // floor contributed by this source
}

function roundHalfAway(x: number): number { return Math.sign(x) * Math.round(Math.abs(x)); }

// Damage: base x bonus / divisor, rounded toward base at the tie, never below 1 for a non-zero base.
function roundDamage(base: number, bonus: number, divisor: number): number {
  if (base === 0) return 0;
  const rounding = Math.floor(divisor / 2) - (bonus <= divisor || divisor === 1 ? 0 : 1);
  return Math.max(1, Math.trunc(Math.trunc(base * bonus + rounding) / divisor));
}

function applyGroup(def: number, group: Mod[]): number {
  const best = new Map<string, { add?: number; sub?: number; mul?: number; div?: number }>();
  let maxCap: number | undefined;
  let minCap: number | undefined;
  let setMax: number | undefined;
  let setMin: number | undefined;
  for (const m of group) {
    const b = best.get(m.source) ?? {};
    // Strongest per source, starting from nothing (a mul or div below 100 still applies).
    if (m.add !== undefined) b.add = b.add === undefined ? m.add : Math.max(b.add, m.add);
    if (m.sub !== undefined) b.sub = b.sub === undefined ? m.sub : Math.max(b.sub, m.sub);
    if (m.mul !== undefined) b.mul = b.mul === undefined ? m.mul : Math.max(b.mul, m.mul);
    if (m.div !== undefined && m.div !== 0) b.div = b.div === undefined ? m.div : Math.max(b.div, m.div);
    best.set(m.source, b);
    if (m.set !== undefined) {
      setMax = setMax === undefined ? m.set : Math.max(setMax, m.set);
      setMin = setMin === undefined ? m.set : Math.min(setMin, m.set);
    }
    if (m.max !== undefined) maxCap = maxCap === undefined ? m.max : Math.min(maxCap, m.max);
    if (m.min !== undefined) minCap = minCap === undefined ? m.min : Math.max(minCap, m.min);
  }
  let addition = 0, subtraction = 0, multiplier = 1, divisor = 1;
  for (const b of best.values()) {
    addition += b.add ?? 0; subtraction += b.sub ?? 0;
    multiplier *= (b.mul ?? 100) / 100; divisor *= (b.div ?? 100) / 100;
  }
  const base = setMax === undefined || setMin === undefined ? def : Math.max(setMax, 0) + Math.min(setMin, 0);
  let v = (base + addition - subtraction) * multiplier / divisor;
  // Clamp: both caps only when min < max (donor branch); the sketch passes value first.
  if (maxCap !== undefined && minCap !== undefined && minCap < maxCap) v = Math.min(maxCap, Math.max(minCap, v));
  else if (maxCap !== undefined && minCap === undefined) v = Math.min(maxCap, v);
  else if (minCap !== undefined && maxCap === undefined) v = Math.max(minCap, v);
  return roundHalfAway(v);
}

function composeStat(base: number, mods: Mod[]): number {
  const priorities = [...new Set(mods.map(m => m.priority))].sort((a, b) => a - b);
  let value = base;
  for (const p of priorities) value = applyGroup(value, mods.filter(m => m.priority === p));
  return value;
}
```

Checks on the sketch (run): typechecks with `tsc --noEmit --strict --target es2020` on the VPS (no errors). Hand-computed: `roundDamage(10, 8500, 10000)` = 9 (8.5 goes toward base 10); `roundDamage(10, 11500, 10000)` = 11 (11.5 goes toward base); a base of 30 with source A add 2, source A add 3 and source B add 5 gives 38 (not 40); one source with mul 80 on a base of 100 gives 80.

## 5. Lands in

- TARGET `src/fight/stat-stack.ts` (new, engine): the value stack (priority groups, named sources, caps) and the damage rounding helper. Server-side; the client reads the result.
- Parity-checklist row 21 (catalogue fields): trait, gear and type values are catalogue fields with source ids; the stack reads them. The XP award belongs to row 18 (loot roll and XP award), not this file.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only).
- Brief rule served: 1 (one engine: the stack is computed once for every source); rule 4 (server-verified) applies to where the composed value is computed; rules 7-9 n/a.

## 6. Gaps and risks

- Licence is GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Suspected defect, not confirmed by running: `composite_double_value_ = std::clamp(static_cast<double>(*min_value), static_cast<double>(*max_value), composite_double_value_);` (abilities.cpp 2339). `std::clamp(v, lo, hi)` takes the value first. The call passes min first, then max, then the composite. With min < max, the first branch then returns the max for any composite (because min < lo). If that reading is right, a value with both min_value and max_value is replaced by max_value. The WML test `illuminates_min_value.cfg` (both caps set, expects 110) does not fit that reading, so I cannot settle it from the code alone. Fix: `std::clamp(value, min, max)`; check against that test first. Do not port the donor's argument order.
- Damage floor: any non-zero base hit deals at least 1 after resistance (math.hpp 81). Frankendom must decide whether a fully blocked or fully resisted hit does 0; do not copy the floor silently.
- Turn-based: time-of-day and leadership are position and clock effects of a turn game. Keep the multiplier shape; drop the clock term unless Frankendom has a day cycle that the server reads.
- XP: each fight gives both sides XP (attack.cpp 1296-1297). Frankendom has one character and one ledger; award XP only from the server-verified kill or duel result, in one place (row 18).
- Traits as named sources: a trait must carry a source id, so the same trait cannot stack twice; this matches Frankendom's one-ledger rule only if the id is the trait's catalogue id.
- The donor's levels are unit levels 0 to 3 with per-type XP; Frankendom's level and class curve must be a data table (zone or catalogue), not constants in the stack.
- Section 6 claims are checked only against the lines read; the movement-type resistance table, ToD and leadership values were not read.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: 1 (one engine computes the stack once); rules 7-9 n/a

Best transferable idea: Compose every per-character value as an ordered stack of named sources where one source counts only once (its strongest entry), then clamp and round once at the end, and round damage toward the base at a tie.
Decision (proposed): adapt - the named-source stack and the tie-toward-base rounding fit a fast duel's stat and damage math; the turn clock, the XP-for-both-sides rule and the donor's clamp order do not.
Acceptance: A server test asserts a base of 30 with source A add 2, source A add 3 and source B add 5 gives 38, a lone source with mul 80 on a base of 100 gives 80, a set value of 20 on a base of 100 gives 20, and base damage 10 at 85% gives 9 and at 115% gives 11 (ties go toward base).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: (1) Section 1 says 'a slowed unit takes half'; slow_damage (attack.cpp:210) is the damage the slowed unit DEALS, not takes. (2) Sketch applyGroup initialises per-source mul/div at 100 and takes Math.max, so any multiply or divide below 100 (e.g. a 80% damage-taken reduction) is silently ignored; donor stores the first value and replaces only if larger (abilities.cpp 2267, 2279), so values under 100 do apply. Note only discloses the add/sub non-negative assumption, not this. Also note says donor 'keeps the first value even when negative' for add/sub, but donor keeps the maximum add (2253) / most negative sub (2260), starting from empty, not from 0. (3) Composite formula omits value_set: abilities with value= set the base (2286-2287 value_set = max(setmax,0)+min(setmin,0)) and replace def, which is how most resistance abilities are written; note says 'not priced here' but the formula row presents (def + add - sub) as complete. Verified OK: effect::effect 2170-2192 priority groups ascending, effect_id from id/name 2210, strongest add/sub/mul/div per source, min/max cap composition 2240-2247, composite 2336, std::clamp(min,max,composite) argument-order bug at 2339 (confirmed real: with min<max it returns max, UB if max>composite), std::round 2345, round_damage math.hpp 78-82, damage multiplier block attack.cpp 184-210, resistance_value unit.cpp 1811-1823, kill_xp 8*level or 4 (game_config.hpp 49-52, cpp 44), combat_xp, award lines 1117/1296-97/1365-71, experience_needed 541-545, default 500 at types.cpp 370, advances gate unit.hpp 191, xp_color 1239-1241, traits.cfg strong/dextrous/quick/intelligent/resilient lines, Spearman hp18/xp18/move5, Wolf Rider xp34, licence COPYING GPLv2. Acceptance (38; 10 at 85% -> 9; 115% -> 11) is correct against roundDamage(10,8500,10000) and (10,11500,10000).
Missed: Sub semantics: donor stores sub as negative and sums it (2258-2261, 2336), subtle but equivalent. The 'cumulative' path (2217-2221) and set max/min (2286-2294) are the main resistance mechanism and are only mentioned as not priced.

Fixed 2026-10-12 (Sonnet fixer): verified against abilities.cpp 2196-2346 that set `value` replaces the base, mul/div under 100 apply (first value kept, larger replaces), sub stored negative; slow_damage is damage dealt not taken (attack.cpp 209-210). Sketch applyGroup rewritten (set base, mul/div from nothing, zero divide skipped), formula rows corrected, acceptance extended; typechecked on the VPS. The clamp-order defect (2339) was confirmed by the checker and left as written.
