# wesnoth-wesnoth (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/udisplay.cpp` (with `src/actions/attack.cpp`, `src/units/animation.cpp`, `src/units/animation_component.cpp`, `src/animated.tpp`, `data/core/units/bats/Bat_Blood.cfg`) | Licence: GPL-2.0-or-later (per the `src/units/udisplay.cpp` header: "either version 2 of the License, or (at your option) any later version"; the `COPYING` file is the GPL Version 2, June 1991 text) | C++ and WML | symbol `unit_attack`

Checked: `unit_attack` udisplay.cpp 598-767 (read in full); `unit_die` 571-596 (read); `attack::perform_hit` attack.cpp 856-1060 (read 856-935 and 955-1060; 936-954 not read); `attack::unit_killed` 1111-1200 (read to 1200; the plague body after 1184 not read); `unit_animator` animation.cpp 1382-1480 (read); `unit_animation::matches` 376-480 (read); `choose_animation` animation_component.cpp 46-68 (read); animated.tpp 96-108 and 205-222 (read). Blood and gore: none in this donor. `grep -rn -i blood src/` finds nothing, and there is no shake, screen-flash, splatter or gore code in `src/`. The Blood Bat has a "drain" special, which is the only blood-themed rule. camera_scope: n/a. Confidence: high on order of operations and numbers; medium on the time origin of the animation timeline (inferred from the bat's lunge, see section 1). Halo sprites (src/halo.cpp) not read. Camera: not a camera cell.

## 1. Mechanism

Wesnoth is a turn-based hex game. The "blood" here is a rule, not an effect: a drain special that heals the attacker, plus a kill animation picked from the result. One strike runs in this order.

1. Hit roll and damage (attack.cpp `perform_hit`, starts at 856). The roll sets `hits`. The damage that lands is the attacker's damage when it hits, and 0 when it misses. The function starts with a hit-roll branch that uses a credit ("bias") when `use_prng_` is set; that is combat-sim topic and is not described here.
2. Drain is computed before any HP changes (attack.cpp 911-931). `damage_done` is the damage capped at the defender's current HP (911). Drain = `damage_done * drain_percent / 100 + drain_constant` (924). It is then capped at the attacker's headroom to max HP (928) and floored at `1 - attacker hp` (931), so a recoil cannot kill the attacker by itself.
3. The display runs (`unit_attack`, udisplay.cpp 598-767). Outcome: `kill` if damage >= the defender's HP, `hit` if damage > 0, otherwise `miss` (639-646). The attacker gets its "attack" clip. The defender gets a "defend" clip chosen with the same outcome and the exact damage value. The defender's HP bar counts down while the clips play: each 50 ms step removes `damage_left / steps_left` (integer division), at least 1 (753-758). When the loop ends, the bar is set back to the HP from before the strike (765).
4. Commit (attack.cpp 976). `take_hit(damage)` lowers the real HP and returns `hp <= 0` as `dies` (unit.hpp 733-734). The HP bar in step 3 was display only.
5. Events and drain (1022, then 1040-1046). The `attacker_hits` or `defender_hits` event fires first. Then the attacker heals by the drain amount (1043), or takes recoil damage (1045). The floor at 931 keeps recoil from killing the attacker, so the attacker's death branch is never reached from recoil.
6. Death, only if `dies` (attack.cpp 1111-1200). XP for the killer is `kill_xp(level)` (1117). The `attack_end` event fires (1127). The `last_breath` event fires next (1146). If the defender still has HP above 0 after that, the function returns (1150-1152). The death is cancelled before any animation runs. Otherwise `unit_die` plays the defender's "death" clip (bars hidden) and the killer's "victory" clip, then waits for both (udisplay.cpp 580, 583, 587). Then the `die` event fires (1172). If the unit still has HP 0 or less, it is erased (1180). Plague reanimation runs only if the attacker has the plague special and the kill was not a drain kill (1184).

Clip choice (animation.cpp 376-480; animation_component.cpp 46-68). Each candidate clip is scored: it starts from `base_score_` (383) and gains +1 for each matched constraint (event, hits, exact value, unit filters, direction, attack filters). A failed constraint returns `MATCH_FAIL` (-10, animation.hpp 32). The highest score wins. Ties are broken with the client's random generator (animation_component.cpp 66-67). A clip with a `frequency` is skipped with chance 1/N (441). The hit-type filter is at 445-446.

Timeline (animation.cpp 1382-1404; animated.tpp 96-108). `unit_animator::start_animations` finds the earliest begin time among all units in the exchange and starts every clip with that value. `start_animation(offset)` sets the clip's start tick to now minus the offset (animated.tpp 104). The Blood Bat's attack clip has `start_time=-200` (Bat_Blood.cfg 132), with a lunge `offset=0.0~0.9:200,0.9~0.0:160` (131). Its defend clips have `start_time=-126` (35, 62). Reading: one shared clock whose zero is the strike. The lunge peaks at zero, so the defender's flinch starts 74 ms after the attacker's wind-in starts and 126 ms before the strike. This zero is inferred from the numbers; the donor's documentation was not searched for the meaning of `start_time` (not read).

Blood Bat drain: `specials_list=drains` (Bat_Blood.cfg 123). The canned `drains` special is "healing itself for half the amount of damage it deals (rounded down)" (weapon_specials.cfg 178-187, description at 185). The fallback death clip for a unit with no `[death]` block was not read. The Blood Bat file has no `[death]` block. The death macro `DEATH_ANIM_DIRECTIONAL_4_FRAME` (animation-utils2.cfg 114) is for units that use it.

Halo sprites are a separate overlay channel with their own start time (`halo_start_time=-100`, 13 frames of 20 ms) in the leadership and teaching clips (`data/core/macros/animation-utils.cfg`, LEADING_ANIM and TEACHING_ANIM macros). `src/halo.cpp` was not read.

## 2. Key functions

- `unit_attack`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/udisplay.cpp` 598-767. The whole kill/hit/miss display, the clip choice, the HP countdown and the restore. Runs before the real HP change (attack.cpp 965 then 976).
- Hit outcome, inside `unit_attack`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/udisplay.cpp` 639-646.
- HP countdown, inside `unit_attack`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/udisplay.cpp` 743-765 (step 50 ms at 753 and 759; integer split at 755; minimum 1 at 756; restore at 765).
- `unit_die`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/udisplay.cpp` 571-596.
- Drain and damage cap, inside `perform_hit`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 911-931.
- Commit, events and drain application, inside `perform_hit`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 976, 1022, 1040-1046.
- Death pipeline: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 1111-1184 (`unit_killed`).
- Clip scoring: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/animation.cpp` 376-480 (`unit_animation::matches`); selection: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/animation_component.cpp` 46-68.
- Shared clock: `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/animation.cpp` 1382-1404; `/mnt/frankendom-donors/wesnoth-wesnoth/src/animated.tpp` 96-108.
- Replay override of the death result: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 1000-1015. When the replay's `dies` differs from the local value, the replay value is used, and HP is set to 0 so a later check does not undo the death.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Outcome from damage vs HP: kill if damage >= HP, hit if > 0, else miss | Threshold 0 for hit (theirs, udisplay.cpp 640-645) |
| Countdown in fixed steps; each step removes floor(left / steps), at least 1 | Step 50 ms (theirs, udisplay.cpp 753, 759) |
| Clip score: base plus one per matched constraint; a failed constraint is -10 | `MATCH_FAIL` -10, `DEFAULT_ANIM` -9 (theirs, animation.hpp 32) |
| Ties broken at random among the best clips | Client rng (theirs, animation_component.cpp 67) |
| Clip timing relative to the strike | Bat attack -200 ms, defend -126 ms (theirs, Bat_Blood.cfg 132, 35, 62) |
| Lunge toward the target and back | 0.9 hex out over 200 ms, back over 160 ms (theirs, Bat_Blood.cfg 131) |
| Drain: a share of damage actually dealt, rounded down | 50 percent (theirs, attack.cpp 219 default; weapon_specials.cfg 185 says "half ... rounded down") |
| Drain headroom and floor | Cap at max HP minus HP (928); floor 1 minus HP (931) |
| Kill XP | `kill_experience * level`; level 0 gives `kill_experience / 2` (theirs, game_config.hpp 51). The value of `kill_experience` was not read. |
| Death can be cancelled before the animation | Threshold 0 HP after `last_breath` (theirs, attack.cpp 1150-1152) |

## 4. TypeScript sketch

simplified: keeps the donor order (outcome, clip and countdown, commit, drain, then death). It omits the attack-side clip and the helper clips (leadership, resistance, teaching), the directions, terrain and unit filters in the clip score, the frequency skip, the hit roll itself, the events, XP and plague reanimation, and the attacker's own death check (the donor's floor at 931 means recoil cannot kill the attacker, so the sketch applies the recoil with no attacker death path). The countdown takes the clip length as a number instead of reading the live clock, and the donor's early exit when the clip ends first is removed (the countdown always reaches the final HP). The donor's replay check is reduced to a value passed in. The death hooks are empty no-ops.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Outcome = "miss" | "hit" | "kill";
const STEP_MS = 50;      // display step for the HP countdown
const MATCH_FAIL = -10;  // score of a clip that does not apply

interface Unit { hp: number; maxHp: number; alive: boolean; }

// 1. Outcome is read from the damage that will land, before any HP changes.
function outcomeOf(damage: number, defenderHp: number): Outcome {
  if (damage >= defenderHp) return "kill";
  return damage > 0 ? "hit" : "miss";
}

// 2. Clip choice: each matching constraint adds 1; highest score wins; ties go to the rng.
interface Clip { event: "attack" | "defend"; outcome?: Outcome; damage?: number; startMs: number; lengthMs: number; baseScore: number; }

function clipScore(c: Clip, event: string, outcome: Outcome, damage: number): number {
  if (c.event !== event) return MATCH_FAIL;
  let s = c.baseScore;
  if (c.outcome !== undefined) { if (c.outcome !== outcome) return MATCH_FAIL; s += 1; }
  if (c.damage !== undefined) { if (c.damage !== damage) return MATCH_FAIL; s += 1; }
  return s;
}

function chooseClip(clips: Clip[], event: string, outcome: Outcome, damage: number, rng: () => number): Clip | undefined {
  let best = MATCH_FAIL;
  let ties: Clip[] = [];
  for (const c of clips) {
    const s = clipScore(c, event, outcome, damage);
    if (s <= MATCH_FAIL) continue;
    if (s > best) { best = s; ties = [c]; }
    else if (s === best) ties.push(c);
  }
  if (ties.length === 0) return undefined;
  return ties[Math.floor(rng() * ties.length)];
}

// 3. HP countdown over the clip. Display only: the caller commits the real HP after this.
function countdownFrames(hp: number, damage: number, clipMs: number): number[] {
  const frames: number[] = [];
  let left = damage;
  let t = 0;
  while (left > 0) {
    const steps = Math.max(1, Math.trunc((clipMs - t) / STEP_MS));
    const removed = Math.max(1, Math.trunc(left / steps));
    left -= removed;
    hp -= removed;
    frames.push(hp);
    t += STEP_MS;
  }
  return frames;
}

// 4. Drain: heal from the damage actually dealt (capped at the defender's HP), clamped to the attacker's headroom.
function drainOf(defenderHp: number, damage: number, attacker: Unit, pct: number, constant: number): number {
  const dealt = Math.min(defenderHp, damage);
  let d = Math.trunc(dealt * pct / 100) + constant;
  d = Math.min(d, attacker.maxHp - attacker.hp);
  d = Math.max(d, 1 - attacker.hp);
  return d;
}

// 5. Death: a last-breath hook runs first and can revive; the death clip plays; the die hook runs;
//    the unit is removed only if it is still at 0 HP.
function resolveDeath(u: Unit, lastBreath: () => void, deathClip: () => void, onDie: () => void): boolean {
  lastBreath();
  if (u.hp > 0) return false;
  deathClip();
  onDie();
  if (u.hp > 0) return false;
  u.alive = false;
  return true;
}

// 6. An authoritative result overrides the local one when it is given.
function diesOf(localDies: boolean, authoritative?: boolean): boolean {
  return authoritative ?? localDies;
}

// 7. One strike: pick the clip and run the countdown, then commit HP, then drain, then death.
interface StrikeResult { outcome: Outcome; frames: number[]; removed: boolean; drained: number; clipStartMs: number | undefined; }

function strike(att: Unit, def: Unit, rawDamage: number, hits: boolean, clips: Clip[], drainPct: number, drainConst: number, rng: () => number, serverDies?: boolean): StrikeResult {
  const damage = hits ? rawDamage : 0;
  const outcome = outcomeOf(damage, def.hp);
  const clip = chooseClip(clips, "defend", outcome, damage, rng);
  const frames = countdownFrames(def.hp, damage, clip ? clip.lengthMs : 0);

  const drained = hits ? drainOf(def.hp, damage, att, drainPct, drainConst) : 0;

  def.hp -= damage;                                  // commit after the clip
  const died = diesOf(def.hp <= 0, serverDies);
  if (died && def.hp > 0) def.hp = 0;                // the authoritative death is kept, not undone later
  att.hp = Math.min(att.maxHp, att.hp + drained);    // heal (positive) or recoil (negative)

  const removed = died ? resolveDeath(def, () => undefined, () => undefined, () => undefined) : false;
  return { outcome, frames, removed, drained, clipStartMs: clip ? clip.startMs : undefined };
}
```

## 5. Lands in

- TARGET `src/fight/finisher.ts` (new module: the kill clip choice, the display countdown and the commit order for one strike). Parity-checklist row 9 (finishers). The engine decides `dies`; the client only shows the clip. The death-cancel and drain rules belong to the engine too, but they are not part of this row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape only)
- Brief rule served: 1 (one engine decides the outcome; the client shows it); rules 7-9 n/a

## 6. Gaps and risks

- Client decides kill. The donor's `unit_attack` computes `kill` from the displayed damage (udisplay.cpp 640). Frankendom's kill clip must read the server's `dies` result, never the local damage check. The donor's own replay path shows the right shape: when the authoritative value differs, it wins and HP is set to 0 (attack.cpp 1000-1015). Adopt that override.
- One ledger. The HP countdown is display only and is restored before the real change (udisplay.cpp 765; commit at attack.cpp 976). Keep it that way: the client never writes HP.
- Client random tie-break. The clip among equal best matches is chosen with the client's rng (animation_component.cpp 67). Frankendom must seed that choice from the fight record and hit index (row 19), or the same fight can look different on two clients.
- Countdown can stop early. The loop ends when the clip ends (udisplay.cpp 745), so the bar can stop above the final value before the snap at 765. The sketch always reaches the final HP. Fix: drive the bar from the server's final HP.
- Rounding per step. Integer division with a minimum of 1 (755-756) gives a bar that is not a smooth line. It is fine for a bar; the sketch keeps the exact final value.
- Order of events. The `attacker_hits` event fires before the drain (1022 before 1043), so an on-hit script sees the pre-drain HP. Frankendom must pick one order and test it.
- Last breath. A hook can cancel a death before any clip (attack.cpp 1146-1152). Useful as a "last stand" rule, but in Frankendom it must be an engine rule with server verification, not a script hook that can change the result on the client. Death and respawn belong to row 17, not this row.
- No blood, gore or screen effects in this donor. Confirmed by search: no blood, gore, splatter, shake or flash code in `src/`. Blood and wound look (row 8) and hit-stop (row 10) must come from our own assets and rules; this donor gives timing and rules only.
- Bat death clip not read. Blood Bat has no `[death]` block; the fallback for units without one was not read.
- Drain is a percentage of damage dealt, capped at the defender's remaining HP, so overkill does not heal. Keep this; it is a good rule for a vampire-style boss.
- Not read: `src/halo.cpp`, the checkup class behind the replay override, the plague body (attack.cpp 1184-1200 onward), the `fire_event` internals, and the rest of `unit_die` beyond 596.
- GPL-2.0-or-later: clean-room only. The numbers (50 ms, -200 and -126 ms, 50 percent) are mechanism values, not expression, but the sketch is written from the described mechanism and was not translated line by line.

Best transferable idea: The finisher clip is chosen from the engine's own kill result, starts before the strike on one shared clock, the HP bar counts down over it, and the real HP is committed only after the clip.
Decision (proposed): adapt — keep the outcome-keyed clip and the countdown-then-commit order (the engine decides, the client shows), but take the kill flag from the server result and seed the tie-break from the fight record; the blood look is ours, since this donor has none.
Acceptance: A killing blow plays the kill clip only when the server's fight result says dies=true, the defender's HP bar counts down over the clip and ends on the server's final HP, and replaying the same fight record picks the same clip.
