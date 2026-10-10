# OpenTTD-OpenTTD (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/goal.cpp` (hint file, read in full; it holds the command handlers, not the dialogue window) | Licence: GPL-2.0 (goal.cpp header line 3: "under the terms of the GNU General Public License as published by the Free Software Foundation, version 2"; `COPYING.md` is "Version 2, June 1991") | C++ | symbol `CmdGoalQuestionAnswer` (with `CmdGoalQuestion`, `ShowGoalQuestion`, `ScriptGoal::DoQuestion`)

Checked: The real mechanism is the question and answer round trip, not the goal list. Read end to end: `CmdGoalQuestion` (goal.cpp 243-276), `CmdGoalQuestionAnswer` (285-306), `GoalQuestionWindow` and its click handler (goal_gui.cpp 318-388, 363-373), `ShowGoalQuestion` (465-469), `ScriptGoal::DoQuestion`, `Question`, `QuestionClient`, `CloseQuestion` (script_goal.cpp 126-162), `ScriptEventGoalQuestionAnswer` (script_event_types.hpp 1036-1060), `Game::NewEvent` (game_core.cpp 131-138, the guard; the queue below it not read). Also read: goal_type.h (full), goal_base.h (full), goal_cmd.h (grep), command_type.h (405-430), network_server.cpp (1134-1142), english.txt (grep of the 22 question strings). Candidates opened and set aside: story.cpp (24-140), story_base.h (20-60), story_type.h (grep). Not read: goal_gui.cpp 1-300 (goal list window), the command dispatch in command.cpp (only grep), ScriptInstance event delivery, story_gui.cpp, story.cpp 140-506, script_story_page.cpp. Confidence: high on the question and answer path and its checks; medium on what happens after the event reaches the server queue. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- A quest script (deity mode) asks a question with an id, a target, a type, a text and a bitset of up to three buttons. The question is sent as a command; its execute branch decides which machine shows it (265-273). The API checks the text, the buttons and the id range before it sends the command (script_goal.cpp 126-141; the deity gate is `EnforceDeityMode(false)` at line 130, macro not read).
- Order inside `CmdGoalQuestion` (243-276), on execute: (a) the target must exist, a client target must still be connected on pre-flight only (250-258, 266-267); (b) the question type decides the minimum buttons: `Question` needs one, the other three types may have none (260); (c) at most three buttons (262); (d) the window is shown only where the target is: a company target only on the client of that company (270); a company-less (global) question only on clients that have a local company (269), so spectators do not get it; a client target only on that client (267). Then `ShowGoalQuestion` (272) opens one window whose window number is the question id (goal_gui.cpp 465-468).
- The window (goal_gui.cpp 318-388). Caption by type: Question, Information, Warning, Error (english.txt 3852-3855). Buttons: the chosen answer is the Nth set bit of the button bitset, so the labels follow the set (356, 369). Click: the window posts the answer command with the window number (the question id) and the button, then closes (369-370). Close box: no answer is posted (400; the close path itself is the default window close, not read).
- `CmdGoalQuestionAnswer` (285-306), in this order: (a) button in range (287); (b) if the sender is the deity, close the question window on every client and return with no event (289-293); (c) if networking and the sender's company is this client's company, close this client's window (295-297); a non-server client then returns with no event (298); (d) on execute, `Game::NewEvent` queues `ScriptEventGoalQuestionAnswer(uniqueid, _current_company, button)` (301-303).
- Event routing: `Game::NewEvent` returns at once on a networked client that is not the server (135-137). So the event is queued on the server only, where the script runs (the queue itself not read).
- Parked script: the engine keeps no waiting state. The script does not block; it resumes when the answer event arrives, using the id it chose. The event carries the id, the company that answered and the button (script_event_types.hpp 1046-1049).
- Silent close: `ScriptGoal::CloseQuestion` sends a Cancel answer from the deity (script_goal.cpp 156-161). The deity branch returns before any event (289-293), so the script is not told the question was closed.
- Spectators: the answer command has only the `Deity` flag in its trait (goal_cmd.h 32) and no `Spectator` flag. The server kicks a client that sends a non-spectator command without a company (network_server.cpp 1138-1139). So a spectator cannot answer.
- Labels: button labels come from the string table by enum offset, `STR_GOAL_QUESTION_BUTTON_CANCEL + index` (goal_gui.cpp 356). The enum has 18 buttons, Cancel first (goal_type.h 25-44), and the English table lists the same 18 in the same order (english.txt 3859-3876). The table has four caption strings (3852-3855). Grammar: each button label is one capitalised word with no punctuation; each caption is one word with a colour tag.

## 2. Key functions

- `CmdGoalQuestion`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/goal.cpp` 243-276. Checks (250-263), addressing (265-273), window open (272).
- `CmdGoalQuestionAnswer`: same file, 285-306. Range check (287), deity close (289-293), same-company close and non-server return (295-298), the one event (301-303).
- `GoalQuestionWindow` and `OnClick`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/goal_gui.cpp` 318-388 and 363-373. Button layout by count (339-343), label offset (356), answer post (369).
- Window layouts: `NestedGoalWidgets`, `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/goal_gui.cpp` 396-423 (one, two and three button rows with padding 85, 65, 25 at 407, 410, 414).
- Script side: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/script/api/script_goal.cpp` 126-162 (`DoQuestion`, `Question`, `QuestionClient` at 149-154, `CloseQuestion`).
- Event and routing: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/script/api/script_event_types.hpp` 1036-1060; `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/game/game_core.cpp` 131-138.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Question id as the only key for a parked question (window number and event key) | Id range 0..65535 (`script_goal.cpp` 138) |
| Minimum choices depend on the kind of prompt | `Question` needs 1; the other three kinds need 0 (`goal.cpp` 260) |
| Maximum three choices per prompt | 3 (`goal.cpp` 262; `script_goal.cpp` 135); window asserts fewer than 4 (`goal_gui.cpp` 336) |
| One answer resumes the script | None (the event itself) |
| Choice is the chosen enum value, not a list index | Eighteen buttons, Cancel = 0 (`goal_type.h` 25-44) |
| Button row padding by choice count | 85 for one, 65 for two, 25 for three (`goal_gui.cpp` 407, 410, 414); widget units, not converted |
| Minimum question width | 300 (`goal_gui.cpp` 405); widget units, not converted |
| Client-targeted prompt versus company prompt | Two entry points (`script_goal.cpp` 143-154) |

Note: no timeout appears in goal.cpp, goal_gui.cpp or script_goal.cpp (all read in full except goal_gui.cpp 1-300, which is the goal list). A question waits until a button, a close, or the script's own `CloseQuestion`.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's checks (id range, minimum and maximum choices) and its one-event rule, then adds three things the donor does not have: a pending record with an addressee and offered set, a check of the answer against it, and a close that emits one event (the donor emits none). It omits the window and layout, the command pre-flight and execute split, the deity branch, the same-company window closing, the client-id addressing (the donor's event carries a company only), and the event queue. Order: pending lookup, open check, addressee check, offered check, then the event; the donor's order has no pending or addressee step.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Choice = 'cancel' | 'ok' | 'no' | 'yes' | 'decline' | 'accept' | 'continue' | 'close';

export type QuestionKind = 'question' | 'information' | 'warning' | 'error';

export interface Pending {
  id: number;                 // script-chosen id, 0..65535
  kind: QuestionKind;
  addressee: string;          // one player (one character), not a company
  offered: Set<Choice>;       // 1 to 3 choices; 'question' needs at least 1
  open: boolean;
}

export type Outcome =
  | { kind: 'event'; id: number; player: string; choice: Choice }
  | { kind: 'rejected'; reason: 'unknown' | 'not-addressee' | 'not-offered' | 'already-answered' };

export class QuestionHub {
  private pending = new Map<number, Pending>();
  private queue: Outcome[] = []; // events for the parked quest script, drained once per tick

  ask(id: number, kind: QuestionKind, addressee: string, offered: Choice[]): boolean {
    if (!Number.isInteger(id) || id < 0 || id > 0xffff) return false;
    const min = kind === 'question' ? 1 : 0;
    if (offered.length < min || offered.length > 3) return false;
    if (this.pending.has(id) && this.pending.get(id)!.open) return false; // one open question per id
    this.pending.set(id, { id, kind, addressee, offered: new Set(offered), open: true });
    return true;
  }

  // A click from a player. Checked against the pending record, not trusted from the client.
  answer(id: number, player: string, choice: Choice): Outcome {
    const p = this.pending.get(id);
    if (!p) return { kind: 'rejected', reason: 'unknown' };
    if (!p.open) return { kind: 'rejected', reason: 'already-answered' };
    if (p.addressee !== player) return { kind: 'rejected', reason: 'not-addressee' };
    if (!p.offered.has(choice)) return { kind: 'rejected', reason: 'not-offered' };
    p.open = false;
    const ev: Outcome = { kind: 'event', id, player, choice };
    this.queue.push(ev);
    return ev;
  }

  // Close box or script close: resolves as 'cancel' and still sends one event (the donor sends none).
  close(id: number): Outcome {
    const p = this.pending.get(id);
    if (!p) return { kind: 'rejected', reason: 'unknown' };
    if (!p.open) return { kind: 'rejected', reason: 'already-answered' };
    p.open = false;
    const ev: Outcome = { kind: 'event', id, player: p.addressee, choice: 'cancel' };
    this.queue.push(ev);
    return ev;
  }

  drain(): Outcome[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (copy at /tmp/openttd-question-answer.ts).

## 5. Lands in

- TARGET `origins/server/dialogue.ts` (proposed new module for server-held quest questions; the Frankendom repo was not read, so the current layout is unknown). The server holds the pending record (id, addressee, offered set, open flag), accepts one answer, and resumes the quest with one event. Any reward the answer triggers pays through the one ledger.
- Parity-checklist row 18 (loot roll and XP award): the reward for the chosen answer is paid once, at the single accepted event. If a timeout is added, it is checked on the server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- today: not checked (repo not read).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (the answer and its reward are one server record); server-verified (the addressee and once checks run on the server, not on the client's click).

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- Defect 1, no pending check. `CmdGoalQuestionAnswer` (285-305) takes the id and the button and nothing else. It does not record that the question was answered. Each executed answer emits its own event (301-303), so a second click for the same id produces a second event. Fix: a server pending record; the first valid answer closes it; later answers are rejected (sketch `answer`).
- Defect 2, no addressee check. The answer command has no target argument. The event carries the sending company (302). Whether a company that was not addressed can send an answer depends on command dispatch, which was not read. Treat it as possible until checked. Fix: the server compares the sender with the recorded addressee.
- Defect 3, silent close. The close box posts nothing (goal_gui.cpp 400; no close handler in 363-373). `CloseQuestion` from the deity returns before any event (goal.cpp 289-293). A parked quest script that waits for a click never resumes. Fix: close resolves as a cancel and emits one event (sketch `close`). A timeout would be a zone data field, but the donor has none (not invented here).
- Defect 4, client answers lose the client. `QuestionClient` (script_goal.cpp 149-154) addresses one client. The answer event takes a company value (script_event_types.hpp 1046-1049) and is built from `_current_company` (goal.cpp 302). A spectator's company is invalid, so the script cannot tell which client answered from the event. Fix: the event carries the player or client id, and the server stores it.
- Defect 5, labels by enum offset. Labels are the string id plus the enum index (goal_gui.cpp 356). Inserting a button in the middle moves every later label. Fix: name the label key on the button, so the table is not order-dependent.
- Defect 6, window number as key. The question id is the window number (goal_gui.cpp 468). Whether two open questions with the same id collide is not read. Fix: the server enforces one open question per id (sketch `ask`).
- Not in the donor: rewards, dialogue trees, timeouts, or a quest log. Goals (goal_base.h 22-28) are text, a progress text, a destination and a completed flag. `CmdSetGoalCompleted` stores the flag and nothing else (goal.cpp 219-220). The donor pays no reward; the script does.
- Story pages (story.cpp 70-73, element types in story_base.h 32-35) can hold a goal reference and push buttons that fire events. Only the validation (story.cpp 70-73) and the element type list were read. Not used for this verdict.
- Frankendom ruling check: the question is a state change on the server, not a client-only panel. The client shows the window only; the answer is the server's input.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: one ledger (answer and reward in one server record); server-verified (addressee and once checks on the server); client-only window (the window displays and posts the choice, nothing else)

Best transferable idea: Model a dialogue as a parked record keyed by an id: the server stores the addressee and the offered choices, accepts one answer from the addressee, and resumes the quest script with one event.

Decision (proposed): adapt — the id-keyed parked question with one answer event is the right shape for server-decided quest dialogue, but the donor has no pending, addressee, once or close checks, so Frankendom adds them on the server and keeps the window client-only.
Acceptance: Server test: an Accept/Decline offer addressed to player A rejects B's answer; A's Accept emits one event and pays the reward once; a second Accept is rejected; closing the box emits one cancel event and no reward; a two-choice and a three-choice offer both render at 375 wide without overlap.
