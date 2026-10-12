# id-Software-Quake (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/pr_cmds.c` (PF_aim, lines 1326-1402) and `/mnt/frankendom-donors/id-Software-Quake/QW/server/pr_cmds.c` (PF_aim, QuakeWorld server, lines 1150-1240) | Licence: header says "either version 2 of the License, or (at your option) any later version" (GPL-2.0-or-later); the tree's gnu.txt is GPL v2 text | C (QuakeC builtin) | symbol `PF_aim`

Checked: Read in full: WinQuake/pr_cmds.c 1326-1402 (PF_aim, the cvar, the cone search, the return). Read in full: QW/server/pr_cmds.c 1150-1240 (the QuakeWorld PF_aim with the noaim opt-out, the cone search and the return). Callers, found by grep across the donor for `aim(`: qw-qc/weapons.qc 462 (rocket) and 681 (grenade), and the same two calls in QW/progs/weapons.qc 437 and 656; the WinQuake tree has no QuakeC source, so it has no caller to grep. I read the rocket caller (444-463) and the grenade caller (656-684) in part. Confidence: high on PF_aim (whole function read in both halves); medium on the callers (read around the aim lines only). Related but not read in full: sbar.c (Sbar_DrawFace, the health face, 828 by grep only) and cl_input.c (input latch, read at 76-100, 166-202, 364-368 only). camera_scope: not applicable (hud cell).

## 1. Mechanism

- PF_aim is the QuakeC builtin `aim(entity, speed)` (defs.qc 678). It runs on the server, reads the shooter's origin and the facing (forward) vector, and returns one unit direction for a shot. Server-side only: it walks the server's edict list and traces on the server world.
- Order of steps (WinQuake version; the QuakeWorld version is the same except for the noaim check at its start):
  1. Eye point: shooter origin plus 20 units up (1346).
  2. Straight trace along the facing, 2048 units (1350-1352). If the first thing struck is an entity with `takedamage == DAMAGE_AIM` and it is not a teammate (teamplay only), return the facing unchanged. No snap.
  3. Cone search. `bestdist` starts at the `sv_aim` value (1362). For each entity with `takedamage == DAMAGE_AIM` (1368), skip self and, in teamplay, teammates. The test point is the box centre, origin plus half of mins plus maxs (1376). Take the unit direction to that point and its dot product with the facing (1377-1379). Skip the candidate if the dot is below `bestdist` (1380-1381). Otherwise trace to the test point; if the first thing struck is this entity, it becomes the best and `bestdist` rises to its dot (1385). So the result is the most central visible candidate inside the cone, not the nearest one.
  4. Return (1392-1395). If a best exists: take the origin difference to the target (origin, not the test point), its along-facing length (dot with the facing, not normalised), build the vector (facing times that length, with z taken from the origin difference), and normalise. The yaw stays the facing's; the pitch points at the target's height. If none exists, return the facing (the else branch copies `bestdir`, which is the facing).
- Callers, QuakeWorld: rocket (qw-qc/weapons.qc 462-463): `aim(self, 1000)` and the result is multiplied by 1000 for velocity. Grenade (weapons.qc 677-684): when `self.v_angle_x` is non-zero (view pitched), it does not aim and uses a fixed velocity; otherwise it calls `aim(self, 10000)`, multiplies by 600 and sets z to 200 (read, numbers not receipted). Both are projectile fires, once per shot, not per tick.
- Tick: none of its own. It runs once per shot, from weapon fire in the QuakeC progs (the QuakeC tick is not read here).

## 2. Key functions

- `PF_aim` (WinQuake): `/mnt/frankendom-donors/id-Software-Quake/WinQuake/pr_cmds.c` 1326-1402. The whole mechanism.
- `PF_aim` (QuakeWorld server): `/mnt/frankendom-donors/id-Software-Quake/QW/server/pr_cmds.c` 1150-1240. Same cone search plus `noaim` opt-out (1174-1183).
- Rocket caller: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/weapons.qc` 444-463 (`aim` at 462).
- Grenade caller: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/weapons.qc` 656-684 (pitch gate at 677, `aim` at 681).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cone test by dot product of unit vectors | `sv_aim` 0.93 (WinQuake 1332). About 21.6 degrees (arccos of 0.93, computed here, not in the donor) |
| Visible-only: a trace from the eye must hit the candidate first | Trace start 20 units above origin (1346) |
| Straight trace first: a hit on an aimable enemy keeps the facing | 2048 units (1350) |
| Most central visible candidate wins (the cone threshold rises with each win) | None (the rule) |
| Vertical-only snap: keep yaw, take the height from the target | None (the rule) |
| Off switch | QuakeWorld `sv_aim 2` (QW 1157). A dot product cannot reach 2, so the cone never matches; the donor docs say autoaim is off by default (QW/qwrlnote.txt 85) |
| Per-player opt-out | Userinfo key `noaim` (QW 1178-1179) |
| Missile speed | Passed in and read (WinQuake 1343), never used in PF_aim |

## 4. TypeScript sketch

simplified: keeps the donor order (straight trace, then the cone search with a visibility trace, then the vertical-only snap or the facing) and the cosine threshold 0.93. It changes: (1) one aim point for both the test and the output (the donor tests the box centre and returns from the origin); (2) a maximum range (the donor has none); (3) the trace is an input callback `firstHit`, not the engine's trace; (4) the donor's unused speed argument is dropped (no lead); (5) the QuakeWorld off switch becomes a boolean (`optOut` is the per-player noaim; the on/off for the feature is the config value, not a sentinel); (6) an alive check is added (the donor checks only `takedamage`); (7) a guard returns the facing when the horizontal part is zero (facing straight up or down).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism; not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number; }

export interface Target {
  id: number;
  origin: Vec3;             // entity origin
  mins: Vec3;               // box, relative to origin
  maxs: Vec3;
  canBeAimed: boolean;      // donor: takedamage == DAMAGE_AIM
  alive: boolean;
  team: number;
}

export interface Shooter { id: number; team: number; origin: Vec3; }

export interface AimCfg {
  cosThreshold: number;     // donor sv_aim default 0.93 (about 21.6 degrees); must be in (0, 1]
  maxRange: number;         // units; donor has no range limit (added here)
  teamplay: boolean;
  optOut: boolean;          // QuakeWorld per-client "noaim" setting
}

// Engine supplies the trace: id of the first entity struck along dir up to range, or null.
export type FirstHit = (from: Vec3, dir: Vec3, range: number, exceptId: number) => number | null;

export interface AimResult { dir: Vec3; targetId: number | null; }

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3): number => Math.sqrt(dot(a, a));
const unit = (a: Vec3): Vec3 => scale(a, 1 / len(a));

// One aim point for both the test and the output (donor mixes box centre and origin).
const aimPoint = (t: Target): Vec3 => add(t.origin, scale(add(t.mins, t.maxs), 0.5));

export function aimVector(
  shooter: Shooter,
  facing: Vec3,
  targets: Target[],
  cfg: AimCfg,
  firstHit: FirstHit,
): AimResult {
  const fwd = unit(facing);
  if (cfg.optOut) return { dir: fwd, targetId: null };

  const eye: Vec3 = { x: shooter.origin.x, y: shooter.origin.y, z: shooter.origin.z + 20 };

  // 1. Straight trace along the facing: a hit on an aimable enemy keeps the facing as is.
  const straight = firstHit(eye, fwd, 2048, shooter.id);
  if (straight !== null) {
    const hit = targets.find((t) => t.id === straight);
    if (hit && hit.canBeAimed && !(cfg.teamplay && shooter.team > 0 && hit.team === shooter.team)) {
      return { dir: fwd, targetId: hit.id };
    }
  }

  // 2. Cone search: the most central visible aimable target inside the cone wins.
  let best = cfg.cosThreshold;
  let bestT: Target | null = null;
  for (const t of targets) {
    if (!t.canBeAimed || !t.alive || t.id === shooter.id) continue;
    if (cfg.teamplay && shooter.team > 0 && t.team === shooter.team) continue;
    const toT = sub(aimPoint(t), eye);
    const d = len(toT);
    if (d === 0 || d > cfg.maxRange) continue;
    const c = dot(scale(toT, 1 / d), fwd);
    if (c < best) continue;                                  // outside the cone, or less central than the best so far
    if (firstHit(eye, scale(toT, 1 / d), d, shooter.id) === t.id) { best = c; bestT = t; }
  }

  if (bestT === null) return { dir: fwd, targetId: null };

  // 3. Keep the facing's yaw; take the height from the target (vertical-only snap).
  const rel = sub(aimPoint(bestT), shooter.origin);
  const along = dot(rel, fwd);
  const v: Vec3 = { x: fwd.x * along, y: fwd.y * along, z: rel.z };
  if (Math.hypot(v.x, v.y) < 1e-9) return { dir: fwd, targetId: null };  // facing straight up or down
  return { dir: unit(v), targetId: bestT.id };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/aim-assist.ts` (new, engine side, runs on the server at the moment of an attack; the client shows the reticle only). Parity-checklist row 5 (controls/input: intake of the attack direction). Row 1 (duel step) is the alternative if the aim is treated as part of the duel step.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the aim is computed by the engine from server state, so the client cannot choose a target)

## 6. Gaps and risks

- Defect 1, aim point mismatch: the test uses the box centre (WinQuake 1376) but the output uses the entity origin (1392; QW 1230). The vertical snap therefore aims at the origin height, which differs from the tested point by `0.5*(mins+maxs)` (zero only for a box symmetric about the origin). fix: one aim point for both (sketch, `aimPoint`).
- Defect 2, missing range: the cone loop has no maximum distance (1368-1385); only the 2048-unit straight trace has a limit. fix: `maxRange` as zone data (sketch).
- Defect 3, unused argument: the speed argument is read at 1343 and not used. Fine for melee, wrong if Frankendom adds projectiles without lead. fix: drop it for melee; add target lead only for projectiles.
- Gap, sentinel for "off": QuakeWorld uses `sv_aim 2` to switch the feature off (1157; docs at QW/qwrlnote.txt 85). This works only because a dot product cannot reach 2. It is a product choice (off by default), not a crash, but it hides the on/off state in a number. fix: an explicit enable flag plus a threshold in (0, 1] (sketch, `cosThreshold`, `optOut`).
- Gap, many-on-one: the loop runs over every `DAMAGE_AIM` entity on the server (`sv.num_edicts`). Frankendom should pass only the fight's candidates (at most MAX_ATTACKERS = 3 in a many-on-one fight), not the whole zone.
- Gap, liveness: the donor checks `takedamage` only (1368); the sketch adds an alive check. Confirm against Frankendom's dead-state rules.
- Ruling fit: the aim runs on the server, which matches server-verified kills. The client must not run `aimVector` to choose a target; it may draw the reticle from the same function.
- Vertical-only snap: the donor keeps yaw and changes pitch only. A camera lane should know the shot can leave the view's yaw unchanged while the pitch moves; the camera itself is not moved here (client-only, not read).
- Grenade gate: the grenade assists only when the view is level (weapons.qc 677). The rocket does not. Frankendom should choose one rule and make it a data field (`assistWhenPitched`).
- Opt-out: the QuakeWorld `noaim` userinfo key (1178-1179) lets a player turn the assist off. Keep it: it fits the accessibility fold-in (the assist is optional, per player).
- Input latch, not written up here (input row 5, own cell): cl_input.c 84 sets the down and impulse-down bits on a key press; 196-198 report a press and release within one frame as 0.25 or 0.75 instead of losing it. That is the input buffer the cell also asked about. Read in part only.
- String tables: none found in this donor's code paths (grep of `localiz`, `localis`, `translat` hit only GL and kit files).

Best transferable idea: A cone-plus-visibility lock-on that picks the most central visible enemy and snaps only the vertical angle to the target's height, computed on the server from one aim point.

Decision (proposed): adapt - keep the cone, the visible-only test, the most-central choice and the vertical-only snap, computed on the server (server-verified rule); fix the aim-point mismatch, add a max range, replace the sentinel with an explicit enable flag, and keep the noaim opt-out. Reject the projectile speed argument for now (no lead needed for melee).
Acceptance: In a duel at 375 wide, a shot aimed up to about 21 degrees off a foe standing at a different height lands on the foe, and its direction takes the foe's height while the hero's yaw does not change; a foe behind a pillar is not chosen; a player with assist off gets the raw facing. Server test: with fixed positions, `aimVector` returns the expected target id and direction, and a blocked target returns null.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)

Brief rule served: 1 (one engine: target choice on the server); fold-in: lock-on forgiveness and accessibility (opt-out).
