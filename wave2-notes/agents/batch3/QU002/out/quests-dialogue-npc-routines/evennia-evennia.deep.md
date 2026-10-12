# evennia-evennia (quests-dialogue-npc-routines, cell 3)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/quests.py` | Licence: BSD-3-Clause (LICENSE.txt line 1 "BSD 3-Clause License"; Copyright 2012- Griatch and Gregory Taylor) | Python | symbol `EvAdventureQuest` (class, line 18) with `EvAdventureQuestHandler` (line 226)

Checked: Opened `evadventure/quests.py` (whole file), `evadventure/tests/test_quests.py` (whole file), `evadventure/ai.py` (whole file), `evadventure/npcs.py` (99-230 and 252-356), `evadventure/utils.py` (55-80), `evennia/utils/evmenu.py` (812-915, plus line numbers from grep), `contrib/base_systems/custom_gametime/custom_gametime.py` (14-64 and 180-331), `evadventure/characters.py` (grep: lines 15 and 188), `evadventure/tests/test_ai.py` (grep: line 47), `CHANGELOG.md` (grep and two lines). Not read: the EvMenu option rendering and paging (about 1400-1490), how EvMenu matches a typed pick to the stored option list, `TickerHandler`, `dungeon.py` ticker use, `combat_turnbased.py`, `ingame_python/scripts.py` (`set_task` body), `evadventure/objects.py` and any quest-item code. Confidence: high on the quest step model (read end to end, with its test); high on the game-time schedule and the mob AI state machine (read in full); medium on EvMenu (node execution and goto only). Camera: not applicable. Note: this is tutorial code (`contrib/tutorials/evadventure`); `ai.py` calls itself "WIP".

## 1. Mechanism

- Model: a quest is a Python class (`EvAdventureQuest`, quests.py 18) with a `key`, a `desc`, a `start_step` (default `"start"`, line 60), one `step_<name>` method per step, an optional `help_<name>` string or method, and a `cleanup()` hook. Each character gets one instance per quest, held by `EvAdventureQuestHandler` (line 226), which is attached lazily to the character (characters.py 188).
- Persistent state: the handler keeps a registry of quest classes in the attribute `_quests` (line 240, category `evadventure`) and each quest's data dict in the attribute `_quest_data_<key>` (line 243). `add_data` sets one key in the dict (line 84) and calls `save_quest_data`, which writes the whole dict back as the attribute.
- Start: `handler.add(cls)` registers the class (line 315), builds the instance, and saves. The instance loads its data; `current_step` is the saved step, or `start_step` if none is saved.
- Status: a quest's status is a data key with default `"started"` (line 127). `complete()` sets `"completed"` (line 150), `abandon()` sets `"abandoned"`, `fail()` sets `"failed"`. Each setter saves through `add_data`.
- Progress: `progress(*args, **kwargs)` calls `getattr(self, f"step_{self.current_step}")(*args, **kwargs)` (line 179). The step decides. A step either does nothing, sets `current_step` (which saves) and calls `progress()` again to chain, or calls `complete()`. The kwargs are the only event channel: the test sends `progress(complete_quest_B=True)` (test_quests.py 142), and step B reads that kwarg. Nothing else calls `progress` in the shipped code (see Gaps).
- Help: `help()` shows `help_<status>` for a finished quest, otherwise `help_<current_step>`, and calls it if it is callable (lines 193-198).
- Remove: `handler.remove(key)` pops the instance, then calls abandon() if it is not completed (327-328), pops the class and saves the registry. DONOR DEFECT: the pop happens before abandon(), and abandon() saves through add_data -> save_quest_data(key), which calls self.get(key) and now gets None (348-357), so the 'abandoned' status is never written. The quest's data attribute is also not deleted (the donor calls no `remove_data`).
- Journal: `CmdQuests` (`quests` and `quest <name>`) lists each quest's status, and for one quest also its help text (end of quests.py).
- Restart: the quest data survives a server restart; test #3560 reloads the handler after clearing the cache and reads the saved `client` object back (test_quests.py 151-166; CHANGELOG 143).
- Tick: none. Quests move only when something calls `progress()`.

## 2. Key functions

- `EvAdventureQuest.progress`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/quests.py` 179 (read in full with the class).
- `EvAdventureQuest.complete`, `abandon`, `fail`, `status`: same file 127-165 (read).
- `EvAdventureQuest.help`: same file 180-202 (read).
- `EvAdventureQuestHandler.add` and `remove`: same file 305-333 (read).
- `EvAdventureQuestHandler.save_quest_data` and `load_quest_data`: same file, after line 333 (read).
- Test of the chain A, B, C with an event kwarg: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/tests/test_quests.py` 124-149 (read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Quest record: current step plus status, saved on every change | Default status `"started"` (quests.py 127); default start step `"start"` (60) |
| Step chain: check the current step, move on, check again | None in the engine. The test's final step needs a counter above 5 (test_quests.py step C, "> 5") |
| Event as a keyword argument, consumed by one step | None |
| Mob action weights, normalised to their sum, then a cumulative roll | `hold` 0.0, `attack` 0.85, `stunt` 0.05, `item` 0.0, `flee` 0.05 (npcs.py 259-265); roll in ai.py 101-105 |
| Game clock: seconds per unit, time factor, months | `hour` = 3600 s (custom_gametime.py 23); `month` = 4 weeks (26); `TIMEFACTOR` from settings (44) |

## 4. TypeScript sketch

simplified: keeps the donor's model (a per-character record with a current step and a status; steps checked in order; an event consumed by one step; a finished record is not restarted). It turns the step methods into data rows with three check kinds (has_tag, counter_at_least, event), which the donor cannot express without code. It omits the chained `progress()` call (replaced by a bounded loop), the help text, the journal command, the save layer and the class registry. Fixes to the donor: `progress` refuses a finished quest (donor quests.py 179 has no status check); cleanup runs on every end (donor `cleanup()` at 216 is never called); `remove` returns false for an unknown key (donor 327-328 reads `is_completed` on a None); the key is the only identity, as in the donor (the donor's class docstring mentions a category that the handler never uses).

```ts
// Licence: BSD-3-Clause (donor, evennia LICENSE.txt). Shape adapted from the quest-step model described in the donor; written fresh, not a line-by-line translation.

type QuestStatus = "started" | "completed" | "abandoned" | "failed";

// A step is a data row: one check and where it leads. The donor writes each step as a method.
type StepCheck =
  | { kind: "has_tag"; tag: string }
  | { kind: "counter_at_least"; counter: string; min: number }
  | { kind: "event"; name: string };

interface StepRow {
  step: string;
  check: StepCheck;
  next: string | null; // null = complete the quest
}

interface QuestDef {
  key: string;
  startStep: string;
  steps: StepRow[];
  cleanupCounters: string[]; // donor cleanup() is defined but never called; here it runs on every end
}

interface QuestState {
  key: string;
  step: string;
  status: QuestStatus;
}

interface World {
  hasTag(tag: string): boolean;
  counter(name: string): number;
  clearCounter(name: string): void;
}

function satisfied(check: StepCheck, world: World, event: string | undefined): boolean {
  switch (check.kind) {
    case "has_tag":
      return world.hasTag(check.tag);
    case "counter_at_least":
      return world.counter(check.counter) >= check.min;
    case "event":
      return event === check.name;
  }
}

function finish(def: QuestDef, q: QuestState, world: World, status: QuestStatus): void {
  q.status = status;
  for (const name of def.cleanupCounters) world.clearCounter(name);
}

// Advance as far as the rows allow. Order follows the donor: check the current step, move on, and only then re-check.
// Fix: nothing moves on a quest that is not started (donor progress() has no status check, quests.py 179).
// The event applies to the first step it is offered to only (donor test: progress(complete_quest_B=True) then progress()).
function progress(def: QuestDef, q: QuestState, world: World, event?: string): void {
  let pending = event;
  for (let guard = 0; guard <= def.steps.length && q.status === "started"; guard++) {
    const row = def.steps.find(r => r.step === q.step);
    if (!row || !satisfied(row.check, world, pending)) return;
    pending = undefined;
    if (row.next === null) {
      finish(def, q, world, "completed");
      return;
    }
    q.step = row.next;
  }
}

// Add or resume. A finished or abandoned record is returned as it is (the donor reloads the saved status the same way).
function addQuest(def: QuestDef, quests: Map<string, QuestState>): QuestState {
  const existing = quests.get(def.key);
  if (existing) return existing;
  const fresh: QuestState = { key: def.key, step: def.startStep, status: "started" };
  quests.set(def.key, fresh);
  return fresh;
}

// Remove: abandon a started quest. Fix: an unknown key returns false instead of reading a missing quest (donor quests.py 327-328).
function removeQuest(def: QuestDef, quests: Map<string, QuestState>, world: World): boolean {
  const q = quests.get(def.key);
  if (!q) return false;
  if (q.status === "started") finish(def, q, world, "abandoned");
  return true;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/qu002-evennia-quest.ts) exits 0.

## 5. Lands in

- TARGET `origins/quests/quest-state.ts` (proposed new module; not checked against the Frankendom repo). It holds the per-character quest record, the step rows, the event dispatch and the single cleanup on every end. Parity-checklist row 20 (catalogue as runtime source): quest definitions are data rows, and the server reads them.
- today: none known (not checked).
- Reuse tag: rewrite-from-idea (BSD-3, code may be adapted; this sketch is written fresh from the mechanism)
- Brief rule served: zones as data (quest steps as rows); server-verified (the server applies events; the client only sends them); one ledger (the quest record lives on the character and is saved with it); rules 7-9 n/a

## 6. Gaps and risks

- Quests are code. A quest is a Python subclass and a step is a method. A new quest is one row: no. The saved registry `_quests` stores the class objects themselves (quests.py 240 and 315), so the saved state refers to Python paths and breaks if a class moves (pickled by reference; not run to confirm).
- `cleanup()` never runs. It is defined at line 216 and its docstring (line 218) says it runs when a quest completes or is abandoned. No caller exists in the shipped code (grep). Counters such as the test's `test_quest_counter` stay set. Fix: the sketch clears `cleanupCounters` on every end.
- `progress()` has no status guard (line 179). A completed quest still runs its step methods, so a repeated event can run a finished step again. Fix: the sketch refuses to advance a finished quest.
- `remove()` on an unknown key crashes: `quest.is_completed` is read on None (327-328). Fix: return false.
- `remove()` does not actually persist the abandon: it pops the quest from `self.quests` first (322), so abandon() -> save_quest_data() finds no quest and writes nothing (322-333, 348-357). It also never calls `remove_data`, so the old saved data stays and a re-add resumes with the old step and status 'started'. Fix: the sketch sets and saves the abandoned status before dropping the live record, and a re-add returns that same abandoned record.
- No event bus. In the shipped code `progress` is called only by tests (quests.py 46 is a docstring example). `EvAdventureQuestGiver` is an empty subclass (npcs.py 221), and no non-test code calls `quests.add`. A quest cannot start or advance in play without new wiring. Frankendom needs explicit event rows, so the server dispatches kills and pickups instead of each step polling.
- Polling: the test's step A loops over the quester's contents on every `progress()` call (test_quests.py step A). That is O(items) per call. Event rows avoid it.
- Writes: each change saves the whole data dict (`save_quest_data`, method after line 333). Fine for a few keys; batch the writes if a character holds many quests.
- Quest identity: the class docstring (quests.py, the `category` argument) says `category + name` must be globally unique, but the handler indexes by `key` only (315, 327). Frankendom must pick one identity rule and enforce it.
- Help text lives in code (`help_<step>`, string or method, lines 193-198). Frankendom should keep help as a field of the step row.

### Other mechanisms read in this donor (depth as stated; not sketched here)

- NPC schedule (`custom_gametime.schedule`, custom_gametime.py 268-308; full depth, read). `schedule(callback, repeat, **units)` computes the real seconds until the next matching game time (`real_seconds_until`, 200-265; the result is divided by `TIMEFACTOR`, 265), creates one persistent `GametimeScript` with the callback stored in its db, and `at_repeat` (321-331) calls the callback and restarts with the next interval. A daily routine is a list of `schedule()` calls with hour and minute; the donor has no routine table. Gaps: a unit left out of the call keeps the current value (the divisors are the current time, 200-265), so `schedule(f, hour=2)` fires at the current minute and second of 02:xx (read in code, not run); `repeats` is 1 for a one-shot (301), but `at_repeat` calls `start()` unconditionally (331), so whether a one-shot re-arms was not run; the calendar is 4-week months (26). CHANGELOG 1230 (Evennia 1.0.0) says days, weeks and months now start from 1, which the `- 1` adjustment in `real_seconds_until` implements. Row fit: row 23 (zone population, time-gated presence), a later note.
- Dialogue (EvMenu, evmenu.py 812-915; partial depth). A node is `function(caller, raw_string, **kwargs)` returning `(text, options)` (835). An option is a dict with `desc`, `key` and `goto`; `goto` is a node name or `(name, kwargs)` (869). A callable `goto` returns the next node name, and if it returns nothing the current node re-runs (903-911). There is no declarative condition key: a node function builds only the options that are allowed. The talk NPC greeting picks `hi_text` at random (npcs.py 205) and builds its options from node names that start with `node_start_` (npcs.py 194-218). How a typed pick is matched to the stored list was not read.
- Mob AI state machine (ai.py, full; npcs.py 252-356). `AIHandler` stores `ai_state` as an attribute (56-57), `run()` calls `ai_<state>()` inside a try (111), and any exception is logged and swallowed. `random_probability` normalises the weights to their sum, sorts them high to low and returns the first key whose cumulative total reaches a uniform roll (84-107). The same helper is duplicated in utils.py (57).

### Donor defects (keep the idea, fix the defect)

- Mob combat action names do not match. `combat_probabilities` uses the key `"attack"` (npcs.py 261), but `ai_combat` matches `case "combat":` (291). The 0.85 attack roll matches no case, so the mob queues nothing on that tick. Fix: match `"attack"`.
- Mob combat reads `self.nbd.combathandler` (npcs.py 283). The donor defines no `nbd` (grep: one hit, this line); Evennia's non-persistent store is `ndb`. Read in code, not run: this would raise AttributeError, which `run()` logs and swallows, so the mob silently does nothing. Fix: `ndb`.
- `random_probability` divides by the weight total (ai.py 84-107): all-zero weights raise ZeroDivisionError, and a roll that exceeds the rounded total returns None, which matches no action. Fix: guard both and keep one copy of the helper.

## As-data shape

- Quest definition: a Python subclass of `EvAdventureQuest` with `key` (str), `desc` (str), `start_step` (str), `help_<step>` (str or method), `step_<step>` (method) and `cleanup()` (method) (quests.py 18-60). A new quest is one row: no (a class). A new step is one row: no (a method).
- Character record, registry: attribute `_quests` = {key: class} (quests.py 240, 315). Quest data: attribute `_quest_data_<key>` = dict with `current_step` and `status`, plus author keys (quests.py 243; keys set in `add_data`, line 84).
- Progress event: keyword arguments to `progress()`, no schema (quests.py 179).
- Game-time schedule row: a persistent `GametimeScript` with `db.callback` (a top-level function) and `db.gametime` = the unit kwargs (custom_gametime.py 301-306). A new time-of-day schedule is one row: yes, one `schedule()` call (no code change), once the callback exists.
- EvMenu node: a function returning `(text, options)`; option = dict of `desc`, `key`, `goto` (evmenu.py 835, 869). A new dialogue node is one row: no (a function), a new option is one row: no (a dict built in the node function).
- AI state: attribute `ai_state` in category `ai_state` (ai.py 56-57); behaviour weights are a dict on the class (npcs.py 259-265).

## Provenance

- Repo: evennia-evennia, `/mnt/frankendom-donors/evennia-evennia/`. The quest code is tutorial code under `evennia/contrib/tutorials/evadventure/`. Licence: BSD-3-Clause, read from LICENSE.txt line 1. The code may be adapted; this sketch is written fresh.
- No `.git` directory in the box; the history below is from CHANGELOG.md.

## What they patched later

- Quest reload after restart: "Tutorial QuestHandler failed to load after server restart" was fixed in Evennia 6.0.0 (CHANGELOG 143; test #3560 at test_quests.py 151-166).
- Game time: "days/weeks/months now always starts from 1" in Evennia 1.0.0 (CHANGELOG 1230), with the `- 1` adjustment in `real_seconds_until` (custom_gametime.py 200-265).
- EvAdventure typo fixes exist (CHANGELOG 323, 948), none on the quest or AI code. The combat-name and `nbd` defects above are not in the changelog.

## Rulings for Dom

1. Should quests be data rows (a step is a kind and parameters, as in the sketch) rather than Python classes? Recommendation: data rows, so a new quest is a row.
2. Should a finished quest be repeatable? Recommendation: no by default, with a per-quest `repeatable` flag.
3. Should kills and pickups be sent to the server as named events for quest steps, instead of steps polling inventory? Recommendation: yes, event rows.

Best transferable idea: Model a quest as a per-character record with a current step and a status, advance it only through ordered step rows fed by named events, and run one cleanup on every end.
Decision (proposed): adapt - the step-and-status record and the event-consumed-once rule fit Frankendom quests; step methods become data rows, cleanup runs on every end, and a finished quest refuses progress; the game-time schedule is a separate follow-up for NPC routines.
Acceptance: A server test completes a three-step quest from events in order, refuses a progress event after completion, runs the cleanup counters exactly once on completion and on abandon, and returns the same record after a reload.

Reuse tag: rewrite-from-idea (BSD-3; adapted shape, fresh code)
Brief rule served: zones as data (quest steps as rows); server-verified (the server applies events); one ledger (the quest record on the character, saved with it); rules 7-9 n/a


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Quest model, status default, progress() without a status guard, cleanup() never called, remove() None crash, key-only identity, AI action-name mismatch, npcs.py typo, zero-division, custom_gametime, licence and changelog lines all verified.
- Minor: note implied remove() persists the abandon; it does not (pop before abandon, so save_quest_data finds None and the status is never written).
- Missed (added): that lost write is the reason a re-add resumes with the old 'started' status, as well as the missing remove_data.

Fixed 2026-10-12: section 1 Remove line and section 6 remove() bullet now describe the lost abandon write; sketch logic unchanged (it already writes abandoned before dropping the record).
