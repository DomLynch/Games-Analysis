# scummvm-scummvm (sound-music, cell 15)

Donor: /mnt/frankendom-donors/scummvm-scummvm/engines/icb/footstep.cpp | Licence: GPL-3 | C++ | symbol _game_session::UpdateFootstep

## 1. Mechanism

- Runs once per session update for each voxel-image character that is not held and whose big-mode is script (`session.cpp` 872-885; `UpdateFootstep()` is called at 883, after the idle manager and before `UpdateMegaFX`). The loop head that visits each character was not read.
- Inputs: the listener entity `L` position, the player position `player.log`, the current animation type `L->cur_anim_type` and frame `L->anim_pc` in the open animation `PXanim`, the footstep state on the mega (`M->footstep_weight`, `M->footstep_special`, `M->footstep_status`), and the floor the entity stands on (`L->owner_floor_rect`).
- Gate: the player must be within 20 m in X and Z (2000 units each, and a circle of the same radius in XZ) and within 2 m vertically. Outside the gate nothing happens and the status is not reset.
- Trigger: the current animation frame has a left or right foot-down flag. The status flag is a rising-edge latch: a step plays only when the previous check was not a step, so one foot plant gives one sound.
- Volume: `weight * 63 / 100`, quartered when crouched, halved when not running, and boosted by half when walking. The weight is set by script from 0 to 200.
- Sound pick (184-214): a special-mega sound if the flag is set (no fallback); otherwise the first floor-override match on the floor number, replaced by the ladder sound on the four ladder-climb animations, then the default sound if still none; nothing plays if all are zero.
- Output: one `RegisterSound(cur_id, ..., sfx, "foot", (int8)vol)` call per step. `RegisterSound` was not read; whether it reaches any server is unverified. Volume cannot overflow the int8 cast: the weight is capped at 200 (line 94), so `vol` is at most 126.

## 2. Key functions

- `_game_session::UpdateFootstep`, `/mnt/frankendom-donors/scummvm-scummvm/engines/icb/footstep.cpp`, lines 123-217. The whole mechanism: range gate, frame flag, rising-edge latch, volume, sound pick.
- `_game_session::fn_set_footstep_weight`, same file, lines 84-100. Script sets the 0 to 200 weight on the mega; out-of-range is a fatal error.
- `_game_session::fn_set_floor_footstep_sfx`, same file, lines 62-80. Fills the floor override table, plus the special and ladder sounds by name.
- `_game_session::fn_set_special_footstep`, same file, lines 104-121. Turns the special single-sound mode on or off; refuses on if no special sound is set.
- Caller: `_game_session` step loop, `/mnt/frankendom-donors/scummvm-scummvm/engines/icb/session.cpp`, lines 872-885 (call at 883).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Range gate in a circle on the ground plane plus a vertical band | 20 m horizontal, 2 m vertical (theirs, as `MIN_FOOTSTEP_DISTANCE_XZ` 2000 and `_Y` 200 units, lines 39-40) |
| Rising-edge latch on a per-frame foot-down flag, one sound per plant | none (the latch itself is generic) |
| Volume from a weight, scaled by a stance factor | weight 0-200 scale (line 94), `* 63 / 100` (167), crouch / 4 (171), not running / 2 (174), walk plus half (178) (all theirs) |
| Override table keyed by surface, fall back to default | `MAX_footstepFloors` cap (theirs); the special and ladder names are theirs |

## 4. TypeScript sketch

simplified: the ladder-sound override and the special single-sound mode are omitted (so the `climb` stance is unused); the donor's volume is integer arithmetic (the sketch computes in floats and truncates once at the end); the donor reads the foot flags from the open animation file at the entity's frame; gate and latch order are the same as the donor's.

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Clean-room: a foot-plant sound from the animation's foot-down flag, gated by distance, one sound per plant.
type Frame = { leftFoot: boolean; rightFoot: boolean };
type Stance = 'walk' | 'run' | 'crouch' | 'climb' | 'idle';
type Listener = { x: number; y: number; z: number; weight: number; crouched: boolean };

const RANGE_XZ = 20;   // metres, theirs in source units
const RANGE_Y = 2;     // metres, theirs

// Returns a sound key to play this tick, or null.
function footstepTick(
  l: Listener, player: { x: number; y: number; z: number },
  frame: Frame, stance: Stance, surface: string,
  state: { latched: boolean },
  surfaceSound: Map<string, string>, defaultSound: string,
): { sound: string; volume: number } | null {
  const dx = player.x - l.x, dy = player.y - l.y, dz = player.z - l.z;
  if (Math.abs(dy) >= RANGE_Y) return null;
  if (dx * dx + dz * dz >= RANGE_XZ * RANGE_XZ) return null;

  const plant = frame.leftFoot || frame.rightFoot;
  // rising edge: one sound per plant, latch cleared when the foot lifts
  if (state.latched && plant) return null;
  state.latched = plant;
  if (!plant) return null;

  let volume = (l.weight * 63) / 100;
  if (l.crouched) volume /= 4;
  else if (stance !== 'run') volume /= 2;
  if (stance === 'walk') volume *= 1.5;

  const sound = surfaceSound.get(surface) ?? defaultSound;
  return { sound, volume: Math.trunc(volume) };
}
```

## 5. Lands in

- Frankendom target: `src/fight/sound.ts` (footstep cue from animation foot-down flags; the flags come from the hero/creature animation data, rows 6 and 7).
- Parity-checklist row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-3, clean-room sketch only).
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks

- Each character is gated on its own distance to the player (`player.log`), not to a camera. Frankendom needs a listener rule (the fight camera, row 11) and a cue cap for up to MAX_ATTACKERS = 3 attackers.
- Reads the animation frame directly, so footstep timing depends on the animation data, not on the fight tick. Frankendom's fight engine has no per-frame foot flags.
- The rising-edge latch is kept on the mega. If the entity changes, the latch stays with the old state.
- `fn_set_footstep_weight` and `fn_set_special_footstep` call `Fatal_error` on bad input. Frankendom should not copy that pattern.
- Floor match is first-match on a floor number. Surface data is a table; Frankendom zone data would need a default on each surface.
- Volume is cast to a signed byte in the sound call; the 0-200 weight cap keeps it at 126 or less, so no overflow in the donor (a Frankendom weight without that cap would need a clamp).
- A missed step harms nothing: keep it a client cue that reads the one fight state and never feeds the fight engine or the server-verified record.
