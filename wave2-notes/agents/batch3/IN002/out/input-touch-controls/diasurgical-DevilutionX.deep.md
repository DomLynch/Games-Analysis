# diasurgical-DevilutionX (input-touch-controls, cell 1)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/touch/gamepad.cpp` (+ `event_handlers.cpp`, `controller_motion.cpp`, `plrctrls.cpp`, `track.cpp`, `diablo.cpp`) | Licence: Sustainable Use License 1.0 (`LICENSE.md` line 1: "# Sustainable Use License"; a non-commercial use licence, not OSI open source) | C++ (SDL) | symbols `VirtualDirectionPad::UpdatePosition`, `FindMeleeTarget`, `FindRangedTarget`, `WalkInDir`, `RepeatPlayerAction`, `AxisDirectionRepeater::Get`

Checked: read in full: `gamepad.cpp` (pad layout, UpdatePosition, sectors), `event_handlers.cpp` 92-102 and 272-324 (pad finger handler), `controller_motion.cpp` 30-70, 125-150, 200-290 (deadzone, 8-way stick, merge of pad flags), `plrctrls.cpp` 84-170, 233-440 (lock-on, rotary distance, FindMeleeTarget), 495-512, 1720-1870, 1857-1880, 2178-2195, 2243-2290 (walk, stand, right stick, frame gate), `track.cpp` 1-116 (repeat), `player.h` 756-772 (CanChangeAction), `diablo.cpp` 222-241, 247-313, 925-936, 1523-1570, 3480-3506 (input and tap-to-move), `game_controls.cpp` 80-200 and 366-372, `axis_direction.h/.cpp`, `controller_motion.h` 20-32, `options.cpp` 248. Camera: not applicable (input cell). Confidence: high on the virtual pad, stick sectors and melee lock-on (read end to end). Not read: the game-step cadence (`nthread_has_500ms_passed`, diablo.cpp:925, not read so the single-player step rate is unknown), the `Direction` enum order (assumed circular in the sketch), SDL's finger-to-mouse conversion, `CheckNewPath` (player.cpp 1094-1200) for the walk-path follower, and the renderers.

Best transferable idea: a fixed-anchor thumb pad that clamps its knob to a radius and reads four overlapping 135-degree sectors (so a diagonal sets two flags), plus a ring-by-ring lock-on that picks the smallest facing turn in the first ring that holds a target.

Decision (proposed): adapt. Keep the ring-first lock-on and the overlapping stick sectors, add the dead zone the donor lacks on the pad path, and move the target pick into `src/fight/target.ts` so the engine owns many-on-one choice while the client only shows the suggestion. Licence is restricted, so this is shape only.

Acceptance: on a 375-wide phone, dragging the pad diagonally walks the hero diagonally, and holding a direction walks one tile per game step; a test asserts that the lock-on returns the hostile with the smallest facing turn in the first ring that holds one (non-talk first, as the donor orders them), and that an engage on a tile the lock-on did not offer is rejected by the server.

## 1. Mechanism

Input in this donor is read every frame and re-sent as commands, not queued as discrete presses. Five parts matter for Frankendom:

- **Virtual pad (touch).** A finger that goes down inside the pad circle is claimed and its id is stored (`event_handlers.cpp:294` contains test, `:298` stores the id). On every move, `UpdatePosition` sets the knob to the touch point, clamps it to the pad radius when outside (`gamepad.cpp:245-251`), takes `atan2` of the displacement with y negated for screen space (`:255`), and sets four flags from four sectors (`:257-260`). Lifting the finger calls `UpdatePosition` at the pad centre, which gives zero displacement and clears all flags (`event_handlers.cpp:309`, `gamepad.cpp:237-241`).
- **Sectors.** Each flag is a sector of half-width 3pi/8 (67.5 degrees) around its axis (`gamepad.cpp:32`, `:54`), so each sector is 135 degrees wide and neighbouring sectors overlap by 45 degrees. A stick at 45 degrees therefore sets UP and RIGHT together. No dead zone is applied on this path: any non-zero displacement sets flags.
- **Merge into the move direction.** `GetLeftStickOrDpadDirection` first reads the analog stick (8-way sectors with a 22.5-degree diagonal cutoff, `controller_motion.cpp:222-242`, and a 0.4 magnitude threshold, `controller_motion.h:29`). It then ORs in the padmapper or D-pad flags, then ORs in the virtual pad flags when the control mode is the virtual pad (`controller_motion.cpp:266-271`). The resolver takes UP over DOWN and LEFT over RIGHT (`:274-285`).
- **Walking.** Each game-logic step calls `Movement`, which calls `WalkInDir` with the merged direction (`plrctrls.cpp:1847-1854`). A held direction sends a `CMD_WALKXY` to the next tile (`:1769`). Diagonal steps are refused when both side tiles are solid (`IsPathBlocked`, `:1727`, checked at `:1763`). Releasing the direction sends a stop to the current tile (`:1746-1747`), only when the control mode is not keyboard-and-mouse, a walk path is queued and the player has no pending destination action.
- **Lock-on (melee and ranged).** While the controller or touch action is not active, the frame searches for a target. Melee uses a breadth-first search from the player over walkable tiles with a 25-step cap (`plrctrls.cpp:304-372`, cap at `:307`). The first ring that holds a targetable monster sets the cap to that ring (`:359`). Inside a ring the candidate with the smaller facing-turn count wins (`:352-357`). Ranged uses Euclidean distance first and facing turns as the tie-break (`:273-302`, distance at `:289`, `point.hpp:143`). While the action button is held, the target is kept only when the last action is not None, Attack or Spell (that is, a walk-to-target style action); it is then only invalidated when it dies or is hidden (`plrctrls.cpp:2250-2258`). For a held Attack or Spell action the search still runs every frame, so the lock-on can switch targets mid-hold. The whole function also returns early in keyboard-and-mouse or point-and-click mode (2245-2247).
- **Tap-to-move and hold-repeat.** A tap on empty ground sets `LastPlayerAction = Walk` and sends a walk to the cursor tile (`diablo.cpp:312-313`). A tap on a monster sends an attack by monster id (`:305`). While the button is held, `RepeatPlayerAction` re-sends the last action each frame, but only when the player's animation allows a change (`track.cpp:65`, `:79`). `CanChangeAction` accepts a new action from standing, or from an attack, ranged or spell animation once its action frame is reached, or on the last walk frame (`player.h:760-770`). So a press during a swing is not stored; the hold is re-read each frame and acted on when the animation allows.

Order per frame (`diablo.cpp:222-241`, `:1523-1568`): read the pad (`:228`), move the cursor (`:239`), run the target search (`:240`), repeat the held action (`:241`). Movement itself runs inside game logic (`:1568`), and `GameLogic` begins by sampling input again (`:1525`). Input is also sampled on frames that skip game logic (`:933`).

Stick-as-cursor (gamepad): the right stick moves the cursor by `rightStickX * elapsed_ms` divided by 2, with the sub-pixel remainder carried (`plrctrls.cpp:1870-1878`, call with divisor 2 at `:2191`), clamped to the screen (`:2192-2193`).

Menu repeat: `AxisDirectionRepeater` fires one direction at most every 200 ms and clears the opposite axis timestamp when a direction is pressed (`axis_direction.h:31`, `axis_direction.cpp:17-40`).

Stand-ground: a held virtual stand button makes `WalkInDir` stand in place (`plrctrls.cpp:507`, `:1757-1759`).

Layout: pad, buttons and margins scale to the short screen side by default (`gamepad.cpp:68`), or to physical inches when a DPI is known (`:94-99`: pad diameter one inch, button 0.3 inch, margin 0.25 inch; radius `:151`).

## 2. Key functions

- `VirtualDirectionPad::UpdatePosition`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/touch/gamepad.cpp` 232-261 (clamp, atan2, sectors).
- `VirtualDirectionPadEventHandler` finger claim and release: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/touch/event_handlers.cpp` 272-324.
- `GetLeftStickOrDpadDirection`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/controller_motion.cpp` 244-286 (merge and resolver). `GetAnalogStickDirection`: same file 210-242.
- `ScaleJoystickAxes` (radial dead zone): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/controller_motion.cpp` 35-70.
- `WalkInDir` and `Movement`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/plrctrls.cpp` 1743-1770 and 1847-1854.
- `FindMeleeTarget`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/plrctrls.cpp` 304-372. `FindRangedTarget`: same file 273-302. `GetRotaryDistance`: same file 112-126.
- `plrctrls_after_check_curs_move` (target hold rule): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/plrctrls.cpp` 2243-2290.
- `RepeatPlayerAction` and `RepeatWalk`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/track.cpp` 20-116.
- `CanChangeAction`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.h` 760-772.
- Tap handling `LeftMouseCmd`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp` 247-313.
- `AxisDirectionRepeater::Get`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/axis_direction.cpp` 1-45.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-anchor pad: knob clamps to radius, displacement gives the direction | Pad radius = size/2; size = min(w,h)/4 (`gamepad.cpp:68`) or 1 inch when DPI known (`:97`, `:151`) |
| Four overlapping sectors, diagonal sets two flags | Half-width 3pi/8 = 67.5 degrees (`gamepad.cpp:32`, `:54`); overlap 45 degrees (derived, not stated in code) |
| Analog 8-way with a diagonal cutoff | tan(22.5 degrees) = 0.41421356 (`controller_motion.cpp:223`); magnitude threshold 0.4 (`controller_motion.h:29`) |
| Radial dead zone then rescale to full range | Default 0.07 (`options.cpp:248`); rescale `(m - dz) / (max - dz)` (`controller_motion.cpp:58`) |
| Lock-on: BFS rings, stop at the first ring with a target | Step cap 25 (`plrctrls.cpp:307`), cap reset to found ring (`:359`) |
| Facing-turn tie-break: min(d, 8 - d) on 8 direction steps | Fold at 4 (`plrctrls.cpp:122-124`); direction order assumed circular (enum not read) |
| Euclidean nearest for ranged | No constant; `sqrt` of squared deltas (`point.hpp:143`) |
| Hold-repeat re-sends the last command each frame it is allowed | Attack action frame index `_pAFNum` (per animation data) (`player.h:764`) |
| Repeat interval for menu directions | 200 ms (`axis_direction.h:31`) |
| Cursor from a stick: speed times elapsed ms, sub-pixel carry | Divisor 2 (`plrctrls.cpp:2191`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the pad (clamp, angle, four overlapping sectors), the ring-first lock-on with the facing-turn tie-break and the donor's talk ordering, and the 200 ms direction repeat with the opposite-axis reset and the reset on release. It adds a dead zone to the pad (the donor has none on this path; the `deadZone` parameter defaults to 0 to match the donor). It omits the ranged branch, the walk-path follower (`CheckNewPath`, not read), the `-1` "standing on target" return, and the visibility and lit-tile checks (`CanTargetMonster`). It starts the repeat timestamps at -Infinity where the donor starts them at 0. The 8 direction values are assumed to be in circular order.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch of the mechanism, not a translation.
export interface Vec { x: number; y: number }
export interface Flags { up: boolean; down: boolean; left: boolean; right: boolean }
export interface Hostile { id: number; tile: Vec; canTalk: boolean }

const NO_FLAGS: Flags = { up: false, down: false, left: false, right: false };
const SECTOR_HALF = (3 * Math.PI) / 8; // each direction owns a 135-degree sector, so sectors overlap

// Virtual stick: anchor is fixed, the knob clamps to the pad radius, each direction is a sector.
// A diagonal sets two flags. deadZone is OUR addition (the donor path has none; default 0 = donor).
export function stickFlags(anchor: Vec, finger: Vec, radius: number, deadZone = 0): { flags: Flags; knob: Vec } {
  const dx = finger.x - anchor.x;
  const dy = finger.y - anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || dist < deadZone) return { flags: NO_FLAGS, knob: anchor };
  const k = dist > radius ? radius / dist : 1;
  const knob = { x: anchor.x + dx * k, y: anchor.y + dy * k };
  const a = Math.atan2(-dy, dx); // screen y grows downwards, so negate
  const within = (centre: number): boolean => {
    let d = Math.abs(a - centre);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d <= SECTOR_HALF;
  };
  return {
    flags: { up: within(Math.PI / 2), down: within(-Math.PI / 2), left: within(Math.PI), right: within(0) },
    knob,
  };
}

// Turns between two of 8 facing steps: min(d, 8 - d). Assumes the 8 direction values are in circular order.
export function turnsTo(facing: number, dir: number): number {
  const d = Math.abs(facing - dir);
  return Math.min(d, 8 - d);
}

// Lock-on: ring-by-ring walk from the player over walkable tiles. The first ring that holds a hostile
// ends the search (unless the hostile can talk). Inside that ring the smallest facing turn wins.
// As written in the donor, a non-talk target is kept over a talk-able one.
// simplified: finishes the whole ring instead of cutting the queue mid-ring; the donor's tie order may differ.
export function lockOn(
  start: Vec,
  facing: number,
  maxSteps: number,
  neighbours: (t: Vec) => Vec[],
  walkable: (t: Vec) => boolean,
  hostileAt: (t: Vec) => Hostile | undefined,
  dirTo: (from: Vec, to: Vec) => number,
): Hostile | undefined {
  const seen = new Set<string>([`${start.x},${start.y}`]);
  let ring: Vec[] = [start];
  let best: Hostile | undefined;
  let bestTurn = Infinity;
  for (let steps = 0; steps <= maxSteps && ring.length > 0; steps++) {
    const next: Vec[] = [];
    for (const t of ring) {
      for (const n of neighbours(t)) {
        const key = `${n.x},${n.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const h = hostileAt(n);
        if (h !== undefined) {
          const turn = turnsTo(facing, dirTo(start, h.tile));
          if (best !== undefined) {
            if (!best.canTalk && h.canTalk) continue;
            if (best.canTalk === h.canTalk && bestTurn < turn) continue;
          }
          best = h;
          bestTurn = turn;
          continue; // a hostile tile is not expanded
        }
        if (walkable(n)) next.push(n);
      }
    }
    if (best !== undefined && !best.canTalk) break;
    ring = next;
  }
  return best;
}

// Direction repeat: a direction fires at most once per interval. Pressing one axis clears the opposite
// timestamp, and releasing clears both. Donor default interval is 200 ms; donor starts timestamps at 0,
// we start at -Infinity so the first press after boot is never suppressed.
type Key = "left" | "right" | "up" | "down";
const OPPOSITE: Record<Key, Key> = { left: "right", right: "left", up: "down", down: "up" };

export class DirRepeat {
  private last: Record<Key, number> = { left: -Infinity, right: -Infinity, up: -Infinity, down: -Infinity };
  constructor(private minIntervalMs = 200) {}

  take(now: number, key: Key): boolean {
    this.last[OPPOSITE[key]] = -Infinity;
    if (now - this.last[key] < this.minIntervalMs) return false;
    this.last[key] = now;
    return true;
  }

  release(): void {
    this.last = { left: -Infinity, right: -Infinity, up: -Infinity, down: -Infinity };
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/IN002-DevilutionX-touch-lockon.ts`), exit 0.

## 5. Lands in

- TARGET `src/fight/target.ts` (new, engine): the many-on-one lock-on pick (ring-first, facing tie-break, talk ordering) and the hate-list hook. The client pad (`stickFlags`) lives in client input, not in `src/fight`.
- Parity-checklist row 5 (controls/input). Intake is the per-frame sample; the command is still sent per game step, so the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" applies to the intake part of row 18 / post-K item 3 (not read: the donor's step cadence).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: restricted; clean-room shape only; no line-by-line port)
- Brief rule served: rule 1 (one engine: the engage stays a server-checked state change, the client only proposes a target) and the input row 5.

## 6. Gaps and risks

- Licence is Sustainable Use License 1.0: a non-commercial use licence. Clean-room only. Nothing here may be copied into a shipped product line-by-line.
- Defect 1, pad has no dead zone on the touch path (`gamepad.cpp:237` only rejects an exact zero): one pixel of jitter sets a direction. Fix: the sketch's `deadZone` (default 0 here; we would set a real value, e.g. the stick default 0.07 of radius, and tune it on a phone).
- Defect 2, repeat timestamps start at 0 (`axis_direction.h:32-35`), so a press within 200 ms of the tick base can be suppressed. Fix: start at -Infinity (done in the sketch).
- Held-attack retarget: with a held Attack or Spell action the target is re-searched each frame (`plrctrls.cpp:2250-2258`), so a held attack can hop to a nearer or better-facing target. Keep it only if that feel is wanted; otherwise hold the target until it dies.
- Defect 3, the melee search rebuilds a full stack array `bool visited[MAXDUNX][MAXDUNY]` each frame (`plrctrls.cpp:306`) while idle. Fix: cache the target and re-search only when the player's tile changes or the target dies or hides.
- Talk ordering (`plrctrls.cpp:350-351`): as written, a non-talk target is kept over a talk-able one. Whether this is intended (combat before quest NPCs) was not read. Keep the rule and name it "combat target first".
- Frankendom gap: the donor chooses targets on the client and sends an id, while our rule says kills are server-verified. The server must re-check range, facing and line of sight on engage; the client pick is only a suggestion.
- Frankendom gap: the donor lock-on is one target. With MAX_ATTACKERS = 3 the engine must choose among attackers by hate, not by facing alone.
- Not read, so not claimed: the game-step cadence (`nthread_has_500ms_passed`, diablo.cpp:925), the `Direction` enum order, the walk-path follower (`CheckNewPath`, player.cpp 1094-1200), SDL's finger-to-mouse conversion, and the renderers.
- Landscape vs portrait: the donor sizes the pad by the short side (`gamepad.cpp:65`, `:68`) and anchors pads to the bottom corners. No separate portrait layout was found in the read code.
- Gesture specials: no swipe or double-tap gesture was found in the read code. The stand button is built with `toggles` set to true (`event_handlers.h:65`); the toggle handler body was not read.

Reuse tag: rewrite-from-idea
Brief rule served: 1 (one engine; lock-on pick in src/fight, engage server-verified) and row 5 (controls/input)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism says 'while the action button is held the target is not re-searched'; real plrctrls.cpp 2250-2258 only retains target when LastPlayerAction is not None/Attack/Spell (i.e. an AttackMonsterTarget-type action), otherwise the search still runs. WalkInDir stop-on-release (1746-1747) also needs ControlMode != KeyboardAndMouse and destAction == NONE (omitted). Verified OK: licence, sector half-width 3pi/8 (gamepad.cpp 30-55), clamp/atan2 (245-255), pad size min/4 and DPI values (65-99, 151), event_handlers claim/release (294-309), 8-way cutoff 0.41421356, threshold 0.4, deadzone 0.07, merge/priorities, FindMeleeTarget cap 25 and ring cap, GetRotaryDistance fold, CanChangeAction, repeater 200ms starting at 0, RepeatPlayerAction gate.
Missed: none

Fixed 2026-10-12 (Sonnet fixer): verified both errors on the donor. The target-hold rule at plrctrls.cpp 2250-2258 applies only when the last action is not None/Attack/Spell (held attack still re-searches); the stop-on-release at 1746-1747 needs a non-keyboard-and-mouse mode, a queued path and no destAction. Sketch unchanged.
