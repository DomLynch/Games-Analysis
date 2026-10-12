# wesnoth-wesnoth (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/wesnoth-wesnoth/data/campaigns/Heir_To_The_Throne/scenarios/08b_Isle_of_the_Damned_part2.cfg (WML) + /mnt/frankendom-donors/wesnoth-wesnoth/src/carryover.cpp (C++) | Licence: GPL-2.0 (COPYING read: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") -> copyleft, clean-room, shape only | WML + C++ | symbol carryover::transfer_all_gold_to
Checked: camera_scope not applicable (quests). Read: scenario lines 150-555 (all events, objectives, endlevels), data/core/macros/carryover-utils.cfg (4-9), objective-utils.cfg (4-11), src/carryover.cpp (20-64, 111-140), src/team.cpp (grep of carryover and objectives, 166-204, 627-632), src/game_config.cpp:50, src/game_board.cpp check_victory (first half only, not used in the mechanism). Not read: KILL_COUNT macro (not defined in data/core/, its definition lives elsewhere and was not opened), the engine's evaluation of [objective] condition, nested-event registration in the event engine, the objectives dialog. Grep over src/ and data/ found NO C++ or WML code that multiplies gold by carryover_percentage: the value is only stored (team.cpp:201), exposed to formulas (callable_objects.cpp:815-816) and Lua (lua_team.cpp:260-265). Confidence: medium-high on the event gate and the carry rule; low on what the percentage does, so the note does not claim it does anything. Depth: thin.

## 1. Mechanism
A boss's death does not end the level. Its "last breath" event fires first: the boss speaks twice, then a nested die handler waits for the linked minions on sides 3, 4, 5 (KILL_COUNT 4, macro semantics not read) and clears any survivors (KILL side=3,4,5). Only then does the nested handler end the level with victory and a 40 carryover (line 528). Two lose paths sit beside it: turns run out (objective TURNS_RUN_OUT, a lose objective with a turn counter, objective-utils.cfg:4-10), and a turn-limit defeat at the end of side 1's last turn (line 544, endlevel defeat at 550). A warning message fires ten turns before the limit (line 537). The objectives list is display text: a win objective ("Find and destroy the source of the undead", line 298) plus the lose macro and a [gold_carryover] block (lines 296-307). Carryover is applied to the next level's side gold: with carryover_add the start gold is base + carried; otherwise the start gold becomes the carried gold only when it is larger than the base (carryover.cpp:55-60). Base gold defaults to 100 when absent (carryover.cpp:44).

## 2. Key functions
- Event gate: `[event] name=last breath` (line 491) contains a nested `[event] name=die` (line 504) that holds `{KILL_COUNT 4 side=3,4,5 ANIMATE=yes}` (505), `{KILL side=3,4,5}` (506), then `[endlevel] result=victory` with `{NEW_GOLD_CARRYOVER 40}` (527-528). Callers: the engine fires the boss's last-breath event (not read beyond the WML).
- NEW_GOLD_CARRYOVER macro: sets carryover_add=yes and carryover_percentage=N (carryover-utils.cfg:6-9).
- carryover::transfer_all_gold_to (src/carryover.cpp:46-64): base = side gold (or 100 if empty); if add_ and carried > 0 writes base + carried; else if carried > base writes carried; then moves the carried variables into the side and zeroes gold_. Callers: not all read; the carryover_info::transfer_all_to path (carryover.cpp:158-176) was read only in grep.
- carryover constructor (carryover.cpp:27-31): carried gold is carryover_gold when set, else the side's gold.
- team constructor/loader (team.cpp:166, 201-204): defaults carryover_percentage to 80 (game_config.cpp:50) and reads carryover_add, carryover_bonus, carryover_gold.

## 3. Numbers vs mechanism
- Kill gate: KILL_COUNT 4 on sides 3, 4, 5 (line 505). The macro is not read, so whether "4" means four kills or four survivors is UNKNOWN.
- Carry: 40 in the scenario (304, 528) and 80 engine default (game_config.cpp:50). Nothing in src/ applies them to gold, so 40 does not change the carried gold in code we read. The real transfer is the raw side gold through the add/max rule above.
- Start gold default 100 (carryover.cpp:44).
- Time-over warning at limit minus 10 turns (537). Defeat at the end of side 1's last turn (544).

## 4. TypeScript sketch
simplified: omits the KILL_COUNT macro semantics (macro not read), the speech and animation timing, the turn-limit defeat, and the per-side carryover variables; it reorders nothing. Our design: the gate is explicit state, and the carry is the donor's add/max rule with no percentage.
```ts
// Death-gated victory with a last-breath beat, plus the carryover start-gold rule.
// Clean-room shape of Wesnoth's scenario events and carryover.cpp, written in Frankendom terms.
// simplified: omits the KILL_COUNT macro semantics (macro not read), the speech and animation
// timing, the turn-limit defeat, and the per-side carryover variables; it reorders nothing.
export type Phase = "fighting" | "last-breath" | "won" | "lost";

export interface QuestGate {
  phase: Phase;
  bossAlive: boolean;
  linkedAlive: number; // linked minions still alive, counted from server-verified deaths
}

// Boss death does not end the fight at once: it opens a last-breath beat.
export function onBossDeath(g: QuestGate): QuestGate {
  if (g.phase !== "fighting") return g;
  return { ...g, bossAlive: false, phase: "last-breath" };
}

// A linked minion dies. The win fires only when the last linked minion falls during last-breath.
export function onLinkedDeath(g: QuestGate): QuestGate {
  const linkedAlive = Math.max(0, g.linkedAlive - 1);
  if (g.phase === "last-breath" && linkedAlive === 0) {
    return { ...g, linkedAlive, phase: "won" };
  }
  return { ...g, linkedAlive };
}

// Start gold for the next zone: the same two branches as carryover::transfer_all_gold_to.
export function nextStartGold(base: number, carried: number, add: boolean): number {
  if (add && carried > 0) return base + carried;
  return carried > base ? carried : base;
}

export {};
```
Typecheck: /tmp/QD020-wesnoth-last-breath-gate.ts on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in
origins/quests/last-breath-gate.ts (proposed new module; the quest gate, not src/fight) | parity row 18 (loot roll and XP award: the carry and the win reward go through the one ledger). The gate itself is a quest-state step that fires the win award.

## 6. Gaps and risks
- One ledger: the donor writes carried gold into the next level's side config (carryover.cpp:55-59). In Frankendom the carry must be one ledger entry written once, never a copied side field.
- Server-verified kills: the donor's nested die handler trusts the engine's unit death. Our gate counts linked deaths only from server-verified kills; the server path is not designed in this note.
- Zones as data: the donor hard-codes the gate per scenario in WML. Frankendom should put the linked-side list, kill count and carry rule in zone data.
- Carry percentage: the donor stores 40/80 but no C++ code applies it (grep). Do not copy the percentage as if it did anything; use the explicit add/max rule.
- Pit as client: last-breath speech and animation are client only; the gate and win are engine state.
- MAX_ATTACKERS = 3: the gate does not limit attackers; unchanged.

Reuse tag: new for Frankendom (the Frankendom repo was not searched by this reader; reuse-first not checked).
Brief rule served: judge the idea, not the genre (addendum rule 2); death opens a beat that delays the win (addendum rule 4, quest state); the carry rule is an exact two-branch formula we could test.
Best transferable idea: a boss death opens a last-breath state that wins only when its linked minions are gone, and the next level's start gold is base + carried or max(base, carried) by one explicit rule.
Decision (proposed): adapt - keep the gate and the add/max carry rule, but count only server-verified kills and write one ledger entry; do not copy the percentage field, since the donor never applies it.
Acceptance: when the boss dies its last line plays, the win banner appears only after the last linked minion dies, and a server test shows boss death alone leaves phase "last-breath" while the final linked death moves it to "won" exactly once.
