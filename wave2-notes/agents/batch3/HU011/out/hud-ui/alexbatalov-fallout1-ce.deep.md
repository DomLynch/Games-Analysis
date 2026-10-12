# alexbatalov-fallout1-ce (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/intface.cc` | Licence: Sustainable Use License 1.0 (`/mnt/frankendom-donors/alexbatalov-fallout1-ce/LICENSE.md`: use only for internal business or non-commercial personal use; distribution free of charge and non-commercial) | C | symbol `intface_update_hit_points` (with `intface_rotate_numbers`, `block_for_tocks`, `message_load`, `getmsg`)

Checked: (verified: HP readout intface.cc 1072-1151; roll `intface_rotate_numbers` 2194-2316; attack-mode choice 1228-1252; busy wait input.cc 657-665; message format message.h 9 and message.cc 164-243, 297-334, 335-360 (partly), 395-498; licence LICENSE.md 1 and 15). Candidates opened: `src/game/intface.cc` (read the HP, AC, move-point and roll functions in full), `src/game/message.cc` (loader, search, field parser, getmsg), `src/plib/gnw/input.cc` (block wait), `src/int/intlib.cc` (the hint file: this is the script-operation library, window and dialog ops such as `op_createwin` at 695, not the HUD; read the op list only), `src/game/automap.cc` (function list only), `src/game/worldmap.cc` (grep only). Not read in full: automap.cc drawing (minimap, not read), worldmap.cc (world map, 3771 lines, grep only), the body of `message_add` after line 360, and the caller sites of the animated HP updates (listed by grep only). No touch UX was found. Lock-on: none; only aimed-attack selection (intface.cc 1228-1252). Confidence: high on the HP roll (read end to end); medium on the message format (loader read, duplicate path partly). camera: not applicable to this cell.

## 1. Mechanism

Two mechanisms: a stepped number roll for the HP readout with colour bands, and a numbered message file that is the string table.

- Readout. A signed, three-digit number is drawn into the interface buffer at a fixed spot (x 473, y 40; intface.cc 1147 and 1150). Each digit is a 9 px wide by 17 px tall sprite cut from a numbers sheet (2194-2230). Colour bands: red when HP is below 25% of max, yellow below 50%, white otherwise. Both thresholds are truncated integers and are compared with strict less-than (1095-1096; band choice 1099-1105).
- Path with band crossings. When HP changes and the colour changes, the function builds a path from the last shown value to the new value (v1[]), inserting a threshold value (25% or 50%) when the change crosses it. Each path segment carries its band colour (v2[]). A fall from white to red through yellow becomes segments white, yellow, red (1114-1142). The final value is appended last (1142).
- Pacing. An animated change uses a per-step delay of `250 / (|last - hp| + 1)` ms (1145). A non-animated change sets the value at once with delay 0 (1150), and the roll loop is skipped when delay is 0 (the `if (delay != 0)` guard at 2237).
- The roll (`intface_rotate_numbers`, 2194-2316). It moves one unit at a time from the previous value to the target (`while (previousValue != value)`, 2241). Each unit step rolls the ones digit: the up frame (2246-2250), then the down frame (2295). If the ones digit wraps past 9 or below 0, the tens digit rolls the same way and the tens carry adds a wait (2260, 2287); a hundreds wrap adds two more waits (2269, 2282). The step ends with the previous value moved by one (2298) and a final wait (2308). Every wait is `block_for_tocks(delay)` (input.cc 657-664), a busy loop on SDL ticks.
- Timing (estimated from the code; not timed). With no carry, each unit step holds three waits of `delay`, so a change of size |Δ| takes about 3 x |Δ| x 250/(|Δ|+1) ms: about 375 ms for a change of 1 and about 750 ms for a large change. Each carry adds two more waits. So the roll is not a fixed 250 ms.
- Display clamp. Values above 999 or below -999 are shown clamped (2196-2199), but the delay uses the unclamped difference (1145).
- Hidden interface. If the interface window is absent, the function returns at once and does not store the new value (1088). The next visible update rolls from the old value.
- Callers (grep only). `critter.cc` 311 and several `intface.cc` sites call it with `false`. `skill.cc` 524 and 682, `inventry.cc` 3533, `protinst.cc` 953 and `intextra.cc` 1816 call it with `true`. `combat.cc` 3615 passes a flag. The call sites were not read in full.
- Inputs: the critter's hit points and its maximum (read from `obj_dude` at the top of the function). Outputs: the readout pixels, with the roll drawn into the same buffer.
- Tick: the roll is a blocking loop in the caller. Nothing else runs in the frame while it plays, apart from the input and render calls inside each wait.
- String table (localisation). Messages are numbered records in per-language files. `message_load` builds `text/<language>/<path>` from the game configuration (message.cc 190). Each record is three brace-delimited fields: the number, an audio filename, and the text (164-243). Newline characters inside a field are dropped (469), and each field is capped at 1024 bytes (message.h 9). Lookup is a binary search on the number (297-334, the midpoint at 311). A number that is already loaded is replaced (341). A missing number returns the text `Error` and logs a message (484-498, error text at 487 and 492). The `.msg` data files are not in this donor folder, so the entry count is not available.

## 2. Key functions

- `intface_update_hit_points`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/intface.cc` lines 1072-1151. Bands, path with crossings, delay, and the call to the roll.
- `intface_rotate_numbers`: same file, lines 2194-2316. Digit sprites, unit steps, carries, and the waits.
- `block_for_tocks`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/plib/gnw/input.cc` lines 657-665. The busy wait.
- `message_load`, `message_find`, `message_add`, `message_load_field`, `getmsg`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/message.cc` lines 164-243, 297-334, 335-360 (partly), 433-483, 484-498.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Show a changed number as a short roll through the bands it crosses, colour changes at the crossing step | Red below 25% of max, yellow below 50% (theirs, intface.cc 1095-1096) |
| Per-step delay that shrinks with the size of the change | `250 / (|delta| + 1)` ms (theirs, intface.cc 1145) |
| Three-digit display clamp | 999 (theirs, intface.cc 2196-2199) |
| Numbered message file with a binary-search index | 1024-byte field cap (theirs, message.h 9); `Error` fallback (theirs, message.cc 487) |
| Language folder chosen by config | `text/<language>/` path (theirs, message.cc 190) |

## 4. TypeScript sketch

simplified: omits the sprite drawing and the 9 x 17 digit cells, the three-digit display clamp, the carry frames (ones into tens into hundreds), the non-animated path, and the hidden-window early return. The sketch colours each step by its own band (the threshold value takes the upper band). The donor colours each segment by the band it is leaving, so on a rise the threshold value itself stays in the lower band's colour for one step (red at 25%, yellow at 50%); on a fall the two agree. Reorders: the donor builds colour segments first and then waits per digit; the sketch builds one path and spends a fixed budget across all its steps, and it never blocks (the frame loop calls `advanceRoll`).

```ts
// Licence: Sustainable Use License 1.0 (donor LICENSE.md): restricted. CLEAN-ROOM: written from the mechanism, not a translation.
// HP readout: the number rolls one step at a time from the old value to the new one, and its colour
// changes at the step where the value crosses 25% and 50% of max. The roll is timed from the frame loop;
// nothing blocks.

export type Band = "red" | "yellow" | "white";

// Thresholds are truncated integers, as in the donor: red below 25% of max, yellow below 50%, else white.
export function bandFor(hp: number, maxHp: number): Band {
  const red = Math.trunc(maxHp * 0.25);
  const yellow = Math.trunc(maxHp * 0.5);
  if (hp < red) {
    return "red";
  }
  if (hp < yellow) {
    return "yellow";
  }
  return "white";
}

export interface RollFrame {
  value: number;
  band: Band;
}

// One integer per step from `from` (exclusive) to `to` (inclusive), each with the band of that value.
export function rollPath(from: number, to: number, maxHp: number): RollFrame[] {
  const dir = to >= from ? 1 : -1;
  const frames: RollFrame[] = [];
  for (let v = from + dir; dir > 0 ? v <= to : v >= to; v += dir) {
    frames.push({ value: v, band: bandFor(v, maxHp) });
  }
  return frames;
}

// A fixed budget per change, split across the steps. The donor uses 250 / (|delta| + 1) ms per step,
// but holds three waits per step, so its real total is larger (see the note).
export function msPerStep(steps: number, budgetMs: number): number {
  return steps <= 0 ? 0 : budgetMs / (steps + 1);
}

export interface Roller {
  frames: RollFrame[];
  index: number;   // number of frames already shown
  msPerStep: number;
  acc: number;     // ms carried into the next step
}

export function startRoll(from: number, to: number, maxHp: number, budgetMs: number): Roller {
  const frames = rollPath(from, to, maxHp);
  return { frames, index: 0, msPerStep: msPerStep(frames.length, budgetMs), acc: 0 };
}

// Advance by dtMs from the frame loop. Returns the frame to show, or null once the roll is finished.
export function advanceRoll(roller: Roller, dtMs: number): RollFrame | null {
  if (roller.index >= roller.frames.length) {
    return null;
  }
  roller.acc += dtMs;
  while (roller.acc >= roller.msPerStep && roller.index < roller.frames.length) {
    roller.acc -= roller.msPerStep;
    roller.index += 1;
  }
  return roller.index < roller.frames.length ? roller.frames[roller.index] : null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/hu011/alexbatalov-fallout1-ce-hud.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/hud-vitals.ts` (new; proposed path, not checked against any worktree). Client-only: the roll animates the value the server reports and never computes damage, so HP and kills stay server-verified. Parity-checklist row 14 (HUD).
- Frankendom's current HUD code was not read in this pass (not read).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one engine, client reads only; rules 7-9 n/a

## 6. Gaps and risks

- Blocking wait: the roll is a busy loop in the caller (intface.cc 2250-2308 through input.cc 657-664), so the frame cannot advance while it plays. Fix: play the roll from the frame loop (the sketch does).
- Not a fixed budget: the 250 in intface.cc 1145 is a per-step delay, and each step holds three waits, so the total is about 375 ms to 750 ms before carries and more with carries. Fix: a total budget split across steps (the sketch's `msPerStep`).
- Delay from the unclamped change: the delay uses `abs(last_points - hp)` (1145), but the display clamps at 999 (2196-2199). A huge change is slowed by a value the screen never shows. Fix: compute the delay from the clamped value.
- Hidden-window rule: while the window is absent the value is not stored (1088), so the first visible roll starts from an old number. This may be wanted; decide it on purpose.
- Static state: `last_points` and `last_points_color` are function-level statics (intface.cc 1079 and 1086), so the readout holds one value per process. Fine for one local player; it does not work for two characters on one screen.
- Licence: Sustainable Use License, which allows only internal business or non-commercial use. Take the shape only: no sprite, palette, font or string from the donor.
- Message fallback: a missing message shows the text `Error` (message.cc 487-492). A player would see that word. Fix: a visible dev warning and a logged key, never the fallback text in a shipped build.
- Message files: the `.msg` data is not in this donor, so the entry count and the text grammar of the actual lines (not read) are unknown.
- Not covered: minimap and world map (automap.cc drawing and worldmap.cc not read in full); touch UX (none found); lock-on (none; only aimed-attack choice at intface.cc 1228-1252).

Best transferable idea: Show a changed number as a short roll through the colour bands it crosses, so the colour changes on the exact step where the value crosses the threshold rather than at the end of the change.

Decision (proposed): adapt. Keep the stepped roll and the band change at the crossing step; drop the sprite digits and the busy wait; use a fixed total budget per change; clamp the displayed value before computing the delay; replace the `Error` fallback with a dev-visible warning.

Acceptance: On a 100-max character, a hit that takes HP from 60 to 20 shows yellow from 49 down and red from 24 down, and the roll finishes inside the 400 ms budget (budget in data, 400 ms proposed), with no frame over 50 ms during the roll at 375 px wide.
