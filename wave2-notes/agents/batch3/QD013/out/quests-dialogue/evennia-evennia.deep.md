# evennia-evennia (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/quests.py` | Licence: BSD-3-Clause (read: `/mnt/frankendom-donors/evennia-evennia/LICENSE.txt`, "BSD 3-Clause License") | Python | symbol `EvAdventureQuest` / `EvAdventureQuestHandler`

Checked: The hint file `quests.py` was read in full (402 lines), with its test `tests/test_quests.py` (168 lines, in full), the XP and quest lazy property in `characters.py` (170-190 and 282-306 read; the level-up lines 307-320 by grep), the talk and quest-giver code in `npcs.py` (115-228, not 252-356), the dialogue tutorial `talking_npc/talking_npc.py` (144 lines, in full), and the EvMenu parts of `evennia/utils/evmenu.py` (804 by grep; 812-832 and 884-990 read; the rest (not read)). The hint file for the cell's other candidate, `full_systems/evscaperoom/state.py` (309 lines), was also read in full: it is an escape-room state machine with a hint ladder, not a quest system, and it is not written up here (one note per cell). Callers: checked by grep over `evadventure/` and `contrib/` (non-test code): no caller of `cleanup()`, of `quests.add` / `quests.remove`, or of `add_xp` outside the tests; `progress()` has no non-test caller: it is called from the step methods themselves (test lines 41 and 53), from the tests, and from a docstring example. Confidence: high for the quest step machine and its defects; medium for the dialogue part (EvMenu internals only partly read). Camera: not applicable.

## 1. Mechanism

- Each character gets a quest handler (`characters.py` 186-188: lazy property `quests`). The handler reads a registry of quest classes from one attribute (`_quests`) and builds one quest object per key on load (`quests.py` 240, 252-260).
- A quest is a class with a `start_step`, one `step_<name>` method per step, and `help_<name>` text or methods (`quests.py` 18-56). `progress(*args, **kwargs)` runs `step_<current_step>` with whatever arguments the environment passes (`quests.py` 166-179). Each step checks its own condition. If it is met, the step sets the next step (which persists it) and may call `progress()` again so that several steps can move in one call (test `step_A` sets "B" and calls `progress()`, test lines 38-41).
- Persistence: `add_data` writes the key into the quest's dict and then saves the whole dict to a per-quest attribute named `_quest_data_<key>` (`quests.py` 84-85, 243, 335-350). The step and status setters go through `add_data`, so every change is saved at once. On load, `__init__` restores `data` and `current_step` from that attribute (`quests.py` 69-73). Restart is simulated in the test by clearing the lazy property (test 162), after which the stored data is read back.
- Status: a quest starts as "started" (`status` getter; default in `quests.py` 127). `complete()`, `abandon()` and `fail()` set it to "completed", "abandoned" or "failed" (`quests.py` 145-164). `help()` checks terminal status first, then returns `help_<current_step>` (`quests.py` 181-205).
- Removal: `remove(key)` pops the quest, abandons it if it is not completed, and drops the registry entry (`quests.py` 319-333). The per-quest data attribute is not deleted, so re-adding the quest later reloads it.
- Cleanup: the base class has `cleanup()` (`quests.py` 216-223), documented as called "when completing the quest, or when it is abandoned prematurely". No code calls it (see Gaps). The test quest's `cleanup()` deletes the counter it set (test 69-74).
- Rewards: the donor has no reward table. The test quest's final step adds 10 XP straight to the character (test 64-67). The XP ledger is a single character attribute `xp` (`characters.py` 177), and `add_xp` adds to it and reports whether the threshold is met (`characters.py` 288-305). `level_up()` is the separate step that increments the level (`characters.py` 320). No non-test code calls `add_xp`.
- Dialogue (EvMenu): `at_talk` opens an `EvMenu` with the NPC's menu data and passes the NPC in as `npc` (`npcs.py` 172-191). A node is a function that returns `(text, options)`; an option is `{"desc": ..., "goto": <node name>}` (`talking_npc.py` 36, 80-85). `node_start` builds the top-level options from every node whose name starts with `node_start_` (`npcs.py` 194-216). Going to an unknown node name is caught inside `EvMenu.goto` (`evmenu.py` 884-925, lookup at 829). `EvAdventureQuestGiver` is an empty subclass with a docstring (`npcs.py` 221-223): it does not hand out any quest. The donor has no code that connects dialogue choices to `quests.add` or to `progress()`.

## 2. Key functions

- `EvAdventureQuest.progress`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/quests.py` 166-179 (one line of body: the step dispatch).
- `EvAdventureQuest.add_data` / `current_step` setter / `status` setter / `complete`: `quests.py` 75-85, 116-150. Every setter writes through `add_data`.
- `EvAdventureQuest.help`: `quests.py` 181-205.
- `EvAdventureQuestHandler._load`, `add`, `remove`, `save_quest_data`, `load_quest_data`: `quests.py` 252-367.
- Reference quest (tests): `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/tests/test_quests.py` 16-74 (steps A, B, C and cleanup).
- Talk and quest-giver: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/npcs.py` 172-191 (`at_talk`), 194-216 (`node_start`), 221-223 (`EvAdventureQuestGiver`).
- Dialogue tutorial: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/talking_npc/talking_npc.py` 32-85 (nodes), 117-120 (menu start).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A quest is a step machine: the current step is the state, a step checks its own condition, and progress is a dispatch by step name | Start step name is data: `start_step = "start"` by default (`quests.py` 60); the test uses "A" (test 25) |
| The state is saved on every change, with one save per setter call | None (no batching; each `add_data` writes the full dict, `quests.py` 84-85) |
| Terminal status (completed, abandoned, failed) is stored and selects the help text | Help strings are per class (`help_start`, `help_end`, `quests.py` 63-64) |
| Quest reward for a finished step | +10 XP in the test quest (test 66); no reward table in the donor |
| Trigger gate on a counter | Counter must be greater than 5 (test 64) |
| XP per level: threshold is level times a constant, compared against total XP | `xp_per_level = 1000` (`characters.py` 178); threshold 1000 at level 1, 2000 at level 2 (`characters.py` 304) |

No timers, no caps, no randomness in this code.

Defects found (keep the idea, fix each):
- `cleanup()` is never called. `complete()`, `abandon()` and `fail()` (`quests.py` 145-164) do not call it, and the comment at line 329 says "make sure to cleanup" before the abandon call (line 330), which does not call it either. fix: call `cleanup()` from the single place where a quest becomes terminal.
- `progress()` has no status gate (`quests.py` 166-179). A completed quest still runs its current step. In the test quest, step C pays 10 XP again on every call while the counter stays above 5 (test 64-67), because `cleanup()` (the only code that deletes the counter, test 74) never runs. fix: return early unless the status is "started", and make the gate part of the single terminal path.
- `remove(key)` with an unknown key crashes: `quest` is None and `quest.is_completed` is read (`quests.py` 327-328). fix: return if the key is not found.
- `add_xp` docstring says level 2 to 3 is "2000 XP" (`characters.py` 299-300), but the code compares total XP with `level * 1000` (304-305), so the next level needs 1000 more XP. fix: make the docstring match the rule we choose, and test it. Also `add_xp` only reports the threshold; a caller that awards a large amount must call `level_up()` once per level (no loop in the donor).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (dispatch on the current step; a step may advance and the next step is checked in the same call; help picks terminal status first). It differs in three ways: a status gate in `progress` (the donor has none), `cleanup` runs from one terminal path, and the recursion is replaced by a loop bounded at 8 steps. It omits Evennia's attribute storage (one `Ledger` object stands in for it and no save call is made), the `abandon` and `fail` entry points (the status is a plain argument), the quester's `contents` and `db` reads (the event object stands in), the EvMenu dialogue, and the XP level-up rule. The XP reward is written inside the step, as in the donor's test quest.

```ts
// Licence: BSD-3-Clause (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Status = "started" | "completed" | "abandoned" | "failed";
type Ev = Record<string, number | string | boolean>;

// One character's ledger: a single object holds the XP and every quest's record.
interface QuestEntry {
  step: string;
  status: Status;
  data: Record<string, number | string | boolean>;
}
interface Ledger {
  xp: number;
  quests: Record<string, QuestEntry>;
}

interface StepCtx {
  entry: QuestEntry;
  ledger: Ledger;
  ev: Ev; // the event that triggered progress
  setStep(name: string): void;
  finish(): void;
}

interface QuestDef {
  key: string;
  startStep: string;
  steps: Record<string, (ctx: StepCtx) => void>;
  help: Record<string, string>;
  cleanup?: (entry: QuestEntry) => void;
}

// Any terminal status ends the quest: cleanup runs once, here.
function setStatus(def: QuestDef, entry: QuestEntry, status: Status): void {
  entry.status = status;
  def.cleanup?.(entry);
}

// Start a quest, or keep stored progress if the character already has it.
function addQuest(def: QuestDef, ledger: Ledger): QuestEntry {
  const existing = ledger.quests[def.key];
  if (existing) return existing;
  const entry: QuestEntry = { step: def.startStep, status: "started", data: {} };
  ledger.quests[def.key] = entry;
  return entry;
}

// Run the current step; keep going while a step advances; never run after a terminal status.
function progress(def: QuestDef, ledger: Ledger, ev: Ev): void {
  for (let i = 0; i < 8; i++) {
    const entry = ledger.quests[def.key];
    if (!entry || entry.status !== "started") return;
    const before = entry.step;
    const step = def.steps[before];
    if (!step) return;
    step({
      entry,
      ledger,
      ev,
      setStep(name: string) { entry.step = name; },
      finish() { setStatus(def, entry, "completed"); },
    });
    if (entry.step === before && entry.status === "started") return;
  }
}

// Help: terminal status first, then the current step's text.
function help(def: QuestDef, entry: QuestEntry): string {
  if (entry.status !== "started") return `You have ${entry.status} this quest.`;
  return def.help[entry.step] ?? "No help available.";
}

// Example quest: step A waits for the parcel; step B pays 10 XP once and completes.
const delivery: QuestDef = {
  key: "delivery",
  startStep: "A",
  help: { A: "Pick up the parcel.", B: "Deliver it with more than 5 gold on you." },
  steps: {
    A: (c) => { if (c.ev.item === "parcel") c.setStep("B"); },
    B: (c) => {
      const gold = c.ev.gold;
      if (typeof gold === "number" && gold > 5) { c.ledger.xp += 10; c.finish(); }
    },
  },
  cleanup: (entry) => { delete entry.data.tmp; },
};

const ledger: Ledger = { xp: 0, quests: {} };
addQuest(delivery, ledger);
progress(delivery, ledger, { item: "parcel" });  // A -> B
progress(delivery, ledger, { gold: 7 });         // B -> completed, +10 xp
progress(delivery, ledger, { gold: 7 });         // no-op: terminal status gate
if (ledger.xp !== 10) throw new Error("xp paid more than once");
if (help(delivery, ledger.quests["delivery"]) !== "You have completed this quest.") throw new Error("help");
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/qd013-evennia-quest-steps.ts` (with `export {};` appended): exit 0. Traced by hand: A to B on the parcel event, +10 XP and completion on the first gold event, no change on the second. Compiled with `tsc --strict --target es2020` and run with `node` on the VPS: its own checks at the end passed (exit 0).

## 5. Lands in

- TARGET `origins/quests/steps.ts` (new file, proposed; I did not check whether Frankendom already has a quest module): the quest step machine, with a status gate and one terminal path that runs cleanup. Quest state lives in the character's single ledger entry, not in a per-quest attribute.
- Parity-checklist row: 18 (loot roll and XP award). The quest XP reward goes through the same award path as loot XP; no new row.
- Reuse tag: adapt-idea (BSD-3-Clause: code may be adapted; this sketch is clean-room)
- Brief rule served: one ledger (one character, one ledger); completion decided on the server (the step check must run in the server's progress call); rules 7-9 n/a

## 6. Gaps and risks

- One ledger: the donor stores each quest in its own attribute (`_quest_data_<key>`) and the registry in `_quests` (`quests.py` 240, 243). Frankendom must keep all quest state, and the XP, in the one character ledger.
- Server-verified: the donor's step checks read the character directly (test lines 38, 64) and run wherever `progress()` is called. In Frankendom the step check and the reward must run in the server's `progress` path only. The client may show the log, not decide completion.
- Quests as code: the donor defines each quest as a Python class (`quests.py` 18-56). Frankendom's ruling is zones as data, so quest steps need to become data (a list of steps with a fixed set of condition types), not per-quest classes. This is a real change to the idea, not a detail.
- The donor's defects (no cleanup call, no status gate, the `remove` crash, the XP docstring mismatch) are listed in section 3 with fixes; the sketch already has the first two fixed. The XP level rule must be decided once for Frankendom (the donor's is total XP against level times 1000).
- Dialogue: the EvMenu tree is a node graph (`talking_npc.py` 32-85) and is fine as a shape, but the donor does not connect any dialogue choice to a quest. In Frankendom every dialogue choice that starts or advances a quest must call the same server path (the step machine above), not set state in the menu.
- Not relevant to Frankendom's fight rulings: MAX_ATTACKERS, hate lists, the Pit. The quest step machine does not touch combat.
- Not read: EvMenu internals beyond the lines cited (menu tree construction, the auto-quit behaviour of an empty option list); `characters.py` 252-282 and 336-356; any Evennia-side persistence code (the attribute backend).

Best transferable idea: a quest is a per-character step machine (the current step is the state; progress() checks only that step's condition and stops at a terminal status), saved in the one character ledger, with cleanup run once from the terminal path.
Decision (proposed): adapt — keep the step machine and its status gate, store it in the one character ledger, and express steps as zone data instead of per-quest classes; reject the per-quest attribute store.
Acceptance: a server test: quest "delivery" on one character. The parcel event moves the step to B; a delivery event with 7 gold adds 10 XP once and the quest log reads "You have completed this quest."; a second delivery event adds nothing; after a server reload from the ledger, the status and XP are unchanged.
