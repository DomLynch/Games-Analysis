# KsanaDock-Microverse (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/DialogService.gd` | Licence: MIT (`/mnt/frankendom-donors/KsanaDock-Microverse/LICENSE`: "MIT License", Copyright (c) 2025 KsanaDock) | GDScript (Godot 4) | symbol `DialogService.try_start_conversation` (with `end_character_conversations`, `ConversationManager.end_conversation`, `_on_request_completed`)

Checked: The list's hint file (`script/ChatHistory.gd`, 147 lines) was read in full: it is a per-node JSON store of messages between pairs, sorted by timestamp on insert. It is storage, not session state, so it is not the mechanism. The real session code is in `script/ai/`. Read in full: `script/ai/DialogService.gd` (151 lines). Read in ranges: `script/ai/ConversationManager.gd` (1-127, 186-256; the prompt builder 128-185 not read), `script/ai/DialogManager.gd` (1-30, 88-150, 165-171, 179-185, 192-198), `script/CharacterManager.gd` (5, 70-76), `script/ai/AIAgent.gd` (2125-2140 only, plus grep for the farewell and end calls at 759-811). Confidence high for the session gate, the turn loop, the end path and the failure returns. Not read: `APIManager.gd`, the prompt builder, the memory-writing bodies (DialogManager 222-246), the AIAgent farewell body (781-811), the speech bubble. The README says the app "Supports group discussions" (README_EN.md 53); the session code I read is speaker-and-listener only, and a grep for group or multi-party session terms found no multi-party session (not exhaustive). camera_scope: n/a (not a camera cell).

## 1. Mechanism

A session is a 1:1 chat between two characters (a speaker and a listener). It is an entry in `DialogService.active_conversations`, keyed by an id, holding a `ConversationManager` object. The gate, the turn loop and the end path are the parts that carry over.

- Start, from input (DialogManager.gd 89-92 routes the T key to `_try_start_conversation`, 103). The current character's listener is the first controllable character in group order within `DIALOG_DISTANCE` (CharacterManager.gd 70-76, constant 100.0 at line 5). The start is passed to `DialogService.try_start_conversation` (DialogManager.gd 113).
- `DialogService.try_start_conversation` (DialogService.gd 19-49), in this order: both actors must exist (20-22); distance must be at most `max_dialog_distance` = 100.0 (8, 25, 112-113); neither actor may already be in a session (30-32); a `ConversationManager` is created and registered (35-36); its ended and dialog signals are connected (39-40); it is started (43); the service emits `conversation_started` (46). The start is not awaited by the caller.
- Turn loop (ConversationManager.gd 45-50 and 76-126 `generate_dialog`, 188-253 `_on_request_completed`). Each reply is parsed. If it parses, both characters' ChatHistory nodes get the line (235, 240), `dialog_generated` is emitted (244), and if the session is still active (247) the speaker and listener are swapped and `generate_dialog()` runs again (253). There is no turn count and no timeout. The grep for `timeout`, `max_turn`, `max_round` and `turn_count` in the donor's script folder found none in the conversation code (the only timers are movement and desk code).
- Failure: an HTTP error returns (195-197), an empty parse returns (217-219), and a missing APIManager returns (117-119). None of these ends the session. The session stays in `active_conversations`, so both characters stay busy, until someone ends it.
- End, from input: the L key calls `_end_current_character_conversation` (DialogManager.gd 124), which first writes an end memory for each session that involves the character, then calls `end_character_conversations` (142). That collects every session where the character is speaker or listener (DialogService.gd 62-71) and ends each. `ConversationManager.end_conversation` (53-73) saves both histories (59-66), frees the request, sets `is_active = false` (72) and emits (73). The service removes the entry on that signal (116-120). The AI farewell path also calls `end_character_conversations` (AIAgent.gd 805 and 811; body not read).
- Tick: none. Everything is event-driven (input, HTTP reply, signals). The session has no per-frame update.

## 2. Key functions

- `DialogService.try_start_conversation`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/DialogService.gd` 19-49. Null check, range, mutual busy check, register, start.
- `DialogService.end_character_conversations`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/DialogService.gd` 62-71. Collects and ends every session of one actor.
- `DialogService._is_in_range`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/DialogService.gd` 112-113. Distance at most the max.
- `ConversationManager.end_conversation`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/ConversationManager.gd` 53-73.
- `ConversationManager._on_request_completed`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/ConversationManager.gd` 188-253. The turn loop and the three failure returns.
- `DialogManager._end_current_character_conversation`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/ai/DialogManager.gd` 124-143. The L key path.
- `CharacterManager.get_nearby_character`: `/mnt/frankendom-donors/KsanaDock-Microverse/script/CharacterManager.gd` 70-76. Listener pick.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Start a session only if both actors exist, are within range, and neither is busy | Range 100.0 (theirs, DialogService.gd 8; the listener pick uses a second constant 100.0, CharacterManager.gd 5) |
| One open session per actor | Check at DialogService.gd 30-32 (count 1) |
| End everything an actor is in with one call | None (the collect-and-end loop, 62-71) |
| Release on the end signal, not inside the caller | Erase at DialogService.gd 119-120 |
| Turn loop with no cap and no timeout | None in the donor (`generate_dialog` after every reply, 253) |
| Failure returns with no release | Three returns (195-197, 217-219, 117-119) |
| Distance test uses `<=` | Comparison at DialogService.gd 113 |

Note: DialogManager.gd 169-171 defines a second `_is_in_range` with its own `max_dialog_distance = 100`. A grep found no caller of it; it looks dead (not confirmed beyond the grep).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order at start (both exist, in range, neither busy, then register) and the one-call end for every session an actor is in. It omits: the LLM turn loop (the donor calls `generate_dialog` after every reply, with no cap), the chat-history writes, the start and end memory notes, the dialog bubble, the speaker and listener role swap, the HTTP request object, and the signal wiring. It adds one thing the donor does not have, `replyFailed`, which ends a session when a reply fails (the donor's three failure returns leave it open). That addition is ours to test, not the donor's behaviour.

```ts
// Licence: MIT (donor, LICENSE: "MIT License, Copyright (c) 2025 KsanaDock"). Shape adapted; written from the described mechanism, not a translation of the GDScript.
const CHAT_RANGE = 100;       // px, DialogService.gd 8

interface Actor { id: string; x: number; y: number; }
interface Session { id: string; a: string; b: string; active: boolean; }

class SessionRegistry {
  private sessions = new Map<string, Session>();
  private nextId = 0;
  constructor(private actors: Map<string, Actor>) {}

  private busy(id: string): boolean {
    for (const s of this.sessions.values()) {
      if (s.a === id || s.b === id) return true;
    }
    return false;
  }

  // Order as the donor runs it: both exist, in range, neither busy, then register.
  start(aId: string, bId: string): 'started' | 'refused:missing' | 'refused:range' | 'refused:busy' {
    const a = this.actors.get(aId);
    const b = this.actors.get(bId);
    if (a === undefined || b === undefined) return 'refused:missing';
    if (Math.hypot(a.x - b.x, a.y - b.y) > CHAT_RANGE) return 'refused:range';
    if (this.busy(aId) || this.busy(bId)) return 'refused:busy';
    const s: Session = { id: `s${this.nextId++}`, a: aId, b: bId, active: true };
    this.sessions.set(s.id, s);
    return 'started';
  }

  // End one session: flag it inactive, then remove it from the registry.
  end(sid: string): void {
    const s = this.sessions.get(sid);
    if (s === undefined || !s.active) return;
    s.active = false;
    this.sessions.delete(sid);
  }

  // End every session this actor is in (donor: end_character_conversations). Returns the count ended.
  endFor(id: string): number {
    const ids = [...this.sessions.values()].filter((s) => s.a === id || s.b === id).map((s) => s.id);
    for (const sid of ids) this.end(sid);
    return ids.length;
  }

  // Added, not in the donor: a failed reply releases the session so neither actor stays busy.
  replyFailed(sid: string): void {
    this.end(sid);
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/session.ts` (new; one open session per actor, range-gated start, end-all on leave, failure release). It is server state shared by duel invites, trades and chat, not client state. Parity-checklist row: none fits. No row covers chat or sessions; the closest is row 5 (controls and input, where the start and end keys would call start and end), but the registry itself is server state and has no row.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted; the sketch is a clean rewrite of the shape, nothing copied)
- Brief rule served: server-verified state and one ledger (the range and busy checks run on the server, the client only shows the result). Rules 7-9 n/a.

## 6. Gaps and risks

- Open-ended by design: no turn cap and no timeout, so a session can run as long as the model answers. A fast game cannot leave a session open with no end. Sessions need a cap or timeout as data, not as a donor default.
- Stuck on failure: the three failure returns (195-197, 217-219, 117-119) leave both characters busy until someone presses L. The donor has no path that releases a session on failure. The sketch adds one (`replyFailed`); it must be tested, it is not proven by the donor.
- Client-side decision: the start is decided in a single Godot process, with the listener pick also done locally (CharacterManager 70-76). Frankendom's rule is server-verified; the server must run the range and busy checks and reject a start the client sent.
- Listener pick by group order, not by distance or by the player's choice (CharacterManager 71-75 returns the first match). A designer would want nearest or an explicit choice; do not copy the first-match rule.
- Stale comment: DialogManager.gd 91 says multiple conversation groups are now allowed and the code no longer checks `is_in_conversation`. The gate at DialogService.gd 30-32 still refuses a second session for either actor. The rule is one session per actor; the comment is wrong. Read the code, not the comment.
- Dead helper: DialogManager.gd 169-171 is a second range check with no caller found. Do not port it; keep one range constant as zone data or an engine constant.
- No multi-party sessions in the code read, despite the README's group-discussion claim. Frankendom's party and guild work needs its own model; this note covers only the one-to-one session gate.
- Not read: APIManager, the prompt builder (128-185), the memory-writing bodies, the AIAgent farewell body, the speech bubble. Guild ranks, friend lists and social sync are not in this code.

Best transferable idea: Let one actor hold at most one open session, check range and busy on both ends at start, end every session an actor is in with one call, and release a session whose reply fails (which the donor does not do).
Decision (proposed): adapt - the one-session gate, the range check and the one-call end fit duel invites, trades and chat on the server; the open-ended turn loop and the failure hold do not fit a fast game, so take the gate and reject the loop.
Acceptance: a second invite while either player is busy is refused; a session whose reply fails frees both players; a player leaving the zone ends every session they hold in one call; a server test asserts that a start beyond the range value is refused.

Reuse tag: rewrite-from-idea (MIT; code may be adapted; the sketch is a clean rewrite)
Brief rule served: server-verified state and one ledger.
