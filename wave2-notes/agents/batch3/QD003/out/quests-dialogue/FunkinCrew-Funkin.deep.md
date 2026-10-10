# FunkinCrew-Funkin (quests-dialogue, cell 2)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/cutscene/dialogue/Conversation.hx` (with `DialogueBox.hx` and `data/dialogue/ConversationData.hx`) | Licence: Apache 2.0 (LICENSE.md line 3: "The Friday Night Funkin' source code is licensed under the Apache 2.0 license") | Haxe | symbol `Conversation.advanceConversation`

Checked: Read in full: `Conversation.hx` 264-296 (box setup), 307-318 (typing complete), 320-349 (start and advance), 448-529 (start, line, complete-line, skip, end handlers), 533-570 (per-frame update), 663-691 (state enum). Read in part: `DialogueBox.hx` 76-93 (speed), 158-192 (setText, appendText, skip, completion), 399-423 (empty listener stubs); `ConversationData.hx` 36, 146-160 (entry fields and speed doc). Caller read: `play/PlayState.hx` 3398-3410 (the advance input). The hint file `ui/freeplay/ScriptedAlbum.hx` is an 11-line empty scripted-class stub with no dialogue logic; it is not the mechanism. Confidence: high on the state machine and the advance-press rule (read, not run). Medium on the typing timing: the per-character delay is set in `DialogueBox.hx` 91, but how `FlxTypeText` reads that delay and completes on skip was not read (library). Not read: `ScriptEventDispatcher`, the state's `dispatchEvent` (the `IEventHandler` that receives events), `ScriptedConversation.hx`, the speaker animation code (`Speaker.hx`), the outro code beyond its call sites. Camera: not a camera cell. camera_scope: n/a.

## 1. Mechanism

- One state field, `state` (Conversation.hx 34), holds one of five values: Start, Opening (box animating), Speaking (text typing, speaker animating), Idle (text done, waiting for input), Ending (outro) (enum 663-691).
- Every input step is an event. A press calls `advanceConversation` (332). Its switch (336-346) picks the event from the current state: Start sends DIALOGUE_START; Opening and Speaking send COMPLETE_LINE; Idle sends DIALOGUE_LINE; Ending ends the outro. Each event is cancelable (true at 339, 341, 343) and is sent to the current game state, which relays it.
- Start (448-461): propagate to the box and speaker, set up music and backdrop, set `state = Opening` (457), show the box. It does not check `eventCanceled`.
- Per-frame update (533-570): in Opening, once the box animation has finished or is no longer the entry's box animation (548), the state becomes Speaking (554), the speaker animates, and the box text is set to the current line (557). Speaking and Idle do nothing in the update. Ending starts the outro once.
- Typing: `showCurrentDialogueBox` wires the box's typing-complete callback to `onTypingComplete` (292). That callback sets Idle when the state is Speaking (311). If it fires in any other state it logs "Unexpected state transition" (315) and still sets Idle.
- Complete-line (505-513): if not cancelled, skip the box's typing (510). Result: the rest of the line is shown; the typing-complete callback then moves Speaking to Idle.
- Line (466-502): if not cancelled, advance the line index (472). If the index passes the box's line count (473), move to the next entry. If there is none, send DIALOGUE_END (481, not cancelable). If there is one and the state is Idle, show that box and set Opening. Otherwise (more lines in this box) set Speaking (497) and append the next line to the same box (498).
- Skip (516-521): if not cancelled, send DIALOGUE_END. End (524-529): set Ending (528).
- Data: a conversation holds a flat array of entries (ConversationData.hx 36). Each entry has a box, a speaker and an array of text lines (151). Each advance adds the next line to the same box (147). Entry `speed` defaults to 1.0 (158).
- Speed to delay: `DialogueBox.set_speed` sets `textDisplay.delay = speed * 0.05` (91), with the comment "1.0 x 0.05". So 0.05 seconds per character at speed 1.0 if the text library reads `delay` as seconds per character (not read).
- Caller: `PlayState` (3406-3408) advances the conversation on the CUTSCENE_ADVANCE control, or on a touch press on mobile when the touch is not on the pause button.

## 2. Key functions

- `advanceConversation`: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/cutscene/dialogue/Conversation.hx` 332-349. The one entry point for a press; the state picks the event.
- `onDialogueLine`: same file, 466-502. Line index, next box, or end; appends text while typing.
- `onDialogueCompleteLine`: same file, 505-513. Skips the typing of the current line.
- `onUpdate`: same file, 533-570. Opening to Speaking when the box animation ends.
- `onTypingComplete`: same file, 307-318. Speaking to Idle.
- `DialogueBox.set_speed`: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/cutscene/dialogue/DialogueBox.hx` 86-93.
- `PlayState` caller: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/PlayState.hx` 3406-3408.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One press completes the typing if the line is still typing; only the next press moves on | none (the rule) |
| One state field with five values, changed only by events | none |
| Box animation gates the move from Opening to Speaking | none (depends on the animation) |
| Per-character reveal time = entry speed x 0.05 | 0.05 s per character (DialogueBox.hx 91); speed default 1.0 (ConversationData.hx 158) |
| Several lines in one box; a new box when the lines run out | no constant; `text` array per entry (ConversationData.hx 151) |
| Every step is a cancelable event; a script can hold a step | none (the rule); the start and end handlers do not check cancellation (448-461, 524-529) |
| Unexpected typing-complete is logged and forced to Idle | none |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's flow: the one-press rule (typing first, then next line), the state values, the box-then-lines-then-next-box order, the per-character timing and the cancel hook on each press. It omits the music, backdrop, speaker and box animations (replaced by `boxAnimDone` on each tick), the outro (`ending` just stops), the event relay and the `ScriptEventDispatcher`, and the donor's Opening-state skip path (a press while Opening is ignored here; in the donor it calls the box skip and can produce the "Unexpected state transition" case). It also drops the `#if mobile` touch rule. The text reveal is a time budget per character, not the library's timer.

```ts
// Licence: Apache-2.0 (donor, Friday Night Funkin' source). Adapted shape; this is a fresh expression of the same state flow.
type DState = "start" | "opening" | "speaking" | "idle" | "ending";

interface Entry {
  text: string[];   // lines shown in one box; each advance appends the next line
  speed: number;    // 1.0 = 0.05 s per character
}

interface Player {
  entries: Entry[];
  entry: number;      // current box
  line: number;       // current line inside the box
  state: DState;
  screen: string;     // text on screen in the current box
  pending: string;    // text still being typed
  secPerChar: number;
  acc: number;        // time banked toward the next character
}

function newPlayer(entries: Entry[]): Player {
  return { entries, entry: 0, line: 0, state: "start", screen: "", pending: "", secPerChar: 0, acc: 0 };
}

// Start the box for the current entry. The box animation runs in the "opening" state.
function openEntry(p: Player): void {
  p.state = "opening";
  p.screen = "";
  p.line = 0;
}

// Frame tick. Opening ends when the box animation has finished; speaking reveals characters
// on a time budget and goes idle when nothing is pending.
function tick(p: Player, dt: number, boxAnimDone: boolean): void {
  if (p.state === "opening" && boxAnimDone) {
    const e = p.entries[p.entry];
    p.pending = e.text[p.line];
    p.secPerChar = e.speed * 0.05;
    p.acc = 0;
    p.state = "speaking";
    return;
  }
  if (p.state === "speaking") {
    p.acc += dt;
    while (p.pending.length > 0 && p.acc >= p.secPerChar) {
      p.acc -= p.secPerChar;
      p.screen += p.pending[0];
      p.pending = p.pending.slice(1);
    }
    if (p.pending.length === 0) p.state = "idle";
  }
}

// Advance while typing: reveal the rest of the line at once (no line change).
function completeLine(p: Player): void {
  p.screen += p.pending;
  p.pending = "";
  p.state = "idle";
}

// Advance while idle: next line in this box, or the next box, or the end.
function nextLine(p: Player): void {
  const e = p.entries[p.entry];
  p.line += 1;
  if (p.line >= e.text.length) {
    p.entry += 1;
    if (p.entry >= p.entries.length) {
      p.state = "ending";
      return;
    }
    openEntry(p);
    return;
  }
  p.pending = e.text[p.line];
  p.secPerChar = e.speed * 0.05;
  p.acc = 0;
  p.state = "speaking";
}

// One advance press (a key or a tap). The hook can hold the step, as a cancelled event does.
function advance(p: Player, held: (step: "complete" | "line") => boolean): void {
  if (p.state === "speaking") {
    if (!held("complete")) completeLine(p);
    return;
  }
  if (p.state === "idle") {
    if (!held("line")) nextLine(p);
  }
}

// Begin the conversation: the first box opens.
function begin(p: Player): void {
  openEntry(p);
}
```

Typecheck: the block plus `export {};` (file `work/dialogue-player.ts` plus the export line), copied to the VPS /tmp and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/quests/dialogue-player.ts` (client-only UI; proposed name, the Frankendom repo layout was not read here). The quest step itself stays on the server; this file only shows and paces lines.
- Parity-checklist row: 5 (controls/input) is the closest fit: one press completes a line or advances. Row 14 (HUD) covers the dialogue box on screen. No row covers dialogue flow exactly, so none fits exactly; say so in review.
- Reuse tag: rewrite-from-idea (Apache 2.0; code may be adapted, this sketch is a fresh expression)
- Brief rule served: 1 (one engine; the dialogue box is client-only UI and zones supply the lines as data); rules 7-9 n/a

Best transferable idea: One advance press does two things by state: while a line is still typing it completes that line, and only the next press moves on, so a phone tap never skips text by accident.
Decision (proposed): adapt - take the one-press rule, the single state field and the typing-then-next-line order for the client dialogue box; reject the donor's cancel hooks as authority over quest steps (a client event must never move a server step), and reject the donor's flat entry list as the quest dialogue model, because Frankendom needs branching by quest state, which this donor does not have.
Acceptance: On a 375-wide phone, a two-box quest dialogue with 'Hello.' at speed 1.0: the box shows nothing until the animation ends, 'Hello.' is fully typed in 0.25 s (5 characters at 0.05 s), a tap during typing shows the whole line without moving on, the next tap opens the next line, and the quest step changes only when the server confirms the dialogue end.

## 6. Gaps and risks

- No branching: ConversationData holds a flat array of entries (36) with no choice or branch field, so the donor has no dialogue tree. Frankendom's quest dialogue needs choices that depend on quest state; this donor gives no answer for that. Design it separately.
- Client-only events: every step can be cancelled by a script (`eventCanceled`, 469, 508, 519, 537), but nothing here is server-verified. A quest step must come from the server, not from a client event.
- Start and end are not cancelable in effect: the start and end handlers do not check `eventCanceled` (448-461, 524-529). Frankendom should not copy that asymmetry without a test.
- Press during the box animation (read, not run): in Opening, a press calls the box skip (510). Whether the skip fires the typing-complete callback depends on the text library (not read). If it does, `onTypingComplete` sees Opening, logs "Unexpected state transition" (315) and sets Idle, so the speaker animation may never run. Frankendom must choose one rule for a press during the box animation (ignore it, or finish the animation) and test it.
- Speed doc and code disagree: the doc says 1.5 types quickly and 0.5 emphasises (ConversationData.hx 155-156), but the code sets delay = speed x 0.05 (DialogueBox.hx 91). If the library's delay is seconds per character (not read), 1.5 is slower than 1.0. Do not copy the doc's meaning; define the field in the Frankendom data and test it.
- Typing engine not read: the per-character timing and the skip completion are assumed from the names; the sketch's time budget is Frankendom's own model.
- Mobile press: the touch advance is skipped while the touch is on the pause button (PlayState 3406). Frankendom's pause control needs the same exclusion.
- Not read: `ScriptEventDispatcher`, the state's `dispatchEvent`, `ScriptedConversation.hx`, `Speaker.hx`, the outro code.

Reuse tag: rewrite-from-idea (Apache 2.0; code may be adapted; this sketch is a fresh expression)
Brief rule served: 1 (one engine; the dialogue box is client-only UI and zones supply the lines as data); rules 7-9 n/a
