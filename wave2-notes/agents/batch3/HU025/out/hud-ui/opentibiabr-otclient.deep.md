# opentibiabr-otclient (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_joystick/joystick.lua` | Licence: MIT (LICENSE line 1: "OTClient is made available under the MIT License") | Lua | symbol `executeWalk`

Checked: joystick.lua read in full (158 lines); joystick.otui (keypad size, line 8); joystick.otmod; game_walk/walk.lua around its one listener hook (line 272) and the head of the file; LICENSE; locales.lua read in full; data/locales/en.lua and the entry counts of de/es/pl/pt/sv (grep). Confidence: high for the client pad mechanism (the whole mechanism and its only caller were read). Not read: the C++ side of `g_game.walk` (how the server or engine paces walk steps), the C++ `g_mouse.isPressed` (I assume it is already false inside the release handler; not verified), and the C++ widget event dispatch. Hud-ui scope: a touch pad, not a camera.

Best transferable idea: a thumb pad that turns a fingertip offset into one of eight directions with a dead zone and corner diagonals, with the knob clamped to a small circle, sampled on a fixed step.
Decision (proposed): adapt — the Frankendom phone world move needs exactly this input shape; the donor's timer and normalised-axis maths are the parts to change.
Acceptance: on a 375 px phone, holding the thumb in the pad's top-right corner moves the hero north-east in the zone; the knob stays inside a 75 px circle; a press inside the 0.1 dead zone sends no intent; releasing stops intent on the next fixed step (unit test: readStick at (0.85 x 175, 0.15 x 150) returns NE).

## 1. Mechanism

- A virtual joystick for touch screens (mobile only). The pad is a 175 x 150 px widget at the bottom left (joystick.otui 8). The pad turns the thumb position into one of eight directions and hands that direction to the walk controller while the finger is down.
- Order of steps:
  (a) Gate: the module does nothing off mobile (joystick.lua 9).
  (b) Touch-down: non-left buttons are ignored (69). The pointer position is stored as fractions of the pad width and height (71-72). The first-step flag is set true (74). One step runs at once (75).
  (c) Step (`executeWalk`): it first removes the pending timer event (104-105). If the mouse is no longer pressed, it resets the knob and returns without re-scheduling (107-111), which ends the loop. Otherwise it re-schedules itself 20 ms later (113), then carries on.
  (d) It clamps the two fractions to 0..1 (114-115). It takes `angle = atan2(x - 0.5, y - 0.5)` (116). Knob travel: each axis is clamped to its share of a 75 px radius (117-122). The vertical knob offset is `(y - 0.5) * 150` before the clamp (118).
  (e) Direction: a corner square (both axes within 0.3 of an edge) gives a diagonal (125-133). Otherwise, outside a 0.1 dead zone on either axis (135), the dominant axis gives N/S or W/E (136-149).
  (f) If there is a direction and a listener, it calls `moveListener(dir, firstStep)` (151-153).
  (g) Touch-up (87-101): the flag is set false (93). The step runs once more (94) and returns early, assuming the button is up, after which the timer is removed (95) and the knob is reset (97-98).
- Numbers: 20 ms repeat; 75 px knob radius; 150 knob scale; 0.1 dead zone; 0.3 corner.
- Tick: no game tick here. A 20 ms UI timer (`scheduleEvent`) re-reads the thumb while it is held. Each call is one direction request. Whether the engine spaces steps is in C++ (not read).

## 2. Key functions

- `onKeypadTouchPress`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_joystick/joystick.lua` 68-78. Sets the pointer fraction and the first-step flag, then runs the step once.
- `executeWalk`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_joystick/joystick.lua` 103-154. The whole pad step: remove timer, pressed check, re-schedule, angle, knob, direction, listener.
- `onKeypadTouchRelease`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_joystick/joystick.lua` 87-101. Clears the flag, runs the step once more, resets the knob.
- The only listener: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_walk/walk.lua` 272 registers `function(dir) g_game.walk(dir) end`. It drops the second argument.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pad position as centred fractions; eight-way from the dominant axis, with corner diagonals and a dead zone | Dead zone 0.1 (joystick.lua 135); corner 0.3 from each edge (125-132) |
| Knob follows the thumb and is clamped to a circle | Radius 75 px (117); scale 150 (118); pad 175 x 150 px (joystick.otui 8) |
| Hold = re-read the thumb on a timer and send the current direction | Timer 20 ms (113) |
| First-step flag on press, to tell a new press from a hold | None (see defect 1 in section 6) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor thresholds (0.1 dead zone, 0.3 corner, corner-before-dominant-axis order, the same N/S/W/E mapping). It changes four things. (1) The knob and the dominant-axis test work in px, not normalised offsets (defect 2 in section 6). (2) It emits on a fixed simulation step, not on a 20 ms timer, and does not call the engine itself. (3) `first` is true for one step per press (defect 1). (4) The first intent comes on the first fixed step after touch-down, not inside the touch-down handler. It omits the knob drawing, the mobile gate, the keypad widget, the release reset and the walk call. The knob is 1:1 px. The donor's vertical knob is also 1:1, but its horizontal knob is 0.857 of the finger's px, because it applies the 150 scale to both axes of a 175-wide pad.

```ts
// Licence: MIT (donor, OTClient LICENSE). Adapted shape, rewritten in TypeScript for Frankendom.
// Client-only input: the engine never reads this module; it only receives a direction per fixed step.

export type Dir8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface StickCfg {
  padW: number;       // pad width in px (donor keypad 175 x 150)
  padH: number;       // pad height in px
  knobMax: number;    // knob travel radius in px (donor 75)
  deadZone: number;   // half-pad fraction with no direction (donor 0.1)
  cornerZone: number; // corner square, fraction from each edge, that means a diagonal (donor 0.3)
}

export interface StickReading {
  dir: Dir8 | null;
  knobX: number; // px from pad centre
  knobY: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Pure reading of one pointer position (px from the pad's top-left corner).
export function readStick(px: number, py: number, cfg: StickCfg): StickReading {
  // Centred fractions, -0.5..0.5 ("+" is right and down).
  const nx = clamp01(px / cfg.padW) - 0.5;
  const ny = clamp01(py / cfg.padH) - 0.5;

  // Knob: follows the finger in px and is clamped to a circle of radius knobMax.
  const dxPx = nx * cfg.padW;
  const dyPx = ny * cfg.padH;
  const r = Math.hypot(dxPx, dyPx);
  const k = r > cfg.knobMax ? cfg.knobMax / r : 1;

  // Corners first: both axes past the corner line means a diagonal.
  const edge = 0.5 - cfg.cornerZone; // donor 0.3 from the edge is 0.2 from centre
  let dir: Dir8 | null = null;
  if (ny < -edge && nx < -edge) dir = 'NW';
  else if (ny < -edge && nx > edge) dir = 'NE';
  else if (ny > edge && nx < -edge) dir = 'SW';
  else if (ny > edge && nx > edge) dir = 'SE';

  // Dead zone, then the dominant axis (compared in px, so the pad's aspect does not skew it).
  if (dir === null && (Math.abs(ny) > cfg.deadZone || Math.abs(nx) > cfg.deadZone)) {
    if (Math.abs(dyPx) > Math.abs(dxPx)) dir = ny < 0 ? 'N' : 'S';
    else dir = nx < 0 ? 'W' : 'E';
  }

  return { dir, knobX: dxPx * k, knobY: dyPx * k };
}

// Holds one touch. Call step() once per FIXED simulation step, never per frame.
export class TouchStick {
  private down = false;
  private px = 0;
  private py = 0;
  private firstSent = false;

  constructor(private readonly cfg: StickCfg) {}

  press(px: number, py: number): void {
    this.down = true;
    this.px = px;
    this.py = py;
    this.firstSent = false;
  }

  move(px: number, py: number): void {
    if (this.down) {
      this.px = px;
      this.py = py;
    }
  }

  release(): void {
    this.down = false;
  }

  // Returns the intent for this step, or null when nothing is held or the stick is in the dead zone.
  // `first` is true only on the first step after a press (the donor never clears its flag while held).
  step(): { dir: Dir8; first: boolean } | null {
    if (!this.down) return null;
    const reading = readStick(this.px, this.py, this.cfg);
    if (reading.dir === null) return null;
    const first = !this.firstSent;
    this.firstSent = true;
    return { dir: reading.dir, first };
  }
}
```

## 5. Lands in

- TARGET `src/fight/input-stick.ts` (new, client-only input module; the engine receives one direction per fixed step, nothing else). Parity-checklist row 5 (controls/input). Touch-UX fold-in from the addendum.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is a rewrite with defects 1-3 fixed)
- Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); Frankendom ruling that input and HUD are client-only

## 6. Gaps and risks

- Defect 1 (latent): `firstStep` is set true on touch-down (74) and false only on release (93). `executeWalk` never clears it, so every step of a hold passes `true` (152). The only caller ignores it (walk.lua 272), so nothing breaks today. Fix: clear the flag after the first callback (the sketch does this in `TouchStick.step`).
- Defect 2 (aspect): the angle (116), the dominant-axis test (136) and the corner tests use offsets normalised by each axis's own size, but the pad is 175 wide and 150 high (joystick.otui 8). A 45-degree thumb line on screen is therefore not the 45-degree line in the code, and the knob moves 0.857 px per px of thumb travel horizontally but 1:1 vertically. Fix: compute offsets in px and compare in px (the sketch does).
- Defect 3 (timing): the repeat is a 20 ms wall-clock timer (113), not the game's step. Frankendom must sample on the fixed step. Fix: the sketch's `step()` is called once per fixed step.
- Defect 4 (assumption, not read): the touch-up step relies on `g_mouse.isPressed` being false inside the release handler (107). Not read in C++.
- Not read: how `g_game.walk` paces steps and how the server treats repeated requests every 20 ms. Any walk buffer lives in C++, not in Lua. For Frankendom the intent must be buffered per fixed step, not sent on a timer.
- Localisation string table (read as data; this is the hud-ui string-table fold-in). Files: data/locales/en.lua, de.lua, es.lua, pl.lua, pt.lua, sv.lua; modules/client_locales/locales.lua (235 lines) and neededtranslations.lua (116 lines, a list of 451 keys that the generator checks). Entry counts by grep: de 526 (24 `false`), es 526 (7), pl 526 (125), pt 526 (0), sv 612 (65). en has an empty table (en.lua 11) because the English text is the key itself. Grammar: each entry is `["English text"] = "translation"`. The key is the English string, including punctuation and printf placeholders (%s, %d, %%). `false` means untranslated. `tr()` looks the key up (locales.lua 222), falls back to the key when the entry is missing or false (223, 229), and formats with `string.format` and the call's arguments (231), so placeholders are positional. Numbers are grouped with the locale's thousands and decimal separators when `formatNumbers` is set. Frankendom gap: a key-as-English design degrades to English with no crash, but the repo has no locale tables today (not read in Frankendom). Placeholder mismatch was not tested.
- Frankendom gap: the stick is a client input. It must not change server state. The sketch's intent is only a direction; the engine decides what a step does.

Reuse tag: adapt (MIT)
Brief rule served: addendum rule 2; rulings on client-only input and one engine

Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Step order in mechanism (c) was wrong: the isPressed check (107-111) comes first and returns without re-scheduling; the schedule (113) comes after it, and removeEvent runs at 104. Confirmed against the code.
- The 451 keys in neededtranslations.lua: a quoted-string count over the file gives 451 (the checker's single-quote count of 455 was a method difference). Checker doubt not applied.
- Everything else verified (MIT, pad size, 20 ms, 75, 150, 0.1, 0.3, walk.lua 272, defects 1-2, locale counts).
- Missed: none material.

Fixed 2026-10-12: corrected the order of steps in mechanism (c) and the key-function line.
