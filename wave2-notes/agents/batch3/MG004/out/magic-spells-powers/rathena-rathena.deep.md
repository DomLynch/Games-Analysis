# rathena-rathena (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/unit.cpp` | Licence: GPL-3.0 (repo `LICENSE`: GNU GPL version 3, 29 June 2007; clean-room, shape only) | C++ | symbol `unit_skilluse_id2`

Checked: Read in full: the cast-start path (`unit_skilluse_id`, unit.cpp 1765-1772; `unit_skilluse_id2`, 2077-2100 and the status-cast and timer part 2462-2476 and 2519-2563), the cast delay (unit.cpp 1981-1990), the cancel (`unit_skillcastcancel`, 3408-3466), the pre-renewal cast-time function (`skill_castfix`, skill.cpp 10118-10195), the renewal one (`skill_vfcastfix`, 10253-10377), the cast-end delay (skill.cpp 5070-5080). Read in part: the status-effect cast modifiers (`skill_castfix_sc`, 10205-10235; the renewal modifier list 10300-10352), the damage handler `status_damage` (status.cpp 1492-1620; the guard that holds the cancel was read, the meaning of its flag bit was not), and the status timer (status.cpp 13140-13150, 14131-14355). Config values read from battle.cpp 8551-8565 and 8753; the skill DB doc header (db/re/skill_db.yml 55-90) and one example entry (380-388). Callers: `unit_skilluse_id` is the wrapper that feeds `skill_castfix`, and the `unit_skillcastcancel` call sites were listed by grep (mob.cpp:3844, pc.cpp:12444, script.cpp:22432, status.cpp 1612, 1768, 13147, 14315, 14339, 14349, unit.cpp 3599, and the mage and swordsman skill files). I read the status call sites at 1612, 13147, 14339 and 14349. Two builds exist (pre-renewal `#ifndef RENEWAL_CAST`, renewal `#ifdef`); the default build is renewal: src/config/renewal.hpp:24 defines RENEWAL and :37 defines RENEWAL_CAST by default, so the renewal formula (the one sketched) is the default and the pre-renewal DEX path is the non-default build. Confidence: high for the cast order, the cancel rule and the delay rule; medium for the exact status modifiers (only the listed ones read).

## 1. Mechanism

- Two builds, one shape. In both, a cast has: a base time from the skill DB, a set of reductions, a timer that ends the cast, a cast delay that stops the caster acting, and a cancel rule. The formulas differ.
- Start (player skill use): `unit_skilluse_id` (unit.cpp 1765-1772) takes the base time from `skill_castfix` (pre-renewal: DEX, item bonuses and Foresight applied here; renewal: only the config cast-rate multiplier, the rest is in step 2) and the skill's `castcancel` flag from the DB. `unit_skilluse_id2` (2077) runs the target and range checks, stops auto-attack for non-combo skills, sets the caster's cancel flag, then applies status modifiers (2469-2471): pre-renewal `skill_castfix_sc` (slow cast, paralysis, Izayoi, Suffragium), renewal `skill_vfcastfix` (the fixed and variable split, see section 3).
- Instant cast: if the final time is 0 or less, the cancel flag is cleared (2519-2520) and no timer is set.
- Cast timer: otherwise one timer is set for `tick + casttime` that ends in `skill_castend_id` (2562-2563). Ground skills use the same pattern with `skill_castend_pos` (2760-2761).
- Cast delay: `unit_set_castdelay` (1981-1990) sets `canact_tick = max(canact_tick, now + max(casttime, 100))` and then adds the 100 ms security delay (SECURITY_CASTTIME, skill.hpp:201). This runs at cast start (2540).
- Cast end: the security delay is taken back and the after-cast act delay is applied: `canact_tick = max(now + skill_delayfix(...), canact_tick - 100)` (skill.cpp 5076).
- Cancel: `unit_skillcastcancel(bl, type)` (unit.cpp 3408). With type bit 2 set, it only proceeds when the cast was marked cancellable; no-cancel status blocks it (3423-3428). It deletes the timer (3441), clears the timer slot (3446), resets `canact_tick` to now (3431), sets the attack delay for the cancel event (3459) and tells the client to clear the cast bar (3466). So a cancelled caster is free again at once, apart from that attack delay.
- Who cancels: (a) damage. In `status_damage`, a target that takes damage (inside a block that runs only when flag bit 1 is clear, 1560-1619) gets `unit_skillcastcancel(target, 2)` (1612), so only cancellable casts stop. (b) Status effects with the stop-casting flag, if the config lists that unit type: `unit_skillcastcancel(bl, 0)` (status.cpp 13146-13147), type 0 means always cancel. (c) Damage-tick statuses: Pyrexia (14339) and Leech End (14349) cancel with type 2 from inside `status_change_timer` (14131).
- Exemptions: a player with `no_castcancel2` is never interrupted (3426). A player with `no_castcancel` or the humming-voice status is not interrupted except on GvG maps or battleground maps (3427-3428).
- Tick: no per-frame loop. Casts are timers on the map server's timer system. The timer delay is `tick + casttime`, the same clock as the rest of the server (time units are ms, `t_tick`).

## 2. Key functions

- `unit_skilluse_id`: `/mnt/frankendom-donors/rathena-rathena/src/map/unit.cpp` 1765-1772. Wrapper: base cast time from `skill_castfix`, cancel flag from `skill_get_castcancel`, then `unit_skilluse_id2`.
- `unit_skilluse_id2`: unit.cpp 2077 onward (the function end was not read). Read for the lines in section 1 (2077-2100, 2355-2420 in part, 2462-2476, 2519-2563); the target and range checks (2100-2355) and the combo special cases were not read.
- `unit_set_castdelay`: unit.cpp 1981-1990.
- `unit_skillcastcancel`: unit.cpp 3408-3470.
- `skill_castfix` (pre-renewal): `/mnt/frankendom-donors/rathena-rathena/src/map/skill.cpp` 10122-10195.
- `skill_castfix_sc` (pre-renewal status modifiers): skill.cpp 10205-10235 (read to the return).
- `skill_vfcastfix` (renewal): skill.cpp 10253-10377 (the status modifiers 10300-10352 read in part, the final formula 10370-10377 read in full).
- Cast-end delay: skill.cpp 5070-5080.
- Damage cancel: `status_damage`, status.cpp 1492; the call at 1612.

## 3. Numbers vs mechanism

Table of mechanisms. Cost, reagent and stamina are not in this donor's cast code (the cast checks for those were not read); cooldown is the skill DB `Cooldown` field (doc line not read).

| name | effect | formula | number ranges | cost | cast time / delay | caps | file:line |
|---|---|---|---|---|---|---|---|
| DEX scale (pre-renewal) | DEX shortens the base cast | t x (scale - DEX) / scale; instant when DEX >= scale | scale 150 (default); DEX 0-150 | n/a | base time from DB | instant at DEX >= 150 | skill.cpp:10135-10141; battle.cpp:8551 |
| Item and skill cast rate (pre-renewal) | gear and skill-specific cut | t x (1 - sum / 100), then t clamped >= 0 | sum of item cuts and skill cuts (0-100 expected) | n/a | n/a | no cap in code (not clamped at 100 before the multiply) | skill.cpp:10147-10148, 10153-10156, 10184, 10192 |
| Foresight (pre-renewal) | halves the cast of learned skills; uses a counter | t x 0.5 while the counter runs; counter -1 per cast | 50 percent | n/a | n/a | not applied to skills with flag bit 2 | skill.cpp:10173-10176 |
| Variable stat cut (renewal) | speed and focus shorten the variable part | variable x (1 - sqrt((2 x DEX + INT) / 530)), flag bit 1 skips it; applied after the status variable adjustment (varcast_r, which only acts when negative, so it lengthens) and before the gear cut | stat scale 530 (default) | n/a | variable part | clamped to >= 0 | skill.cpp:10373; battle.cpp:8552 |
| Fixed/variable split (renewal) | fixed part set by DB, or 20 percent of base when absent | fixed = t x 0.20 (default); variable = t x 0.80 | 20 percent (default) | n/a | fixed part does not take the stat cut | cut percentages capped at 100 | skill.cpp:10270-10271; battle.cpp:8753 |
| Gear cut (renewal) | variable cut, fixed cut | order in the donor: variable x (1 - min(varcast_r, 100)/100) when varcast_r < 0, then stat cut, then variable x (1 - min(reduce_cast_rate, 100)/100), then add fixed x (1 - min(fixcast_r, 100)/100) | 0-100 each | n/a | n/a | cap 100 | skill.cpp:10375-10376 |
| Cast delay | caster cannot act until | canact = max(now + max(t, 100), canact) + 100 | min 100 ms; security 100 ms | n/a | cast time or 100 ms | security removed at cast end | unit.cpp:1983-1989; skill.hpp:201 |
| Cast end delay | after-cast act delay | canact = max(now + after, canact - 100) | DB field (example 500 ms) | n/a | after-cast delay | n/a | skill.cpp:5076; db/re/skill_db.yml:385 |
| Cancel on hit | a damaging hit stops a cancellable cast | cancel if castcancel true; exempt when no-cancel status (outside GvG and battleground) | DB default true | n/a | n/a | cancelled caster free at once (act tick = now) | unit.cpp:3423-3431; status.cpp:1612 |
| Stop-casting status | status always cancels | type 0 cancel | config list of unit types | n/a | n/a | n/a | status.cpp:13146-13147 |

Example skill entry (db/re/skill_db.yml 384-386): CastTime 400, AfterCastActDelay 500, FixedCastTime 100. That is a 0.4 s cast with 0.1 s fixed, then a 0.5 s lock. Which numbers suit a fast mobile fight (proposed, not measured): the structure fits. The example's 0.5 s after-cast lock is too long for a fast duel. A proposed starting point is a cast of 150-300 ms with a 50 ms fixed part and a 150 ms after-cast lock. Those values need a test on a phone.

The pre-renewal build also has an instant-cast threshold: a DEX value at or above the scale (150) returns 0, so the spell fires without a timer (skill.cpp 10135-10141).

## 4. TypeScript sketch

simplified: keeps the renewal split (the variable part is cut by a speed/focus curve and then by gear, the fixed part is cut by gear only, and the variable part is clamped before the fixed part is added; the donor order is status variable adjustment, then stat cut, then gear cut, then fixed cut, skill.cpp 10365-10377; the sketch takes the status variable adjustment as the optional `varAdjustPct` argument, negative = longer), the cancel-on-hit check with an exemption flag, the cast-start delay with its minimum, and the cast-end rule (the security delay is taken back, then the after-cast delay applies). It omits: the pre-renewal DEX formula (the donor's non-default build), the status-effect cast modifiers (slow cast, paralysis, Izayoi, Suffragium, Foresight counters), the flag bits except the stat-ignore bit, the status-triggered cancel (type 0), the ground-target path, the reset of the act tick on cancel (donor unit.cpp 3431; the sketch leaves the caller to decide), the 'casttime <= 0 clears the cancel flag' rule, and the after-cast walk delay. The donor's FixedCastTime default (a negative value triggers the 20 percent share) was not read; the sketch uses null for that case.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface CastSpec {
  castMs: number;            // CastTime for this skill level (the variable part)
  fixedMs: number | null;    // FixedCastTime; null = take the default share of castMs as fixed
  cancellableOnHit: boolean; // CastCancel
  ignoresStats: boolean;     // skill ignores the speed/focus cut
}

interface CasterStats { speed: number; focus: number; } // donor: DEX and INT

const STAT_SCALE = 530;   // donor vcast_stat_scale (renewal build)
const FIXED_SHARE = 0.2;  // donor default_fixed_castrate (20 percent)
const MIN_DELAY_MS = 100; // donor min_skill_delay_limit
const SECURITY_MS = 100;  // donor SECURITY_CASTTIME

// Renewal-style split. Variable part: cut by stats, then by gear. Fixed part: cut by gear only.
// gearCutPct and fixedCutPct are 0..100; varAdjustPct is the donor varcast_r (negative = longer), applied first.
export function castTimeMs(spec: CastSpec, s: CasterStats, gearCutPct: number, fixedCutPct: number, varAdjustPct = 0): number {
  let variable: number;
  let fixed: number;
  if (spec.fixedMs === null) {
    fixed = spec.castMs * FIXED_SHARE;
    variable = spec.castMs - fixed;
  } else {
    variable = spec.castMs;
    fixed = spec.fixedMs;
  }
  // donor varcast_r: only acts when negative (a status that lengthens the variable part); applied before the stat cut
  if (varAdjustPct < 0) variable = variable * (1 - Math.min(varAdjustPct, 100) / 100);
  if (!spec.ignoresStats) {
    variable = variable * (1 - Math.sqrt((2 * s.speed + s.focus) / STAT_SCALE));
  }
  variable = variable * (1 - Math.min(gearCutPct, 100) / 100);
  const v = Math.max(Math.floor(variable), 0); // clamp the variable part before the fixed part is added
  const f = Math.max(fixed, 0) * (1 - Math.min(fixedCutPct, 100) / 100);
  return Math.floor(v + f);
}

export interface ActiveCast { skillId: string; endsAtMs: number; cancellable: boolean; }

// A damaging hit on the caster. exempt is computed by the caller (donor: no-cancel status outside GvG and battlegrounds).
export function onDamage(cast: ActiveCast | null, exempt: boolean): ActiveCast | null {
  if (cast === null) return null;
  if (!cast.cancellable || exempt) return cast;
  return null;
}

// Cast start delay: the caster may act again at max(current, now + max(castMs, minDelay)) + security.
export function canActAtMs(nowMs: number, castMs: number, currentCanActMs: number): number {
  const delay = Math.max(castMs, MIN_DELAY_MS);
  return Math.max(currentCanActMs, nowMs + delay) + SECURITY_MS;
}

// Cast end: the security delay is taken back, then the after-cast delay applies.
export function onCastEnd(currentCanActMs: number, nowMs: number, afterCastMs: number): number {
  return Math.max(nowMs + afterCastMs, currentCanActMs - SECURITY_MS);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/mg004-rathena-rathena.ts`) exits 0.

## 5. Lands in

- TARGET `src/fight/cast.ts` (new module: cast time, cancel-on-hit and the act delay). The server runs the cast and the cancel; the client only shows the cast bar.
- Parity-checklist row 13 (specials). A special that is a cast uses this module; a special that is a melee move does not.
- Data fields: cast time, fixed part, cancellable flag, after-cast delay, stat-ignore flag and the cut percentages are data (see the JSON sidecar).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the cast and its cancel are server-verified); rules 7-9 n/a

## 6. Gaps and risks

- Frankendom rule (server-verified kills, one engine): the cancel must run in the server's damage step, on the same tick as the hit. A client that shows the bar and keeps casting after a server cancel is a defect.
- Many-on-one (MAX_ATTACKERS = 3): with three attackers, the first landed hit cancels the cast, so the rest of the hits are not counted against it. The donor cancels on any damage call that reaches the 1612 line (inferred: the order of simultaneous hits was not read). Frankendom must pick the order (server input order) and test it.
- Donor defects and fixes:
  - Two build variants with duplicated formulas (`#ifndef RENEWAL_CAST` in skill.cpp, unit.cpp). Fix: one formula with the split and the stat-ignore flag as data.
  - Pre-renewal instant cast returns 0 at skill.cpp 10141 before the Foresight counter (10173-10176) is used, so an instant spell does not spend a Foresight charge. The intent was not checked. Fix: decide the rule and test it (the sketch has no Foresight).
  - Pre-renewal item and skill cut has no cap at 100 percent (skill.cpp 10184); the renewal build caps it (10375). Fix: cap in data.
- The pre-renewal stat cut is linear (scale minus DEX over scale, instant at 150). The renewal cut is a square root of (2 x DEX + INT) over 530. A square-root curve flattens the gain at high stats. Frankendom must choose one curve and say which numbers it targets (proposed: keep the renewal curve, so the first points of speed matter most).
- Stop-casting status and damage-tick cancels (status.cpp 13146, 14339, 14349) are status effects. They must go on the one crowd-control ladder (Strategy rule c), not a second list.
- Spell-side behaviour not covered: the cast-cost checks (HP, SP, items), cooldown, the Foresight counter, the after-cast walk delay and the ground-target cast were not read.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine: the cast and its cancel are server-verified); rules 7-9 n/a

Best transferable idea: a cast has a fixed windup that stats cannot remove plus a variable part that they can shorten, any landed hit cancels a cancellable cast, and a cancelled caster is free at once.

Decision (proposed): adapt - keep the fixed-plus-variable windup, the per-spell cancellable flag and the cancel-frees-caster rule; drop the pre-renewal linear cut and the duplicate build; take the cast numbers from data and tune them shorter than the donor example for a fast phone duel (proposed, not measured).

Acceptance: a server test: a 300 ms cast with a 50 ms fixed part is cancelled by one landed hit and the cast bar clears on the same tick; a spell marked not cancellable completes through a hit; after a cancel the caster can act again on the next tick (no security delay left behind); a cast with a speed stat at the top of the scale is shorter than the same cast at the base value.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: note said the default build was not checked; renewal.hpp:24 and :37 define RENEWAL and RENEWAL_CAST by default, so renewal is the default. Confirmed and fixed.
- Error: sketch order drops the donor's variable adjustment (varcast_r, skill.cpp 10365-10366, only when negative) before the stat cut; the gear cut after the stat cut (reduce_cast_rate) and fixed cut (fixcast_r) match. Confirmed; sketch gains an optional varAdjustPct.
- Not applied: MAX_ATTACKERS=3 is a Frankendom rule, not a donor value; the note already labels it inferred, so left as is.

Fixed 2026-10-12: Checked paragraph (default build is renewal), table rows for stat cut and gear cut (donor order), sketch description and sketch code (varAdjustPct), 'other build' wording.
