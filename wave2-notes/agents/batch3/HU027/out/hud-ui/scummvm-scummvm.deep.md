# scummvm-scummvm (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/hud.cpp` | Licence: GPL-3.0-or-later (per hud.cpp header: version 3 or any later version) | C++ | symbol `Hud::update`

Checked: Symbol `Hud::update` is defined at 212 and closes at 273 (verified, read in full). Read in full: hud.cpp (1-293), hud.h (1-150), motor.cpp 34-38, twp.cpp 681-690 and 1865-1871, tsv.cpp (1-90), genlib.cpp 832-866. Grepped only (not opened in full): metaengine.cpp 68-71, dialogs.cpp 80-93. Callers: `Hud::update` has one caller, twp.cpp:687 (read). The assignment of `_noun1` (the object passed in as the hotspot) was not read, so "hovered object" is an inference. Confidence: high on the verb bar mechanics; medium on the intent of the default-verb highlight (see defect 1). This donor is a point-and-click verb bar only: it has no health frame, minimap, lock-on, input buffer or touch input, so it covers one slice of hud-ui.

Best transferable idea: Highlight the default action for the current target on the action bar, and make instant actions fire on the first click while other actions wait for a target.
Decision (proposed): adapt - keep the target-default highlight and the instant-versus-targeted flag for the action bar; drop the decorative wobble except as a short cue; fix the two defects in the sketch.
Acceptance: At 375 wide, when the player's target is a downed enemy the "Finish" slot is highlighted on the action bar; a server test asserts that the highlighted default comes from the server snapshot of available actions, not from client-side guesses.

## 1. Mechanism

- Each frame, `Hud::update` takes the mouse position (flipped to bottom-up at 214), the hovered object and the click state (called from twp.cpp:687). It does nothing unless the bar is active (213), but the fade clock always runs (219-223).
- Fade in: the clock is clamped at 2 s (221-223) and, while fading in, the bar alpha is `min(fadeTime, 2) / 2` (225-228), a linear 2-second fade. `setVisible` restarts the clock on each change (275-281).
- Default-verb highlight: `defaultVerbId` starts as slot 0 (240, the walk verb). If the object `_noun1` exists and the current verb is slot 0, it switches to `_noun1->defaultVerbId()` (241-243). Each slot's `_hightlight` flag is set from that id (251).
- Per slot (1 to 21, 246-271): look up the slot's sprite frame (249). `over` is true if the mouse is inside the frame's source rectangle (250). Wobble timer: if it is running, the shake motor is updated and the timer drops by `elapsed` (253-259). Re-arm: if the mouse just entered (`over` and not `_over`) and the timer is below 0.1 s, the timer is set to 0.25 s and a new 1.2-px circular wobble motor is created (260-264). Then `_over = over` (265).
- Click: the caller passes the button's held state (`_cursor.isLeftDown()`, twp.cpp:687), so this is level input, not a press edge. While the button is held over a hovered slot, `selectVerb` runs (267-268) every frame. `selectVerb` returns early if the verb id is already current (161-162); otherwise it sets the current verb and, if the flag `VERBFLAG_INSTANT` is set, calls the verb at once with no noun (164-165). A non-instant verb stays current and waits for a target. The early return is what stops repeats while the button is held.
- Text and localisation (read in full: tsv.cpp; twp.cpp 1075-1079; genlib.cpp 832-866): a verb label is not a string. It is a sprite frame named `<image>` plus `_retro` when the retro option is on, plus `_` and the language code (hud.cpp 202, 249, 288). Verb text is resolved through the string table at display time (twp.cpp:401), and the table is `ThimbleweedText_<language>.tsv`, inside the game pack (twp.cpp:1075). Other callers of `getText` were not read. Grammar (tsv.cpp): the first line is a header and is skipped (31); each later line is `id<TAB>text`, with the id being the number before the first tab (35-37). A text reference is `@<id>` (60-62). A `^` prefix is literal text (63-64). A `$` prefix is Squirrel code that returns a reference, which is then resolved again (65-84). A trailing `#M` or `#F` marker is stripped (46-47); this function does not choose between gendered variants. `\"` becomes `"` (49). A missing id is fatal (51-52). Entry count: not countable from this box, because the table lives in the game pack, which is not in the repo (not read).
- Drawing (`drawCore`, 169-210): the backing panel is drawn at alpha 0.33 times the bar alpha (179-180). Each slot's sprite is drawn at its wobble offset (205-206), in the highlight colour when hovered or highlighted (203). The `invertVerbHighlight` option swaps which colour is the normal and which the highlight (182-184).
- The wobble is a motor (`ShakeVerb`): each update adds `40 * elapsed` to its phase and sets the offset to a circle of radius 1.2 (36-39). The radius never decays and the offset is never cleared (see defect 2).
- Shader: the verb sprites are drawn with a fragment shader that tints each texel by its green channel: at or below the shadow threshold it uses the shadow tint (108-109), at or above the highlight threshold the highlight tint (110-111), otherwise the normal tint (112-113). Both thresholds are set to 0.8 (uniform, 124), so the normal branch can never run (see defect 3). The shader source is inline GLSL in the donor (read, hud.cpp 65-119).

## 2. Key functions

- `Hud::update`: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/hud.cpp` 212-273. Fade clock, default-verb highlight, per-slot hover wobble, click select.
- `Hud::selectVerb`: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/hud.cpp` 160-167. Same-verb early return; instant verbs fire at once.
- `ShakeVerb::onUpdate`: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/hud.cpp` 36-40. Constant-radius circular wobble driven by elapsed time.
- `Hud::drawCore`: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/hud.cpp` 169-210. Backing panel, verb sprites at their offsets, colour by hover and highlight.
- `Motor::update`: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/motor.cpp` 34-38. Forwards to `onUpdate` unless the motor is disabled.
- Caller: `/mnt/frankendom-donors/scummvm-scummvm/engines/twp/twp.cpp` 681-687 (the bar is active only in a fullscreen room with `scrPos.getY() < 180`; `Hud::update` gets `_noun1` as the hotspot).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Show the default action of the hovered target, highlighted on the bar | Default highlight is the slot-0 verb id unless the current verb is slot 0 and `_noun1` is set (theirs, hud.cpp 240-242) |
| Click: instant actions fire now, the rest wait for a target | `VERBFLAG_INSTANT` flag (theirs, hud.cpp 164) |
| Hover cue on entry, re-armed only when nearly done | Cue 0.25 s (theirs, hud.cpp 261); re-arm below 0.1 s (theirs, hud.cpp 260); amplitude 1.2 px (theirs, hud.cpp 262); phase 40 per second (theirs, hud.cpp 37) |
| Fade in over a fixed time | 2 s (theirs, hud.cpp 221 and 226) |
| Colour bands from one channel | Both thresholds 0.8 (theirs, hud.cpp 124), which leaves the normal band empty (defect 3) |
| Option defaults | `invertVerbHighlight` on (theirs, metaengine.cpp 68); `retroVerbs` off (theirs, metaengine.cpp 70); `hudSentence` off (grepped, metaengine.cpp 71, not opened) |

## 4. TypeScript sketch

simplified: the sketch keeps the target-default highlight, the hover cue, click select and the instant flag. It omits the sprite lookup and the sprite source rectangles (the hit box is a plain rectangle), the fade-in, the shader and the colour inversion, the Squirrel `callVerb` path, the keyboard and inventory routes, and the same-verb early return of `selectVerb` (the sketch only sets the current verb when it changes). The click is a press edge (defect 4), where the donor passes the held state. It reorders nothing else. Three donor defects are fixed (see section 6): the highlight now uses the hovered target's default (the donor computes that id and never reads it), the wobble decays to zero and clears its offset when it ends, and the click is a press edge.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Box { x: number; y: number; w: number; h: number; }

interface Slot {
  id: number;
  instant: boolean;   // true: fire on click; false: becomes the current verb and waits for a target
  box: Box;
  over: boolean;
  cueLeft: number;    // s left in the hover wobble
  cuePhase: number;
  offX: number;       // px offset drawn for this slot
  offY: number;
}

interface Bar { verb: number; slots: Slot[]; }   // slots[0] is the default (walk) action
// pressed is true only on the frame the button goes down (a press edge), not while it is held (donor: held state).
interface Input { mx: number; my: number; pressed: boolean; targetDefault: number | null; }

const CUE_TIME = 0.25;   // s, hover wobble length
const CUE_AMP = 1.2;     // px, peak wobble radius
const CUE_REARM = 0.1;   // s, re-arm a hover cue only when the last one is nearly done
const CUE_SPEED = 40;    // phase per second of elapsed time

function inside(b: Box, x: number, y: number): boolean {
  return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
}

// One frame of the action bar. Returns the instant verb to fire now (or null) and the verb to highlight.
function updateBar(bar: Bar, inp: Input, elapsed: number): { fire: number | null; highlight: number } {
  // Fix: highlight the hovered target's default action when there is one (the donor stores it and never reads it).
  const highlight = inp.targetDefault ?? bar.slots[0].id;
  let fire: number | null = null;

  for (const s of bar.slots) {
    const over = inside(s.box, inp.mx, inp.my);

    if (s.cueLeft > 0) {
      s.cueLeft = Math.max(0, s.cueLeft - elapsed);
      s.cuePhase += CUE_SPEED * elapsed;
      // Fix: the wobble decays to zero and the offset is cleared when it ends (the donor keeps the last offset).
      const amp = CUE_AMP * (s.cueLeft / CUE_TIME);
      s.offX = amp * Math.cos(s.cuePhase + 0.3);
      s.offY = amp * Math.sin(s.cuePhase);
    } else {
      s.offX = 0;
      s.offY = 0;
    }

    if (over && !s.over && s.cueLeft < CUE_REARM) {
      s.cueLeft = CUE_TIME;
      s.cuePhase = 0;
    }
    s.over = over;

    if (inp.pressed && over) {
      if (s.instant) {
        fire = s.id;
      } else if (bar.verb !== s.id) {
        bar.verb = s.id;
      }
    }
  }
  return { fire, highlight };
}

export {};
```

## 5. Lands in

- TARGET (client view-model, name only; the Frankendom repo was not opened) `src/fight/hud.ts`: a pure function from the server-sent fight snapshot to the action bar state (default highlight, enabled slots). Draw code stays in the client. Parity-checklist row 14 (HUD).
- today: none in Frankendom checked (not read).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: HUD is client-only (addendum: camera, HUD and sound are client-only); the server decides which actions are available; rule 1 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Defect 1 (dead field): `Hud::update` stores the hovered object's default verb in `_defaultVerbId` (hud.cpp 215) but nothing reads it (hud.h 143 is the only other mention). The highlight uses `_noun1` and only when the current verb is slot 0 (hud.cpp 241-242). Fix: use the hovered target's default (sketch) or delete the field; do not keep both. Frankendom rule: the default must come from the server snapshot, so a client never shows a finisher the server would refuse.
- Defect 2 (frozen wobble): the wobble amplitude is constant at 1.2 px (hud.cpp 262), it never decays, and nothing clears `_shakeOffset` when the timer reaches zero (hud.cpp 253-259, the only writer is hud.cpp 39). The last offset stays drawn (up to 1.2 px off-centre). Fix: decay the amplitude and clear the offset (sketch).
- Defect 3 (empty middle band): both shader thresholds are 0.8 (hud.cpp 124). A texel with green at or below 0.8 takes the shadow tint (108-109); anything above 0.8 satisfies the highlight test (110), so the normal tint (113) is unreachable. Fix: pick two thresholds with shadows below highlights, as client data, and check that the normal band is hit by real art. The sketch does not include the shader.
- Defect 4 (level-triggered click): the click input is the held state (twp.cpp 687), so the hover-and-select code runs every frame while the button is held. Today the same-verb early return (hud.cpp 161-162) stops repeats; an instant verb that is already current will not fire again on a second click (that follows from the early return; whether `resetVerb` clears it after a fire was not read). Frankendom must use a press edge for attacks, not a held state.
- Re-arm restarts the wobble phase at zero (a new motor object). That is a design choice, not a defect, and the sketch keeps it.
- Input: mouse only. There is no touch, tap-hold or double-tap code in this file, and `_holdToMove` (twp.cpp 371) is the only drag-like state seen. Frankendom's phone-first touch rules are not covered by this note.
- Lock-on, input buffer and forgiveness: not in this donor (not found by reading the bar code). Do not claim them from this note.
- Health and target frames, minimap and world map: not in this donor (not found in the files read).
- Accessibility: the donor offers an invert-highlight option (on by default, metaengine.cpp 68) and a retro verb style. These are client settings with a test on the colour, not a contrast check. Frankendom's 375-wide readability rule still needs its own check.
- The fade-in and the shader thresholds (0.8) are tuning values; treat them as data (client constants) if we take the bar.

## Reuse tag

rewrite-from-idea (GPL-3.0-or-later; clean-room only)

Brief rule served: HUD client-only; server-verified actions; rule 14 (HUD) only.
