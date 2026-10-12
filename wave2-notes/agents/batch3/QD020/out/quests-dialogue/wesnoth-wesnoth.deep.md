# wesnoth-wesnoth (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/wesnoth-wesnoth/data/campaigns/Heir_To_The_Throne/scenarios/08b_Isle_of_the_Damned_part2.cfg (WML) + /mnt/frankendom-donors/wesnoth-wesnoth/src/carryover.cpp (C++) | Licence: GPL-2.0 (COPYING read: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") -> copyleft, clean-room, shape only | WML + C++ | symbol carryover::transfer_all_gold_to
Checked: camera_scope not applicable (quests). Read: scenario lines 150-555 (all events, objectives, endlevels), data/core/macros/carryover-utils.cfg (4-9), objective-utils.cfg (4-11), src/carryover.cpp (20-64, 111-140), src/team.cpp (grep of carryover and objectives, 166-204, 627-632), src/game_config.cpp:50, src/game_board.cpp check_victory (first half only, not used in the mechanism). Also read after the checker: KILL_COUNT (Heir_To_The_Throne/utils/macros.cfg:263-289), data/lua/carryover_gold.lua:92, data/lua/wml/endlevel.lua:70-82. Not read: the engine's evaluation of [objective] condition, nested-event registration in the event engine, the objectives dialog. The earlier claim that no code applies carryover_percentage was wrong: data/lua/carryover_gold.lua:92 does side.carryover_gold = math.ceil((side.gold + finishing_bonus) * side.carryover_percentage / 100), and data/lua/wml/endlevel.lua:79-82 sets the percentage from [endlevel]. Confidence: medium-high on the death-sweep event and the carry rule. Depth: thin.

## 1. Mechanism
A boss's death does not end the level at once. Its "last breath" event fires first: the boss speaks twice, then a nested die handler is registered (no filter, so it fires on the boss's own death right after). That handler does not wait for anything: KILL_COUNT 4 kills up to four units on sides 3, 4, 5 (the macro does store_unit + foreach + [kill], macros.cfg:263-289), KILL side=3,4,5 kills every remaining one, the heroes speak, and [endlevel] result=victory fires in the same event with a 40 carryover (line 528). Boss death therefore wins the level immediately; the beat is the speech, the death animation and the minion sweep. Two lose paths sit beside it: turns run out (objective TURNS_RUN_OUT, a lose objective with a turn counter, objective-utils.cfg:4-10), and a turn-limit defeat at the end of side 1's last turn (line 544, endlevel defeat at 550). A warning message fires ten turns before the limit (line 537). The objectives list is display text: a win objective ("Find and destroy the source of the undead", line 298) plus the lose macro and a [gold_carryover] block (lines 296-307). Carryover has two steps. At level end, data/lua/carryover_gold.lua:92 sets side.carryover_gold = ceil((side.gold + finishing_bonus) * carryover_percentage / 100), so 40 keeps 40 percent of the gold (the engine default is 80, game_config.cpp:50). At the next level, carryover::transfer_all_gold_to applies it: with carryover_add the start gold is base + carried; otherwise the start gold becomes the carried gold only when it is larger than the base (carryover.cpp:55-60). Base gold defaults to 100 when absent (carryover.cpp:44).

## 2. Key functions
- Event gate: `[event] name=last breath` (line 491) contains a nested `[event] name=die` (line 504) that holds `{KILL_COUNT 4 side=3,4,5 ANIMATE=yes}` (505), `{KILL side=3,4,5}` (506), the closing messages, then `[endlevel] result=victory` with `{NEW_GOLD_CARRYOVER 40}` (527-528). Nothing waits: the handler kills the minions and ends the level in one event. Callers: the engine fires the boss's last-breath event (not read beyond the WML).
- KILL_COUNT (macros.cfg:263-289): stores units matching the filter, loops, and [kill]s while a counter is below COUNT, so it kills at most COUNT units. Defect worth noting: the counter test reads variable `i` (the foreach index) while the macro initialises and clears KILL_COUNT_i, so which counter really gates the kills was not verified; the following KILL sweep makes the result the same here.
- carryover_gold.lua:92 set_side_carryover_gold: carryover_gold = ceil((gold + finishing_bonus) * percentage / 100); endlevel.lua:79-82 takes the percentage from [endlevel] or the side.
- NEW_GOLD_CARRYOVER macro: sets carryover_add=yes and carryover_percentage=N (carryover-utils.cfg:6-9).
- carryover::transfer_all_gold_to (src/carryover.cpp:46-64): base = side gold (or 100 if empty); if add_ and carried > 0 writes base + carried; else if carried > base writes carried; then moves the carried variables into the side and zeroes gold_. Callers: not all read; the carryover_info::transfer_all_to path (carryover.cpp:158-176) was read only in grep.
- carryover constructor (carryover.cpp:27-31): carried gold is carryover_gold when set, else the side's gold.
- team constructor/loader (team.cpp:166, 201-204): defaults carryover_percentage to 80 (game_config.cpp:50) and reads carryover_add, carryover_bonus, carryover_gold.

## 3. Numbers vs mechanism
- Kill sweep: KILL_COUNT 4 on sides 3, 4, 5 (line 505) kills up to four such units with animation, then KILL side=3,4,5 kills the rest. It is a cap on the animated kills, not a count of survivors to wait for.
- Carry: 40 in the scenario (304, 528) and 80 engine default (game_config.cpp:50). carryover_gold.lua:92 applies it: ceil((gold + finishing bonus) * pct / 100), so 40 keeps 40 percent of the gold. The result then goes through the add/max rule above at the next level.
- Start gold default 100 (carryover.cpp:44).
- Time-over warning at limit minus 10 turns (537). Defeat at the end of side 1's last turn (544).

## 4. TypeScript sketch
simplified: omits the animated-kill cap (KILL_COUNT) as a presentation detail, the speech and animation timing, the turn-limit defeat, the finishing bonus and the per-side carryover variables. Our design: boss death opens a last-breath beat, the beat sweeps the linked minions, then the win fires once; the carry is the donor's percentage step then the add/max rule.
```ts
// Boss-death-gated victory with a minion sweep, plus the carryover rules.
// Clean-room shape of Wesnoth's scenario events and carryover, written in Frankendom terms.
// simplified: omits the animated-kill cap (KILL_COUNT), the speech and animation timing, the
// turn-limit defeat, the finishing bonus and the per-side carryover variables.
export type Phase = "fighting" | "last-breath" | "won" | "lost";

export interface QuestGate {
  phase: Phase;
  bossAlive: boolean;
  linkedAlive: number; // linked minions still alive, from server-verified state
}

// Boss death does not end the fight at once: it opens a last-breath beat.
export function onBossDeath(g: QuestGate): QuestGate {
  if (g.phase !== "fighting") return g;
  return { ...g, bossAlive: false, phase: "last-breath" };
}

// The beat resolves in one step, like the donor's nested die handler: every linked minion is
// removed and the win fires exactly once. It does not wait for the minions to die.
export function resolveLastBreath(g: QuestGate): QuestGate {
  if (g.phase !== "last-breath") return g;
  return { ...g, linkedAlive: 0, phase: "won" };
}

// Gold kept at level end: ceil((gold + bonus) * pct / 100), as data/lua/carryover_gold.lua.
export function carriedGold(gold: number, bonus: number, pct: number): number {
  return Math.ceil(((gold + bonus) * pct) / 100);
}

// Start gold for the next zone: the same two branches as carryover::transfer_all_gold_to.
export function nextStartGold(base: number, carried: number, add: boolean): number {
  if (add && carried > 0) return base + carried;
  return carried > base ? carried : base;
}

export {};
```
Typecheck: /tmp/fixer-V08/wesnoth-last-breath-gate.ts on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` (result in the Fixed line below).

## 5. Lands in
origins/quests/last-breath-gate.ts (proposed new module; the quest gate, not src/fight) | parity row 18 (loot roll and XP award: the carry and the win reward go through the one ledger). The gate itself is a quest-state step that fires the win award.

## 6. Gaps and risks
- One ledger: the donor writes carried gold into the next level's side config (carryover.cpp:55-59). In Frankendom the carry must be one ledger entry written once, never a copied side field.
- Server-verified state: the donor's die handler trusts the engine's unit death. Our sweep reads linked units from server state; the server path is not designed in this note.
- Zones as data: the donor hard-codes the gate per scenario in WML. Frankendom should put the linked-side list, kill count and carry rule in zone data.
- Carry percentage: the donor applies it in Lua (carryover_gold.lua:92). Keep the percentage step, then the add/max rule, and write the result once.
- Pit as client: last-breath speech and animation are client only; the sweep and win are engine state.
- MAX_ATTACKERS = 3: the gate does not limit attackers; unchanged.
- Donor defect kept out: the KILL_COUNT counter name mismatch (i vs KILL_COUNT_i); our sweep takes an explicit cap and removes the rest.

Reuse tag: new for Frankendom (the Frankendom repo was not searched by this reader; reuse-first not checked).
Brief rule served: judge the idea, not the genre (addendum rule 2); death opens a beat that precedes the win (addendum rule 4, quest state); the carry is an exact formula we could test.
Best transferable idea: a boss death opens a last-breath beat that sweeps its linked minions and then wins once, and the next level's start gold is base + carried or max(base, carried) after a percentage step, by one explicit rule.
Decision (proposed): adapt - keep the last-breath beat with the minion sweep and the percentage-then-add/max carry rule, take linked units from server state and write one ledger entry.
Acceptance: when the boss dies its last line plays, the linked minions are removed and the win banner appears once; a server test shows onBossDeath leaves phase "last-breath" with the boss dead, resolveLastBreath sets linkedAlive 0 and phase "won" exactly once (a second call changes nothing), and carriedGold(100, 0, 40) is 40 with nextStartGold(100, 40, true) 140 and nextStartGold(100, 40, false) 100.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG
- Main mechanism was invented: KILL_COUNT (Heir_To_The_Throne/utils/macros.cfg:263-289) kills up to COUNT units matching the filter (store_unit + foreach + [kill]); the nested die handler (scenario 504-529) kills sides 3,4,5 and ends the level with victory at once. Nothing waits for the minions. Confirmed against the donor.
- Claim that no code applies carryover_percentage was false: data/lua/carryover_gold.lua:92 does ceil((gold + finishing_bonus) * pct / 100); data/lua/wml/endlevel.lua:79-82 sets the percentage. Confirmed.
- transfer_all_gold_to branches, default 100, NEW_GOLD_CARRYOVER and GPL v2 were correct.
- Missed (found while fixing): KILL_COUNT tests variable i (the foreach index) while it initialises and clears KILL_COUNT_i; which counter gates the kills was not verified.
Fixed 2026-10-12: Rewrote Mechanism, Key functions, Numbers, Gaps, Best idea, Decision and Acceptance: boss death opens a last-breath beat that sweeps the linked minions and wins once; carry is percentage step then add/max. Sketch replaced (resolveLastBreath instead of onLinkedDeath, added carriedGold) and mirrored to QD020/work/wesnoth-last-breath-gate.ts; tsc --strict on the VPS (/tmp/fixer-V08) exit 0.
