# crawl-crawl (enemy-ai-behaviour, cell 1)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` | Licence: GPL-2.0-or-later (donor LICENSE lines 6-9: "either version 2 of the License, or (at your option) any later version") | C++ | symbol `handle_behaviour`

Checked: Read end to end: `handle_behaviour` (mon-behv.cc 288-978) and `behaviour_event` (1063-1461), `set_nearest_monster_foe` (1004-1062), `try_pathfind` and its gate (mon-movetarget.cc 76-200), `mons_tracking_range` (mon-pathfind.cc 35-58), `monster_perception` and `check_awaken` (shout.cc 245-289), the per-turn wake pass (mon-act.cc 4285-4313), the move loop entry (mon-act.cc 1984-2483, calls only), `shake_off_monsters` (mon-behv.cc 1484-1503). Not read: the A* body (`calc_path_to_neighbours`, `get_best_position`, mon-pathfind.cc 203-346), `_monster_move` internals beyond the cornered call, `Killed`, the scale of `you.time_taken` (one assignment seen, arena.cc:847). Candidates opened: mon-behv.cc, mon-act.cc, mon-movetarget.cc, mon-pathfind.cc, mon-util.cc, shout.cc, coordit.cc, melee-attack.cc, mon-cast.cc, beam.cc, teleport.cc, files.cc, beh-type.h, mon-enum.h, docs/changelog.txt. Confidence: high on the state machine and the numbers; medium on which code raises the cornered event (the guard above mon-act.cc:4254 is only partly read). Verdict STRONG; depth full.

Best transferable idea: a monster keeps a memory timer of its foe that is set by intelligence tier and runs down while the foe is out of view, so pursuit ends on a clock instead of on sight, with a stealth roll at the last known cell.
Decision (proposed): adapt - keep the three-tier memory window, the cornered two-step and the 1-in-12 unreachable retry; move the clock to server ticks (not player action time), seed the draws, and fix the comment that claims retreaters retry every turn.
Acceptance: A server test: a human-tier creature that loses sight of a player keeps chasing for a seeded draw in its tier window (in server ticks), then goes to wander; a failed path search marks it unreachable and it retries on about 1 tick in 12; a fleeing creature that is blocked twice in a row turns to fight.

## 1. Mechanism

- The state lives on the monster: a behaviour enum (`beh_type` in beh-type.h 5-25: SLEEP, WANDER, SEEK, FLEE, CORNERED, RETREAT, WITHDRAW, BATTY, plus creation-only states), a foe, a target cell and a `foe_memory` counter.
- Tick order (handle_monster_move, mon-act.cc 1984): `handle_behaviour` (line 2321), then the step choice `_monster_move` (line 2472), then `handle_behaviour` again (line 2483). So a state change can be made by the move itself and is re-evaluated in the same turn.
- Memory decay: `_pre_monster_move` (mon-act.cc 1784-1865) subtracts `you.time_taken` from `foe_memory` once per monster move, and not while the player is under Ashenzari penance or during off-level catch-up. So the clock is player action time, not a fixed tick.
- When the foe is seen, SEEK sets `foe_memory` to a random value by intelligence tier: human 450-1000, animal 250-550, brainless 100-300 (mon-behv.cc 723-733; the comment at 723 says "Hack: smarter monsters will tend to pursue the player longer.").
- SEEK with the foe out of view (mon-behv.cc BEH_SEEK case 554-740; the memory checks are at 659-691):
  - a foe marked by a sentinel mark or haunting is tracked to its exact cell;
  - otherwise the monster walks to the last known cell. On arrival, for a player foe a stealth roll `x_chance_in_y(50, you.stealth())`, or a coinflip when the player is under Ashenzari penance (672-674), keeps the trail; on failure `foe_memory` is zeroed (679). For a monster foe, a coin flip re-targets the foe's current cell or zeroes memory (the code is marked "XXX: cheesy!" at 683);
  - when `foe_memory <= 0` the monster goes to WANDER (691).
- FLEE: stays until `isScared` is false, then returns to SEEK (855). It runs from the foe's cell (target = foe position each tick while the foe is visible).
- Blocked while fleeing (ME_CORNERED, behaviour_event 1353-1390): if the monster was already cornered, it becomes SEEK (fights back); if it was fleeing, it becomes CORNERED and saves its cell. In CORNERED, if the cell changed since the block it resumes FLEE (879); if the foe is out of view it goes to WANDER, unless the player is in view (or the monster is friendly) and the monster is not neutral and not patrolling, in which case it targets the player (BEH_CORNERED case 876-901).
- The "cornered" event is raised by the move code when a fleeing monster cannot step (mon-act.cc 4254-4256, comment "Fleeing monsters that can't move will panic and possibly turn to face their attacker"). It is also raised before a fleeing monster fires (mon-act.cc 1720).
- Attack or annoyance (ME_WHACK / ME_ANNOY, 1127-1258): the attacker becomes the foe; `try_pathfind` runs; if the target is unreachable and the monster is not brainless, it becomes RETREAT (1157-1162); if feared, the attack snaps it out of fear; otherwise SEEK (not if fleeing).
- RETREAT (840-851): path search each tick; re-seeks with chance 1 in 10 if the target is reachable; wanders with chance 1 in 5 if the player is not in view.
- Noise and notice: `check_awaken` (shout.cc 265-290) wakes a sleeping or wandering monster with `x_chance_in_y(mons_perc, stealth)`, where `mons_perc` is computed in shout.cc 253-262 from hit dice, intelligence (factors 15/20/30) and asleep state (+15 when awake), with minimum 12. The per-turn pass (mon-act.cc 4285-4313) runs this for monsters near the player; success sends ME_ALERT, then a shout is considered (shout.cc 110: one in five skips).
- Fear sources in this source: howl-type effect (melee-attack.cc 1304-1305, duration 40-70), fear spell (mon-cast.cc 6356), fear beams (beam.cc 1963-1973), teleport-related (spl-transloc.cc 2051), mass fear (item-use.cc 3105, spl-cast.cc 2714, xom.cc 2978). Sanctuary flee: `mons_start_fleeing_from_sanctuary` (mon-util.cc 3532-3543). I searched for every place that assigns BEH_FLEE across *.cc: ME_SCARE (mon-behv.cc 1343), the sanctuary path (mon-util.cc 3542), and the re-entry from CORNERED when the cell changed (mon-behv.cc 881). I found no HP-threshold flee in this source (grep-based, not a full read).
- Foe choice (`set_nearest_monster_foe`, 1004-1062): walks cells outward with `distance_iterator` (fair mode, random start angle per ring, coordit.cc 391-394), takes the first cell in LOS that holds a valid hostile (`_mons_check_foe`, 978-1003: visible, hostile, not sanctuary, LOS valid), and stops there. It does not compare candidates by score.
- Leash: a summoned monster with a leash range (table `mons_leash_range`, mon-util.cc 5988-6001: phalanx beetle 1, haunted armour 2, jade crystals, rending blade and solar ember 1, default 0 = no leash) returns to its creator when beyond range (mon-behv.cc 371). The move code refuses steps away from the creator when adjacent (mon-act.cc 3385-3395) and blocks attacks when the leash is exceeded (mon-act.cc 2436).
- Unreachable and stuck: `try_pathfind` (mon-movetarget.cc 87-186) first checks direct reach (can_go_straight or in threat range with LOS). If the target was marked unreachable it searches only with chance 1 in 12 (140). If the foe is beyond tracking range it marks the monster unreachable and returns (182-184). Otherwise it runs the A* search with a fallback (197-199) and on failure calls `_set_no_path_found` (71), which also marks nearby monsters that see the same foe.
- Withdraw (allies only): a withdrawing ally that stays on one cell gets a deadline of 30 elapsed-time units (930), then stops withdrawing.

## 2. Key functions

- `handle_behaviour`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` 288-978 (state switch, memory set 723-733, stealth roll 672-679, cornered resume 879, FLEE/RETREAT/WITHDRAW cases 840-955).
- `behaviour_event`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` 1063-1461 (ME_DISTURB, ME_WHACK/ME_ANNOY 1127-1260, ME_ALERT 1262-1325, ME_SCARE 1323-1349, ME_CORNERED 1353-1390).
- `try_pathfind`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-movetarget.cc` 87-186 (gate 140, range cut-off 180-184, A* call 197-199).
- `_set_no_path_found` and the neighbour marking: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-movetarget.cc` 22-72.
- `mons_tracking_range`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-pathfind.cc` 35-58.
- `_pre_monster_move` (memory decay): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-act.cc` 1784-1866.
- `check_awaken` and `monster_perception`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shout.cc` 245-289.
- `seen_monsters_react` (per-turn wake pass): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-act.cc` 4285-4313.
- `set_nearest_monster_foe`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` 1004-1062.
- `shake_off_monsters`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` 1484-1503 (callers: files.cc 2524, teleport.cc 272).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A foe seen once is pursued for a random window, drawn per tier; the window runs down while the foe is out of view | Memory windows: human 450-1000, animal 250-550, brainless 100-300 (mon-behv.cc 727, 730, 733). Unit: game time (player time_taken), scale not read beyond arena.cc 847 |
| Losing the trail at the last known cell is a stealth roll | `x_chance_in_y(50, you.stealth())` (mon-behv.cc 672) for the player; the monster-foe branch is a coin flip (683) |
| A blocked fleeing monster pauses one turn, then fights if still blocked | One blocked move (mon-behv.cc 1362-1386) |
| Search for a path only on a 1-in-12 retry after failure | Retry odds 1 in 12 (mon-movetarget.cc 140); no search beyond tracking range |
| Tracking range by tier | 3 / 8 / 11 cells for brainless / animal / human (mon-pathfind.cc 41, 44, 47); x5 when marked or haunted (54-56) or under penance (51-52) |
| Notice chance: perception against stealth | Factors 15 / 20 / 30 per tier, out of 20 (shout.cc 257); +15 when awake (258); HD term (5 + HD*3/2) (259); minimum 12 (262) |
| Smart monsters back off when they cannot reach the attacker | Only intelligence above brainless (mon-behv.cc 1160-1162) |
| Shout skip | One in five (shout.cc 110) |
| Forget after the player leaves by stairs or is teleported | Memory capped at 50 (mon-behv.cc 1502) |

## 4. TypeScript sketch

simplified: the sketch keeps the memory window by tier, the stealth-gated loss of trail, the cornered two-step, the 1-in-12 unreachable retry, the tracking-range cut-off and the perception formula, in the donor's order. It takes elapsed game time as an argument rather than reading player action time. It omits: the foe-marked and haunted shortcuts, the penance multiplier, the monster-foe coin flip, the RETREAT 1-in-10 re-seek and 1-in-5 wander, the 1-in-20/1-in-60 forgetting while wandering, the fear-snap branch of an attack, the just-slept check, the withdraw deadline, the leash, the foe search, and the A* search itself. It uses a seeded `Rng` argument (the donor's RNG is not read). It does not model the donor's time_taken scale.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Intel = 0 | 1 | 2; // 0 brainless, 1 animal, 2 human (donor I_BRAINLESS, I_ANIMAL, I_HUMAN)
type Beh = "wander" | "seek" | "flee" | "cornered" | "retreat";
type Rng = () => number;

interface Mon {
  intel: Intel;
  hd: number;
  beh: Beh;
  foeMemory: number;     // game-time units left to chase a foe that is out of view
  unreachable: boolean;  // the last path search failed
  blockedAt: number;     // cell index recorded when cornered
  pos: number;           // current cell index
}

const PERC_INTEL = [15, 20, 30];            // perception multiplier by intel tier (out of 20)
const MEMORY: [number, number][] = [[100, 300], [250, 550], [450, 1000]];
const TRACK_RANGE = [3, 8, 11];             // path search cut-off by intel tier

const chance = (x: number, y: number, rng: Rng): boolean => rng() * y < x; // true with odds x in y
const between = (lo: number, hi: number, rng: Rng): number => lo + Math.floor(rng() * (hi - lo + 1));

// Chance that a monster notices the player: perception against player stealth.
function perception(m: Mon, awake: boolean): number {
  const mult = PERC_INTEL[m.intel] + (awake ? 15 : 0);
  const perc = Math.floor((5 + Math.floor(m.hd * 3 / 2)) * mult / 20);
  return Math.max(12, perc);
}
function noticesPlayer(m: Mon, awake: boolean, stealth: number, rng: Rng): boolean {
  return chance(perception(m, awake), stealth, rng);
}

// A foe is in view: chase it and refresh the memory window.
function sawFoe(m: Mon, rng: Rng): void {
  m.beh = "seek";
  m.foeMemory = between(MEMORY[m.intel][0], MEMORY[m.intel][1], rng);
}

// Once per monster move: memory runs down by the game time that passed.
function decayMemory(m: Mon, elapsed: number): void {
  if (m.foeMemory > 0) m.foeMemory -= elapsed;
}

// Foe out of view. At the last known cell a stealth roll decides whether the trail is kept.
function outOfView(m: Mon, atLastKnown: boolean, stealth: number, rng: Rng, godPenance = false): "chase" | "wander" {
  if (m.foeMemory <= 0) { m.beh = "wander"; return "wander"; }
  // Donor also keeps the trail on a coin flip when the player is under a god's penance (mon-behv.cc 672-674).
  const keepsTrail = chance(50, stealth, rng) || (godPenance && rng() < 0.5);
  if (atLastKnown && !keepsTrail) { m.foeMemory = 0; m.beh = "wander"; return "wander"; }
  return "chase";
}

// The move away from the foe failed this turn (fleeing monster blocked).
function blocked(m: Mon): void {
  if (m.beh === "cornered") { m.beh = "seek"; return; }      // blocked twice in a row: turn and fight
  if (m.beh === "flee") { m.beh = "cornered"; m.blockedAt = m.pos; return; } // first block: pause one turn
  // A RETREAT monster ignores the event: the donor only reacts when the monster is fleeing or cornered (mon-behv.cc 1353-1356).
}

// Next turn: a cornered monster that has moved resumes fleeing.
function cornerTick(m: Mon): void {
  if (m.beh === "cornered" && m.pos !== m.blockedAt) m.beh = "flee";
}

// Path search gate: beyond tracking range never search; when unreachable, search 1 turn in 12.
function mayRepath(m: Mon, dist: number, rng: Rng): boolean {
  if (dist > TRACK_RANGE[m.intel]) { m.unreachable = true; return false; }
  if (m.unreachable && !chance(1, 12, rng)) return false;
  return true;
}

// Hit or annoyed by its foe: a smart monster that cannot reach the foe backs off.
function onAttacked(m: Mon): void {
  if (m.unreachable && m.intel > 0) m.beh = "retreat";
  else if (m.beh !== "flee" && m.beh !== "cornered") m.beh = "seek";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp/ai002-crawl-crawl-ai.ts) exit 0.

## 5. Lands in

- TARGET `src/fight/ai.ts` (engine AI brain: state, memory timer, path gate; server-side).
- Parity-checklist row 2 (AI brain). The leash and aggro sub-lines belong to row 4 (fight loop) and are not decided here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape not code)
- Brief rule served: 2 (one AI brain in the engine; fleeing, seeking and cornered are state changes, not client logic); addendum rule 6 (copyleft: shape only).

## 6. Gaps and risks

- Time base: the donor counts memory in player action time (`you.time_taken`), so a fast player shortens monster memory. Frankendom must count in server ticks of the fixed step (row 18 sub-line "server tick: fixed step").
- Determinism: the donor's random draws come from the global RNG and are not read per monster. Server verification needs per-creature seeded draws, or two clients will see different chases.
- Server authority: the stealth roll uses the player's stealth; in Frankendom the stealth input must come from the server's player state, never the client.
- Many-on-one: this code shows no cap on how many monsters attack one foe (the hit-cap was not searched). MAX_ATTACKERS = 3 has to be added in the engine; the donor's choice of foe is nearest-first with no score, which is the wrong shape for a 3-slot cap (a hate list is needed).
- Fear is the only flee trigger I found. An HP-threshold flee is not in this source; the changelog says it existed in older versions (see section 8). Frankendom's creature-flee row flag should not inherit a rule the donor removed.
- Cornered event: the raise point is only partly read (mon-act.cc 4254-4256); the sketch's blocked() is the donor's order as I read it, not a verified full trace.
- Donor defects, each with the fix kept in the sketch:
  - the comment at mon-movetarget.cc:139 says "Retreating monsters retry every turn" but line 140 applies the 1-in-12 gate to every monster. fix: choose one rule, test it, and correct the comment; the sketch keeps 1-in-12 for all.
  - the comment at mon-behv.cc:1003 says ties are "chosen randomly", but the code returns the first valid cell of the ring with a random start angle (coordit.cc 391-394). fix: define the tie rule in the engine (lowest id, or a seeded pick among equal distances).
  - the coin flip at mon-behv.cc:683 ("XXX: cheesy!") is a hidden rule with no stated odds. fix: replace it with a stated rule (the same stealth-style roll the player case uses, or a fixed rule), and write the odds in the data row.
  - the withdraw deadline (930) adds 30 to elapsed time. fix: express it as ticks.

## 7. As data

- Donor tables: there is no data file for AI. The rules are code plus enums: `beh_type` (beh-type.h 5-25), `mon_intel_type` (mon-enum.h 210-215), the leash switch (mon-util.cc 5988-6001), tracking range (mon-pathfind.cc 35-58), perception factors (shout.cc 257-262), memory ranges (mon-behv.cc 727-733).
- Row fields a Frankendom creature row would need (name: type):
  - intel: enum (brainless | animal | human)
  - hd: int
  - memory_min_ticks, memory_max_ticks: int
  - track_range: int (cells)
  - perception_mult_asleep: int (out of 20); awake bonus: int
  - leash_range: int (0 = none)
  - flee_mode: enum (never | fear_only | sanctuary) (the donor's only flee paths)
  - cornered_pause_ticks: int (donor 1)
  - retry_odds: "1 in N" int (donor N = 12)
- A new creature is one row: yes, if the tier and the numbers are fields and the state machine stays shared code (the donor has to edit a switch to add a leash type, so that table must move into rows). Keep the state machine in code.
- Zone data vs engine: memory and tracking can vary per zone (data); the state machine and the retry rule are engine constants.

## 8. Provenance and patch history

- Provenance: repo `crawl-crawl` (Dungeon Crawl Stone Soup), GPL-2.0-or-later, copyleft: shape only. No CLAUDE.md or AGENTS.md read.
- Patch history (donor docs/changelog.txt; version headings not read):
  - line 627: a change that stops monsters shouting when they first notice the player (the grep line is "preventing them from shouting"; the full entry was not read).
  - line 650: wandering monsters no longer notice the player automatically.
  - line 5279: monsters may no longer carry a flee ability (named bears).
  - line 5772: no random flee on re-entering a level after a short time.
  - line 7044: only a select few monsters flee at low HP.
  - line 7619: monsters retreat when hit from behind an obstacle they cannot walk through.
  - line 7626: monsters flee at lower health thresholds, and less predictably. (Line order vs version order was not read; the source read here has no HP-threshold flee.)
  - line 8261: smart monsters pathfind around shallow water.
  - line 9150: fixed monsters getting stuck in deep water while confused.
  - line 9935: friendly monsters should not flee from the player.
  - line 10103: monsters do not break fleeing when hit by missiles.
- No history line covers the 1-in-12 retry rule.

## 9. Rulings for Dom

1. Should hunting creatures keep a memory window after losing sight, in server ticks by tier (brainless / animal / human), with the donor's proportions as the starting point? Recommendation: yes; values chosen by Dom.
2. For a creature that cannot reach its target: smart creatures retreat, and every creature retries the path only 1 tick in 12? Recommendation: yes, and correct the donor comment in our code.
3. Should Frankendom creatures ever flee on low HP? The donor has no such rule in this source. Recommendation: no for bosses; yes for beasts, as a row flag `flee_mode`, with the default fear-only.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 2 (one AI brain in the engine); addendum rule 2 (judge the idea, not the genre)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Memory windows, tracking ranges, 1-in-12 retry, RETREAT odds, cornered two-step, perception, shout skip, memory cap, leash table, changelog lines and licence verified.
- Error 1: stealth roll at mon-behv.cc 672 is `x_chance_in_y(50, stealth) || (penance[GOD_ASHENZARI] && coinflip())`; the Ashenzari coinflip was omitted. Added (note and sketch parameter).
- Error 2: sketch blocked() had `retreat -> seek`; ME_CORNERED returns early unless the monster is fleeing or cornered (mon-behv.cc 1353-1356), so a RETREAT monster ignores it. Removed.
- Missed: nothing serious; the mon-behv.cc 1003 'ties chosen randomly' comment was correctly flagged.

Fixed 2026-10-12: stealth-roll line in section 1, sketch outOfView (penance coinflip) and blocked() (retreat case removed), in the note and work/crawl-crawl-ai.ts.
