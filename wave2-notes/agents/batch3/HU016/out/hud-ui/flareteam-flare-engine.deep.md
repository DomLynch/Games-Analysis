# flareteam-flare-engine (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/GameStatePlay.cpp` (checkEnemyFocus 153-225; read) with `src/MenuEnemy.cpp` (target frame) and `src/HazardManager.cpp` (last-hit source) | Licence: GPL-3.0-or-later (per the MenuEnemy.cpp header: "either version 3 of the License, or (at your option) any later version"; COPYING is the GPLv3 text) | C++ | symbol `GameStatePlay::checkEnemyFocus`

Checked: Hint `src/MenuCharacter.cpp` is the character sheet and is not the HUD; not used beyond confirming that. Read in full or near-full: `GameStatePlay.cpp` 150-262 (checkEnemyFocus, checkNPCFocus), 857-880 (logic, call site); `MenuEnemy.cpp` 26-216 (constructor, loadGraphics, handleNewMap, logic, render to end of file); `HazardManager.cpp` 118-135; `Utils.cpp` 186-245 (Timer, read 212-240); `UtilsParsing.cpp` 242-258 (duration parsing); `main.cpp` 180-215 (logic loop); `Avatar.cpp` 575-612 (mouse-move lock). `Settings.cpp` 84 by grep. Confidence high on the focus order and the window; medium on the frame's relative order to MenuEnemy::logic (the MenuManager tick order is (not read)). camera_scope: not applicable. Other hud-ui sub-topics, honest status: minimap `src/MenuMiniMap.cpp` (636 lines, not read); touch `src/MenuTouchControls.cpp` (138 lines, not read); string table fold-in is in section 1 (engine .po files, counted, not opened line by line).

## 1. Mechanism

- One function picks the foe the target frame and the attack auto-target use: `GameStatePlay::checkEnemyFocus`. It runs once per logic step, inside the not-paused block of `GameStatePlay::logic` (857-878). It writes two things: the frame's foe (`menu->enemy->enemy`) and `pc->cursor_enemy`.
- Keyboard or gamepad path (not mouse). A "last hit" foe exists when a hazard (a power's area) hits a living foe and the hit is not a beacon (`HazardManager.cpp` 130-131 sets `last_enemy`). Order in the function (170-184):
  1. If the last hit is already the current focus: stay on it, and return early, while the frame's window has time left and the foe is alive (167-168). The early return skips the frame update and the nearest scan.
  2. If the window ran out or the foe died: clear the last hit (170) and the focus becomes nothing for this step (172). The next step takes the nearest foe in interact range (175).
  3. If the last hit is a different foe, it takes the focus at once (172) and the window restarts (197).
  4. If there is no last hit, the nearest living foe within `eset->misc.interact_range` is the focus (175).
- Mouse path. The last hit is used once and then cleared (180-181). Otherwise the living foe under the cursor is the focus (184). If none, a dead foe under the cursor becomes a corpse target and sets `target_corpse` (202-206).
- The window. The frame's timer is a `Timer` in logic steps. Default 10 s = 10 x max fps steps (`MenuEnemy.cpp` 51; default max fps is 60, `Settings.cpp` 84). A mod can override it with a seconds value in `menus/enemy.txt` (84; `UtilsParsing.cpp` 253 multiplies seconds by max fps). The window is reset on every step that sets a non-sticky focus (197, 206, 245, 253). With no last hit, the nearest foe is set every step, so the window stays full while a foe is in range. The window only runs down while a last-hit lock holds, because the early return at 168 skips the reset at 197. Re-hitting the locked foe therefore does not refresh it.
- Timer and loop. `Timer::tick` counts down to 0 (`Utils.cpp` 213). The logic loop (`main.cpp` 195) runs logic in fixed steps at the configured max fps, with catch-up up to that many steps per render. So the 10 s is game-logic time and holds when the frame rate drops.
- The frame (`MenuEnemy`). It draws only when a foe is set (`render`). The bar fill is `hp * fill width / hp max`, truncated, and is at least 1 px while hp > 0 (147-149). The fill width defaults to the width of `bar_pos` (95). The label is "name level N" (173), then "hp/max" while alive (192-193), else "Dead" for a lifeform (196-197) or "Destroyed". The frame hides when its timer ends (124-125) or when a corpse's timer ends (127-128).
- Mouse-move attack lock (`Avatar.cpp`). With `mouse_move_attack` on, pressing on a non-ally cursor enemy copies it to `lock_enemy` (585-587). The lock is dropped when that foe's hp is 0 or less (600-601). Separately, when the mouse-move key is not latched (584) and there is no cursor enemy (591), `lock_enemy` is cleared (592).

- String table (fold-in): gettext files under `mods/default/languages/`. `engine.pot` holds 531 entries (532 `msgid` lines including the header), 72 of them with `%s`/`%d`/`%f` placeholders, 33 with multi-line `msgid`s, and no plural forms (`msgid_plural` count 0). The German `engine.de.po` also has 532 `msgid` lines. The loader reads `languages/engine.<lang>.po` and `languages/data.<lang>.po` per language (`MessageEngine.cpp` 72 and 86); `getv` fills the placeholders (117). Grammar: flat English key to translation, with the placeholder style in the key; nothing is pluralised in the table. Quoted nothing.

## 2. Key functions

- `GameStatePlay::checkEnemyFocus`: `/mnt/frankendom-donors/flareteam-flare-engine/src/GameStatePlay.cpp` 153-225 (reset 155-158, keyboard path 165-182, mouse path 183-209, cursor and nearest 212-224).
- Call site: `/mnt/frankendom-donors/flareteam-flare-engine/src/GameStatePlay.cpp` 857 and 878.
- `MenuEnemy` constructor (window default, overrides, fill default): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuEnemy.cpp` 42 up to `loadGraphics` at 104 (51, 84, 95).
- `MenuEnemy::logic` (window tick and clear): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuEnemy.cpp` 121-129.
- `MenuEnemy::render` (fill length and labels): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuEnemy.cpp` 131 to the end of the file (147-149, 173-197).
- Hazard last-hit source: `/mnt/frankendom-donors/flareteam-flare-engine/src/HazardManager.cpp` 118-135 (130-131).
- Timer: `/mnt/frankendom-donors/flareteam-flare-engine/src/Utils.cpp` 212-240.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sticky lock on the last hit, released after a timed window, with nearest fallback | Window 10 s by default (theirs, MenuEnemy.cpp 51); overridable per mod (84) |
| Window measured in logic steps, so it survives a slow frame rate | Steps per second = max fps, default 60 (theirs, Settings.cpp 84; main.cpp 195) |
| Bar fill is value / max times fill width, truncated | Fill width defaults to the bar_pos width (theirs, MenuEnemy.cpp 95) |
| A nearly dead foe still shows a sliver | Minimum 1 px while hp > 0 (theirs, MenuEnemy.cpp 148-149) |
| Nearest foe inside the interaction radius | `eset->misc.interact_range` (theirs, GameStatePlay.cpp 175; value (not read)) |
| Last-hit source excludes beacon powers | Beacon exclusion (theirs, HazardManager.cpp 130) |
| Dead foe label | "Dead" for lifeforms, "Destroyed" otherwise (theirs, MenuEnemy.cpp 196-197) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: tick the window, keep the locked last-hit foe while the window runs and it lives, take the last hit, else the nearest foe; the mouse path uses the last hit once, then the cursor. It omits the corpse target for dead foes under the cursor, the beacon exclusion (the sketch assumes `onHit` is called only for non-beacon hits), the hazard and power code, the interaction-range filter (the caller passes `nearestInRange`), the frame's labels and fade, and the MenuManager tick order. It changes one thing on purpose: `onHit` refreshes the window when the locked foe is hit again, because the donor's early return skips the refresh (see section 6). The caller computes the nearest foe on every step, because the donor's early return also skips the nearest scan (219-224).

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const LOGIC_STEPS_PER_SECOND = 60;             // donor default max fps; timers count logic steps
const WINDOW_STEPS = 10 * LOGIC_STEPS_PER_SECOND;  // donor default: 10 s target window

interface Foe {
  id: number;
  hp: number;
  hpMax: number;
  alive: boolean;
}

interface Focus {
  target: Foe | null;     // the foe the HUD frame shows
  lastHit: Foe | null;    // last foe hit by a power (donor: hazards->last_enemy)
  windowLeft: number;     // logic steps left on the target window (donor: menu timeout)
}

// Called on each hit. FIX: the donor only refreshes the window when a target is newly chosen,
// so re-hitting the locked target did not extend it. Here a hit on the locked foe refreshes it.
function onHit(f: Focus, foe: Foe): void {
  f.lastHit = foe;
  if (f.target === foe) f.windowLeft = WINDOW_STEPS;
}

// Keyboard or gamepad path, once per logic step. Donor order: tick the window, then
// keep the locked last-hit target while its window runs and it lives; else take the
// last hit; else the nearest foe in range.
function stepKeyboard(f: Focus, nearestInRange: Foe | null): void {
  if (f.windowLeft > 0) f.windowLeft -= 1;

  if (f.lastHit) {
    if (f.target === f.lastHit) {
      if (f.windowLeft > 0 && f.lastHit.hp > 0) return;   // sticky: keep the lock
      f.lastHit = null;                                  // window over or foe dead: drop it
    }
    f.target = f.lastHit;
  } else {
    f.target = nearestInRange;
  }
  if (f.target) f.windowLeft = WINDOW_STEPS;
}

// Mouse path, once per logic step. The last hit is used once, then the cursor decides.
function stepMouse(f: Focus, underCursor: Foe | null): void {
  if (f.windowLeft > 0) f.windowLeft -= 1;
  if (f.lastHit) {
    f.target = f.lastHit;
    f.lastHit = null;
  } else {
    f.target = underCursor;
  }
  if (f.target) f.windowLeft = WINDOW_STEPS;
}

// Frame HUD bar: length = hp * fill width / max, truncated; at least 1 px while hp > 0.
function hpBarLengthPx(hp: number, hpMax: number, fillWidthPx: number): number {
  if (hpMax === 0) return 0;
  let len = Math.trunc((hp * fillWidthPx) / hpMax);
  if (len === 0 && hp > 0) len = 1;
  return Math.max(0, len);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/flare-target.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/hud.ts` (client target frame: HP bar length, Dead/Destroyed label, frame shown while the engine's target is set). The lock rule (last hit, window, nearest fallback) is engine target selection, so it sits with the engine's target logic, not in the HUD. Parity-checklist row 14 (HUD).
- today: not checked (Frankendom HUD and target files not opened for this note).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: client view of engine state (HUD is client-only; the frame reads the engine's target); one engine (the lock is engine state).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect (window not refreshed by hits): the early return at 167-168 skips the window reset at 197. Hitting the locked foe again does not extend its window, so the lock ends 10 s after it was first chosen, even while it is being hit. fix: refresh the window in the hit path (`onHit` in the sketch).
- Defect (nearest value cleared on sticky steps): `pc->stats.target_nearest` and `target_nearest_corpse` are cleared at the top (155-158). The sticky return skips the nearest scan (219-224), so these stay NULL on every sticky step. Impact on powers that read `target_nearest` is not traced (not read). fix: compute the nearest foe before the early return.
- Design question (not a defect I can prove): expiry releases the lock for one step. At expiry the focus becomes nothing (172), then the nearest foe is re-locked on the next step (175, 197) with a fresh window. If the same foe is still nearest, the 10 s window is a soft release, not a hard drop. Decide whether Frankendom wants a hard drop.
- Design question (mouse): with a mouse the last hit is used once (180-181), so the frame and the cursor disagree after one step. Frankendom's pointer and touch targeting must decide this with the touch UX (not read in this donor).
- Frankendom rulings: the hit that sets the lock must be the server's verified hit, never a client prediction. Kills and hits stay server-verified; the lock is a read of the engine's last verified hit.
- MAX_ATTACKERS = 3: with several attackers, a last-hit lock can swap targets on every hit. The donor has no hate list; Frankendom's engine hate list should choose the target and the frame should show that, not the last hit.
- Clock: the window is in fixed logic steps, which matches Frankendom's fixed tick. Keep the window in engine ticks, not wall time.
- Readability at 375 px: the 1 px minimum keeps a nearly dead foe visible (good). A fixed 10 s window is long for a fast duel; Frankendom should make the window a data field per fight type.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: client view of engine state (HUD client-only); the lock is engine target state read by the frame.

Best transferable idea: a target lock that sticks to the last foe you hit for a fixed window (10 s by default), refreshed on each hit, and falls back to the nearest foe in range when it lapses; the frame bar keeps a 1 px minimum so a nearly dead foe stays visible.
Decision (proposed): adapt — take the sticky last-hit lock with a timed window and nearest fallback, refresh the window on each hit (the donor does not), keep the 1 px bar minimum; leave the mouse one-shot rule for the touch and pointer decision.
Acceptance: keyboard or gamepad in a 3-foe fight: hit foe A at 0 s and again at 9 s; A stays on the frame until 19 s, then the nearest foe in range takes the frame; a server test asserts the engine target is A at 18.9 s and the nearest foe at 19.0 s.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN. No errors found.
- Missed (minor): checkNPCFocus (GameStatePlay.cpp 230-256, read but unused) overwrites menu->enemy and resets the same timeout in the same step when no enemy is focused or the enemy is an ally (233-246); matters for who owns the frame after the sticky early return.
- Unverified: placeholder count 72 not reproduced by a one-line grep (70 single-line matches; multi-line msgids can account for the rest).
