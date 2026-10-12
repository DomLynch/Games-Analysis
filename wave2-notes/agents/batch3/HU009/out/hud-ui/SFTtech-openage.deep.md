# SFTtech-openage (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/SFTtech-openage/libopenage/input/controller/game/controller.cpp` | Licence: GPL-3.0-or-later (copying.md line 3: "GPLv3 or later", files without their own statement) | C++ | symbol `Controller::process`

Checked: Symbol `Controller::process` is at controller.cpp 60-93 (read in full). Also read in full: input/controller/game/binding.h, binding_context.cpp, controller.h (lines 110-125 and 133), the game `setup_defaults` at controller.cpp 119-229, event.cpp 20-31 (class chain). Read the HUD topic files too: input/controller/hud/controller.cpp (drag box only) and renderer/stages/hud/render_stage.h 36-41 and object.cpp. String table: openage/convert/service/read/string_resource.py (read in full) and entity_object/conversion/stringresource.py. Not read: the caller of `process` (the input manager loop), and the Qt GUI (renderer/gui) beyond its file list. Confidence: high on what the code does; the buffer's timing cannot be checked because the donor has no timing at all. camera_scope: n/a (not a camera cell). Scope note: the HUD half of hud-ui is thin in this donor (see section 6).

## 1. Mechanism

- One call handles one raw input event for the game controller. Inputs: the event with its arguments (`ev_args`) and a binding context. Output: `true` if a binding handled the event, `false` if it is not bound. A bound event is turned into a gamestate event, and that event is pushed onto a per-controller queue (`outqueue`) according to the binding's action type.
- Order of steps, as the code runs: (a) take the controller mutex (61); (b) if the event is not bound, return false (63-65); (c) look up the binding (68): exact event first, then the event's class chain (binding_context.cpp 23-37); (d) run the binding's transform, which builds the gamestate event (70). The transform runs while the lock is held and calls back into the controller (for example `get_selected()`), which works because the mutex is recursive (controller.h 133); (e) switch on the action type (72): SEND pushes the new event and then runs a loop over the queue whose body is empty and marked TODO (74-77), so nothing is dispatched and the queue is not cleared; QUEUE only pushes (81); CLEAR empties the queue (85); any other value throws (89); (f) return true (92).
- So the controller has three verbs for a bound input: send now, hold, or drop what is held. The donor's own doc for the enum says SEND should "forward the event (and all queued events) immediately" (binding.h 25). The code does not do that yet.
- Defaults that use the verbs (setup_defaults, controller.cpp 119-229): create-entity on Ctrl + left button release is SEND (140, bound at 147); move order on right button release is SEND (167, bound at 174); the drag start on left button press is CLEAR (182, bound at 189); the drag end on left button release is CLEAR (221, bound at 228) and its transform builds the drag-select event from the start and end points in NDC and then resets the start (191-219). QUEUE is declared but no default binding uses it.
- Timing: no clock, no window, no time stamp. The function is synchronous, called once per input event (caller not read).

## 2. Key functions

- `Controller::process`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/input/controller/game/controller.cpp` 60-93. The whole pipeline: lock, bound check, lookup, transform, action switch.
- `setup_defaults` (game): `/mnt/frankendom-donors/SFTtech-openage/libopenage/input/controller/game/controller.cpp` 119-229. Binds the default actions and their verbs.
- `BindingContext::is_bound` and `lookup`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/input/controller/game/binding_context.cpp` 19-37. `is_bound` checks the exact event or the primary class only (20). `lookup` walks the whole class chain (29-34).
- `ClassCode::get_classes`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/input/event.cpp` 20-31. Returns the event's class and each parent up the tree, most specific first.
- `BindingContext::bind`: `/mnt/frankendom-donors/SFTtech-openage/libopenage/input/controller/game/binding_context.cpp` 11-13. Uses `emplace`, so the first binding for a key wins and later ones are silently dropped.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Per-input policy: send now, hold, or drop held inputs | None; an enum with three values (binding.h 29-33) |
| Flush held inputs on send | Not implemented: empty loop with TODO (controller.cpp 75-77) |
| Cap on held inputs | None. `outqueue` is unbounded (controller.h 121); it is pushed on SEND and QUEUE (74, 81) and cleared only on CLEAR (85) |
| Expiry of held inputs (window) | None in the donor. Grep of the donor shows `outqueue` only in controller.h and controller.cpp |
| Binding priority: exact event before class | Exact map first, then class chain (binding_context.cpp 24-34) |

Honest reading: the donor has no buffer timing at all, so there are no numbers to carry over. The shape is the three-verb policy.

## 4. TypeScript sketch

simplified: the sketch implements the drain that binding.h line 25 describes and that controller.cpp leaves as a TODO (line 76). It adds two things the donor lacks: a count cap and an expiry window, both Frankendom choices and not donor numbers. It omits the exact-then-class binding lookup, the game-event transform, the recursive mutex, the drag-select verbs, and the `is_bound` mismatch. The switch is reordered to queue, send, clear for readability; each verb does what the donor intends.

```ts
// Licence: GPL-3.0-or-later (donor, copying.md). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Verb = "send" | "queue" | "clear";

interface BufferedCommand {
  verb: Verb;
  atMs: number;      // when the input was pressed
  payload: string;   // the command the simulation receives
}

interface InputBuffer {
  items: BufferedCommand[];
  maxItems: number;  // Frankendom choice, not a donor number
  windowMs: number;  // Frankendom choice, not a donor number
}

// Returns the commands to hand to the simulation now.
function onInput(buf: InputBuffer, cmd: BufferedCommand, nowMs: number): string[] {
  buf.items = buf.items.filter((c) => nowMs - c.atMs <= buf.windowMs);
  switch (cmd.verb) {
    case "queue":
      buf.items.push(cmd);
      if (buf.items.length > buf.maxItems) {
        buf.items.splice(0, buf.items.length - buf.maxItems);
      }
      return [];
    case "send": {
      const out = [...buf.items.map((c) => c.payload), cmd.payload];
      buf.items = [];
      return out;
    }
    case "clear":
      buf.items = [];
      return [];
  }
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/hu009tc/input-buffer.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/input-buffer.ts` (new client module; the buffer holds inputs, the engine decides). Parity-checklist row 5 (controls/input). The row 14 HUD hint does not fit this mechanism: the HUD in this donor draws only a drag box.
- today: no buffer in `src/fight`; inputs go straight through.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: buffered commands reach the single fight command path; the client only holds them)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described policy.
- Donor defects, each with its fix (the idea is kept):
  1. SEND never dispatches or clears (controller.cpp 74-77, TODO at 76). fix: on SEND, hand every held command plus the new one to the engine, then clear the queue (the donor's own doc at binding.h 25 says so).
  2. `outqueue` has no cap and no expiry (controller.h 121; pushed at 74 and 81). fix: cap the count and drop entries older than a window; both values are data fields (section 4 of the JSON).
  3. `is_bound` checks only the primary class (binding_context.cpp 20), but `lookup` walks the whole chain (29). So a binding made on a parent class is found by lookup, but `process` returns false first (controller.cpp 63-65) and the input is dropped without a message. fix: make `is_bound` use the same walk as `lookup`.
  4. `bind` uses `emplace` (binding_context.cpp 12), so a second binding for the same key is ignored without a message. fix: overwrite or throw on a duplicate.
  5. The action policy is not checked: "TODO: check if action is allowed" (controller.cpp 67). fix: the engine decides at dispatch time, so a held attack is refused if the actor is not in a state that accepts it. The client buffer is never the authority.
- Rulings: server-verified kills. The server must check each buffered command when it dispatches, because the client queue is a hint. One ledger: a held command sent twice is two actions, so the drain must clear the queue at the same point it sends. MAX_ATTACKERS = 3 does not apply here.
- The donor's controller is an RTS selection and move controller. Only the shape transfers. Nothing in it is a fighting rule.
- Other hud-ui topics checked in this donor (for the record):
  - HUD: `renderer/stages/hud/render_stage.h` 36-41 says the HUD draws health bars, selection boxes and a minimap, but line 40 says "Currently only supports drag selection." No health bar, target frame, minimap or world map is implemented in this donor (render_stage.h, object.cpp). The one HUD element is a drag box (`input/controller/hud/controller.cpp` 40-86).
  - String table: no string table file is shipped in the donor (0 entries counted). The loader parses the user's own game files. Grammar, from string_resource.py: one entry per line as `ID` then whitespace then text (193); lines starting with `//` and blank lines are skipped (190); the split is on the first whitespace only, so the text keeps its inner spaces (193); the ID is a number for the original game and an UPPERCASE name for later HD additions (195-197); the DE1 parser also accepts a comma after the ID (230); there is no quoting or escape syntax; HTML markup is kept as is (TODO at 58-59). A line with an ID and no text fails the unpacking (193). Several language files merge per language with `update`, so a later file overwrites an earlier key (stringresource.py 26-27).
- Callers of `process` were not read, so the claim "called once per input event" is about this function only.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine: buffered commands go through the single engine path; the client only holds them). Rules 7-9 n/a.

Best transferable idea: a per-binding policy (send now, hold, or drop held inputs) lets a fast fight buffer an attack pressed during recovery and fire it once when the actor can act, while a cancel input drops it.
Decision (proposed): adapt — take the three-verb policy and the drain-on-send with the donor's defects fixed; the buffer is a client hint and the server checks each command when it fires; the RTS selection and move parts are not used. Why: a held command with no expiry or cap can fire a stale hit late and break fast duels; with the fixes it fits row 5.
Acceptance: a server test presses attack during recovery, the attack fires once when recovery ends, a guard or cancel input clears it, a buffered attack older than the window never fires, and the held count never exceeds the cap.
