# EQEmu (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/zone/mob_ai.cpp` (`Mob::StartEnrage`, `Mob::ProcessEnrage`, lines 1930-1980) and `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` (`Mob::HateSummon` 4822-4910; the special-ability row parser `Mob::ProcessSpecialAbilities` 7551-7591 and accessors 7468-7549) | Licence: GPL-3.0-or-later (file headers of `zone/mob.cpp` and `zone/mob_ai.cpp`: "either version 3 of the License, or (at your option) any later version"; `LICENSE.md` is the GPL version 3 text) | C++ | symbols `Mob::StartEnrage`, `Mob::ProcessEnrage`, `Mob::HateSummon`, `Mob::ProcessSpecialAbilities`

Checked: Read in full: `Mob::HateSummon` (4822-4910), the accessors and row parser (7468-7591), `StartEnrage`, `ProcessEnrage`, `IsEnraged` (1930-1980), the call sites in the engaged AI branch (1146, 1148, 1322-1325), the AI init and timer-disable lines (486-498, 562-574), the enrage poll in `npc.cpp` (129, 757-762), the `Timer` class (`common/timer.h` 30-50, `timer.cpp` 82-93), the rule and constant definitions (`features.h` 159-160, `ruletypes.h` 688-689), the riposte branch (`zone/attack.cpp` 486-500) and the special-ability enum (`common/emu_constants.h` 525-585). Confidence: high on the order of operations of summon and enrage and on the row format; medium on the riposte condition (`InFront` is computed earlier in `attack.cpp`, not read). Not read: `Rampage` and `AreaRampage` (`zone/tune.cpp` 1543-1554, grep only), the name of the function at `mob_ai.cpp` 555-574 that disables the ability timers, `MovePC` for summoned clients, and `IsEnraged` use in combat beyond the riposte branch. Not found: breath cones (only a comment at `zone/spells.cpp` 7164), flight for NPC bosses (no `FlyMode` or flying-NPC code located), taming and mounts (grep only, not read), armour per body part (not read). `camera_scope`: not applicable.

Best transferable idea: A boss burst is one timer that first runs as the burst length and then as the rest period, gated by an HP fraction; while it runs, every frontal melee hit is ripostes (no damage), and each boss's abilities are a data row of "id, level, up to nine numeric parameters".
Decision (proposed): adapt - take the one-timer burst window, the HP gate and the data row format, but count the rest period from the scheduled end (no drift from the poll) and spend a pull's cooldown only when a target exists. The riposte effect must become a server-verified parry state in `src/fight` (a guard-style window), not a per-client roll.
Acceptance: A server test: a boss at or below 9 percent HP starts a 10 s burst; during it every frontal melee hit is ripostes with no damage; the next burst cannot start before 360 s after the scheduled burst end, even when the 1 s poll runs late; a pull with no hate-top does not start its cooldown. A player sees the boss go to a visible enraged state at 9 percent and every frontal swing bounce off for 10 s.

## 1. Mechanism

- Data: each NPC type has a string `special_abilities` in the form `id,level,p0,p1,...^id,level,...` (`zone/npc.cpp` 908 gives a sample `1,1,3000,50^12,1^...`). `ProcessSpecialAbilities` clears all abilities (`mob.cpp` 7552), splits the string on `^` (7554), reads id and level (7565), then up to nine numeric parameters (7584-7590). `SpecialAbility::MaxParameters` is 9 (`emu_constants.h` 585). Each ability has one level value and one timer slot (`SetSpecialAbility` 7496-7502, `StartSpecialAbilityTimer` 7512-7523, `GetSpecialAbilityTimer` 7533-7539).
- Burst (enrage), in `StartEnrage` (`mob_ai.cpp` 1930-1961), called on each engaged AI tick before the range check (1146):
  (a) Stop if already in a burst (1933-1934). Stop if the ability level is 0 (1936-1937).
  (b) HP gate: the threshold is parameter 0, or the rule `NPC:StartEnrageValue` (default 9 percent) when the parameter is 0 (1939-1940). Stop if HP ratio is above it (1941-1943).
  (c) Live-like rule: if `NPC:LiveLikeEnrage` is on (default off), only player-controlled pets may burst; NPC bosses return here (1945-1948).
  (d) Rest gate: if the shared timer exists and has not expired, stop (1950-1952).
  (e) Start the shared timer for the burst length: parameter 1, or 10000 ms by default (1954-1956). Set the burst flag (1959) and announce it.
- End of burst, in `ProcessEnrage` (1963-1975), polled from the NPC's process loop: when the timer expires, start the same timer for the rest period: parameter 2, or 360000 ms by default (1969-1971), and clear the flag (1972).
- The poll: `enraged_timer` is a one-second timer (`npc.cpp` 129). When it expires the NPC calls `ProcessEnrage` (757-758), and it disables its own poll when the ability is off (761-762). So the burst end is noticed at up to one second after it happens.
- Effect of the burst: in the melee defence code, an enraged defender ripostes a frontal hit when it is allowed to riposte (`attack.cpp` 489-494), which sets the damage to ripostes and returns. No roll is made in that branch.
- Pull (summon), in `HateSummon` (`mob.cpp` 4822-4910), called only when the NPC is not in melee range (`mob_ai.cpp` 1322-1325):
  (a) Level 1 or 2 is required, and a target must exist (4828-4836).
  (b) HP gate: parameter 1, or 97 by default (4839-4843, 4840).
  (c) Cooldown: parameter 0, or 6000 ms by default (4846-4847). If the timer exists and has not expired, stop (4849-4854). Otherwise the timer is started for the cooldown (4851 or 4856) before the target is looked up.
  (d) Target: the hate-list top (4860-4861). Level 1 moves the target to about 5 units from the caster (4866-4874, 4894) and returns true. Level 2 moves the caster onto the target (4904-4906).
- Timer class: `Timer(time)` uses inexact timing by default (`common/timer.h` 34). `Check` fires when the elapsed time exceeds the period (`timer.cpp` 84), and on a reset it sets the start to the time of the check (89). So each cycle starts late by however late the check ran.
- Reset: a function containing `mob_ai.cpp` 570-573 (its name was not read) disables every ability timer, which clears the cooldowns when that function runs.

## 2. Key functions

- `Mob::StartEnrage` (burst start, gates a to e): `/mnt/frankendom-donors/EQEmu/zone/mob_ai.cpp` 1930-1961.
- `Mob::ProcessEnrage` (burst end and rest start) and `Mob::IsEnraged`: same file, 1963-1980.
- `Mob::HateSummon` (pull, gates a to d): `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 4822-4910.
- `Mob::ProcessSpecialAbilities` (row parser): `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 7551-7591.
- Timer semantics: `/mnt/frankendom-donors/EQEmu/common/timer.cpp` 82-93 and `common/timer.h` 34.
- Riposte branch: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 486-500.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (file:line) |
|---|---|
| Burst length on the shared timer | 10000 ms default (`common/features.h` 160), or the row's parameter 1 |
| Rest period on the same timer | 360000 ms default (`features.h` 159), or the row's parameter 2 |
| Burst HP gate | 9 percent default from rule `NPC:StartEnrageValue` (`common/ruletypes.h` 688); row parameter 0 overrides |
| Burst effect | frontal melee hits ripostes (`attack.cpp` 489-494) |
| Live-like rule | `NPC:LiveLikeEnrage` default false (`ruletypes.h` 689): when on, NPC bosses do not burst |
| Pull HP gate | 97 percent default (`mob.cpp` 4840); row parameter 1 overrides |
| Pull cooldown | 6000 ms default (`mob.cpp` 4847); row parameter 0 overrides; the example row in `npc.cpp` 908 uses 3000 ms and 50 percent |
| Pull distance | about 5 units from the caster (`mob.cpp` 4874) |
| Poll rate for burst end | 1000 ms (`npc.cpp` 129) |
| Data row size | 9 parameters (`emu_constants.h` 585) |

Which numbers suit a fast mobile fight: a 10 s burst every 6 minutes is long between fights and too rare for a duel; a fast duel would want a burst of 2 to 3 s with a rest of 20 to 40 s, still gated at a low HP fraction. The pull's 97 percent default means it is almost always available out of melee range, so a designer must set its HP gate on purpose.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gates in order: the level or enabled flag, the HP gate, the rest or cooldown check, then the start. It keeps one timer for the burst and the rest, the riposte rule while a burst runs, and the pull's out-of-melee check and hate-top target. It omits the live-like rule, the "already enraged" check (represented by the `active` flag), the rule lookup for defaults, the announce messages, the `MovePC` and `GMMove` calls, and the level 2 caster-to-target move. The row parser keeps the donor's rule of skipping rows with non-numeric id or level, and it fills missing parameters with 0, which matches the donor's cleared table. Two changes are fixes: the rest period counts from the scheduled burst end, not the poll time (donor: `Timer::Check` resets to the check time), and a pull spends its cooldown only when a target exists (donor: the timer starts before the target check).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface AbilityRow { id: number; level: number; params: number[] } // params: up to 9

// Donor row format: "id,level,p0,p1,...^id,level,...". Non-numeric fields are skipped.
export function parseAbilityRows(text: string): Map<number, AbilityRow> {
  const out = new Map<number, AbilityRow>();
  const isNum = (x: string): boolean => /^\d+$/.test(x);
  for (const part of text.split("^")) {
    const f = part.split(",");
    if (f.length < 2 || !isNum(f[0]) || !isNum(f[1])) continue;
    const params = f.slice(2, 2 + 9).map((x) => (isNum(x) ? Number(x) : 0));
    out.set(Number(f[0]), { id: Number(f[0]), level: Number(f[1]), params });
  }
  return out;
}

// Burst (donor: enrage). One timer: the burst length first, then the rest period.
export interface BurstSpec { enabled: boolean; hpFractionStart: number; durationMs: number; restMs: number; }
export interface BurstState { active: boolean; endAtMs: number; nowMs: number; }

// Starts a burst when the HP gate passes and the rest period is over.
export function tryStartBurst(s: BurstState, spec: BurstSpec, hpFraction: number): boolean {
  if (!spec.enabled || s.active) return false;
  if (hpFraction > spec.hpFractionStart) return false;
  if (s.nowMs < s.endAtMs) return false;   // still resting
  s.active = true;
  s.endAtMs = s.nowMs + spec.durationMs;
  return true;
}

// Called at the poll rate (donor: 1 s). The window ends at the poll, as in the donor.
// Fix: the rest period is counted from the scheduled end, not from the poll time (no drift).
export function pollBurst(s: BurstState, spec: BurstSpec): void {
  if (s.active && s.nowMs >= s.endAtMs) {
    s.active = false;
    s.endAtMs = s.endAtMs + spec.restMs;
  }
}

// While a burst is active, a frontal melee hit is ripostes (no damage).
export function ripostesFrontal(s: BurstState, inFront: boolean): boolean {
  return s.active && inFront;
}

// Pull (donor: summon). Pulls the hate-top target toward the caster when out of melee range.
// Fix: the cooldown is only spent when a target exists.
export interface PullSpec { enabled: boolean; hpFractionMax: number; cooldownMs: number; }
export interface PullState { nextAtMs: number; nowMs: number; }

export function tryPull(s: PullState, spec: PullSpec, hpFraction: number, outOfMelee: boolean, hateTop: number | null): number | null {
  if (!spec.enabled || !outOfMelee) return null;
  if (hpFraction > spec.hpFractionMax) return null;
  if (s.nowMs < s.nextAtMs) return null;
  if (hateTop === null) return null;
  s.nextAtMs = s.nowMs + spec.cooldownMs;
  return hateTop;
}
export {};
```

## 5. Lands in

- TARGET `src/fight/boss-bursts.ts` (new module: the burst window and the pull for bosses, run by the engine's fight step; the riposte rule is a guard-style parry state checked on the server). Parity-checklist row 13 (specials).
- today: no burst window in Frankendom; guard and parry are row 3, specials are row 13.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); zones as data (the row format is the zone-data shape for boss abilities)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Timing drift (defect, keep the idea): `Timer` resets to the check time (`timer.cpp` 89), and special-ability timers are built inexact (`mob.cpp` 7520; `timer.h` 34). Each cycle therefore starts late by the poll delay. Fix: count from the scheduled end (in the sketch, `pollBurst`).
- Late end (defect): the burst end is detected at the one-second poll (`npc.cpp` 129, 757). A short burst could run up to a second long. Fix: schedule the end time and check it on the fight tick, or accept the one-second window as a design rule and state it in the data.
- Cooldown spent for nothing (defect, keep the idea): `HateSummon` starts the cooldown (4851 or 4856) before it reads the hate-top target (4860-4861). With no hate-top the cooldown is used and no pull happens. Fix: check the target first (in the sketch, `tryPull`).
- Stale state (risk): `ProcessSpecialAbilities` clears every ability and deletes every timer (`mob.cpp` 7552 and the clear helper at 7541-7549), so re-running it mid-fight would reset all cooldowns. It is called from AI init (`mob_ai.cpp` 496). Frankendom should parse the row once per spawn and keep the cooldown state separate from the data.
- Live-like rule (policy): with `LiveLikeEnrage` on, NPC bosses never burst (`mob_ai.cpp` 1945-1948). This is a server rule, not a boss rule. Frankendom should not make bursts depend on a rule that turns them off for bosses.
- Riposte as a burst effect (Frankendom gap): the donor makes the burst a free parry on every frontal hit, with no stamina or roll (`attack.cpp` 489-494). Frankendom's guard and parry (row 3) have stamina costs, so the burst must either use the guard path or be an explicit ruling. The riposte branch also depends on `InFront` (not read), so the arc must be defined in Frankendom's engine.
- Frankendom gap: MAX_ATTACKERS = 3 caps melee attackers. The donor's pull has no such cap (`HateSummon` pulls one target). Nothing in the donor limits the number of pulls per burst; Frankendom must set one.
- Not read in this cell (scope): breath cones (no breath special found), flight and mounts (not found for NPC bosses), taming, armour per body part, and the spell-side dragon body-type gates (`zone/spell_effects.cpp` 7607-7621, grep only).
- Data (zone data for Frankendom, from section 3): the burst HP fraction, burst length, rest length, the pull HP fraction and cooldown, and the pull distance. The poll interval and the parameter count are engine constants.
