# wesnoth-wesnoth (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/heal.cpp` (with `src/units/abilities.cpp` for the heal value combine, `src/game_config.cpp` for the defaults, `src/actions/attack.cpp` for the combat preview, `src/units/unit.hpp` for `is_healthy`) | Licence: GNU GPL version 2 or later. `COPYING` is GPL-2.0 text; `heal.cpp` header: "This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version." GPL-2.0-or-later: clean-room, shape only | C++ | symbol `calculate_healing`

Checked: read `actions/heal.cpp` from line 36 to the end (358 lines; lines 1-35 are the licence header and includes, only skimmed: poison status 36-80, `poison_progress` 84-150, `update_healing` and `heal_amount` 160-225, `do_heal` and `animate_heals` 231-286, `calculate_healing` 290-358). Read `units/abilities.cpp` 1036-1066 (`get_extremum`, a best-location helper; not on the heal path as read) and 2194-2262 (the composite heal value that `heal_amount` uses, incl. cumulative and non-cumulative rules). Read `game_config.cpp` 47-48 and 278-279 (defaults and WML override), `actions/attack.cpp` 385-392 (preview), `units/unit.hpp` 1190-1196 (`is_healthy`). Scope: status and damage-over-time, not a camera cell. Confidence: high on the order of operations (poison tick, cure ladder, heal clamp), and on the non-stacking rule (receipts cover the branch lines). Not read: `unit::heal`/`take_hit` bodies, `set_state` side effects, the wider `active_ability` loader for `heals` and `regenerate` (only the status values seen in `heal.cpp`), the replay and display path (`unit_display::unit_healing`), other magic-like effects (slow, petrify, charm) which live in other files and were not searched in this cell. Receipts quote branch and signature lines; the constant values are the donor's defaults (GPL; values are not expressive text, and the sketch uses Frankendom parameters instead).

Best transferable idea: a damage-over-time that cannot kill: it ticks only on the victim's own turn, stops at 1 HP, a three-step cure ladder (tick, slow, cure) decides whether it ticks, and non-cumulative heals take the single best source instead of a sum.
Decision (proposed): adapt - keep the cure ladder, the owner-turn tick, the 1-HP floor and the best-single-heal rule; change the tick to a fixed cadence in the engine (no turn in a real-time duel) and make the cure turn heal, not skip the heal (see D1); reject the "turn start" coupling, which does not fit a fast duel.
Acceptance: a server test asserts that a poison tick never takes a target below 1 HP, that a cure clears the poison and the same turn applies the village or healer heal, and that two non-cumulative heal sources give the better single value, not the sum.

## 1. Mechanism

Order of steps in `calculate_healing(side, update_display)` (`heal.cpp` 290-358), run once per side per turn. For each allied unit that is not `unhealable` and not incapacitated (`heal.cpp` 296-300):

(a) Rest heal first. If the patient is on this side and is resting or `is_healthy()` (`unit.hpp` 1194, the "always rest heals" flag), add the rest heal (312-313, default 2 in `game_config.cpp` 48). This happens before the poison branch, so a resting poisoned unit nets rest minus tick.

(b) Poisoned or not. If not poisoned (317): add `heal_amount` (318), the best single heal source plus the worst harm source (see (d)). If poisoned (else branch): `poison_progress` (321) returns the cure level: NORMAL, SLOW or CURE. A poisoned unit gets no `heal_amount` at all in this branch, including on the turn it is cured (defect D1).

(c) Poison tick. If the level is NORMAL and the patient is on this side (324-325): healing -= poison amount (default 8, `game_config.cpp` 47). A SLOW level stops the tick for the turn but leaves the poison. A CURE level clears the poison (see (e)). The tick is taken only on the owner's turn (comment at 322-323 and the side test at 324).

(d) Heal aggregation, `heal_amount` (181-224). Village healing and regeneration feed `update_healing`, which keeps the larger heal and the smaller (more negative) harm (163-170). Heal abilities from allied units on this side only (the list is filtered at 204-206 by side) feed the same test (213). The composite value comes from `unit_abilities::effect` (`abilities.cpp` 2217-2229): a non-cumulative value competes by maximum (2229); a cumulative value is summed (2219). So a default `heals` ability does not stack. Return is heal plus harm (224).

(e) Cure ladder, `poison_progress` (84-150). Village: cure (96-97). Regeneration with a cure value: cure (`curing = std::max(curing, ...)`, own side only, lines 99-106). Heal abilities, in order: an enemy healer does nothing (128); an allied healer can only slow (131-133); an own-side healer can cure (125, 137-140). The best level found is returned. The strength order is in the enum (61): NORMAL < SLOW < CURE.

(f) Clamp (330-332 and the matching max). Minimum heal is min(0, 1 - HP): a tick cannot take a unit below 1 HP. Maximum heal is max HP minus HP. Clamp (331-334).

(g) Apply. If the cure is CURE or the heal is non-zero, the heal is queued for display (`animate_heals`, nearest first, at 247 inside the anonymous namespace that closes at 286) or applied at once when not animating (`do_heal`, 231-238). `do_heal` clears poison on CURE (234) then heals or takes the hit.

Attack preview uses the same poison amount: `attack.cpp` 389-392 counts expected poison damage for both units in the combat forecast.

Data. Defaults: poison tick 8 (`game_config.cpp` 47), rest heal 2 (48); both can be overridden by WML (278-279). Ability values (heal amount, `max_value`, `cumulative`, the `poison` key with values `slowed` or `cured`) are per-ability data (`heal.cpp` 67-79 for the poison key; `abilities.cpp` comment block 70-82).

## 2. Key functions

- `calculate_healing`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/heal.cpp` 290-358.
- `poison_progress`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/heal.cpp` 84-150.
- `heal_amount` and `update_healing`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/heal.cpp` 163-224.
- `do_heal`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/heal.cpp` 231-238.
- composite heal value: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/abilities.cpp` 2194-2262 (`effect_impl`).
- defaults: `/mnt/frankendom-donors/wesnoth-wesnoth/src/game_config.cpp` 47-48.

## 3. Numbers vs mechanism

TABLE (donor defaults; GPL, shape only; a Frankendom value is a parameter):

| name | effect | formula | number ranges | cost | cooldown/cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Poison tick | HP lost each owner turn | healing -= poison_amount (only if level NORMAL, owner's turn) | default 8 (WML override) | HP | once per owner turn | cannot take HP below 1 | heal.cpp 324-325, 330-332; game_config.cpp 47, 278 |
| Slow level | pause the tick | level SLOW: no tick this turn, still poisoned | n/a | none | one turn | n/a | heal.cpp 61, 131-133 |
| Cure level | clear poison | level CURE: state cleared in do_heal | n/a | none | immediate | no heal that turn (D1) | heal.cpp 96-97, 137-140, 234 |
| Rest heal | slow regen when idle or healthy | +rest_heal_amount when resting or is_healthy | default 2 | none | per owner turn | none | heal.cpp 312-313; game_config.cpp 48; unit.hpp 1194 |
| Heal sources | best single heal | max over non-cumulative heal values; cumulative values summed | per ability value, max_value cap | none | per turn | max_value clamp per ability | heal.cpp 213; abilities.cpp 2217-2229 |
| Harm source | worst single harm | min over harm values (update_healing) | per ability | HP | per turn | none | heal.cpp 163-170 |
| Heal clamp | HP range | min heal = min(0, 1 - HP); max heal = max HP - HP | n/a | none | n/a | floor 1, max HP | heal.cpp 330-332 |
| Owner's turn | damage cadence | tick and rest apply only when patient side equals the side being calculated | n/a | n/a | turn-based | n/a | heal.cpp 311, 324 |
| Preview | expected poison in forecast | poisoned * poison_amount, minus HP distribution | n/a | n/a | n/a | n/a | attack.cpp 389-392 |

Which numbers suit a fast mobile fight (this reader's proposal, not donor values): a tick every 1-2 s for a real-time duel (not per turn); a tick of a few percent of max HP so a 10 s poison is a finisher, not a kill (the 1-HP floor means it cannot end a fight by itself); a cure ladder with the cure one step above slow, so a healer in the crowd can pause but a dedicated cure is rare; rest heal kept small (a regen tick only out of combat).

Defects (keep the idea, fix the defect):

- D1. The cure turn does not heal. `calculate_healing` skips `heal_amount` for any poisoned patient (317-318 with 321-325), including on the turn `poison_progress` returns CURE, so a village or healer cure applies no heal that turn. This may be intended (a cure replaces a heal) but the code does not say so. fix: on a cure turn, apply the heal the patient would have had; test it.
- D2. The tick is tied to the owner's turn (324). In real time there is no turn. fix: a fixed cadence in the engine; the tick applies to the owner's unit clock, not to a side.
- D3. Healer lookups assume the healer still exists (`assert(cure_it != units.end())` at 122; `assert(healer != units.end())` at 206). A stale reference (a healer killed this turn) trips an assert in debug and is undefined in release. fix: resolve the healer by id at tick time; a missing healer contributes nothing. Frankendom's server-verified rule needs this.
- D4. `heal_amount` and `poison_progress` read healers by location (`teacher_loc`), so a healer that moves between the two calls can change the result. fix: fix the healer set once per tick.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (rest first, then heal for the unpoisoned or the tick for the poisoned, then the 1-HP floor and max-HP clamp) and the three-level cure ladder (none, slow, cure), and it uses only the best non-cumulative heal. It reorders nothing inside the donor's clamp. It omits: the enemy and ally side checks (the caller supplies the best cure level), the `unhealable` and incapacitated skip, the animation queue (`animate_heals`, nearest first), the replay and display path, the cumulative heal sums, harm sources (`update_healing`'s worst-harm branch), the attack preview, WML overrides and the per-ability `max_value`. It also drops the donor's D1 behaviour on purpose: the cure turn applies the heal (see D1 fix), so the sketch differs from the donor there.

```ts
// clean-room sketch (GPL-2.0-or-later donor; shape only, no donor text or lines carried over).
// Numbers are Frankendom parameters chosen by the caller, not donor values.
type Cure = "none" | "slow" | "cure"; // none = ticks; slow = no tick this turn, still poisoned; cure = cleared

interface Patient {
  hp: number;
  maxHp: number;
  poisoned: boolean;
  ownTurn: boolean;   // rest and poison damage apply only on the owner's turn
  resting: boolean;
  healthy: boolean;   // donor flag: "always rest heals"
}

interface Turn {
  cure: Cure;          // best cure this turn: a village or an own-side healer cures; an allied healer slows
  heals: number[];     // non-cumulative heal sources; only the best single value applies
  tickDamage: number;  // poison tick per owner turn
  restHeal: number;    // rest heal per owner turn
}

interface Result { delta: number; clearPoison: boolean; }

function turnResult(p: Patient, t: Turn): Result {
  let delta = 0;
  // Rest heal is added before the poison branch, so a resting poisoned unit nets rest minus tick.
  if (p.ownTurn && (p.resting || p.healthy)) delta += t.restHeal;
  // Heals are not applied to a poisoned unit, even on the turn it is cured.
  if (!p.poisoned && t.heals.length > 0) delta += Math.max(...t.heals);
  if (p.poisoned && t.cure === "none" && p.ownTurn) delta -= t.tickDamage;
  // Clamp: poison cannot take a unit below 1 HP; healing cannot exceed max HP.
  const maxHeal = Math.max(0, p.maxHp - p.hp);
  const minHeal = Math.min(0, 1 - p.hp);
  delta = Math.min(Math.max(delta, minHeal), maxHeal);
  return { delta, clearPoison: p.poisoned && t.cure === "cure" };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/wesnoth-poison-cure.ts` on the VPS, exit 0. Note: the sketch as written follows the donor (including D1); the D1 fix is described in section 3 and in the acceptance line, not coded.

## 5. Lands in

- TARGET `src/fight/status.ts` (new engine module: poison and cure ladder, owner-clock tick, non-cumulative heals; one engine, so the Pit and zones do not hold their own copy). Parity-checklist row 13 (specials; status and damage-over-time).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only).
- Brief rule served: 1 (one engine: status and the cure ladder in `src/fight`), 13 (specials); kills stay server-verified because a tick cannot kill (1-HP floor).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor text, lines or structure are carried over, and the donor's defaults appear only as the note's reference values.
- Turn coupling (D2): the donor ticks per side turn. Frankendom's fast duel is real-time; the tick must be on a fixed server cadence, and the server must decide the tick, not the client.
- The 1-HP floor (`heal.cpp` 330) means DoT alone never kills. That fits "kills are server-verified" (no kill from a tick), but it removes DoT as a finisher; decide that as a design rule, not by accident.
- One ledger: the tick and the heal both write HP. The one HP writer rule applies: both go through the same damage/heal function on the server.
- Many-on-one: a healer that cures one unit in a crowd is a cheap counter. Frankendom's MAX_ATTACKERS = 3 does not change the cure rule, but the healer set should be capped (not read in the donor).
- Not read: `unit::heal`/`take_hit` bodies, the `active_ability` loader for `heals` and `regenerate`, `unit_display::unit_healing`, slow/petrify/charm (separate files, not searched in this cell).
- Strategy's CC ladder (fear, root, sleep, charm) is a different file set; this note covers only poison and healing.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room)
Brief rule served: 1 (one engine); specials row 13; one HP writer
