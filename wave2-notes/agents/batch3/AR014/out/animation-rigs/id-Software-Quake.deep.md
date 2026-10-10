# id-Software-Quake (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/r_alias.c` | Licence: GPL-2.0-or-later (per file header: "either version 2 of the License, or (at your option) any later version"; the donor's `gnu.txt` is GPL v2 text) | C (plus QuakeC in `qw-qc/player.qc`) | symbol `R_AliasSetupFrame`

Checked: Read in full: `R_AliasSetupFrame` (r_alias.c 652-695) and its one call site in `R_AliasDrawModel` (r_alias.c 722; grep found no other call in WinQuake). Read: `Mod_LoadAliasGroup` interval loop (model.c 1283-1320; the frame-copy loop after 1327 not read), `cl_parse.c` 370-395 (where `syncbase` is set), `modelgen.h` 50-125 (types), GL path `R_SetupAliasFrame` (gl_rmain.c 410-436) and `Mod_LoadAliasGroup` (gl_model.c 1288-1320), sprite lookup `R_GetSpriteFrame` (gl_rmain.c 150-188; r_sprite.c 266 by grep only), QuakeC walk cycle `player.qc` 118-165. At least three candidates opened for the cell (the hint file `spritegn.h` is the sprite file format header and holds only the struct; the alias code is in r_alias.c). camera_scope: n/a (not a camera topic). Confidence: high on the control flow of the software path; medium on the reading that stored interval values are running end times (inferred from how the reader uses them; the file writer is not in this donor, not read). Not read: the file writer, the `cl.time` setup, `CL_LerpPoint` (cl_main.c 385, seen by grep only; it is for entity movement, not poses), the skin-group path `R_AliasSetupSkin` beyond its header and interval lines (r_alias.c 558-600, grep only), and any monster QuakeC (not in qw-qc).

## 1. Mechanism

- A model has frames. Each entity carries one `frame` number, set by game code (the server, through QuakeC, or the client for local entities). A frame is either a single pose or a group of poses, where each pose in a group has its own duration (`ALIAS_SINGLE` vs `ALIAS_GROUP`, modelgen.h 55).
- Single pose: the pose is used directly, no timing (r_alias.c 666-670).
- Group: the engine picks one pose from the group by time, every time the model is drawn. Order of steps (r_alias.c 673-694):
  (a) `time = cl.time + syncbase` (679). The clock is the client clock, plus a fixed per-entity offset.
  (b) cycle length = the last stored interval value (677).
  (c) wrap into one cycle: `targettime = time - floor(time / cycle) * cycle` (685; the code uses an `(int)` cast on a positive time, the same thing).
  (d) scan the slots 0 to n-2 for the first stored value greater than `targettime` (687-691). If none, the last slot is used.
  (e) draw that slot's pose (693-694). There is no blend between poses in this path.
- The pick happens inside `R_AliasDrawModel`, after skin setup, transform and lighting (719-722), once per drawn entity per frame. Nothing is stored between frames.
- Phase, set once per entity when its model is assigned (cl_parse.c 380-391): if the model's sync type is `ST_RAND` (torches and similar), `syncbase` is random in 0 to 1 seconds; if it is `ST_SYNC`, `syncbase` is 0. So random-sync entities start at a random point in their loop, and sync entities share one clock phase.
- Reader convention (inferred): the stored interval values are read as running end times inside one cycle. Evidence: the cycle is the last stored value (677), and the scan compares each stored value to a time inside the cycle (689). A list of per-pose durations would produce a wrong cycle length, so the reader cannot be using durations. The writer is not in this donor (not read), so this is the reader's convention, not a checked file format.
- Tick: none. This is per draw, on client time. There is no fixed step and no accumulator.
- The GL build differs (gl_rmain.c 415-436, gl_model.c 1311-1313): the loader keeps only the first interval of each group, the pose is `firstpose + (int)(cl.time / interval) % numposes`, and no `syncbase` is added. So the GL build plays every group at one uniform speed with no per-pose timing and no random phase. Which build the donor's shipped game used is not checked here.
- QuakeC side (player.qc): the walk and stand cycles are chosen by game code that sets `self.frame` from a counter (`self.frame = $stand1 + self.walkframe`, 137, and `self.walkframe = self.walkframe + 1`, 139). The next step is chosen by a frame-function chain (`player_run =[ $rockrun1, player_run ]`, 142): each frame names the next think function. So the game state machine sets which group is active, and the engine plays it by time.

## 2. Key functions

- `R_AliasSetupFrame`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/r_alias.c` 652-695. Single-pose early return (666-670), group time wrap (677-685), slot scan (687-691), pose pick (693-694).
- `R_AliasDrawModel` (call site only): `/mnt/frankendom-donors/id-Software-Quake/WinQuake/r_alias.c` 722 (`R_AliasSetupFrame ();`, after skin, transform and lighting).
- Phase setup: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/cl_parse.c` 380-391 (`syncbase` random for `ST_RAND` at 388, zero otherwise at 390).
- Loader, group intervals: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/model.c` 1317-1325 (copies the stored values unchanged at 1319; rejects non-positive values at 1320-1321).
- GL variant: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/gl_rmain.c` 415-436 (single interval, uniform pose loop at 431-432). Loader: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/gl_model.c` 1311-1313.
- Sprite copy of the same wrap: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/r_sprite.c` 266-270 (grep line; the caller not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clip playback by time: wrap a shared clock into one cycle, show the first slot whose end is after it, else the last | None. Cycle length is the last stored value (677). |
| Per-actor phase so identical loops do not line up | Random phase 0 to 1 s, from `(rand()&0x7fff) / 0x7fff` (theirs, cl_parse.c 388). Zero for sync models (390). |
| Sync type per model: shared phase or random phase | `ST_SYNC=0`, `ST_RAND` (theirs, modelgen.h 52). |
| Per-slot timing from the asset | Every stored value must be above 0 (theirs, model.c 1320). |
| Single-pose shortcut (no timing) | Returns at once (666-670). |
| Uniform playback (GL build) | Pose = `firstpose + (int)(cl.time / interval) % numposes`, one interval per group (theirs, gl_rmain.c 432; gl_model.c 1311). No phase. |

## 4. TypeScript sketch

simplified: the sketch keeps the software path: the cycle is the last end time, the clock is wrapped, the first slot whose end is after the wrapped time is used, and a single-pose clip returns at once. It omits the GL build's uniform interval, the skin-group timing, the `(int)` cast and the donor's bounds check on the frame index, and the loader's positive-interval check. It also drops the donor's behaviour for a negative clock (the sketch's `%` leaves a negative `t` that still maps to the first slot, which matches the donor's result but is not checked against it). `actorPhase` is a separate helper and is not called from `poseAt`. The phase is in seconds and is added to the clock, not a fraction of the cycle, as in the donor.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface PoseClip {
  poses: number[];  // pose ids, one per slot of the clip group
  ends: number[];   // running end time of each slot inside one cycle, seconds; ends[last] = cycle length
}

// Pose to show at client clock `clockS` for an actor whose fixed phase is `phaseS` (seconds).
export function poseAt(clip: PoseClip, clockS: number, phaseS: number): number {
  const n = clip.poses.length;
  if (n === 1) return clip.poses[0];
  const cycle = clip.ends[n - 1];
  const t = (clockS + phaseS) % cycle;    // wrap into one cycle
  let i = 0;
  while (i < n - 1 && clip.ends[i] <= t) i++;  // first slot whose end is after t; else the last slot
  return clip.poses[i];
}

// Per-actor phase, in seconds, added to the shared client clock once when the actor is created.
export function actorPhase(syncRandom: boolean, rng: () => number): number {
  return syncRandom ? rng() : 0;  // donor: (rand() & 0x7fff) / 0x7fff, so 0 to 1 inclusive
}

export {};
```

## 5. Lands in

- TARGET `src/fight/creature-anim.ts` (new; client-only presentation). It maps the clip id and start time that the engine sends for a creature to a pose, using the client clock plus a per-creature phase. Note: the rulings put the engine in `src/fight`, and animation is client presentation, so if the Lead wants client code kept out of `src/fight`, move this file to the Pit client tree. This is a decision for the Lead, not made here.
- Parity-checklist row: 7 (creature actor/clips). The clip durations are creature catalogue data (row 21), not engine code.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); rules 7-9 n/a

Best transferable idea: Let the client derive a looping creature pose from one shared clock plus a per-creature random phase, so the server sends only "which clip, from when" and idle creatures do not move in lockstep.

Decision (proposed): adapt — the split is right for us (timing is client-only, and the game code sets which clip plays), but in Frankendom the hit window and the kill must come from server time and the same clip data, never from the pose the client draws, so we take the shape and not the client-only hit story.

Acceptance: In one zone with 12 idle creatures of one type, the idle poses are visibly out of step (phase spread up to 1 s); and a server test with a client clock 300 ms ahead or behind still gives the same hit result for the same swing, because the window is computed from clip data and server time.

## 6. Gaps and risks

- Client-only clock: two clients can show different poses at the same moment. That is fine for idle looks. It is not fine for hit windows, which must be server-verified (Frankendom ruling). The donor has no hit windows here, so nothing in it covers this; we must write that rule ourselves.
- The donor's game code sets the group index and the engine plays it. That matches our server-authoritative split only if the server sends the clip id and start time, not a pose per tick. Do not send poses per tick.
- Phase is random per actor at model creation (cl_parse.c 388). Pit actors are a fixed arena and may not want it; apply it only to zone creature idle loops, and make it a data flag per creature type (ST_RAND vs ST_SYNC in the donor).
- No blending: poses snap from one slot to the next. A hit-reaction or a blend between walk and run needs something this donor does not show (not read in full).
- The two builds disagree: the software path uses per-slot timing and random phase (r_alias.c), the GL path uses one interval and no phase (gl_rmain.c 431-432). Frankendom must pick one timing; the software path is the one with per-slot durations.
- The reader's cumulative-end-time convention is inferred (see Mechanism). Before we write durations into our own catalogue, convert them to running end times on load and test the wrap at a slot boundary.
- The file is GPL: clean-room only. The sketch is written from the mechanism.
- Not read: the file writer (not in this donor), monster QuakeC (not in qw-qc), the skin-group timing beyond its header.
- Aside, not part of the mechanism: gl_model.c 1306 copies `bboxmax` into `bboxmin` (the loop writes the min field from the max field), a donor bug in the GL loader's bounding box. Not used here.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: addendum anti-strictness rule 2 (judge the idea, not the genre); rules 7-9 n/a
