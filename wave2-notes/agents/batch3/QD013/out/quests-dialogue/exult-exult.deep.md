# exult-exult (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/exult-exult/usecode/ucmachine.h` (flag store) with `usecode/ucinternal.cc`, `usecode/conversation.cc`, `usecode/intrinsics.cc`, `gumps/Notebook_gump.cc` | Licence: GPL-2.0-or-later (headers of `usecode/ucmachine.h` and `usecode/conversation.h`: "either version 2 of the License, or (at your option) any later version"; `COPYING` is the GPL version 2 text) | C++ | symbol `Usecode_machine::set_global_flag`

Checked: Read in full: `usecode/conversation.h` (119 lines). Read in part, with the line ranges: `ucmachine.h` 44-160; `ucinternal.cc` 1666-1721 (choice loop), 2605-2680 (PUSHF/POPF), 3176-3186 and 3258-3270 (save/load of flags); `conversation.cc` 110-200 and 830-959 (answer list, choice hit test, push/pop); `intrinsics.cc` 148-206 (answer and menu intrinsics); `gumps/Notebook_gump.cc` 820-870 and 950-990 (journal entry and autonote loader); `gumps/Notebook_gump.h` 90-110; `ucsched.h` (grep survey of the class); `ucsched.cc` 300-362 and 430-460; `gamewin.cc` 392-394 (config default), 2909 (caller). Callers: `get_global_flag`/`set_global_flag` have three non-usecode callers (`gamewin.cc` 2909, `cheat_screen.cc` 1608, `Dynamic_button`); the POPF opcode (`ucinternal.cc` 2631) is the only usecode writer. `add_answer` is called from one intrinsic (intrinsics 152-156) and from its own array overload (`conversation.cc` 134). Data read by counting (not quoted): `data/bg/autonotes.txt` 790 entries over 789 distinct flag numbers (flag 0x333 appears twice; which text the loader keeps was not read; 706 entries have a bare identifier as text, 84 with prose), `data/si/autonotes.txt` 681 entries (531 bare identifier, 150 prose), `data/bg/global_flags.txt` 823 named flags, `data/si/global_flags.txt` 698 named flags. Not read: the quest content itself (rewards, objectives, the dialogue scripts). The donor has only the VM and the intrinsics; `data/bginclude.uc` (10 lines) and `data/myusecode.uc` (8 lines) are stubs (head read). Not read: `translate_usecode_text`, the journal save format, `Get_click`, `show_avatar_choices` (707-829). Confidence: high for the flag ledger and the choice loop; medium for the scheduler part (read in part). Camera: not applicable.

## 1. Mechanism

- One world-state ledger. Global flags are a byte vector, one byte per flag, with the store grown in whole 2048-byte pages and capped at 32768 flags (`ucmachine.h` 50, 57, 60). A checked write rejects an index at or above the cap and grows the store to `i + 1` rounded up to a page, clamped to the cap (124-128, 139-140). A checked read returns "no value" outside the store (111-114). Unchecked accessors skip these checks (101, 106).
- Usecode reads and writes flags by opcode. PUSHF reads the flag and pushes its value; an out-of-range read reports an error and pushes 0 (`ucinternal.cc` 2617-2622). POPF pops a value and writes it through the checked setter (2631). Setting a flag to true then calls the journal hook (2664-2665). A SI-only special case clears flag 0x272 (`doing_xenka_return`) right after it is set (2668-2670, enum at `ucmachine.h` 95).
- Journal entry on set. `add_gflag_text(int)` looks up the flag's text in the autonote table and returns if the table has no text for that flag (`Notebook_gump.h` 99-106; the check is at 103). The table is loaded from the `config/autonotes` resource on first use (`Notebook_gump.cc` 969-990, bundled path at 980). `add_gflag_text(gflag, text)` returns if a note with that flag already exists (843-847), and adds the note only when autonotes are allowed (848-849). Autonotes default to off: the config key `config/gameplay/allow_autonotes` is read with default "no" (`gamewin.cc` 392-393).
- Save and load. Before saving, the store is compacted: if no flag is set it keeps one page; otherwise it keeps the whole pages that cover the last set flag (`ucmachine.h` 149-160; the save call is `ucinternal.cc` 3182). The bytes are then written as they are (3184). Load resets the store to the saved length and reads the bytes (3262-3263).
- Dialogue answers. Usecode builds a list of answer strings with `add_answer` (intrinsics 152-153 to `Conversation::add_answer`, `conversation.cc` 118-139). An answer that is already listed is removed and appended again (119, 122). Lookups are a linear search by exact string (`locate_answer`, 938-948). `push_answers` saves the current list on a stack and clears the list (950-953); `pop_answers` restores the top of the stack (955-957). The pop intrinsic does nothing if the stack is empty (intrinsics 171-179, guard at 173).
- Choosing an answer. `select_from_menu2` returns the 1-based index (intrinsics 197-206; index from `get_user_choice_num`). `get_user_choice_num` (`ucinternal.cc` 1687-1721) shows the choices (1690), then loops: paint, `Get_click` (1697). If there is no click (ESC, per the comment at 1698), it picks the answer "bye" if one exists (1699); otherwise the choice stays -1 and the loop waits. A key picks by position in "123456789abcdefghijklmnopqrstuvwxyz" if the position is below the answer count (1703-1708). A click picks the index from the overlay hit test (1711, `conversation.cc` 868-888). The loop ends only when the index is valid (1715). The chosen string is stored (1719).
- Waiting is a blocking call, not a parked script. The choice loop runs inside the usecode intrinsic and keeps the game painting and reading input until a valid pick (1696-1715). Scripts that wait over game time are the scheduler: `Usecode_script::handle_event` runs `exec` (one instruction per tick, with a "continue" opcode letting several run; `ucsched.cc` 300-318), re-queues itself at `curtime + delay` if instructions are left (320), and deletes itself when none are left (331). The default delay is the window's standard delay (350). The delay opcodes multiply it by ticks, minutes or hours (434-456). Scheduler values not read: the standard delay itself, `ticks_per_minute`.

## 2. Key functions

- `Usecode_machine::set_global_flag` / `get_global_flag` / `set_num_global_flags` / `compact_global_flags`: `/mnt/frankendom-donors/exult-exult/usecode/ucmachine.h` 99-160.
- Usecode PUSHF / POPF handlers: `/mnt/frankendom-donors/exult-exult/usecode/ucinternal.cc` 2610-2670.
- Journal hook: `/mnt/frankendom-donors/exult-exult/gumps/Notebook_gump.cc` 838-851 (`add_gflag_text`) and `/mnt/frankendom-donors/exult-exult/gumps/Notebook_gump.h` 99-106.
- Answer list: `/mnt/frankendom-donors/exult-exult/usecode/conversation.cc` 114-169 (add/remove), 938-959 (lookup, push, pop).
- Choice loop: `/mnt/frankendom-donors/exult-exult/usecode/ucinternal.cc` 1668-1721 (`get_user_choice`, `get_user_choice_num`).
- Scheduler: `/mnt/frankendom-donors/exult-exult/usecode/ucsched.cc` 303-332 (`handle_event`), 345-456 (`exec`, the start of the function and its delay opcodes).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| One ledger of named boolean flags, one byte each, grown in pages, with a hard cap | 32768 flags max (`ucmachine.h` 60); page 2048 (57); used flags are far below the cap (highest autonote flag in bg is 0x344, data table) |
| Save trims the store to the pages that cover the last set flag | One page minimum (152), page-rounded trim (158) |
| Journal entry when a flag becomes true, once per flag | Text table per flag; autonotes off by default (`gamewin.cc` 392, "no") |
| Choice by key: position in a key string, then bounds check | 35 keys: 1-9, then a-z (1703) |
| ESC means leave, if the dialogue has a "bye" answer | Answer text "bye", exact match (1699) |
| Nested dialogue lists | Stack, unbounded depth (`conversation.h` 50 is a deque) |
| Time-based script steps | Delay = standard delay times the unit count (434-456); the standard delay value is not read |

Defects and special cases (keep the idea, fix each):
- `pop_answers` reads the front of an empty deque (`conversation.cc` 956-957). The only guard is in the intrinsic (`intrinsics.cc` 173). fix: check the stack inside `pop_answers` and return a bool.
- Flag 0x272 is forced to false right after it is set, but only in SI (`ucinternal.cc` 2668-2670). That is a per-game special case in the write path. fix: move the rule to per-game data (a flag list with a "clear on set" option), not a branch in the write path.
- Journal entries come only from the usecode POPF path (2665). Engine-side writes (`gamewin.cc` 2909, the first-scene flag) and the cheat screen (`cheat_screen.cc` 1608) set flags without a journal entry. fix: route every flag write through one setter that decides the journal entry.
- ESC picks "bye" by exact string (`locate_answer`, 941), and answers are translated when added (`conversation.cc` 121) but "bye" is looked up untranslated. Whether this breaks in a translated game was not tested (translate_usecode_text not read). fix: store an answer id, not a display string, and map ESC to that id.
- The flag store is named only in debug logs and the cheat screen (`ucinternal.cc` 2636-2661; the name file is `global_flags.txt`). fix: flags are named keys in data from the start.

## 4. TypeScript sketch

simplified: the sketch keeps the store shape (one byte per flag, grown by page, capped, compact on save) and the answer list (add moves to the end, push and pop keep nested lists, keys map by position, ESC picks "bye"). It changes three things: the journal fires on the 0 to 1 edge (the donor calls the journal hook on every set to true, and the notebook removes repeats by flag number); the pop call returns a boolean instead of reading an empty stack; the choice is a pure function of an input event, so the blocking wait loop is omitted (the caller keeps waiting while the result is -1). It omits the SI special case, the debug logging, the translation step, the overlay hit test, the scheduler, and the save file format. The check calls at the end run when the file is compiled and run with node on the VPS (exit 0).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const PAGE = 2048;
const MAX_FLAGS = 32768;

// One ledger for world state: one byte per flag, grown in whole pages up to a cap.
class FlagLedger {
  private bits: Uint8Array = new Uint8Array(PAGE);
  constructor(private onSet: (flag: number) => void) {}

  // Read: undefined when the index is outside the store (the caller treats it as 0 and reports it).
  get(i: number): boolean | undefined {
    if (i < 0 || i >= this.bits.length) return undefined;
    return this.bits[i] !== 0;
  }

  // Write: refused at or above the cap; grows the store when needed; journals on the 0 -> 1 edge.
  set(i: number, v: boolean): boolean {
    if (i < 0 || i >= MAX_FLAGS) return false;
    if (i >= this.bits.length) this.grow(i + 1);
    const wasSet = this.bits[i] !== 0;
    this.bits[i] = v ? 1 : 0;
    if (v && !wasSet) this.onSet(i);
    return true;
  }

  private grow(n: number): void {
    const size = Math.min(Math.ceil(n / PAGE) * PAGE, MAX_FLAGS);
    const next = new Uint8Array(size);
    next.set(this.bits);
    this.bits = next;
  }

  // Save: keep whole pages up to the last set flag; never less than one page.
  compact(): Uint8Array {
    let last = -1;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      if (this.bits[i] === 1) { last = i; break; }
    }
    const n = Math.max(PAGE, Math.ceil((last + 1) / PAGE) * PAGE);
    return this.bits.slice(0, n);
  }
}

interface JournalEntry { flag: number; text: string; }

// Journal hook: one entry per flag, only when autonotes are allowed and the flag has text.
function journalOnSet(journal: JournalEntry[], flag: number, text: string | undefined, allowed: boolean): void {
  if (!allowed || !text) return;
  if (journal.some((e) => e.flag === flag)) return;
  journal.push({ flag, text });
}

// Dialogue answers: a list the player picks from, with nested lists kept on a stack.
class AnswerMenu {
  private answers: string[] = [];
  private stack: string[][] = [];

  // Adding an answer that is already listed moves it to the end.
  add(s: string): void {
    this.remove(s);
    this.answers.push(s);
  }

  remove(s: string): void {
    const i = this.answers.indexOf(s);
    if (i >= 0) this.answers.splice(i, 1);
  }

  push(): void {
    this.stack.push(this.answers);
    this.answers = [];
  }

  // Restores the last saved list; does nothing when the stack is empty.
  pop(): boolean {
    const prev = this.stack.pop();
    if (prev === undefined) return false;
    this.answers = prev;
    return true;
  }

  locate(s: string): number {
    return this.answers.indexOf(s);
  }

  get list(): readonly string[] {
    return this.answers;
  }
}

// Pick an answer index from a key (1-9, then a-z) or a click index; -1 means no valid pick yet.
const KEYS = "123456789abcdefghijklmnopqrstuvwxyz";
function pick(menu: AnswerMenu, input: { esc?: boolean; key?: string; click?: number }): number {
  if (input.esc) return menu.locate("bye"); // -1 when there is no "bye" answer; the caller keeps waiting
  if (input.key !== undefined) {
    if (input.key.length !== 1) return -1;
    const d = KEYS.indexOf(input.key);
    return d >= 0 && d < menu.list.length ? d : -1;
  }
  if (input.click !== undefined) return input.click < menu.list.length ? input.click : -1;
  return -1;
}

// Checks: set once journals once; cap and read are guarded; nested menus restore; keys map to indices.
const journal: JournalEntry[] = [];
const ledger = new FlagLedger((f) => journalOnSet(journal, f, "text for flag", true));
ledger.set(3, true);
ledger.set(3, true);
if (journal.length !== 1) throw new Error("journal should have one entry");
if (ledger.set(MAX_FLAGS, true)) throw new Error("cap not enforced");
if (ledger.get(5000) !== undefined && ledger.get(5000) !== false) throw new Error("read");
if (ledger.compact().length !== PAGE) throw new Error("compact");

const menu = new AnswerMenu();
menu.add("Tell me more");
menu.add("bye");
menu.add("Tell me more");                 // moves to the end
if (menu.list.join("|") !== "bye|Tell me more") throw new Error("dedupe");
if (pick(menu, { key: "2" }) !== 1) throw new Error("key pick");
if (pick(menu, { esc: true }) !== 0) throw new Error("esc to bye");
menu.push();
menu.add("Back");
if (menu.list.join("|") !== "Back") throw new Error("push clears");
if (!menu.pop()) throw new Error("pop");
if (menu.list.join("|") !== "bye|Tell me more") throw new Error("pop restores");
if (menu.pop()) throw new Error("pop on empty stack should do nothing");
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/qd013-exult-flags-and-answers.ts` (with `export {};` appended): exit 0. Compiled with `tsc --strict --target es2020` and run with `node`: exit 0.

## 5. Lands in

- TARGET `origins/quests/flags.ts` (new file, proposed): the one character ledger holds named flags (a set of booleans, with names from data), a single setter that decides the journal entry, and the save compaction. The answer menu is client-only UI: its pick is sent to the server as an action, and the server decides what the pick does.
- Parity-checklist row: 18 (loot roll and XP award), as the cell hint says. Flags themselves have no row of their own; row 18 is the closest fit for quest rewards on the one character ledger.
- Reuse tag: adapt-idea (GPL-2.0-or-later: clean-room only; the sketch is written from the mechanism)
- Brief rule served: one ledger (one character, one ledger); completion decided on the server; the answer menu is client-only (camera, HUD and sound rules)

## 6. Gaps and risks

- Clean-room only: the donor is GPL-2.0-or-later. The sketch is written from the mechanism and the donor code is not copied.
- One ledger: the donor's ledger is global (one store for the whole world, `ucmachine.h` 50). Frankendom's ruling is one character ledger, so the flags have to be per character (or a per-character view of a world ledger, decided once).
- Server-verified: the donor trusts whatever runs usecode. In Frankendom only the server path may write a flag or a reward; the client sends a pick (answer id) and nothing more.
- Journal: entries come from one place (`ucinternal.cc` 2665) and some writes skip it (gamewin 2909, cheat 1608). Frankendom must route every write through the one setter.
- Dialogue choice is a blocking loop inside the usecode call (1696-1715). Frankendom must not block a server tick on a player's pick; the pick is an event that resumes a parked dialogue step. The donor's scheduler parks timed scripts (`ucsched.cc` 320), which is the shape to copy for timed steps, not the choice loop.
- The quest content (what sets which flag, rewards, objectives) is not in the donor. Anything that depends on those scripts is not verified here.
- Not relevant to Frankendom's fight rulings (MAX_ATTACKERS, hate lists, the Pit).

Best transferable idea: a world-state ledger of named boolean flags (one byte each, page-grown, capped, compacted on save) whose set-to-true write is the one place that also writes a journal line, once per flag.
Decision (proposed): adapt — keep the flag ledger, the single setter with journal-on-set, and the answer list with push/pop; key the flags by data names and the answers by id; reject the SI-only special case and the unguarded pop.
Acceptance: a server test: setting the quest flag "met_smith" to true adds one journal line, and setting it again adds none; after save and reload the flag and the journal line are unchanged; a client message that tries to set a flag is refused. A client check: the choice list shows keys 1-9 then a-z, ESC picks the "bye" answer when one exists and does nothing when there is none.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN.
- Errors: none; all cited lines and counts verified.
- Missed: did_first_scene kludge in POPF (ucinternal.cc 2673-2676) is another per-game special case beside the xenka one; skip_intro flag write at gamewin.cc 2909 (already cited).
