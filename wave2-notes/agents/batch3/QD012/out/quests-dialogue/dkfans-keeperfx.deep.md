# dkfans-keeperfx (quests-dialogue, cell 1)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script.c` (also `src/lvl_script_conditions.c`, `src/lvl_script_value.c`, `src/game_update.cpp`) | Licence: GPL-2.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 2, June 1991"; clean-room only) | C | symbol `process_level_script`

Checked: Symbol `process_level_script` at lvl_script.c 1145, read in full with its gate and call order (1145-1167). The condition engine was read in full: `condition_inactive` (lvl_script_conditions.c 438-448), `process_condition` (455-541), `process_conditions` (543-550), IF/ENDIF gate stack (553-608). Trigger lists read: party (lvl_script.c 986-1040), tunneller (1042-1082), values (1127-1143). Value dispatcher read: `script_process_value` (lvl_script_value.c 128-160) and the switch cases from 167 to 200. Confidence: high on the order of operations, the bit meanings and the numbers. Not read: the bodies of `set_player_as_won_level`, `set_player_as_lost_level` and `setup_all_player_creatures_and_diggers_leave_or_die`; the frontend objective setter `set_general_objective_with_icon` (called at lvl_script_commands.c 853); the create functions behind `process_party`; the bodies of the unlock functions after their calls. Dialogue trees: none found (the grep for "dialog" over src/*.c hits only bflib_basics.c error boxes). Hint file: lvl_script_commands.c, read in parts (objective commands 799-860, heart-lost objectives 2076-2135, message commands 6001-6050).

Best transferable idea: a quest step is a condition with a latch and an edge, nested under its parent step, and its reward is a trigger that fires once and is evaluated in a fixed per-turn order.
Decision (proposed): adapt - keep the nested gate and the one-shot trigger; route every reward through one server ledger function, because KeeperFX has three effect paths (values, party and tunneller triggers, and an event-driven Lua trigger layer), which breaks the one-ledger ruling.
Acceptance: a server test asserts that a nested step does not complete on the turn its parent first completes, and that its reward is granted exactly once across 1000 turns and a reconnect.

## 1. Mechanism

- What it is: a level script is compiled at load into fixed arrays (conditions, party triggers, tunneller triggers, values). Conditions are tests on game state. Triggers and values are effects that wait ("park") until their gate condition is true, then fire.
- Driver: `update()` (game_update.cpp 472) runs its game-state block only when the game is not paused (493). Inside it, `process_level_script()` is called at 512, after room, dungeon, research, event processing, and before player and action-point processing. `game.play_gameturn++` is at 534. So the script is counted in game turns, not wall-clock time. (Not read: whether `update()` is itself called at a fixed rate.)
- Gate on the whole step: it runs if the local player is still Undecided (1154), or the game is multiplayer (1151-1152), or `run_after_victory` is set (1157). A single-player player who has won or lost stops running the script.
- Order inside the step (1161-1167): (1) `process_conditions`, all conditions in index order; (2) creature party triggers; (3) tunneller triggers; (4) value triggers; (5) win and lose checks.
- Per condition (lvl_script_conditions.c 455-541), in this order: (a) If its gate is closed, clear its truth bit 0x01 and return, leaving its latch and edge alone (462-466). A gate is closed when the gate condition's truth bit is clear or its edge bit is set (445). (b) Otherwise run its own test. For a plain test it is true if ANY player in its range matches (492, 522). (c) Store the result in bit 0x01 (531). (d) Edge logic (532-538): if the result is false, or the latch 0x02 is already set, clear the edge 0x04. Otherwise set the latch 0x02 and the edge 0x04. So the edge is high only on the first turn the condition is ever true, and the latch is never cleared (no clear of 0x02 in the lvl_script files).
- Nesting is gating: an IF creates a condition whose gate (`condit_idx`) is the enclosing condition (585). The IF pushes the previous current condition on a stack (601, only when not at top level). ENDIF calls `pop_condition` (563; the caller is lvl_script_commands_old.c 1251-1252, not read in full). Top-level conditions have the gate CONDITION_ALWAYS. So an IF tree is a tree of gates: a child is true only when its parent is true, not on the parent's first-true turn, and the child's own test passes. A child always has a higher index than its parent, so the parent is already updated when the child is evaluated.
- Triggers: a party trigger, tunneller trigger or value fires when its gate's truth bit is set (the level bit, not the edge). After firing it sets TrgF_DISABLED (0x40) unless TrgF_REUSABLE (0x80) is set (1036, 1078, 1137-1138). So: one-shot by default, reusable by flag.
- Always-true values: when the gate is CONDITION_ALWAYS and the value is not reusable, the ALLOCATE macro builds it in a local temp (lvl_script_lib.h 370) and the PROCESS macro runs it at load (396). It never enters the parked table. The check functions run when a command line is added: `script_add_command` (lvl_script.c 821, inside `script_recognize_params`, 618-826, which is in the load path from `load_script` at 924; the link from `parse_txt_data` (869, called at 919) into `script_recognize_params` was not read).
- Value effects: `process_values` (1127-1143) calls `script_process_value` (lvl_script_value.c 128). It finds the descriptor by index (143-146). If the descriptor has a process_fn, it calls it once per player in range (158-160). Otherwise a switch handles the rest, including unlock effects: room availability (167-170) and research amount (197-200). In this donor the rewards are unlocks and research, not gold or XP (the unlock bodies are not read).
- Party triggers use a second dispatcher, `process_party` (992), which switches on the command mask (999): add to party (1001), create creature (1016), and others (not read).
- Win and lose (1093-1125): a met win condition calls `set_player_as_won_level` for every player for whom `scripted_outcome_applies_to_player` holds (1103 loop). The lose path also calls `set_player_as_lost_level` and `setup_all_player_creatures_and_diggers_leave_or_die` (1117 loop). The applies check (1086-1090) needs the player to exist, to be not computer-controlled (unless a placeholder), and to have `victory_state == VicS_Undecided`. There is no DISABLED bit here: the repeat each turn is stopped only if the setters change victory_state (not read).
- Objectives and messages: an objective command calls `set_general_objective_with_icon` (lvl_script_commands.c 851-853; frontend not read). A quick message stores its text in one shared slot `game.quick_messages[N]` at load (6018), keeps only the slot number in the trigger value (6019), and reads the text from the slot when it fires (6024-6026). So the text is last-write-wins at load. A display message adds a chat line with an icon (6046-6048).

## 2. Key functions

- `process_level_script`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script.c` 1145-1167. The per-turn step: gate, then the five calls in order.
- `process_win_and_lose_conditions`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script.c` 1093-1125. Win and lose loops over players, latched by victory_state.
- `process_values`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script.c` 1127-1143. Gate, dispatch, one-shot disable.
- `process_check_new_creature_parties` and `process_check_new_tunneller_parties`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script.c` 1023-1040 and 1042-1082. Same gate and one-shot pattern.
- `process_party`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script.c` 992-1020. Second dispatcher, switch on the command mask.
- `condition_inactive`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script_conditions.c` 438-448. Gate closed when the gate's truth bit is clear or its edge bit is set.
- `process_condition`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script_conditions.c` 455-541. Gate, own test, truth bit, latch and edge.
- `process_conditions`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script_conditions.c` 543-550. Index-order loop.
- IF/ENDIF gate stack: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script_conditions.c` 553-608 (`pop_condition` 553-569, `command_add_condition` 581-606). The gate is the enclosing condition.
- `script_process_value`: `/mnt/frankendom-donors/dkfans-keeperfx/src/lvl_script_value.c` 128-200. Descriptor lookup, per-player process_fn call, switch for unlocks.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Quest step gate: a step is true only when its parent is true and not on the parent's first-true turn | Truth bit 0x01, latch 0x02, edge 0x04 (theirs, lvl_script_conditions.c 445, 531-538) |
| Latch: a step that has ever been true keeps its latch | Latch bit 0x02 set at 537, never cleared in the lvl_script files |
| One-shot trigger: disable after the first firing unless reusable | TrgF_DISABLED 0x40, TrgF_REUSABLE 0x80 (theirs, creature_groups.h 42-43; set at lvl_script.c 1036, 1078, 1138) |
| Parked effects table | CONDITIONS_COUNT 512 (theirs, lvl_script.h 36); SCRIPT_VALUES_COUNT 2048 (theirs, lvl_script.h 38) |
| "Always true" gate sentinel | CONDITION_ALWAYS equals CONDITIONS_COUNT (theirs, lvl_script.h 42) |
| Fixed per-turn order | Conditions, party triggers, tunneller triggers, values, outcomes (theirs, lvl_script.c 1162-1167) |
| Decided-player latch | victory_state == VicS_Undecided (theirs, lvl_script.c 1090) |
| Turn driver | Unpaused update block, game turn counter advanced at 534 (theirs, game_update.cpp 493, 534) |

## 4. TypeScript sketch

simplified: keeps the donor order (conditions, then triggers, then outcomes), the bit meanings (truth, latch, edge), and the closed-gate rule (truth cleared, latch and edge untouched). It merges the three trigger lists (party, tunneller, value) into one list and drops the separate dispatchers (`process_party`, `script_process_value`). It omits the player-range loops (one player per test), the second-variable comparison, action-point and slab tests, the command table, and the victory-state setters (the sketch sets `decided` itself, assuming the setters latch as the donor expects). The defects listed in section 6 are removed by construction: no range lookup, no table scan, no shared message slot. The example at the end is written for this sketch, not taken from the donor.

```ts
// Licence: GPL-2.0 (donor, LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const CONDITION_ALWAYS = -1; // no gate: always true

interface Cond {
  gate: number;        // index of the enclosing condition (an earlier index), or CONDITION_ALWAYS
  test: () => boolean; // this turn's own check, e.g. "rooms built >= 3"
  on: boolean;         // truth this turn
  latched: boolean;    // has been true at least once; never cleared
  edge: boolean;       // true only on the turn it first became true
}

interface Trigger {
  cond: number;        // gate index, or CONDITION_ALWAYS
  reusable: boolean;   // false = fires once
  done: boolean;
  fire: () => void;    // the one effect path (rewards go through here)
}

interface Outcome {
  cond: number;
  apply: (playerId: number) => void;
}

interface QuestState {
  conds: Cond[];
  triggers: Trigger[];
  outcomes: Outcome[];
  players: { id: number; decided: boolean }[];
}

function isMet(s: QuestState, idx: number): boolean {
  return idx === CONDITION_ALWAYS ? true : s.conds[idx].on;
}

// A gate counts as closed on the turn it first becomes true, so a gated step starts one turn later.
function gateOpen(s: QuestState, idx: number): boolean {
  if (idx === CONDITION_ALWAYS) return true;
  const g = s.conds[idx];
  return g.on && !g.edge;
}

function evalConditions(s: QuestState): void {
  for (let i = 0; i < s.conds.length; i++) {
    const c = s.conds[i];
    if (!gateOpen(s, c.gate)) {
      c.on = false; // gated off: truth cleared; latch and edge are left alone
      continue;
    }
    c.on = c.test();
    if (!c.on || c.latched) {
      c.edge = false;
    } else {
      c.latched = true;
      c.edge = true;
    }
  }
}

function runTriggers(s: QuestState): void {
  for (const t of s.triggers) {
    if (t.done || !isMet(s, t.cond)) continue;
    t.fire();
    if (!t.reusable) t.done = true;
  }
}

function runOutcomes(s: QuestState): void {
  for (const o of s.outcomes) {
    if (!isMet(s, o.cond)) continue;
    for (const p of s.players) {
      if (p.decided) continue;
      o.apply(p.id);
      p.decided = true;
    }
  }
}

// One game turn, fixed order: conditions, then triggers, then outcomes.
export function questTurn(s: QuestState, localUndecided: boolean, runAfterVictory: boolean): void {
  if (!localUndecided && !runAfterVictory) return;
  evalConditions(s);
  runTriggers(s);
  runOutcomes(s);
}

// Example: step 2 is nested under step 1 (gate = 0); its reward fires once.
const s: QuestState = {
  conds: [
    { gate: CONDITION_ALWAYS, test: () => true, on: false, latched: false, edge: false },
    { gate: 0, test: () => true, on: false, latched: false, edge: false },
  ],
  triggers: [{ cond: 1, reusable: false, done: false, fire: () => {} }],
  outcomes: [],
  players: [{ id: 0, decided: false }],
};
questTurn(s, true, false);
```

## 5. Lands in

- TARGET `origins/server/quest-triggers.ts` (proposed path, not checked against the repo): the server-side quest step evaluator, one ledger for every reward. Parity-checklist row 18 (loot roll and XP award): quest rewards are granted once, by the server, through one function. Server-tick sub-line (row 18 / post-K item 3): "server tick: fixed step" is the per-turn order above; the reward itself is row 18.
- today: not checked (this pass did not read the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (rewards applied once, by the server); zones as data (gate and reusable flags as zone data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, not translated.
- Three effect paths: values go through `script_process_value` (lvl_script_value.c 128), party and tunneller triggers go through `process_party` (lvl_script.c 992) and their own loops, and a third, event-driven Lua layer sits beside them: `src/lua_triggers.c` (397 lines; `lua_on_game_tick`, `lua_on_creature_death`, `lua_on_level_up`, `lua_on_power_cast`, `lua_on_chatmsg`, `lua_on_slab_owner_change` and others), with `lua_on_game_tick()` called at game_update.cpp:514 right after `process_level_script` (512), plus a `RUN_LUA_CODE` script command (lvl_script_commands.c 7132). This Lua layer is the more modern quest and event path and was not read beyond its function list. The one-ledger ruling needs one function; the donor has none.
- Defect 1, stale state: an invalid player range returns early (lvl_script_conditions.c 475-478, warning at 477), so the condition keeps its old truth and edge. fix: validate every range at load, and at run time set the truth to false instead of returning.
- Defect 2, dead check: the `if (desc == NULL)` test (lvl_script_value.c 146) can never be true, because the scan (143) stops on the table sentinel (lvl_script_commands.c 7134), which is an entry with a NULL textptr, not a NULL pointer. So the "Unexpected index" warning never fires. fix: test `desc->textptr == NULL` and fail at load.
- Defect 3, shared message slot: quick message text is one shared slot per number, last-write-wins at load (lvl_script_commands.c 6018); two triggers with the same number show the same text. fix: give each dialogue line its own id and store its text with the quest step data.
- Edge bit left high while gated off: the early return (462-466) does not clear the edge bit. Harmless in this donor because the truth bit is already clear, but a port must not read the edge alone.
- Gate delay: a gated step starts one turn after its gate first becomes true (the gate is closed on its edge turn). This is a design choice; the acceptance test should assert it, or the port should change it on purpose.
- Dialogue trees: none found. The only dialogue is one-line chat messages with an icon. Frankendom's dialogue-tree needs are not covered by this donor.
- Time unit: everything is in game turns, not milliseconds. Quest timers in Frankendom need the same unit (ticks) so they match the server tick.
- Not read: the win and lose setters; the frontend objective display; the create functions behind `process_party`; the unlock function bodies. Claims about those are not made.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: one ledger; zones as data; rules 7-9 n/a

Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR. Main mechanism verified (process_level_script order and gate, condition_inactive, process_condition bit logic, edge on first-ever true turn, defects 1 and 2, TrgF bits, CONDITIONS_COUNT 512, SCRIPT_VALUES_COUNT 2048, GPL-2, update() lines 512 and 534).
- Error: "two effect dispatchers (values and party triggers)" is incomplete; there is a third, event-driven Lua trigger layer. Confirmed (lua_triggers.c 397 lines; lua_on_game_tick at game_update.cpp:514).
- Missed: the Lua event-trigger layer and the RUN_LUA_CODE command (added to Gaps and the Decision).

Fixed 2026-10-12: Decision and Gaps now say three effect paths, with the Lua layer described. Sketch unchanged.
