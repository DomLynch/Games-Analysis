# veloren-veloren (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/states/basic_beam.rs` (state machine) with `common/systems/src/beam.rs` (per-tick hits) and `common/src/comp/ability.rs` (data to state) | Licence: GPL-3.0-or-later (`Cargo.toml` line 34 `license` field; `LICENSE` file is the GPL version 3 text) | Rust | symbols `basic_beam::Data::behavior`, `beam::Sys::run`, `conical_bezier_cylinder_collision`

Checked: Read in full: `basic_beam.rs` (304 lines), `common/systems/src/beam.rs` (394 lines), `common/src/comp/beam.rs` (53 lines), the beam-to-state conversion in `ability.rs` (3113-3150), the two precision constants in `combat.rs`, `assets/.../flamewyvern/flamethrower.ron` and `icedrake/icebreath.ron`. Confidence high on the order of operations of the state and the beam system; medium on what the precision multiplier does downstream (`combat.rs` apply path not read). Not read: `apply_attack` internals, `precision_mult_from_flank` body, `allow_friendly_fire`, `permit_pvp`, `handle_move` / `handle_orientation` / `handle_interrupts` bodies, the `Energy::change_by` clamp, the Burning buff, and how NPC AI holds the beam input. `camera_scope`: not applicable (not a camera cell).

Best transferable idea: A breath cone is a channelled beam: a fixed buildup, a hold that ticks damage at a set rate (optionally draining energy), a recover after release, a cone radius derived from a half-angle, and a time-on-target ramp that resets when the target leaves the beam.
Decision (proposed): adapt - take the channel shape and the window-counted ramp, but the server computes the cone hits once per tick in `src/fight` and the client only draws the beam; the donor runs hits from each beam entity's own system, which Frankendom's one-engine ruling does not allow.
Acceptance: A server test: a target held inside the cone for consecutive 1/3-second tick windows gets precision 0.25 from the 9th window (8 windows already closed), a target that leaves the cone for one window drops back to 0, and a target outside the cone takes no tick. A player sees a flame cone for as long as the button is held, the far end sweeping out over 2 s, and the cone ends on release plus a 2 s recover.

## 1. Mechanism

- Buildup: the state counts `timer` against `buildup_duration` and does nothing else (basic_beam.rs 107-121). The flamewyvern ron sets 0.9 s, the icedrake 0.8 s.
- Start of beam: at the end of buildup the state inserts a `Beam` component (158-174) with `start_radius: 0.0` (161), `end_radius` = tan(max_angle) x range (ability.rs 3140), `duration` = `beam_duration` (the sweep time), and `tick_dur` = 1 / `tick_rate` (165). Stage moves to Action (179).
- Action: each frame the state stays in Action while the ability input is still pressed and (drain is zero or energy is above zero) (184-186). The aim is the look direction with the body's z component merged in (191). Energy falls by `energy_drain` x dt (202). If either condition fails, the stage becomes Recover (203-205).
- Beam system, once per frame per beam (beam.rs 94-126 for the geometry, 130-344 for hits):
  (i) Geometry: the start follows the caster plus `beam_offset` (116). The far end moves toward its target by the fraction dt / beam_duration of the remaining distance each frame (123-125). The control point (at 30% of range) moves the same way with a 0.3 factor (118-121).
  (ii) Tick window: when `time % tick_dur < dt` the system keeps only the hit targets from the window that just ended, adds one to their count, and clears the hit list (96-102). A target whose count is kept therefore has consecutive window hits.
  (iii) Candidates: a spatial-grid query within `range` of the start (162-165). Skips the caster and dead targets (186-187). Skips any target already hit in this window (175-177).
  (iv) Hit test: a cone-cylinder test (188-196, body 357-394): nearest point on the bezier, radius at that point, z-band check, radius check, and an angle check of at least 0.45 pi between the tangent and the direction to the target centre (390). Then a terrain ray to the target must be unobstructed (204-214).
  (v) On hit: the precision multiplier is the larger of a flank term and a time-on-target term (290-305). The time term is `ticks x tick_dur / 2.5 s`, clamped to 0 to 1, times 0.25 (292-299). The attack is applied with source `AttackSource::Beam` (321). The target is recorded as hit in this window (329).
- Recover: runs `recover_duration` (flamewyvern 2.0 s), then ends the ability and removes the Beam component (208-217).
- Energy: each damaging hit adds `energy_regen` (125, requirement `AnyDamage` at 127). Drain is `energy_drain` per second (202). The flamewyvern and icedrake both have drain 0, so the beam has no energy limit and runs while the input is held.
- Movement and turning: `move_efficiency` is passed to `handle_move` (92). `ori_rate` is passed to `handle_orientation` (89-91). The donor comment on `ori_rate` reads "How fast enemy can rotate with beam" (60-61).
- Tick: the beam is driven by the system's per-frame run plus the window test on absolute time. This is not a fixed-step loop; the window is re-derived each frame from `time` and `dt`.

## 2. Key functions

- `basic_beam::Data::behavior`, the stage machine (buildup, action, recover): `/mnt/frankendom-donors/veloren-veloren/common/src/states/basic_beam.rs` 85-232.
- `beam::Sys::run`, geometry update and per-tick hit loop: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/beam.rs` 84-354.
- `conical_bezier_cylinder_collision`, the cone hit test: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/beam.rs` 357-394.
- Data-to-state conversion, where the cone radius is computed: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/ability.rs` 3113-3150.
- Precision constants: `/mnt/frankendom-donors/veloren-veloren/common/src/combat.rs` 72 and 77.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (file:line) |
|---|---|
| Buildup, hold, recover stages | flamewyvern: buildup 0.9 s (ron 2), recover 2.0 s (ron 3). icedrake: buildup 0.8 s (ron 2), recover 0.5 s (ron 3) |
| Tick window = 1 / tick_rate; one hit per target per window | flamewyvern tick_rate 3.0 per s (ron 6), so a window is 0.333 s. icedrake 3.0 (ron 6) |
| Cone radius at range = range x tan(half-angle) | flamewyvern max_angle 22.5 (ron 8), range 22.0 (ron 7), so radius at range = 22 x tan 22.5 deg = 9.11 (computed by me from the formula at ability.rs 3140). icedrake max_angle 22.5 (ron 8), range 15.0 (ron 7), so 6.21 (computed) |
| Sweep time of the far end | beam_duration 2.0 s (flamewyvern ron 4), 0.5 s (icedrake ron 4) |
| Time-on-target ramp | closed windows x window length, divided by 2.5 s (combat.rs 72), clamped to 0..1, times 0.25 (combat.rs 77) |
| Energy | flamewyvern: drain 0 (ron 16), regen 2 per hit (ron 15). icedrake: drain 0, regen 0 |
| Movement while beaming | move_efficiency 0.4 (flamewyvern ron 17; icedrake 0.4) |
| Turn rate while beaming | ori_rate 0.5 (flamewyvern ron 18), 0.2 (icedrake) |
| Damage per tick | flamewyvern 12.5 (ron 5); icedrake 10.0. Not receipted: the ron line is shorter than the receipt minimum |
| Burn on hit | flamewyvern: Burning, 3.0 s, strength 0.5 (ron 9-14). Not receipted |

Which numbers suit a fast mobile fight: a 0.3 to 0.5 s sweep, a 15 unit range, a 3 ticks per second cadence and a 0 energy cost are plausible; the flamewyvern's 2 s sweep and 2 s recover are long for a duel. The 0.25 ramp cap is small enough that it will not dominate a duel.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order per frame: buildup, then in action the drain-or-release check, the energy drain, the tick-window close, the sweep, and the hits; recover on release. It omits the caster-to-target bezier curve (it uses a straight axis), the terrain ray check, the flank term of the precision multiplier (only the time term is kept), dodge and block rules, PvP and friendly-fire gates, group targeting, the dead-target and self checks, the attack's damage pipeline (`apply_attack`), the orientation and movement rules, and the interrupts. It reorders on purpose in two places: the tick window is driven by an accumulator instead of the donor's absolute time modulo (same cadence for frames shorter than a window), and the far end is a linear sweep instead of the donor's per-frame approach to a moving target. It does not clamp energy, because the `Energy::change_by` clamp was not read.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface BeamSpec {
  buildupS: number;          // buildup duration before the beam appears
  recoverS: number;          // recovery after release or energy run-out
  sweepS: number;            // time for the far end to reach full range
  damagePerTick: number;     // damage per tick window per target
  tickRate: number;          // tick windows per second
  range: number;             // max reach, units
  halfAngleDeg: number;      // cone half-angle
  energyDrainPerS: number;   // 0 = no energy gate
  energyRegenPerHit: number; // energy returned per hit
}

export interface Target { id: number; along: number; lateral: number; } // distance along the axis, off-axis distance

export interface Hit { id: number; damage: number; precision: number; }

export interface BeamState {
  stage: "buildup" | "action" | "recover" | "done";
  timer: number;                 // seconds in the current stage
  elapsed: number;               // seconds since the beam began to sweep
  reach: number;                 // current far-end distance
  energy: number;
  tickAcc: number;               // seconds into the current tick window
  hitThisTick: Set<number>;      // targets hit in the open window
  ticksOn: Map<number, number>;  // closed windows each target has stayed in
}

export const PRECISION_FULL_S = 2.5;  // engine constant: time on target for full ramp
export const PRECISION_MAX = 0.25;    // engine constant: ramp cap

export function endRadius(spec: BeamSpec): number {
  return spec.range * Math.tan((spec.halfAngleDeg * Math.PI) / 180);
}

// Ramp: precision grows with time on target and is capped.
export function timePrecision(closedWindows: number, tickDur: number): number {
  const onS = closedWindows * tickDur;
  return PRECISION_MAX * Math.min(1, Math.max(0, onS / PRECISION_FULL_S));
}

// One frame. Returns the hits this frame.
export function stepBeam(s: BeamState, spec: BeamSpec, held: boolean, dt: number, targets: Target[]): Hit[] {
  const hits: Hit[] = [];
  const tickDur = 1 / spec.tickRate;
  s.timer += dt;

  if (s.stage === "buildup") {
    if (s.timer >= spec.buildupS) { s.stage = "action"; s.timer = 0; s.elapsed = 0; s.tickAcc = 0; }
    return hits;
  }

  if (s.stage === "action") {
    const canDrain = spec.energyDrainPerS <= 0 || s.energy > 0;
    if (!held || !canDrain) { s.stage = "recover"; s.timer = 0; return hits; }

    s.elapsed += dt;
    s.energy -= spec.energyDrainPerS * dt;

    // Tick window boundary: close the open window; only targets hit in it keep their count.
    s.tickAcc += dt;
    if (s.tickAcc >= tickDur) {
      s.tickAcc -= tickDur;
      const next = new Map<number, number>();
      for (const id of s.hitThisTick) next.set(id, (s.ticksOn.get(id) ?? 0) + 1);
      s.ticksOn = next;
      s.hitThisTick = new Set<number>();
    }

    s.reach = Math.min(spec.range, (spec.range * s.elapsed) / spec.sweepS);
    const radiusPerUnit = endRadius(spec) / spec.range;
    for (const t of targets) {
      if (s.hitThisTick.has(t.id)) continue;             // at most one hit per window
      if (t.along < 0 || t.along > s.reach) continue;    // inside the swept length
      if (t.lateral > radiusPerUnit * t.along) continue; // inside the cone
      s.hitThisTick.add(t.id);
      hits.push({ id: t.id, damage: spec.damagePerTick, precision: timePrecision(s.ticksOn.get(t.id) ?? 0, tickDur) });
      s.energy += spec.energyRegenPerHit;
    }
    return hits;
  }

  if (s.stage === "recover") {
    if (s.timer >= spec.recoverS) s.stage = "done";
  }
  return hits;
}
export {};
```

## 5. Lands in

- TARGET `src/fight/breath.ts` (new module: a channelled cone special in the engine; the server computes the cone hits once per tick, the client draws the beam). Parity-checklist row 13 (specials).
- today: no channelled beam in Frankendom; specials are row 13.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); the cone and tick rules live in src/fight, not in the client

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect (keep the idea, fix in the sketch): the far-end and control-point approach uses `dt / beam_duration` with no clamp (beam.rs 119-125). A frame longer than `beam_duration` overshoots. Fix: clamp the fraction at 1, or use a linear sweep clamped at range (the sketch does the latter).
- Defect (keep the idea, fix in the data): the same lines divide by `beam_duration`, so a zero duration gives infinity or NaN. Fix: validate `sweepS > 0` in the zone-data loader.
- Defect (keep the idea, fix in the sketch): the window test `time % tick_dur < dt` depends on frame timing. A frame longer than a window can fire the window test on several frames or skip one. Fix: an accumulator, as in the sketch.
- Not verified: whether energy can go negative, since `Energy::change_by` was not read. The sketch does not clamp.
- Frankendom gap: MAX_ATTACKERS = 3 caps melee attackers, but a breath cone can hit several targets at once. The donor has no cap in `beam.rs` 130-344 (read). This needs an explicit ruling for specials; the sketch does not enforce a cap.
- Frankendom gap: the time-on-target ramp is a precision multiplier in the donor. How precision maps to damage in the donor was not read, so the Frankendom equivalent (a damage multiplier or a hit-chance bonus) must be chosen by the designer.
- Data gap: the ron gives `max_angle`, and the state stores a computed `end_radius`. Frankendom should store the half-angle as zone data and compute the radius in the engine, so the number a designer edits is the angle.
- Reddragon: `common/src/comp/body/dragon.rs` (77 lines, read) defines one species and two body types. The breath beams I found are on wyverns (`bird_large`, the flamewyvern and icedrake ron files), not on the Reddragon. I found no breath ability wired to the Reddragon in the assets I searched.
- Other dragon-topic mechanisms read in this cell (not sketched, short):
  - Flight: the dragon's flight model is a constant `fly_thrust` of 200,000 (`common/src/states/utils.rs` 355). The PID `FlightMode` in `common/src/comp/agent.rs` 1026-1100 is documented for airships, not dragons.
  - Boss phases: none found. A grep for `phase` in `common/src` and `server/src/sys/agent` found only the trade phase and the moon phase. The closest is a health-fraction flee/retarget check (`server/src/sys/agent/behavior_tree/mod.rs` 878-905), which is the AI topic, not a phase machine.
  - Mounts: mounting needs the mount alive and not downed (`common/src/mounting.rs` 94). The mount takes rider inputs only when it has no free will (`common/systems/src/mount.rs` 142). The rider's position is the mount's position plus offsets (173). A mount's buffs are re-applied to the rider only when the rider lacks a stronger copy (103). Mountable when rider mass / mount mass < 0.7 (`common/src/comp/pet.rs` 65), with humanoid mounts only for bird-medium riders (67-68). Dragon mounting uses the default mass rule; the dragon's mass was not read.
  - Taming: a collar item tames the nearest wild tameable entity within 5 units (`server/src/events/inventory_manip.rs` 638), with a cap of 3 pets per owner (616). It is instant: the code read has no chance roll and no health threshold. Dragons are not tameable: `is_tameable` (`common/src/comp/pet.rs` 39-57) lists low and small quadrupeds, medium birds and crustaceans, and falls through to false for the dragon body.
  - Armour: not per body part. Protection sums every equipped armour piece (`common/src/combat.rs` 2288-2309), damage reduction is p / (60 + |p|) (1769-1772), and inventory and stats reduction are combined multiplicatively (1785). Piercing damage lowers protection by 75% of its value, capped at the protection itself (`combat.rs` 1735, 1758).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: None found in main claims. Verified: basic_beam.rs buildup 107-121, Beam insert 158-174 (start_radius 0, tick_dur 1/tick_rate at 165), action gate 184-186, merge_z 191, drain 202, recover 203-217; beam.rs window test 96-103, ctrl/end approach 117-125 with no clamp, grid query 162-165, dead/self 186-187, hit-list skip 175, terrain ray 204-214, precision 290-305 (max of flank/time), apply_attack 315-321, hit recorded 329; cone test 357-394 incl. 0.45 pi; combat.rs 72 (2.5) and 77 (0.25); ability.rs 3140 end_radius; ron values for flamewyvern and icedrake all match; radii 9.11 and 6.21 correct; GPL-3.0-or-later at Cargo.toml 34; sidebar claims (taming 5 units / MAX_PETS 3, is_tameable, mass 0.7, DR 60 constant, piercing 0.75, dragon fly_thrust 200000) spot-checked and true. Minor sketch gap: donor cone test adds target radius/height tolerance (z_check, rad_check use rad_b and length_b) which the sketch's lateral<=slope*along ignores; not listed under omissions.
Missed: None important. Hit-chance side: on first window the donor passes precision_from_time=None while the sketch passes 0 (equivalent).
