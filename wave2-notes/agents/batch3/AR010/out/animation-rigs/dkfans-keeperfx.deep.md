# dkfans-keeperfx (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_graphics.c` | Licence: GPL-2.0-or-later (source headers: "either version 2 of the License, or (at your option) any later version"; the `LICENSE` file is version 2, June 1991) | C | symbol `update_creature_graphic_anim`

Checked: `creature_graphics.c` 376-600 read in full (clip update 394-421, clip choice 460-572, tint and set 575-600; rendering flags 423-458 read but not part of the mechanism). Frame advance: `thing_list.c` 1015-1048 read in full. Clip reset and phase: `thing_data.c` 299-339 read in full. Distance: `thing_creature.c` `move_creature` 2832-2880 read in part and 2930-2968 read; the collision and slab code between (2880-2930) was not read. `move_creature` has no return between 2832 and 2968 except the final `return 1` (2969), so the distance is stored on every call (grep of that range). Callers: `move_creature` at `thing_creature.c` 6612 and `set_creature_graphic` at 6637, both inside `update_creature` (entry 6498; the rest of that function was not read). `update_thing_animation` is called from `thing_list.c` 1095 and 1342 (list walks) and 3556 (the enclosing function was not read in full). Netcode checksum: `net_checksums.c` 60-75 read; the function's name was not checked. Not read: the instance clips (`creature_instance_info_get`, training and torture), `thing_touching_floor`, the piss and chicken-release effects beyond their branch lines, the sprite table. Readers of `distance_to_destination` other than `creature_graphics.c` were not searched; only its writer (`thing_creature.c` 2967) was found by grep. Confidence: high on the clip order, the speed formula and the phase rules. camera_scope: not applicable (animation cell).

## 1. Mechanism

A creature's clip and playback speed are chosen once per creature turn from its state, in a fixed priority order. The walking playback speed is the signed distance the creature moved this turn, divided by a per-creature stride constant. The phase is an 8.8 fixed-point counter advanced by that speed each turn.

Per-turn sequence:
1. `update_creature` (`thing_creature.c` 6498) calls `move_creature` (6612). `move_creature` saves the start position (2835-2839). After the move it takes the 2D distance from that start to the new position (2961). The sign is positive when the move direction is within 90 degrees of the facing (2959), negative otherwise (2965). The result is stored in `distance_to_destination` (2967). Despite the name, this is the distance moved this turn, not the distance remaining.
2. `set_creature_graphic` (`creature_graphics.c` 595-598, called at `thing_creature.c` 6637) resets the rendering flags (423-458), then calls `update_creature_graphic_anim`.
3. `update_creature_graphic_anim` picks the clip. The first match wins:
   a. Size change pending: clear the flag and make no clip choice this turn (468-470).
   b. Chicken spell: this overrides every state below (476; the chicken branch starts at 549). Stand or airborne uses fixed sprite 820 at speed 256 (554). Walking uses sprite 819 at speed 256 if fixed speed, otherwise the distance speed (562, 565-568).
   c. Creature has an instance (training, torture and similar): the instance clip at the instance step speed (478-488). Not read further.
   d. Frozen on hit, dying, or frozen by a spell: GotHit at 256 (494-496).
   e. Chicken release flag: Stand at 256 (498-500). Not in the sketch.
   f. Slapped: GotSlapped at 256 (502-504).
   g. Roar at 128 (506-508). Piss at 128 (510-512). Not in the sketch.
   h. Unconscious: DropDead at 64, with the animate-once flag (514-517).
   i. Asleep: Sleep at 128 (519-522).
   j. Moved zero this turn: Stand at `walking_anim_speed` (524-526).
   k. Airborne: Stand at the distance speed (528-531).
   l. Dragged: Drag at the distance speed (533-536).
   m. Fixed-speed creature: Ambulate at 256 (538-540).
   n. Otherwise: Ambulate at the distance speed (542-547).
   Distance speed = (distance << 8) / (walking_anim_speed + 1) (530, 543). The default `walking_anim_speed` is 32 (`config_creature.c` 496), so one tick of movement d gives about d/33 frames.
4. `update_creature_anim` (394-409) applies the pick. If the clip id changed, it calls `set_thing_draw` with the new speed and start frame 0 (400), which resets the phase to frame 0 (`thing_data.c` 338). If only the speed changed, it stores the speed and keeps the phase (403-406).
5. `update_thing_animation` (`thing_list.c` 1015-1046) advances the phase: time += speed (1028). A cycle is max_frames x 256. While the time is negative it adds the cycle, so a backward walk plays the clip in reverse (1031-1034). Past the end, an animate-once clip holds its last frame and sets speed to 0 (1037-1041); a looping clip wraps by modulo (1043). The frame is time >> 8 (1046).
6. The phase (`anim_speed` and `anim_time`) is part of the netcode state checksum (`net_checksums.c` 71-72).

## 2. Key functions

- `update_creature_graphic_anim`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_graphics.c` 460-572. The whole clip choice, steps 3a to 3n.
- `update_creature_anim`: same file, 394-409. `update_creature_animation_by_sprite`: 411-421.
- `set_thing_draw` and `set_thing_animation`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_data.c` 299-339 (phase reset at 338).
- `update_thing_animation`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_list.c` 1015-1048 (the phase advance).
- `move_creature`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` 2832-2970 (the distance and its sign; 2880-2930 not read).
- Caller chain: `update_creature` 6498; `move_creature` at 6612; `set_creature_graphic` at 6637.
- Config: `/mnt/frankendom-donors/dkfans-keeperfx/src/config_creature.c` 496-497 (defaults).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Clip picked from a fixed priority list; the first match wins | order at `creature_graphics.c` 476-547 |
| Walk playback rate proportional to the distance moved this turn, divided by a per-creature stride constant | divisor `walking_anim_speed` + 1; default 32 (`config_creature.c` 496), so about d/33 frames per tick |
| Stopped creature holds Stand at the stride constant itself | 32 in 8.8 = 1/8 frame per tick |
| Fixed-rate walk for creatures that should not scale | 256 = one frame per tick; `fixed_anim_speed` default false (497) |
| Hit and slap reactions play at one frame per tick | 256 (496, 504) |
| Roar and sleep play at half a frame per tick | 128 (508, 522) |
| Drop dead plays at a quarter frame per tick and holds its last frame | 64 (516), animate-once (517) |
| Backward movement gives a negative speed, so the clip plays in reverse | negative distance (2965) |
| Chicken clips are fixed sprite ids | 819 (562) and 820 (554) |

Distances are mappos units; the scale was not converted or checked.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the states it covers (hit, slap, roar, unconscious, asleep, still, airborne, drag, fixed speed, walk) and the chicken override first. It omits the instance clips (not read), the piss and chicken-release states, the rendering flags, the tint, the `set_thing_draw` start-frame options (the sketch always starts at 0, which is what the update path passes), and the fallback assignment at 544-547 (a no-op for normal speeds). Clip names replace the sprite ids, and the sketch takes the frame count as a callback instead of reading the sprite table.

```ts
// Licence: GPL-2.0-or-later (donor headers; LICENSE file is version 2). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Clip = 'stand' | 'walk' | 'drag' | 'hitReact' | 'slapped' | 'roar' | 'sleep' | 'dropDead' | 'chickenStand' | 'chickenWalk';

export interface Body {
  sizeChanging: boolean;   // a size change is pending: no clip choice this tick
  chicken: boolean;        // chicken spell: overrides the other states
  hitReacting: boolean;    // frozen on hit, dying, or frozen by a spell
  slapped: boolean;
  roaring: boolean;
  unconscious: boolean;
  asleep: boolean;
  grounded: boolean;       // touching the floor
  dragged: boolean;
  moveDist: number;        // signed distance moved this tick (negative = moved backward)
}

export interface Pick { clip: Clip; speed: number; animateOnce: boolean; }

// Speeds are 8.8 fixed point: 256 = one frame per tick.
// Returns null when the donor would make no clip choice this tick.
export function pickClip(b: Body, walkDivisor: number, fixedSpeed: boolean): Pick | null {
  const distSpeed = Math.trunc((b.moveDist * 256) / (walkDivisor + 1));
  if (b.sizeChanging) return null;
  if (b.chicken) {
    if (b.moveDist === 0 || !b.grounded) return { clip: 'chickenStand', speed: 256, animateOnce: false };
    return { clip: 'chickenWalk', speed: fixedSpeed ? 256 : distSpeed, animateOnce: false };
  }
  if (b.hitReacting) return { clip: 'hitReact', speed: 256, animateOnce: false };
  if (b.slapped) return { clip: 'slapped', speed: 256, animateOnce: false };
  if (b.roaring) return { clip: 'roar', speed: 128, animateOnce: false };
  if (b.unconscious) return { clip: 'dropDead', speed: 64, animateOnce: true };
  if (b.asleep) return { clip: 'sleep', speed: 128, animateOnce: false };
  if (b.moveDist === 0) return { clip: 'stand', speed: walkDivisor, animateOnce: false };
  if (!b.grounded) return { clip: 'stand', speed: distSpeed, animateOnce: false };
  if (b.dragged) return { clip: 'drag', speed: distSpeed, animateOnce: false };
  if (fixedSpeed) return { clip: 'walk', speed: 256, animateOnce: false };
  return { clip: 'walk', speed: distSpeed, animateOnce: false };
}

export interface Anim { clip: Clip | null; frames: number; time: number; speed: number; animateOnce: boolean; }

// A clip change restarts the phase at frame 0; a speed-only change keeps the phase.
export function applyPick(a: Anim, p: Pick, framesOf: (c: Clip) => number): void {
  if (p.clip !== a.clip) {
    a.clip = p.clip;
    a.frames = framesOf(p.clip);
    a.time = 0;
  }
  a.speed = p.speed;
  a.animateOnce = p.animateOnce;
}

// One tick of playback. Returns the current frame index.
export function advance(a: Anim): number {
  if (a.speed !== 0 && a.frames !== 0) {
    a.time += a.speed;
    const cycle = a.frames * 256;
    while (a.time < 0) a.time += cycle;            // a backward walk wraps the cycle the other way
    if (a.time > cycle - 1) {
      if (a.animateOnce) { a.speed = 0; a.time = cycle - 1; }   // hold the last frame
      else a.time %= cycle;
    }
  }
  return a.time >> 8;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/rig/clip-select.ts` (proposed path, not checked against the repo). Client-only: the pick and the phase never reach server state. Parity-checklist row 7 (creature actor/clips). The hero would use the same selector under row 6.
- today: none. The Frankendom creature clip logic was not checked against the repo.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only; shape only)
- Brief rule served: 1 (one combat core, two clients: the clip choice is a client-only pass, and the creature's movement it reads is engine state); rules 7-9 n/a

## 6. Gaps and risks

- Tick-bound rate. The donor takes the rate from the distance moved in the last server turn. A late or bunched network tick makes one turn's distance jump, and the walk cycle jumps with it. Frankendom should drive the client phase from ground speed in units per second, with the stride as a per-creature constant, so the rate does not depend on the tick.
- Phase in netcode state. The donor checksums `anim_speed` and `anim_time` (`net_checksums.c` 71-72), so the visual phase is part of the simulation checksum. Frankendom must keep the clip phase out of server-verified state. Kills are server-verified, and the phase cannot be an input to them.
- Reverse walk. A backward move plays the walk clip in reverse (2965, 1031-1034). That is a choice, not a rule. For Frankendom a retreat or leash should use its own clip, not reverse playback of the walk.
- Hard cuts. A clip change restarts at frame 0 (`thing_data.c` 338). There is no blending or transition. The clip-blending part of this topic is not covered by the donor.
- Priority list is hard-coded (476-547). Frankendom should keep the priority table as creature data, and refer to clips by name, not sprite id (the chicken clips 819 and 820 at 562 and 554 are magic numbers).
- Hit reaction is a clip swap at one frame per tick (496). Its length depends on the clip, not on a hit-stop. Hit stop belongs to row 10 (hit impact and hit stop), not to this clip choice.
- Zones as data: the stride constant and the clip speeds are per-creature config (`config_creature.c` 496-497), not zone data. Nothing in this mechanism depends on the zone.
- The donor's one-ledger, server-verified-kill and MAX_ATTACKERS = 3 rules do not touch this mechanism; it has no damage, loot or attacker count.

Best transferable idea: Pick a creature's clip from a fixed priority list of states, and drive the walk cycle's rate from the distance it actually moved, divided by a per-creature stride constant, so the feet match the ground speed.
Decision (proposed): adapt - keep the priority-list selector and the movement-driven rate as client-only creature clip logic (row 7), with a seconds-based phase driven by ground speed and a per-creature stride, no reverse walk, and no clip phase in server state.
Acceptance: Player sees: a creature walking at half its usual speed steps at half the cadence, a stopped creature holds its stand clip, and a death clip plays once and holds its last frame; a server test asserts the kill result is the same with the client clip phase changed.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only; shape only)
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a
