# FunkinCrew-Funkin (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/character/BaseCharacter.hx` (`BaseCharacter.onUpdate`, 389-470; `isSinging` 473-477; `onNoteHit` 550-600) | Licence: Apache 2.0 for the source (LICENSE.md line 3: "The Friday Night Funkin' source code is licensed under the Apache 2.0 license"); LICENSE.md also says the assets have their own licence and the name and logo are trademarks, so no assets are used here | Haxe | symbol `BaseCharacter.onUpdate`

Checked: The hint file `source/funkin/ui/freeplay/dj/AnimateAtlasFreeplayDJ.hx` (243 lines, read in full) is the freeplay DJ screen. Its own header says "BaseFreeplayDJ has game logic, AnimateAtlasFreeplayDJ has only rendering logic" (line 19). It picks a clip per UI state and escalates idle after `IDLE_EGG_PERIOD` (186; 60 s at BaseFreeplayDJ.hx 74). That is UI idle logic, not the in-game rig, so it is not the mechanism. The in-game mechanism is the sing hold state in `BaseCharacter.hx` (read 380-600). Also read: `CharacterPlayer.hx` 228-240 (sustain pre-charge), `PlayState.hx` 2828-2852 (opponent sustain), `Constants.hx` (suffix and ms constants, by grep and line), `Conductor.hx` 189 (step length, by grep). Not read: `playAnimation`, `getCurrentAnimation`, `isAnimationFinished` (the base class), `dance` in the base class, the death path, and the animation loop setting for `-hold` clips. Confidence: high on the sing hold order of operations and its numbers. camera_scope: not applicable (not a camera topic).

## 1. Mechanism

Each character has a current clip name and a hold timer in seconds. A note hit plays a sing clip (`playSingAnimation`) and resets the hold timer. The timer keeps the sing clip on screen while the note is held, and a release plays the clip's end pose, or idle if there is none.

Order of operations, `BaseCharacter.onUpdate` (389-470):
- For the player character, a new note press resets the hold timer to 0 (393-396).
- Hold twin: when the current clip has finished (411), does not already end in `-hold`, and a clip named `<clip>-hold` exists (413), the twin plays (415). The source comment says the twin is looped if configured, so a pose can hold and flicker while the input is held (405-409).
- Singing test, `isSinging` (476): the clip name starts with `sing` and does not end in `-end`. If singing:
  - the hold timer grows by the frame's elapsed time (433);
  - the sing time is `singTimeSteps * (stepLengthMs / 1000)` (434), where `singTimeSteps` is the character's data field (190) and the step length comes from the song's tempo (Conductor 189);
  - a clip whose name ends in `miss` doubles that time (436);
  - for the player the release gate is `!isHoldingNote()` (440); the opponent always releases on time;
  - when the timer passes the sing time and the gate allows, the timer resets (445). The code plays `<base>-end` if that clip exists (456), otherwise idle (460-461).
- Not singing: the timer is set to 0 (467), and the beat dance handles idle (468).

Sustain pre-charge: `BaseCharacter.onNoteHit` sets the timer to 0 when a sing starts (for example 564-586). Then `CharacterPlayer.onNoteHit` (236-238) overwrites it with minus the note's length in seconds, for the side that owns the note. So a sustain extends the sing by its own length, and the timer counts up from a negative start.

Opponent sustain hold: while an opponent sustain is held (`hitNote` set, not missed, length above 0), `PlayState` resets the opponent's hold timer to 0 each update if it is singing (loop from 2839; reset at 2850). So the opponent's sing pose does not end while its sustain is held.

Note kinds: a note kind with `noanim` plays no sing clip; a kind with a suffix plays a suffixed sing clip (550-592). Clip names are the interface: the code finds `sing`, `-hold`, `-end` and `miss` by string match.

## 2. Key functions

- `BaseCharacter.onUpdate`: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/character/BaseCharacter.hx` 389-470. Hold twin, sing timer, release to end pose or idle, reset when not singing.
- `BaseCharacter.isSinging`: same file, 473-477. Sing and not end.
- `BaseCharacter.onNoteHit`: same file, 550-600. Clip choice per note, hold timer reset, GF combo clips.
- `CharacterPlayer.onNoteHit` (sustain pre-charge): `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/ui/haxeui/components/CharacterPlayer.hx` 228-240.
- Opponent sustain reset: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/PlayState.hx` 2839-2852.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Sing time = steps x step length | `singTimeSteps` per character data (BaseCharacter.hx 190); step length from the conductor (Conductor.hx 189) |
| Miss holds twice as long | `singTimeSec *= 2` (BaseCharacter.hx 436) |
| Sustain extends the sing by its length | `-note.length / 1000` seconds (CharacterPlayer.hx 238) |
| Player release gate | `!isHoldingNote()` for the player; always true for the opponent (BaseCharacter.hx 440) |
| End pose and idle release | suffix `-end` (Constants.hx 346); idle when absent (BaseCharacter.hx 456-461) |
| Hold twin | suffix `-hold` (Constants.hx 341; BaseCharacter.hx 413-415) |
| Milliseconds per second | 1000 (Constants.hx 373) |
| Opponent sustain keeps the sing | hold timer 0 while held (PlayState.hx 2850) |
| Freeplay DJ idle egg | 60 s (BaseFreeplayDJ.hx 74) - UI only, not the fight |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (hold twin, player press reset, sing timer with miss doubling and the player release gate, end pose or idle release, timer reset when not singing) and the sustain pre-charge helper. It omits: the dead-state return, the base class clip functions (the sketch takes `hasAnim` as a callback), the idle variant (the sketch returns the string "idle" where the donor calls `dance(true)`), the note-kind suffix and the GF combo clips, the opponent sustain reset in PlayState (the caller must apply it), and the clip loop setting. Times are in seconds and the frame clock is the caller's `elapsedSec`. The block below is the typechecked file; the file adds `export {}` at the end.

```ts
// clean-room sketch of a sing hold timer with a hold loop and an end pose (donor licence Apache-2.0: shape only, not a translation)
const HOLD = "-hold";
const END = "-end";

export interface SingState { anim: string; holdTimer: number; } // holdTimer in seconds

export interface SingCfg {
  singTimeSteps: number;   // per-character data (donor: _data.singTime)
  stepLengthMs: number;    // from the song tempo, not from the frame clock
  isPlayer: boolean;       // the player releases on let-go; the opponent always releases on time
}

export interface SingFrame {
  elapsedSec: number;
  justPressed: boolean;    // a new note was pressed this frame
  held: boolean;           // a note key is still down
  finished: boolean;       // the current clip reached its last frame
  hasAnim: (name: string) => boolean;
}

// Sustain notes pre-charge the hold timer with minus the note length, so the sing lasts longer.
export function sustainPrecharge(sustainLengthMs: number): number {
  return -sustainLengthMs / 1000;
}

export function singStep(s: SingState, cfg: SingCfg, f: SingFrame): SingState {
  let anim = s.anim;
  let holdTimer = s.holdTimer;

  // A finished clip with a "-hold" twin switches to the twin, which loops.
  if (f.finished && !anim.endsWith(HOLD) && f.hasAnim(anim + HOLD)) anim = anim + HOLD;

  if (cfg.isPlayer && f.justPressed) holdTimer = 0;

  const singing = anim.startsWith("sing") && !anim.endsWith(END);
  if (!singing) return { anim, holdTimer: 0 };

  holdTimer += f.elapsedSec;
  let singSec = cfg.singTimeSteps * (cfg.stepLengthMs / 1000);
  if (anim.endsWith("miss")) singSec *= 2; // a miss holds twice as long
  const mayStop = cfg.isPlayer ? !f.held : true;

  if (holdTimer > singSec && mayStop) {
    holdTimer = 0;
    const base = anim.endsWith(HOLD) ? anim.slice(0, anim.length - HOLD.length) : anim;
    anim = f.hasAnim(base + END) ? base + END : "idle"; // release: end pose if any, else idle
  }
  return { anim, holdTimer };
}
```

Best transferable idea: A note hit starts a sing clip whose end is decided by a timer that counts from the note, with a sustain pre-charging the timer by its length and a release that plays an end pose or returns to idle, so the pose lasts exactly as long as the player's input.

Decision (proposed): adapt - take the hold-then-release shape (end pose or idle, sustain pre-charge, miss doubles the hold) for the hero's and creatures' clip state, keyed to the fight tick and to explicit clip fields in the catalogue instead of name suffixes; keep the damage window in src/fight, because the hold only decides how long a pose stays on screen.

Acceptance: in the browser, a hero's swing pose stays on screen while the attack input is held for the swing's sustain, and releasing shows the end pose or returns to idle; a missed swing holds twice as long; a server test shows the hit tick is the same whether the hold clip is on or off.

Reuse tag: rewrite-from-idea (Apache-2.0; code could be adapted with the notice kept, but the sketch is written from the mechanism; no assets used)
Brief rule served: 1 (one engine, two clients: the hold timer lives on the client and never decides a hit); row 6 hero actor/animation (creature clips would use the same shape through row 7).

## 5. Lands in

- TARGET `origins/client/rig/clip-state.ts` (new, client only; path proposed, repo layout not checked in this task). The fight step in `src/fight` owns the damage window and never reads this timer.
- Parity-checklist row 6 (hero actor/animation).
- The `singTimeSteps` value is per-character data in the donor (BaseCharacter.hx 190). In Frankendom it belongs to the creature or hero catalogue entry (rows 20-21), not to a zone; the schema's "zone data" tag here means per-actor data.

## 6. Gaps and risks

- The donor times the pose with frame elapsed time (433) and the sing length with song tempo (434). Frankendom's fight is ticked by the server, so the hold must use the fight tick count when it matters, and the client should only show it.
- The player release gate (440) keeps a sing pose on while a key is down. A swing whose input is held must not extend the engine's attack window: only the clip is held.
- The miss double (436) matches a clip-name suffix. Frankendom should carry a state flag, not parse names.
- The clip interface is string-based (`sing` prefix, `-hold`, `-end`). That is fragile and implicit. Frankendom's catalogue (rows 20-21) should declare hold and end clips as named fields.
- The sustain pre-charge (CharacterPlayer.hx 238) is set after the base hit handler, so the order matters. A test should pin the order.
- The freeplay DJ (`AnimateAtlasFreeplayDJ.hx`) is UI and has its own idle escalation (egg at 60 s, cartoon later). Its shape (finish callbacks drive state changes) is a UI idea only and does not fit the fight.
- Licence: Apache 2.0 for the source; the assets are separately licensed and the name and logo are trademarks, so no assets are taken. Any code adapted would keep the Apache notice.
- Not read: the base class clip functions and the loop setting for `-hold` clips. The sketch assumes the clip finishes and reports it; the donor's exact finish rule was not read.
