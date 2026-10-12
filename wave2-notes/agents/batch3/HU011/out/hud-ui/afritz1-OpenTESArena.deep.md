# afritz1-OpenTESArena (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp` | Licence: MIT (`/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt`, "The MIT License (MIT)", copyright 2016-2026 The OpenTESArena Developers) | C++ | symbol `GameWorldUiView::getTriggerTextSeconds` (with `GameWorldUiView::getStatusBarCurrentPixelHeight`, `GameWorldUI::setTriggerText`, `GameState::tickUiMessages`)

Checked: (verified: message-line durations GameWorldUiMVC.cpp 782-795; bar fill 1006-1066; gradient 358-380; status text 88-111 and 160-201; hurt overlay 1119-1148; `GameWorldUI` line timers GameWorldUiState.cpp 810-816, 889-895, 1511-1514, 2936-3036; countdown GameState.cpp 1425-1440; tick and frame clamp Game.cpp 84-96, 126-134, 929; critical health Player.cpp 791-794; string key file data/exe/aExeStrings.txt and loader ExeData.cpp 160-240, 1200-1253, 1467-1469; trigger caller MapLogic.cpp 51-91). Candidates opened: GameWorldUiMVC.cpp (read 1-420 and 700-1200 in full; 1429-1748 controller callbacks NOT read, grep only), GameWorldUiState.cpp, GameState.cpp, Game.cpp, Player.cpp, ExeData.cpp, Options.h, ArenaRenderUtils.h, MapLogic.cpp. Not read in full: AutomapUiMVC.cpp and WorldMapUiMVC.cpp (names only, so the minimap and world-map behaviour is (not read)). A grep for touch input, lock-on and auto-target found no lock-on or touch UX code. Confidence: high on the message timers, bar fill and critical threshold (read end to end); medium on the string-table grammar (read the loader and template paths, not TextAssetLibrary.cpp). camera: not applicable to this cell.

## 1. Mechanism

Three parts: timed message lines, vitals bars with a threshold gradient, and a template-filled string table read from the original executable.

- Message lines. Three lines (trigger, action, effect) each hold a countdown in seconds. Setting a line's text also sets its countdown: the trigger and effect lines get `max(2.50, chars * 0.050)` s, the action line `max(2.25, chars * 0.050)` s (GameWorldUiMVC.cpp 784, 789, 794). `chars` is `text.size()`, which is the byte length (see gaps). A line is visible while its countdown is above zero (GameWorldUiState.cpp 2938). The setters call the duration function at the same time (2968; action and effect setters likewise). The countdown runs in `GameState::tickUiMessages` (GameState.cpp 1425-1440), which the frame update calls once per frame with the clamped step (Game.cpp 929). Trigger lines come from voxel lore triggers when the player enters a trigger voxel (MapLogic.cpp 51-91), and a trigger can be set to show only once.
- Action line special case: thieving mode sets its countdown to infinity until the interaction type is set back to Default, which zeroes it (GameWorldUiState.cpp 889-895).
- Frame step clamp. The step used for all game logic is the frame time capped at 1/MIN_FPS, with MIN_FPS = 15 (Game.cpp 96, 132; Options.h 63). A frame longer than 66.7 ms counts as 66.7 ms, so the game runs in slow motion rather than skipping time. Message timers therefore slow down on a hitch but never jump.
- Vitals bars. One texture holds the health, stamina and spell-point bars, each 4 px wide and 26 px tall at fixed x offsets (GameWorldUiMVC.h 201-205). Bar height per frame is `round(26 * current / max)` clamped to 0..26 (GameWorldUiMVC.cpp 1011-1012). The texture is cleared and redrawn from the bottom up each time (1015-1066).
- Critical health and status gradient. Health ratio is clamped to 0..1, and at or below 0.15 the player is "critically low" (Player.cpp 793-794). The gradient checks, in order: critically low (near death), then drunk (poisoned), then diseased, then healthy (GameWorldUiMVC.cpp 358-380). The same critical test picks the critical-hurt line of the status text (88-101).
- Hurt flash. A full-view checkerboard of dark red cells (GameWorldUiMVC.cpp 1139-1148; alternate cells by `(x + y) % 2`) is shown while its timer is above zero (GameWorldUiState.cpp 810). The timer is set to one frame of a 25 fps clock, 1/25 s (1514; ArenaRenderUtils.h 57), and counted down by dt (816). It is one flash, not a fade.
- String templates. The UI texts are templates with `%s` and `%d` placeholders. The status pop-up is filled left to right, each search starting where the last replacement ended: location, time of day, date (`%s`), then weight and capacity (`%d`, `%d`) (GameWorldUiMVC.cpp 160-201; finds at 182 and 188). The effect text's `%s` is filled from an indexed list (effectsList: index 0 healthy, 1 diseased, 3 critically hurt, 4 drunk, 20 paralysed; lines 88-111, with the paralysed index at line 128). Disease text uses diseaseNames at the disease id minus 10. Pieces are joined with no separator (201). Carriage returns in the source text become newlines and the final newline is removed with `pop_back` (137).
- String table. There is no separate locale layer for these strings. They are read from the original Arena executable: A.EXE (floppy) or ACD.EXE (CD), chosen in `ExeData::init` (ExeData.cpp 1469). `data/exe/aExeStrings.txt` maps each key to an offset in hex, or to an offset and length for fixed-size fields. It has 24 sections and 397 key lines (`grep` count, same as the ACD file). 23 lines are offset-and-length pairs, for example `ChooseClassCreation=0x35A80,37` (line 46). The [Status] section has 20 keys (lines 363-382). Fields are read as null-terminated strings (ExeData.cpp 1210-1231), and arrays are read by stepping over each null (166).
- Grammar in short: placeholders `%s` (string) and `%d` (integer) are filled in order; a `\r` in the source becomes `\n`; text is built by concatenation. Plural forms are separate keys (SingularHourPassed and PluralHoursPassed, aExeStrings.txt lines 14-15, and the Remaining pair at 16-17), so the singular-or-plural choice is made in code that I did not read.
- Inputs: the player's health, stamina, spell points, drunk/disease/paralysis flags, the message text and the frame time. Outputs: the bar texture, the visible text lines, the hurt overlay and the status pop-up.
- Tick: the UI and message countdowns run once per frame in the update block, with the clamped step (Game.cpp 848-929). There is no fixed-step accumulator for the HUD.

## 2. Key functions

- `GameWorldUiView::getTriggerTextSeconds`, `getActionTextSeconds`, `getEffectTextSeconds`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp` lines 782-795. Duration rule: floor plus per-character time.
- `GameWorldUI::setTriggerText` and `setTriggerTextDuration`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiState.cpp` lines 2960-2970 and 3002-3005. Sets the text and the countdown together.
- `GameState::tickUiMessages`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/GameState.cpp` lines 1425-1440. Counts each visible line down by dt.
- Frame timer: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/Game.cpp` lines 96 and 132. The clamp that makes a hitch run in slow motion.
- `GameWorldUiView::getStatusBarCurrentPixelHeight` and `updateStatusBarsTexture`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp` lines 1006-1066. Pixel fill from the bottom.
- `GameWorldUiModel::getCurrentPlayerStatusGradientType`: same file, lines 358-380. Priority order of the gradient.
- `Player::isHealthCriticallyLow`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Player/Player.cpp` lines 791-794. The 15 percent threshold.
- `GameWorldUiModel::getStatusButtonText`: GameWorldUiMVC.cpp lines 165-201. The template fill.
- `ExeData::init` and `ExeDataStatus::init`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Assets/ExeData.cpp` lines 1200-1253 and 1467-1469. Key-to-offset string loading.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Message line countdown that the text itself sets: `max(floor, chars * rate)` | Floor 2.50 s for trigger and effect, 2.25 s for action (theirs, GameWorldUiMVC.cpp 784, 789, 794) |
| Reading time per character | 0.050 s per character (theirs, 784) |
| Countdown on a clamped step, so hitches slow timers | Max step 1/15 s = 66.7 ms (theirs, Game.cpp 96; Options.h 63 `MIN_FPS = 15`) |
| Vitals bar as a rounded, clamped pixel count, filled from the bottom | Bar 26 px tall (theirs, GameWorldUiMVC.h 201) |
| Critical threshold on a clamped ratio | 0.15 (theirs, Player.cpp 794) |
| One-frame hit flash timed by the frame clock | 1/25 s (theirs, GameWorldUiState.cpp 1514; ArenaRenderUtils.h 57) |
| Indexed text lists per status | effectsList indexes 0, 1, 3, 4, 20 (theirs, GameWorldUiMVC.cpp 88-111) |

## 4. TypeScript sketch

simplified: omits the byte-versus-character count (the sketch uses JS string length, UTF-16 units; the donor uses byte length), the infinite action line (the donor sets it by interaction mode; the sketch keeps `remaining` and the comment only), the once-only lore trigger flag, the pop-up queue and callback, the texture upload, the compass and the status-text concatenation. Reorders: the donor clamps the frame time in the frame timer before the whole update; the sketch clamps inside `tickLines`. The gradient takes the health ratio as a number, where the donor reads the player object.

```ts
// Licence: MIT (donor LICENSE.txt). Shape only; written from the mechanism, not copied line by line.
// Timed HUD message lines and vitals bars.

export interface LineTiming {
  floorSeconds: number;   // minimum on-screen time
  secondsPerChar: number; // reading time per character
}

// Trigger and effect lines use 2.50 s; action lines use 2.25 s. Both 0.050 s per character.
export const TRIGGER_TIMING: LineTiming = { floorSeconds: 2.5, secondsPerChar: 0.05 };
export const ACTION_TIMING: LineTiming = { floorSeconds: 2.25, secondsPerChar: 0.05 };

export function lineSeconds(text: string, t: LineTiming): number {
  return Math.max(t.floorSeconds, text.length * t.secondsPerChar);
}

export interface HudLine {
  remaining: number; // seconds left; 0 = hidden; Infinity = stays until cleared
  text: string;
}

export function showLine(line: HudLine, text: string, t: LineTiming): void {
  line.text = text;
  line.remaining = lineSeconds(text, t);
}

export function clearLine(line: HudLine): void {
  line.remaining = 0;
}

// Called once per logic step. The step is clamped first so a long hitch does not skip a message.
export function tickLines(lines: HudLine[], dt: number, maxStep: number): void {
  const step = Math.min(dt, maxStep);
  for (const line of lines) {
    if (line.remaining > 0) {
      line.remaining = Math.max(line.remaining - step, 0);
    }
  }
}

export function isVisible(line: HudLine): boolean {
  return line.remaining > 0;
}

// Vitals bar: fill height in whole pixels from the bottom, clamped to the bar.
export function barPixels(current: number, max: number, heightPx: number): number {
  if (max <= 0) {
    return 0;
  }
  const percent = current / max;
  return Math.min(Math.max(Math.round(heightPx * percent), 0), heightPx);
}

export const CRITICAL_HEALTH_RATIO = 0.15;

export type StatusGradient = "nearDeath" | "poisoned" | "diseased" | "healthy";

// Priority order: near death beats poisoned, which beats diseased.
export function statusGradient(healthRatio: number, drunk: boolean, diseased: boolean): StatusGradient {
  const clamped = Math.min(Math.max(healthRatio, 0), 1);
  if (clamped <= CRITICAL_HEALTH_RATIO) {
    return "nearDeath";
  }
  if (drunk) {
    return "poisoned";
  }
  if (diseased) {
    return "diseased";
  }
  return "healthy";
}

// Hit flash: one frame at 25 fps, held as a timer so it survives the frame rate.
export const HURT_FLASH_SECONDS = 1 / 25;

export function triggerHurtFlash(flash: { remaining: number }): void {
  flash.remaining = HURT_FLASH_SECONDS;
}

export function sampleBarPixelsDemo(): number[] {
  return [barPixels(0, 100, 26), barPixels(15, 100, 26), barPixels(100, 100, 26), barPixels(5, 0, 26)];
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/hu011/afritz1-OpenTESArena-hud.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/hud-messages.ts` (new; proposed path, not checked against any worktree). Client-only: the timers and bars read engine values (health, hits) and never write them, so kills and health stay server-verified. Parity-checklist row 14 (HUD).
- Frankendom's current HUD code was not read in this pass (not read).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one engine, client reads only; rules 7-9 n/a

## 6. Gaps and risks

- Byte count, not characters: `text.size()` (GameWorldUiMVC.cpp 784) counts bytes, so accented text gets a longer on-screen time. Fix: count characters (code points) in the Frankendom version.
- No guard on max: `currentValue / maxValue` (1011) divides by a possibly zero max. Fix: return 0 when max is 0 or less (the sketch does this).
- Unchecked search: `text.find("%s")` (110) and `text.replace(index, 2, effectStr)` (111) do not test for npos. A template without `%s` would throw inside replace (C++ standard behaviour, not tested here). Fix: check placeholder count when a template is loaded.
- Empty string: `text.pop_back()` (137) on an empty string is undefined behaviour. The date line `back()` in `getStatusButtonText` has the same risk (not line-checked). Fix: guard the length.
- The hurt flash is 40 ms. That is one frame at 25 fps and may be too brief to read on a 60 Hz screen (my judgement; not measured). Frankendom should pick its own duration and test it at 375 px wide.
- No cap on message time: the formula has a floor and no ceiling, so a very long lore line stays on screen a long time. Frankendom should cap it.
- Source and copyright: the strings are read from Arena's own executable at fixed offsets. The donor code is MIT, but the text it reads is not. Do not copy those strings or this loader; Frankendom text must be its own. The rule here is the shape of the timer, not the content.
- Not covered: touch UX, lock-on, the minimap and world map (AutomapUiMVC.cpp and WorldMapUiMVC.cpp not read in full). No touch or lock-on code was found by grep.
- Not read: GameWorldUiMVC.cpp 1429-1748 (controller callbacks), TextAssetLibrary.cpp (other text assets).

Best transferable idea: Give every HUD message a countdown that the text itself sets (a floor plus a per-character reading time), and count it down on the clamped frame step so a hitch slows it instead of skipping it.

Decision (proposed): adapt. Keep the length-based countdown and the clamped-step tick; use Frankendom's own constants, count characters not bytes, guard the zero-max bar, and reject the executable string loader (copyright and not our shape).

Acceptance: At 375 px wide, a 60-character toast stays visible at least 3.0 s and a 5-character toast at least 2.5 s (Playwright timing check), and a 500 ms stall moves the countdown by at most 66.7 ms.
