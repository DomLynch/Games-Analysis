# id-Software-DOOM (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_enemy.c` (494-553 `P_LookForPlayers`, 601-640 `A_Look`, 672-775 `A_Chase`, 340-356 `P_TryWalk`, 363-460 `P_NewChaseDir`, 95-170 sound flood) with `p_inter.c` 820-925 (`P_DamageMobj`) | Licence: conflicting, treated as unclear. Root `LICENSE.TXT` is the GNU General Public License Version 2 text (line 1); `README.TXT` line 81 says "Licensed under the GNU General Public License 2.0."; but the header of `p_enemy.c` (lines 8-10) says the source is "available for distribution and/or modification only under the terms of the DOOM Source Code License as published by id Software. All rights reserved." Restricted class for this note: clean-room, shape only. | C | symbol `P_LookForPlayers`, `A_Chase`, `P_DamageMobj`

Checked: `P_LookForPlayers` (494-553) read in full; `A_Look` (601-640) read in full; `A_Chase` (672-775) read in full, the rest of the file not read; `P_TryWalk` (340-356) and `P_NewChaseDir` (363-460) read in full; `P_RecursiveSound` and `P_NoiseAlert` (95-170) read in full; `P_DamageMobj` retarget block (p_inter.c 820-925) read; `P_CheckSight` (p_sight.c 294-330) read only up to the REJECT lookup. Callers: `P_LookForPlayers` is called from `A_Look` (626), `A_Chase` (708, 759) and one more site at p_enemy.c:1982 (not read); `P_NoiseAlert` is called from p_pspr.c:256 (read only as the call). Not read: the line-of-sight code after the REJECT check (p_sight.c), `P_Move`, `P_CheckMeleeRange`, `P_CheckMissileRange`, the state table (info.c) beyond the A_Look and A_Chase references, and the netgame flag path beyond the one netgame check in A_Chase. The `BASETHRESHOLD` and `MELEERANGE` defines are not receipted because their source lines are tab-separated, which the receipt format cannot carry. Confidence: high on the look, commit and retarget order; the sight test is only partly read. camera_scope: not applicable.

## 1. Mechanism

- Two ways to see a player. Idle monsters run `A_Look` (601-627): they first take the sector's sound target (609) if it has the shootable flag (611-612), and otherwise call `P_LookForPlayers(actor, false)` (626). Chasing monsters run `A_Chase` (672-775): with no live target they call `P_LookForPlayers(actor, true)` (708); if that finds nothing they return to the spawn state (711).
- `P_LookForPlayers` (494-553) is a round-robin over the four player slots, keeping its place in `actor->lastlook` (513-515). Per call it looks at most at two in-game slots: the counter `c` is tested with `c++ == 2` (520), and the loop also ends when it reaches its starting point `stop` (`(lastlook-1)&3`, 513; the test is on 521); the two-slot cap is in the line `if (c++ == 2`, 520, which is too short to receipt but was read; the stop test is on 521). Each candidate is checked in order: skip empty slots (517), skip dead players (`health <= 0`), skip anything `P_CheckSight` cannot see (532). If the look is front-only (`allaround` false), a player more than 90 degrees off the facing (543) is ignored unless it is within `MELEERANGE` (548). A match sets `actor->target` (553) and returns true.
- Commit timer (`threshold`). `A_Look` clears it (608) when the monster goes idle, "any shot will wake up". `A_Chase` counts it down once per chase tick (680-689): if the target is missing or dead it is cleared at once (686), otherwise it decrements (689).
- Damage re-aims the monster, unless it is committed. In `P_DamageMobj` (904-911), a monster hit by a source that is not itself, and not an archvile, re-aims at the source (910) and sets the timer to `BASETHRESHOLD` (911) only when its timer is zero (904). The source can be a player or another monster. Infighting falls out of this: a hit by another monster also re-aims, if the timer is zero. The comment at 908-909 (p_inter.c) reads: "if not intent on another player, chase after this one".
- Chase retargeting in netgame. `A_Chase` re-looks all-around (759) when the monster is netgame, not committed (756) and cannot see its target (757). Single-player chases do not re-look.
- Chase movement. `P_NewChaseDir` (363-460) turns the vector to the target into up to two axis directions, using a 10-unit dead band (384, 391-396), tries the diagonal first when both axes are live (399-405), flips the order when `P_Random() > 200` or the y gap is larger (408-409), never reverses (turnaround, 416-419), and falls back to the old direction, then to a random order. `P_TryWalk` (356) sets the step commit to `P_Random()&15`: a monster keeps its direction for 0-15 steps before `A_Chase` re-decides (764-767).
- Sound flood. `P_NoiseAlert` (163-165) sets a global sound target and floods from the emitting sector through two-sided open lines (`P_RecursiveSound`, 123, 141), and a sound-blocking line lets the flood cross only once (141-145: the recursion passes a count of 1, and a second block stops it). Each flooded sector stores the target (123), and `A_Look` reads it (609).
- Tick. A_Look and A_Chase are state actions (info.c state table, read only at those references); the driver that calls states each tick was not read. The counters (threshold, movecount) are decremented per call of these actions, which the state table drives. The donor's tick is not checked for fixed step here (not read).

## 2. Key functions

- `P_LookForPlayers`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_enemy.c` 494-553. Round-robin slot scan, two in-game slots per call, front arc unless close.
- `A_Look`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_enemy.c` 601-640. Clear commit timer, sound target first, then front-arc look.
- `A_Chase`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_enemy.c` 672-775. Commit countdown, all-around re-look if no target, melee or missile, then netgame re-look and step.
- `P_DamageMobj` retarget: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_inter.c` 904-911. A hit re-aims a non-committed monster and starts its commit timer.
- `P_NewChaseDir`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_enemy.c` 363-460. Four-way grid chase with a 10-unit dead band.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Round-robin over player slots, at most two in-game slots per look, so the cost per tick is bounded | Two per look (theirs, 520); four slots (`lastlook` and `&3`, 513-515) |
| Front-arc look when idle; all-around when chasing a lost target | 90 degrees each side of facing (theirs, 543) |
| Rear target still counts when close | `MELEERANGE` (theirs, 548; define not receipted, tab-separated line) |
| Commit window after a re-aim; cleared at once if the target dies | `BASETHRESHOLD` counted down per chase tick (theirs, 911 and 689; define not receipted) |
| Re-aim on being hit, only when not committed | Source type exception for archvile (theirs, 904-906); the archvile case is not Frankendom's |
| Step commit of 0-15 before re-deciding direction | `P_Random()&15` (theirs, 356) |
| Sound flood through open sectors; one sound-blocking line may be crossed | Flood depth rule (141-145); no distance cap in the code read |
| Grid chase with a dead band | 10 map units (theirs, 384-396); grid directions |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the round-robin look with its two-slot cap and its rear-arc rule, the commit window set on a hit and counted down per chase tick, the clear on idle, and the all-around re-look when there is no live target. It omits: the sound target and the sector flood (`P_NoiseAlert`, `P_RecursiveSound`); the archvile exception; the spawn-state return when nothing is found (the caller decides); the netgame-only re-look in A_Chase; the just-attacked flag and the skill and fast-monster checks; the four-way grid chase (`P_NewChaseDir`) and step commit (`movecount`); the line-of-sight test (passed in as `sees`). Angles are radians, not the donor's fixed-point angles. `BASE_THRESHOLD` and `MELEE_RANGE` are the donor values as read at the lines named above.

```ts
// Licence: GPL-2.0 per LICENSE.TXT and README.TXT, but the p_enemy.c header says DOOM Source Code License. Conflicting, so treated as unclear. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Actor {
  id: number;
  x: number;
  y: number;
  alive: boolean;
}

interface Mon extends Actor {
  facing: number;            // radians, the direction the monster faces
  target: Actor | null;      // donor actor->target
  threshold: number;         // commit timer: while it runs, damage does not re-aim the monster
  lastLook: number;          // round-robin index over player slots (donor lastlook)
}

const BASE_THRESHOLD = 100;  // donor p_local.h:61 (the source line uses tabs, so no receipt)
const LOOK_BUDGET = 2;       // donor p_enemy.c 520: at most two in-game slots per look
const MELEE_RANGE = 64;      // donor p_enemy.c 548 (MELEERANGE; the define line uses tabs, so no receipt)

interface Sensing {
  dist: (a: Actor, b: Actor) => number;
  sees: (a: Actor, b: Actor) => boolean;
}

// Donor the rear test of P_LookForPlayers (543-548): behind the facing arc counts as a rear target.
function behind(m: Mon, p: Actor): boolean {
  let a = Math.atan2(p.y - m.y, p.x - m.x) - m.facing;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return Math.abs(a) > Math.PI / 2;
}

// Donor P_LookForPlayers (494-553): round-robin over the slots, at most two in-game slots per look.
// allAround = false is the front-arc look used when idle; a rear target inside melee range still counts.
export function lookForPlayers(m: Mon, slots: (Actor | null)[], allAround: boolean, s: Sensing): boolean {
  const n = slots.length;
  if (n === 0) return false;
  const stop = (m.lastLook - 1 + n) % n;
  let seen = 0;
  for (;; m.lastLook = (m.lastLook + 1) % n) {
    const p = slots[m.lastLook];
    if (p === null) continue;                              // slot empty (donor: !playeringame)
    if (seen++ === LOOK_BUDGET || m.lastLook === stop) return false;
    if (!p.alive) continue;
    if (!s.sees(m, p)) continue;
    if (!allAround && behind(m, p) && s.dist(m, p) > MELEE_RANGE) continue;
    m.target = p;
    return true;
  }
}

// Donor P_DamageMobj (904-911): a hit re-aims the monster only when it is not committed to a target.
export function onHit(m: Mon, source: Actor | null): void {
  if (m.threshold === 0 && source !== null && source.id !== m.id) {
    m.target = source;
    m.threshold = BASE_THRESHOLD;
  }
}

// Donor A_Chase (680-690): the commit timer counts down per chase tick and clears at once if the target is dead.
export function chaseTickCommit(m: Mon): void {
  if (m.threshold > 0) {
    if (m.target === null || !m.target.alive) m.threshold = 0;
    else m.threshold--;
  }
}

// Donor A_Look (604-627): an idle monster clears its commit timer and looks only in front.
export function idleLook(m: Mon, slots: (Actor | null)[], s: Sensing): boolean {
  m.threshold = 0;
  return lookForPlayers(m, slots, false, s);
}

// Donor A_Chase (704-713): with no live target it looks all-around; if that finds nothing it goes idle.
export function chaseRetarget(m: Mon, slots: (Actor | null)[], s: Sensing): boolean {
  if (m.target !== null && m.target.alive) return true;
  return lookForPlayers(m, slots, true, s);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new): the per-enemy look, commit window and retarget-on-hit rule. Parity-checklist row 2 (AI brain). Row 2 is the only row named; the leash and chase parts of row 4 are gaps below, not a second row here.
- today: no per-enemy look or commit rule in the fight engine.
- Reuse tag: rewrite-from-idea (licence conflicting, treated as unclear; clean-room, shape only)
- Brief rule served: one engine (look and retarget are engine logic, not client); MAX_ATTACKERS = 3 (the look budget and the commit window are the rules that keep a crowd from flipping targets)

## 6. Gaps and risks

- Licence conflict. The root LICENSE.TXT and README.TXT say GPL-2.0; the p_enemy.c header says DOOM Source Code License. Nothing copied. The owner should decide the licence before any line is taken; this note is shape only either way.
- Commit window and tick. The donor counts the window down per chase tick (A_Chase, 689), not per wall-clock second. Frankendom must set the window in its own ticks and say which tick it uses (server tick, post-K item 3 sub-line, row 18). The value 100 is the donor's and is not a Frankendom ruling.
- Re-aim on any hit is risky in many-on-one. The donor lets any non-committed monster re-aim at whoever hits it, including another monster. With MAX_ATTACKERS = 3 that can pull a fighter off the attacker it already has. The commit window is the guard; the engine must define which hits count (the one-ledger rule means the server decides the hit, not the client).
- Idle look is front-only; a fighter behind an enemy is not noticed until it is within melee range. This is a fight rule, not a camera rule, and it must be stated in the duel design before it is used, otherwise a player behind the enemy can walk in unnoticed.
- The two-slot look budget is a per-call bound on checks. With four slots and a budget of two, a fighter can take up to two looks to see everyone. Frankendom's zones can have more than four players in a fight; the look budget must be set per tick by the engine, not per slot count.
- The sound flood is level-geometry based (sector and line flags). Zones are data on one runtime, so a flood would need zone geometry the server does not have yet. Not adopted here.
- The four-way grid chase and the step commit are DOOM's grid movement. Frankendom's fights are free-form in three dimensions; the only transfer is the idea of a short step commit (0-15 steps) before re-deciding direction, which is a movement rule for the fight step (row 1), not aggro.
- Not read: the line-of-sight code after the REJECT table (p_sight.c), `P_Move`, `P_CheckMeleeRange`, `P_CheckMissileRange`, and the state table beyond the references read. Nothing above depends on them, except that "can see" is treated as an input.
- Reuse check: no prior lane implementation was looked up in this pass; the Frankendom tree was not read.

Best transferable idea: After a monster is hit it keeps its current target for a commit window (100 chase ticks in the donor), re-aims only when that window is zero, and drops the commit at once if the target dies.
Decision (proposed): adapt — take the commit window with the immediate clear on target death, and the two-slot round-robin look; reject the four-way grid chase and the sound flood, which depend on DOOM's grid and level geometry; the front-arc idle look is a design choice to decide, not adopt yet.
Acceptance: In a three-on-one server test, a fighter hit by a second enemy keeps its first target while the commit window runs, re-aims only after the window reaches zero, and clears the window at once when its target dies; a second assertion shows one look checks at most two live fighter slots.
