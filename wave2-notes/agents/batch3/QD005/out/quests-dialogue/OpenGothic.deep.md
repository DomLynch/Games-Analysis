# OpenGothic (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` (dialogue choice selection 871-975, known memory 3415-3422) with `common/game/questlog.cpp`/`questlog.h` and `common/ui/dialogmenu.cpp` | Licence: MIT (LICENSE line 1 "MIT License", Copyright (c) 2019 Try; code may be adapted) | C++ | symbols `GameScript::dialogChoices`, `GameScript::updateDialog`, `GameScript::exec`, `GameScript::npc_checkinfo`, `QuestLog`

Checked: Confidence high for the dialogue selection order, the known memory and the quest-log state, because I read those functions end to end (gamescript.cpp 871-975, 2527-2551, 3274-3288, 3360-3375, 3405-3423; dialogmenu.cpp 60-75, 196-212, 240-340 (state flow), 396-420; questlog.h/cpp whole; gamemenu.h 41-46, gamemenu.cpp 170-182, 326-350). Not read: the zenkit `IInfo`/`IInfoChoice` struct definitions (the `lib/ZenKit` submodule directory is empty in the donor), so the meaning of `important`, `permanent`, `nr`, `condition` is taken from how the donor uses them, not from their definitions; the Daedalus scripts that hold the conditions and the info functions (game data, not in repo); the reward externals' bodies (`createinvitem`, `createinvitems` at gamescript.cpp 3300-3311, bound at 310-311, not read). Caller check: `dialogChoices` has one caller path (`Npc::dialogChoices` in npc.cpp 4519-4520 to dialogmenu.cpp 271); `updateDialog` is called from dialogmenu.cpp 330 and `GameSession::updateDialog` (gamesession.cpp 434-435). Confidence on the "two predicates differ" finding is high because both bodies were read.

Best transferable idea: Store a conversation topic as data with a condition, a repeat flag and an important tier, and pick the choice list in one fixed order (important tier first, then the rest; a topic heard once is skipped unless marked repeatable; an important repeatable topic is not repeated inside the same talk); record "heard" per player and per topic, saved with the game.
Decision (proposed): adapt - take the selection order and the known/repeat/except rules, but make the condition evaluation and the known set server-side in the one ledger, and key every "used" or "heard" mark by player (the donor mutates a shared object).
Acceptance: A server test talks to the same NPC twice as one player: a one-time topic is offered once and gone on the second talk; a repeatable important greeting plays once per talk and again on the next talk; a second player talking to the same NPC still sees the one-time topic (proving the mark is per player); and `npcCheckInfo` and the choice list return the same answer for the same state.

## 1. Mechanism

- Topics are data: each info has an owner npc (`info.npc`), a main function (`info.information`), a title (`info.description`), a sort key (`info.nr`), flags `important` and `permanent`, an optional condition function, and a list of sub-choices (`info.choices`, each with text and function). (Field meanings from use; see Checked.)
- Order of steps when a conversation opens (`DialogMenu::openPipe` sets PreStart at 204; `DialogMenu::tick` at 67-71 clears `except` (68) and calls `onStart` (71); `onStart` calls `dialogChoices` with `includeImp` = true only in PreStart (271)):
  (a) `dialogChoices` loops the tiers: important (1) first when `includeImp`, then ordinary (0) (885). (b) For each topic with the matching npc and tier (888): a topic the player already knows is skipped unless it is permanent (890-891). (c) An important AND permanent topic is skipped if its main id is already in the conversation's except list (894-897). (d) The condition function is called with self = the npc and other = the player (905-909); if the topic has no condition, it counts as valid (905). (e) The choice is added with title, function id and sort key (915-920). (f) If the tier produced any choice it is sorted and returned (923-925); otherwise the next tier is tried (928 after the loop).
- Sort: by `nr`, then by the script function id as a tie-break. The donor's comment says the tie-break reproduces the original game (3411 and the comment on the same line).
- Auto-run: if the first returned choice has an empty title, it is an important dialog and runs at once (`onStart` 277-279, `onEntry` 279).
- Entering a choice (`DialogMenu::onEntry` 399-405): sets depth to 1, pushes the function id into `except` (404), calls `dialogExec` (405), then `onDoneText`.
- `GameScript::exec` (956-975): sets the player and npc as self/other. A main choice (function id equals `info.information`, 966) marks the (player, topic) pair as known (967). A sub-choice is removed from the shared `info.choices` list (969-971). Then the script function runs (975).
- After each entry, `onDoneText` (330) rebuilds the choices from the selected topic's sub-choices with `updateDialog` (941-952; sort key = list index). If that list is empty and depth is above zero, `onStart` runs again (333-334) with includeImp false (state is Active); if depth is zero the menu closes.
- `npc_checkinfo` (2527-2551) is a second predicate for "does this npc have a topic for this player" with the same known filter (2538-2539) and condition check (2542-2546), but with different defaults (see section 6).
- Known memory: a set of (npc symbol, topic symbol) pairs (3415-3422), saved with the quest state (538-540) and restored on load (552).
- Quest log: `log_createtopic` accepts only Mission or Note (3275); `log_settopicstatus` accepts only the four status values (3280-3283) and calls `setStatus` (3284); `log_addentry` appends by name (3288). Topics are a flat vector; `QuestLog::setStatus` creates a missing topic as Mission unless the status is Obsolete (`questlog.cpp` 19-21). Save writes count, then name, section, status and entries (41).
- The quest log menu picks tabs by status value (`gamemenu.cpp` 338-341) and lists the newest topic first (176).

## 2. Key functions

- `GameScript::dialogChoices`: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 871-929. Tier order, known filter, except filter, condition, sort.
- `GameScript::updateDialog`: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 932-953. Sub-choices from the topic list, index as sort key.
- `GameScript::exec`: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 956-976. Known mark for the main entry; shared erase for sub-choices; then the script call.
- `GameScript::npc_checkinfo`: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 2527-2551. Second predicate, different defaults.
- Known memory: `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 3415-3422, saved at 536-541, loaded at 545-553.
- `DialogMenu` state flow: `/mnt/frankendom-donors/OpenGothic/common/ui/dialogmenu.cpp` 60-75 (tick, PreStart), 196-212 (openPipe), 240-280 (onStart, auto-run), 329-345 (onDoneText), 399-407 (onEntry).
- Quest log: `/mnt/frankendom-donors/OpenGothic/common/game/questlog.cpp` 7-28 (add, setStatus, addEntry), 37-52 (save, load); `/mnt/frankendom-donors/OpenGothic/common/game/questlog.h` 13-18 (status values); `/mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp` 3274-3288 (script bindings to the log).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Tier order: important first, then ordinary, first non-empty tier wins | Two tiers (1 important, 0 ordinary) (theirs, `gamescript.cpp` 885) |
| Heard once: skip known unless repeatable | No numbers; the rule is the flag `permanent` (theirs, 891) |
| Important repeatable topic not repeated inside one talk | Per-talk except list cleared at PreStart (`dialogmenu.cpp` 68), pushed on each entry (404) |
| Sort by key then id | Key `nr` (theirs, 920); id tie-break (theirs, 3411) |
| Quest status values | Running 1, Success 2, Failed 3, Obsolete 4 (theirs, `questlog.h` 14-17) |
| Tab-to-status pairing | Current 1, Old 3, Failed 2 (theirs, `gamemenu.h` 42-44) |

## 4. TypeScript sketch

simplified: the selection order, the important-first tiers, the known and repeat rules, the except list and the sort follow the donor. Changes on purpose: (a) the donor's `except` push happens in `DialogMenu::onEntry` (404), and this sketch does it inside `exec` so one function owns the state change; (b) the sub-choice erase is a per-player `usedSub` set instead of erasing from the shared list (971), so a second player still sees the choice; (c) a missing condition counts as valid, as in the donor's `dialogChoices` (905), but the sketch does not model `npc_checkinfo`'s different default (2541); (d) the donor's `info_addchoice` and `info_clearchoices` script calls (3360-3375) are not modelled; (e) no trade flag, no dialog UI, no sound, no timing.

```ts
// Licence: MIT (donor OpenGothic, LICENSE "MIT License", Copyright (c) 2019 Try). Shape adapted; written fresh for Frankendom.
export interface Topic {
  id: number;                       // main function id (donor: info.information)
  npc: number;                      // owner npc id (donor: info.npc)
  important: boolean;               // donor: info.important
  permanent: boolean;               // donor: info.permanent (repeatable)
  nr: number;                       // sort key (donor: info.nr)
  title: string;                    // donor: info.description; empty = auto-run
  condition?: (self: number, other: number) => boolean; // donor: condition fn; missing = valid
  subChoices: { id: number; text: string }[];           // donor: info.choices
}

export interface DialogState {
  known: Set<string>;               // "player:topic" pairs (donor: dlgKnownInfos)
  except: number[];                 // main ids entered in this conversation (donor: except)
  usedSub: Set<string>;             // "player:topic:sub" pairs used (donor erases from the shared list)
}

export interface Pick { fn: number; title: string; sort: number; }

function sortPicks(a: Pick[]): Pick[] {
  return a.sort((l, r) => (l.sort - r.sort) || (l.fn - r.fn));
}

// Tier 1 (important) first when asked, then tier 0; the first tier with any valid topic wins.
export function dialogChoices(s: DialogState, npc: number, player: number, topics: Topic[], includeImportant: boolean): Pick[] {
  const tiers: number[] = includeImportant ? [1, 0] : [0];
  for (const tier of tiers) {
    const out: Pick[] = [];
    for (const t of topics) {
      if (t.npc !== npc || Number(t.important) !== tier) continue;
      const known = s.known.has(`${player}:${t.id}`);
      if (known && !t.permanent) continue;                       // heard once, never again
      if (t.important && t.permanent && s.except.includes(t.id)) continue; // no repeat inside one talk
      const valid = t.condition ? t.condition(npc, player) : true;
      if (!valid) continue;
      out.push({ fn: t.id, title: t.title, sort: t.nr });
    }
    if (out.length > 0) return sortPicks(out);
  }
  return [];
}

// Sub-choices of the selected topic, minus the ones this player already used.
export function subChoices(s: DialogState, player: number, t: Topic): Pick[] {
  const out: Pick[] = t.subChoices
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !s.usedSub.has(`${player}:${t.id}:${c.id}`))
    .map(({ c, i }) => ({ fn: c.id, title: c.text, sort: i }));
  return sortPicks(out);
}

// Entering a topic records it; a main entry marks the topic known, a sub-choice marks only the sub-choice used.
export function exec(s: DialogState, player: number, t: Topic, fn: number, run: (fn: number) => void): void {
  if (fn === t.id) {
    s.known.add(`${player}:${t.id}`);
    s.except.push(t.id);
  } else {
    s.usedSub.add(`${player}:${t.id}:${fn}`);
  }
  run(fn);
}
```

## 5. Lands in

- TARGET `origins/quests/dialogue-choices.ts` (proposed path, not checked against the repo): the one function that picks which dialogue topics an NPC offers a player, with the known, repeat and except rules, run on the server. Parity-checklist row 18 (loot roll and XP award): a dialogue topic is the usual place a quest reward is triggered, so the award it causes must go through the same ledger write as row 18. The dialogue choice itself is not in any parity row; row 18 is the reward it triggers.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is written fresh from the shape)
- Brief rule served: one ledger (known marks, used sub-choices and quest status are written once, server side, per player); the dialogue menu is client-only and only renders the server's list.

## 6. Gaps and risks

- Two predicates disagree. `dialogChoices` starts `valid` at true (905), so a topic with no condition is offered; `npc_checkinfo` starts `valid` at false (2541) and only sets it inside the `if(info->condition)` block (2542-2549), so a topic with no condition is never counted by `npc_checkinfo`. The same applies when a condition symbol is missing: `dialogChoices` keeps it valid, `npc_checkinfo` does not. Which one the original game matches is not verified here. Fix: one predicate function that both call; the sketch's `dialogChoices` is that predicate.
- Shared mutation of sub-choices: `exec` erases a used sub-choice from `info.choices` (971), and the script calls `info_addchoice` (3360-3368) and `info_clearchoices` (3374) mutate the same object. The objects are per session (`dialogsInfo` built in `initDialogs`, 442-448), so this is safe for one player. Any second player in the same session would see choices vanish for everyone. Fix: per-player `usedSub` (the sketch) and a per-player copy of any choice the script adds.
- Sort tie-break on script function id (3411) makes display order depend on symbol index, so reordering script files changes the menu. Fix: give every topic an explicit `nr` and tie-break on topic id, not on a script symbol.
- Quest-log tab mapping looks swapped. `QuestStat::Old` is the Failed status value 3 (`gamemenu.h` 43) and `QuestStat::Failed` is the Success status value 2 (44), while the tab names are `OLDMISSIONS` (`gamemenu.cpp` 329) and `FAILEDMISSIONS` (331). Whether the game's menu script labels those tabs the other way is not verified (the menu script is game data, not in the repo). Fix: map each tab name to its status by name and test the pairing against the real menu labels.
- The "Log" tab shows only notes: `isCompatible` (338-341) can never match status 5 for a mission. This is probably intended but it is not stated.
- Rewards are not ledgered here: quest rewards run inside the script functions (the `createinvitem` externals, 310-311, bodies not read). Frankendom must route every reward through the one ledger; the donor does not.
- Known memory and quest state are saved together (536-541), which is the right shape, but `except` is not saved (it is per talk, which is correct).
- Confidence and scope: this is a dialogue-selection and quest-log mechanism, not a quest engine. Objectives are free text in the log entries, and completion is whatever the Daedalus script sets; the donor has no objective counter.
