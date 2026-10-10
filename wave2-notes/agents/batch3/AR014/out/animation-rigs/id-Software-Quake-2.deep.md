# id-Software-Quake-2 (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_monster.c` | Licence: GPL-2.0-or-later (per file header: "either version 2 of the License, or (at your option) any later version"; the donor's `gnu.txt` is GPL v2 text) | C | symbol `M_MoveFrame`

Checked: Read in full: `M_MoveFrame` (g_monster.c 361-416) and `monster_think` (419-430; set as the think function at g_monster.c 666; `M_MoveFrame` has no other caller in game/, checked by grep). Read: move records and frame records (g_local.h 400-414, fields only), `FRAMETIME` (g_local.h 73), `AI_HOLD_FRAME` (g_local.h 134), `ai_move` (g_ai.c 92-95), the soldier attack table and move (m_soldier.c 559-574), the soldier pain code (m_soldier.c 409-451), the pain hook assignment (m_soldier.c 1217), the damage path that calls the pain hook (g_combat.c 495-526), `M_ReactToDamage` opening (g_combat.c 295-312, partial). At least three candidate files opened (g_monster.c, g_local.h, g_ai.c, g_combat.c, m_soldier.c). camera_scope: n/a (not a camera topic). Confidence: high on the stepper's control flow and the soldier pain numbers; medium on the sketch's equivalence for the donor's null-frame cases (the donor's `aifunc`/`thinkfunc` null checks are kept, the bounds are not). Not read: `M_CheckGround`, `M_CatagorizePosition`, `M_WorldEffects`, `M_SetEffects` (called after the stepper in `monster_think`), `ai_charge` and `ai_stand` bodies, `soldier_fire` (m_soldier.c 462-527), the rest of `M_ReactToDamage`, the value of `MODEL_SCALE`, and how `s.frame` is sent to clients. Client-side blending between frames (`GL_DrawAliasFrameLerp`, ref_gl/gl_mesh.c 90-150, and `backlerp` from `cl.lerpfrac`, client/cl_ents.c 1448-1461) was seen by grep only and is not part of this note.

## 1. Mechanism

- A monster's animation is a state machine of moves. A move is a frame range (`firstframe` to `lastframe`), a table of one record per frame, and an optional end hook (`mmove_t` and `mframe_t`, g_local.h 401-414). A frame record holds an `aifunc` (motion, called with a distance), a `dist` (authored distance for that frame), and a `thinkfunc` (an event that runs on that frame). The current move is `monsterinfo.currentmove`.
- One step is one call to `M_MoveFrame`, driven by `monster_think`. The step is scheduled `FRAMETIME` (0.1 s) ahead of the server clock `level.time` (g_monster.c 367; g_local.h 73). So a monster's animation runs at 10 steps per second of server time, whatever the render rate.
- Order of steps inside one call (g_monster.c 366-415):
  (a) read the current move; schedule the next step at `level.time + FRAMETIME` (366-367).
  (b) If a frame has been queued (`monsterinfo.nextframe`) and it lies inside the current move, jump to it and clear the queue (369-373). Otherwise go to (c).
  (c) If the current frame is the move's last frame and the move has an end hook, run the end hook (376-380). The hook may switch the move, so the move is read again (383). If the monster is now dead, return at once (386-387).
  (d) If the frame is outside the move's range, clear the hold flag and jump to the move's first frame (391-395). Otherwise, unless the hold flag is set, advance one frame and wrap from the last frame to the first (398-402).
  (e) Index the frame table by `frame - firstframe` (407). Call `aifunc(self, dist * scale)`, or `aifunc(self, 0)` when the hold flag is set (408-412). Then call `thinkfunc` for that frame, if any (414-415).
- Consequences of that order, as written: if a new move's range contains the frame number the monster is already on, the move continues from that frame, not from its first frame (391-404). A queued frame jump is ignored (and kept) if it lies outside the current move (369). A hold flag stops the advance and zeroes the motion, but the frame's event still runs (410-415).
- The soldier's attack is a move whose table fires an event on one frame: `soldier_fire1` is the third of twelve entries (m_soldier.c 559-574), so the shot happens on that frame of the animation, and the table's end hook is `soldier_run` (574). The attack can also start part way through: `self->monsterinfo.nextframe = FRAME_attak102;` (556) queues the second frame.
- Pain (the hit-reaction path): damage is applied to health first (g_combat.c 495). If the target is a monster, it calls `M_ReactToDamage` (506-508), then calls its `pain` hook if the monster is not ducked and the damage is above zero (509-511). Nightmare skill sets a 5 s debounce after that call (513-514). The soldier sets `pain` to `soldier_pain` (m_soldier.c 1217).
- `soldier_pain` (409-451), in order: set the skin variant if health is under half of max (414-415); if inside the 3 s debounce window, switch from pain move 1-3 to pain move 4 when vertical velocity is above 100, otherwise do nothing (417-422); start the 3 s debounce (424); play a pain sound by skin variant (426-432); if vertical velocity is above 100, choose pain move 4 and return (434-438); on nightmare skill return with no pain move (440-441); otherwise one random roll picks pain move 1 below 0.33, move 2 below 0.66, or move 3 (443-450). Each pain move is a move record whose end hook is `soldier_run`, so the pain returns to the run cycle by the same move system (349, and the same pattern for the others).
- The AI motion is data, not code: `ai_move` applies the distance along the monster's yaw through `M_walkmove` (g_ai.c 92-94). The soldier walk table lists per-frame distances `3, 6, 2, 2, 2, 1` for its first six walk frames (m_soldier.c 232-237).

## 2. Key functions

- `M_MoveFrame`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_monster.c` 361-416. The stepper: schedule, queued jump, end hook, range and advance, per-frame motion and event.
- `monster_think`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_monster.c` 419-430 (calls `M_MoveFrame` at 421, then ground and effects calls that are not read).
- Records: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_local.h` 401-414 (`mframe_t`, `mmove_t`), `FRAMETIME` 73, `AI_HOLD_FRAME` 134.
- Pain choice: `/mnt/frankendom-donors/id-Software-Quake-2/game/m_soldier.c` 409-451 (`soldier_pain`).
- Pain call from damage: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_combat.c` 506-516.
- Attack table with the fire event: `/mnt/frankendom-donors/id-Software-Quake-2/game/m_soldier.c` 559-574.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed server step for a clip frame | 0.1 s per frame (theirs, g_local.h 73; scheduling g_monster.c 367). |
| Authored motion per frame, scaled per monster | `dist` per frame; scale `monsterinfo.scale`, value (not read, `MODEL_SCALE`). Soldier walk: 3, 6, 2, 2, 2, 1 (theirs, m_soldier.c 232-237). |
| An event on one frame of a move | Soldier attack fires on the third of 12 entries (theirs, m_soldier.c 563). |
| Queue a frame jump, cleared when used | Melee skips to frame attak102 (theirs, m_soldier.c 556). |
| Hold a frame: no advance, no motion, event still runs | Flag `AI_HOLD_FRAME` (theirs, g_local.h 134; used at g_monster.c 393, 398, 410-412). |
| Hit-reaction debounce | 3 s (theirs, m_soldier.c 424); 5 s in nightmare (theirs, g_combat.c 514). |
| Pain pick by one roll | Below 0.33, below 0.66, else (theirs, m_soldier.c 445-450). |
| Upward-velocity pain | Vertical velocity above 100 (theirs, m_soldier.c 434). |
| Skin variant at half health | `health < max_health / 2` (theirs, m_soldier.c 414). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: schedule the next step, take the queued jump only if it is inside the current move, otherwise run the end hook (and stop if dead), reset or advance the frame, then run the per-frame motion (zero while held) and the per-frame event. It omits the donor's ground and effects calls that run after the stepper in `monster_think`, the pain hook and the soldier's pain and attack moves, the sound calls, the skin variant, and the client-side blend. It keeps the null checks on the hooks but not the frame-table bounds checks. The donor's `level.time` is server time; the sketch takes it as `now`.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const FRAME_S = 0.1; // seconds per animation step (donor define, server time)

export interface Step {
  act?: (self: Mon, dist: number) => void; // per-frame motion/AI hook; dist is the authored root-motion distance, scaled
  dist: number;                             // authored distance for this frame
  onFrame?: (self: Mon) => void;            // per-frame event, e.g. the attack that fires on this frame
}

export interface Move {
  first: number;
  last: number;
  steps: Step[];               // one entry per frame from first to last
  end?: (self: Mon) => void;   // runs when the last frame is reached; may switch the move
}

export interface Mon {
  frame: number;
  move: Move;
  queued: number;   // requested frame inside the current move; 0 = none
  hold: boolean;    // hold the current frame (no advance, no motion)
  scale: number;    // per-monster scale on the distances
  dead: boolean;
}

// One animation step at server time `now`. Returns the time of the next step.
export function stepMove(m: Mon, now: number): number {
  const next = now + FRAME_S;
  let move = m.move;
  if (m.queued !== 0 && m.queued >= move.first && m.queued <= move.last) {
    m.frame = m.queued;
    m.queued = 0;
  } else {
    if (m.frame === move.last && move.end) {
      move.end(m);
      move = m.move;            // the end hook may have switched the move
      if (m.dead) return next;
    }
    if (m.frame < move.first || m.frame > move.last) {
      m.hold = false;
      m.frame = move.first;
    } else if (!m.hold) {
      m.frame++;
      if (m.frame > move.last) m.frame = move.first;
    }
  }
  const step = move.steps[m.frame - move.first];
  if (step.act) step.act(m, m.hold ? 0 : step.dist * m.scale);
  if (step.onFrame) step.onFrame(m);
  return next;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/creature-clips.ts` (new; engine-side, because the frame event is server state: a hit that lands on a frame is a duel step). Parity-checklist row 7 (creature actor/clips). Server tick sub-line: fixed step, input intake, per-tick NPC budget (post-K item 3 / row 18 sub-line). The stepper runs on the server tick, so its step size (FRAME_S) is a fixed rule of the engine, not per creature.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); rules 7-9 n/a

Best transferable idea: Put a creature's attack as a frame-indexed event inside its clip table, so the server applies the hit on the exact frame the data names and the timing is data, not a timer the client guesses.

Decision (proposed): adapt — the frame table, queued jump, hold flag and end hook are the right shape for server-owned creature clips, but the donor's pain roll and nightmare skip are gameplay choices we must make on the server with a seeded roll, and the donor's hooks are C functions that we must replace with a registry of named events read from the creature catalogue.

Acceptance: A server test runs one creature swing move on the server tick and asserts the hit is applied exactly once, on the frame the data names (frame 3 of 12 in the test data), never on a held frame, and that a second hit inside the 3 s pain debounce does not restart the pain move.

## 6. Gaps and risks

- The donor's frame events are C function pointers in a table. Ours must be data: the creature catalogue names an event per frame (for example "hit-window-open"), and the engine maps names to functions. Zones and catalogues stay data (rows 20-21).
- Step size is a fixed 0.1 s per frame in this donor (g_local.h 73). Our clips at other rates need either per-clip step data or an accumulator on the server tick; do not let the client decide the step.
- A move change keeps the current frame number when the new move's range contains it (g_monster.c 391-404). That is a hidden transition rule. If we keep it, write it down and test it; if not, reset to the new move's first frame.
- The pain roll is a random number on the monster's own state (m_soldier.c 443). On our server it must come from the seeded fight RNG, so the same swing gives the same result in a replay (the record and replay rule, row 19).
- Nightmare skill plays the pain sound before the skill check that skips the pain move (m_soldier.c 426-441). That is an inconsistency in the donor; we must pick one order and test it.
- The hold flag (AI_HOLD_FRAME) is how the donor pauses an attack on a frame: no advance, no motion, but the event still runs. Ours must say which of those a hold changes; a hold that still fires the hit is a bug risk.
- MAX_ATTACKERS = 3 is not visible in this path. The donor has no attacker cap in the code read here (not read in full). The cap has to live in the engine's hate and target logic, not in the move table.
- The donor's `M_ReactToDamage` (g_combat.c 295-312) decides who the monster is angry at. Only its opening was read; the rest is not read, so the aggro rule is not described here (row 2 / AI brain).
- Not read: the ground and effects calls after the stepper, `ai_charge`, `soldier_fire`, the monster scale value, how `s.frame` is sent to the client, and the client blend (see Checked).
- The file is GPL: clean-room only. The sketch is written from the mechanism.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); rules 7-9 n/a
