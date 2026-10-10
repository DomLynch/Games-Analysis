# id-Software-DOOM (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_inter.c` (with `p_map.c` for the shot trace and `p_pspr.c` for the player weapons) | Licence: unclear (per the `p_map.c` header: "only under the terms of the DOOM Source Code License as published by id Software"; the top-level `LICENSE.TXT` in the donor is GPL v2 text; the two do not agree, so clean-room only) | C | symbols `P_DamageMobj`, `P_LineAttack`, `PTR_ShootTraverse`, `P_AimLineAttack`, `P_GunShot`

Checked: Read in full `P_DamageMobj` (p_inter.c 764-917), `P_AimLineAttack`, `P_LineAttack` (p_map.c 1020-1086), `PTR_AimTraverse` (816-893), `PTR_ShootTraverse` (899-1016), the fist, pistol, double-barrel and aim-fallback code in p_pspr.c (468-486, 598-640, 700-726), and `A_PosAttack` (p_enemy.c 800-819). Candidate files opened: p_map.c, p_inter.c, p_pspr.c, p_enemy.c, p_local.h (constants by grep and receipts), LICENSE.TXT (header only). The list hint `p_map.c` is the right file for the trace; `p_inter.c` holds the damage. camera_scope: not applicable (combat cell). Confidence: high for the trace, the aim window and `P_DamageMobj`; high for the weapon damage rolls. Not read: `P_Random` (m_random.c; the 0..255 range is taken as given by its use with `painchance`, not read); `P_PathTraverse` (p_maputl.c; the path order and the stop-on-false rule are taken from the traverse comments "shot continues" and "don't go any farther"); `P_LineOpening`; `P_SpawnPuff` and `P_SpawnBlood` bodies; `P_KillMobj` (p_mobj.c); `A_FaceTarget`; the function header of the double-barrel shot above line 700; the per-type mass and painchance values in info.c (grep only); the `BASETHRESHOLD` value. Callers of `P_DamageMobj`, seen by grep: p_map.c 105 (10000 damage, enclosing function not read), 279 and 324 (thing collisions), 1011 (line attack), 1194 (splash, enclosing function not read), 1300 (10 damage, enclosing function not read); p_pspr.c 809 (a melee call whose enclosing function was not read).

## 1. Mechanism

- A DOOM shot is an instant trace, not a projectile. It has two passes. The aim pass finds the vertical angle to a target. The fire pass walks the trace and damages the first valid thing.
- Aim pass, `P_AimLineAttack` (p_map.c 1020-1054). The eye point is `z + height/2 + 8` units (1036). The vertical window starts at `+100/160` and `-100/160` slope (1039-1040), which is about +/-0.625 rise per unit of distance. `PTR_AimTraverse` runs along the path (1045-1048). A one-sided line stops the trace (829-830). A two-sided line narrows the window to its opening: the floor raises `bottomslope` and the ceiling lowers `topslope`, and an empty window stops (835-857). A thing that lies entirely above or below the window is skipped (874-880). A thing inside the window clips the window to its own vertical range (883-887) and sets `aimslope` to the midpoint of what is left (889), then the traverse stops (892). If nothing is found, `linetarget` is null and the slope is 0 (1050-1053).
- Player aim fallback, `P_BulletSlope` (p_pspr.c 601-619). It aims straight ahead, with range `16 x 64` (607). If nothing is found, it probes one angle step of `1<<26` to the left (611-612), then `2<<26` back to the right (615-616). `1<<26` is one 64th of a full turn of 2^32 angle units (the angle unit is not receipted here).
- Fire pass, `P_LineAttack` (p_map.c 1063-1085). It stores the damage in `la_damage` (1075), uses the slope it was given as `aimslope` (1080), and walks the trace with `PTR_ShootTraverse` (1082-1085).
- `PTR_ShootTraverse` (899-1016), per intercept in path order:
  - A special line fires its special (919-920). A one-sided line, or a closed two-sided opening, ends the trace with a wall puff placed slightly before the hit (922-971). A two-sided opening that is passable lets the trace continue (928-945). The sky is not shot (956-965).
  - A thing that is the shooter, or not shootable, is skipped (976-980).
  - A thing whose top is below `aimslope` or whose bottom is above it is skipped (983-992). So the test is whether the aim slope falls inside the thing's vertical range from this distance.
  - The first thing that passes is hit. Blood or a puff is spawned (1005-1008). If `la_damage` is non-zero, `P_DamageMobj(th, shootthing, shootthing, la_damage)` runs (1010-1011). The trace stops (1014).
- Damage rolls (per weapon, the call sites that build `damage` and the spread):
  - Fist (p_pspr.c 476-484): `(P_Random() % 10 + 1) << 1`, so 2 to 20 in steps of 2; berserk multiplies by 10 (478-479). Spread: `(P_Random() - P_Random()) << 18` (482). Range `MELEERANGE` (483-484).
  - Pistol (p_pspr.c 633-639): `5 x (P_Random() % 3 + 1)`, so 5, 10 or 15. Spread only when not an accurate shot: `(P_Random() - P_Random()) << 18` (637). Range `MISSILERANGE`.
  - Double-barrel (p_pspr.c 716-724): 20 pellets, each `5 x (P_Random() % 3 + 1)` (718), angle spread `<< 19` (720), slope spread `<< 5` (724).
  - Monster (p_enemy.c 813-818): aims with `P_AimLineAttack` at `MISSILERANGE` (813), damage `3 x (P_Random() % 5 + 1)` (817), angle spread `<< 20` (816), then `P_LineAttack` with that slope (818).
- `P_DamageMobj` (p_inter.c 764-917), in order:
  1. Gates: a non-shootable target returns (787-788); a dead one returns (790-791). A skull-flying target has its momentum zeroed (793-796).
  2. Player on the baby skill setting takes half damage (798-800). This is before the push, so it also halves the push.
  3. Push (806-832). Skipped if there is no inflictor, the target is no-clip, or the source is a player holding the chainsaw (806-810). `thrust = damage x (FRACUNIT>>3) x 100 / mass` (817), so about `damage x 12.5 / mass` map units. If the hit is under 40, is lethal, and the target is more than 64 units above the inflictor, a coin flip sends it forwards with the thrust times 4 (820-827). The momentum is added along the angle from the inflictor to the target (829-831). This runs on the raw damage, before armour and before the immunity gate.
  4. Player only: invulnerability or god mode returns with no damage for hits under 1000 (847-852). Armour: class 1 soaks `damage / 3` and class 2 soaks `damage / 2`, using integer division (854-859). If the armour points are no more than the soak, the soak is the points and the class is cleared (861-866). The points and the damage are reduced by the soak (867-868). Then health is reduced and clamped at 0 (870-872), the attacker is recorded (874), and the damage counter is updated (875-878).
  5. Every target: `health -= damage` (887). If health is 0 or less, `P_KillMobj(source, target)` runs and the function returns (888-892). A killing blow does not reach steps 6-8.
  6. Flinch: if `P_Random() < painchance` and the target is not skull-flying, it gets the fight-back flag and the pain state (894-900).
  7. Reaction time is reset (902).
  8. Retarget: if the target has no current threshold (or is a Vile), the source exists, and the source is not the target, the target's `target` becomes the source and its threshold is set to `BASETHRESHOLD` (904-911). If it was idle, it goes to its see state (912-914). A body already committed to another target keeps it.

## 2. Key functions

- `P_DamageMobj`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_inter.c` 764-917. Gates, push, armour, health, death, flinch, retarget (section 1, steps 1-8).
- `P_AimLineAttack`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_map.c` 1020-1054. Eye point and the +/-0.625 slope window (1036-1040), then the aim traverse.
- `PTR_AimTraverse`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_map.c` 816-893. Narrows the window at two-sided lines (835-857); sets `aimslope` at the first thing in the window (872-892).
- `P_LineAttack`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_map.c` 1063-1085.
- `PTR_ShootTraverse`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_map.c` 899-1016. The first valid thing takes the damage (1010-1014).
- `P_BulletSlope`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_pspr.c` 601-619. Straight, then one probe to each side.
- `A_PosAttack`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_enemy.c` 800-819.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Aim by a vertical window that narrows at each opening; the first target inside the window wins and the window is clipped to it | Window +/-100/160 slope (theirs, p_map.c 1039-1040); aim eye height `height/2 + 8` units (theirs, 1036) |
| The trace stops at the first thing that the aim slope passes through | Stop on one-sided line and on a closed opening (theirs, 829-830, 837-838, 856-857) |
| Damage rolls as a multiple of a base value, uniform over 1..N | Fist 2 x (1..10) (theirs, 476); pistol 5 x (1..3) (theirs, 633); double-barrel 20 pellets of 5 x (1..3) (theirs, 716-718); monster 3 x (1..5) (theirs, 817); berserk x10 (theirs, 478-479) |
| Spread as a difference of two random draws, scaled by a bit shift | Shifts 18, 19, 20 and 5 (theirs, 482, 637, 720, 816, 724) |
| Ranges | `MELEERANGE` 64 units (theirs, p_local.h 57); `MISSILERANGE` 32 x 64 units (theirs, p_local.h 58); aim probe 16 x 64 (theirs, p_pspr.c 607) |
| Push is damage over mass, computed before the immunity gate | `damage x 12.5 / mass` (theirs, p_inter.c 817); hits under 40 that are lethal and from above can fall forward x4 (theirs, 820-827) |
| Invulnerability absorbs small hits only | Under 1000 damage (theirs, p_inter.c 847) |
| Armour soaks a fixed share, is capped by its points, and clears when used up | Class 1 one third (theirs, 857); class 2 one half (theirs, 859) |
| Flinch: a per-type chance on a random draw | `painchance` per type (theirs, info.c, grep only) |
| Retarget to the attacker when not committed | `BASETHRESHOLD` (theirs, p_inter.c 911; value not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the damage step: gates, push from the raw damage before the immunity gate, the invulnerability gate, the armour split with the pool clearing when used up, health and the death return (no flinch or retarget after a kill), the flinch roll, and retarget to the source only when not committed. It omits: the baby skill halving, the no-clip and chainsaw exceptions on the push, the fall-forward case, the skull-fly momentum reset, the lethal-sector hack (p_inter.c 838-842), the Vile exceptions on retarget and the see-state change, the reaction-time reset, the attacker record and damage counter, and the trace itself (section 1 only). The donor's BASETHRESHOLD value is not read, so the sketch uses a placeholder. The sketch uses a number for the source id and does not model the death handler.

```ts
// Licence: unclear (donor header: DOOM Source Code License; top-level LICENSE.TXT is GPL v2 text). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Body {
  id: number;
  health: number;
  shootable: boolean;
  mass: number;          // per-type value; push = damage x 12.5 / mass (map units)
  armourClass: 0 | 1 | 2; // 0 none; class 1 soaks a third of a hit, class 2 a half
  armourPoints: number;
  invulnerable: boolean;
  painChance: number;    // flinch threshold on a 0..255 roll
  threshold: number;     // > 0 while the body is committed to another target
}

export interface Hit {
  damage: number;
  source: number | null; // attacker id; null for the environment
  pushes: boolean;       // false for a melee weapon that does not push
}

export interface HitResult {
  dealt: number;     // damage taken by health
  dead: boolean;
  push: number;      // push magnitude from the raw damage (map units); the caller decides how to use it
  flinch: boolean;
  retargetTo: number | null;
  threshold: number;
}

const BASE_THRESHOLD = 100; // value is a placeholder; the donor's BASETHRESHOLD is not read

// Donor order: gates, then push (from raw damage, before the invulnerability gate), then armour split,
// then health and death, then the flinch roll, then retarget to the source (not after a kill).
export function applyHit(b: Body, h: Hit, rand255: () => number): HitResult {
  const none: HitResult = { dealt: 0, dead: false, push: 0, flinch: false, retargetTo: null, threshold: b.threshold };
  if (!b.shootable || b.health <= 0) return none;

  const push = h.pushes ? (h.damage * 12.5) / b.mass : 0;

  if (b.invulnerable && h.damage < 1000) return { ...none, push };

  let damage = h.damage;
  if (b.armourClass !== 0) {
    let saved = b.armourClass === 1 ? Math.trunc(damage / 3) : Math.trunc(damage / 2);
    if (b.armourPoints <= saved) {
      saved = b.armourPoints;
      b.armourClass = 0; // pool used up
    }
    b.armourPoints -= saved;
    damage -= saved;
  }

  b.health -= damage;
  if (b.health <= 0) return { dealt: damage, dead: true, push, flinch: false, retargetTo: null, threshold: b.threshold };

  const flinch = rand255() < b.painChance;

  let retargetTo: number | null = null;
  let threshold = b.threshold;
  if (b.threshold === 0 && h.source !== null && h.source !== b.id) {
    retargetTo = h.source;
    threshold = BASE_THRESHOLD;
  }
  return { dealt: damage, dead: false, push, flinch, retargetTo, threshold };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/q073/doom-hit.ts (with `export {}`), exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step, the one place health changes). Parity-checklist row 1 (duel step / sim). The armour pool and the push decision belong to this step; the aim window belongs to the target-select step and is not decided here.
- Reuse tag: rewrite-from-idea (unclear licence; clean-room only)
- Brief rule served: 1 (one combat core: one damage step for every hit); rules 7-9 n/a

Best transferable idea: Let armour soak a fixed share of each hit (a third or a half) from a points pool that clears when it runs out, and compute any push from the raw damage before the immunity gate, so the push is decided even when damage is not.

Decision (proposed): adapt. Armour as a pool that soaks a fixed share of each hit until it runs out, then clears, is a small, testable rule that fits the one-ledger ruling if it lives in the damage step. We adapt the push: a server stagger state scaled by damage over mass, never a position push, and we reject the chainsaw and fall-forward cases unless we add those weapon classes. We reject the aim window for this cell.
Acceptance: a server test sets 9 armour points in class 1 and a 30 hit: 10 would be soaked, only 9 are available, so 9 is absorbed, 21 reaches health, and the armour class is cleared; a 1000-point hit is not absorbed by invulnerability.

## 6. Gaps and risks

- The licence is unclear: the file header names the DOOM Source Code License, and the top-level LICENSE.TXT is GPL v2 text. Treat as clean-room, shape only, and do not copy the lines.
- Push and immunity order: the donor pushes an invulnerable target (the push at 817 runs before the gate at 847). Frankendom has to pick the order. If the push becomes a state (stagger), the immune target is staggered too; decide that on purpose.
- A killing blow ends the function before flinch and retarget (888-892). Frankendom's death handling must run its own path; do not reuse the retarget as part of the kill.
- Armour soaks by integer division (857, 859). For a 1-point hit, class 1 soaks 0. Frankendom needs a minimum (the donor has none here).
- The damage rolls depend on `P_Random` (m_random.c, not read). Spread from `P_Random() - P_Random()` depends on that generator's range. Frankendom's server must own the seed; the donor's sync across clients was not checked.
- Hitscan with one first-hit: a spread shot can hit a different thing than the aim picked. Frankendom's fights are server-verified; the server must decide the first valid target with the same rule the client shows.
- The aim window is about vertical aim. Frankendom's duels have no vertical aim; the window is only relevant if the third-person camera or lock-on needs it (camera cells, not this one).
- Base threshold and per-type mass and painchance are data, not read in full (info.c grep only). They belong in the catalogue, not in engine constants.
- `P_DamageMobj` is also called from non-combat paths (p_map.c 105, 1194, 1300; enclosing functions not read, and the names suggest a telefrag, a splash and a crush). Frankendom must not let those bypass the damage step.
