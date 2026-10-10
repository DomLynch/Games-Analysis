# dhewm-dhewm3 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/ai/AI.cpp` (with `d3xp/ai/AI_events.cpp`, `d3xp/Actor.cpp`, `d3xp/Projectile.cpp`) | Licence: GNU GPL version 3 (`COPYING.txt` line 2 "Version 3, 29 June 2007"), and the file header (`d3xp/ai/AI.cpp` line 22) says the Doom 3 source "is also subject to certain additional terms" (id Software; the terms text was not read) | C++ | symbol `idAI::UpdateEnemyPosition` (with `idAI::SetEnemyPosition`, `idAI::Event_FindEnemyAI`, `idActor::CanSee`, `idGuidedProjectile::Launch`)

Checked: Read in full: `d3xp/ai/AI.cpp` 1129-1200 (Think, the movement-type switch), 3253-3290 (ReactionTo), 3720-3742 (ClearEnemy), 3772-3861 (SetEnemyPosition), 3869-3930 (UpdateEnemyPosition), 3938-3970 (SetEnemy); `d3xp/ai/AI_events.cpp` 340-460 (FindEnemy, FindEnemyAI, FindEnemyInCombatNodes), 470-530 (ClosestReachableEnemyOfEntity, HeardSound); `d3xp/Actor.cpp` 521-541 (Spawn, fov default), 1412-1545 (SetFOV, CheckFOV, CanSee), 1849-1893 (ClosestEnemyToPoint, EnemyWithMostHealth); `d3xp/Projectile.cpp` 1509-1530 and 1580-1630 (guided Launch). Grep-only: `d3xp/ai/AI.h` 52 (hearing range), `d3xp/Actor.h` 124 (enemyList), `d3xp/Game_local.cpp` 61 (frame step), `framework/UsercmdGen.h` 40-41 (60 Hz), `neo/game/ai/AI.cpp` (the base-game copy, not compared line by line). Candidates opened: d3xp/ai/AI.cpp, d3xp/ai/AI_events.cpp, d3xp/Actor.cpp, d3xp/Projectile.cpp, d3xp/Actor.h (grep), and the list hint `d3xp/ai/AI.h` (declarations only; the mechanism is in AI.cpp). Not read: the monster scripts that call FindEnemy and UpdateAIScript (the decision layer), the guided projectile steering body (`Think`, about 1530-1590), the Doom 3 additional-terms text. Confidence: high on sight, memory, enemy list and the pickers (read end to end); medium on how the scripts use them. Camera: not applicable.

## 1. Mechanism

- A monster keeps two things about its enemy: what it can see now, and where the enemy last stood on reachable ground. A chase walks to the second. The enemy also keeps a list of the monsters that have targeted it.
- Order of steps, per game frame (fixed step, 60 per second):
  (a) `idAI::Think` (1129) does nothing if the monster is dormant (1131). For the moving types (fly, static, anim, slide) it calls `UpdateEnemyPosition` (1170, 1179, 1188, 1197) before `UpdateAIScript` and the move. Dead and hidden monsters run only the script. The script's decisions are not read.
  (b) `UpdateEnemyPosition` (3869). If the enemy stands on the floor within 64 units (3887): without an AAS (area map) every such point counts as reachable (3898); with one, the point counts if the enemy's area is reachable and a path exists from this monster (3900-3904). That tracked point is refreshed every frame, seen or not. Then the in-FOV and visible flags are cleared (3910-3911).
  (c) If `CanSee(enemy, false)` (3913): visible. If `CheckFOV` also passes (3915): in FOV. Then `SetEnemyPosition` (3919). Else, if the enemy is the sound source of this frame (3922) and within `AI_HEARING_RANGE` 2048 (3924), `SetEnemyPosition` runs too (3925).
  (d) `SetEnemyPosition` (3775): copy the tracked point into the chase point (3788); record the enemy's origin as last visible (3790); if the enemy is not on the floor, return and keep the copied chase point; otherwise find its area and path from this monster (3832); on success set the chase point to that point (3833). For a MOVE_TO_ENEMY order, `move.moveDest` is the chase point (3847, 3850).
- Target choice (called by scripts; callers not read):
  `Event_FindEnemy` (AI_events.cpp 347) returns the first client-slot actor that is alive, attack-on-sight and visible, and only when this monster is in the player's PVS (352).
  `Event_FindEnemyAI` (380) returns the nearest such actor: candidates are culled to the current PVS (403), compared by squared distance (407), and CanSee is checked only for a candidate already closer (409).
  `Event_FindEnemyInCombatNodes` (424) returns an alive attack-on-sight actor in view of an enabled combat node, only when the player is in this monster's PVS (431).
- Who may attack (`ReactionTo`, 3253): hidden entities are ignored (3255), and so are non-actors. Different team: attack on sight, damage and activate (3271-3276); `notarget` actors: attack only on damage or activate (3272-3273). Same team: the monster reacts only to damage from a lower-rank attacker, when its own rank is above zero and the attacker's rank is below it (3280-3281); otherwise ignore.
- Enemy list: `SetEnemy` adds the monster to the enemy's `enemyList` (3954); `ClearEnemy` removes it (3734). So each actor (the player included) has the list of monsters that have targeted it (`d3xp/Actor.h` 124).
- Sight (`idActor::CanSee`, `d3xp/Actor.cpp` 1505): a hidden target is not seen (1510). If FOV is requested and fails, not seen (1520). Otherwise trace opaque geometry from this monster's eye to the target's eye (1526); seen if nothing is hit or the first hit is the target (1527). FOV (`CheckFOV`, 1478): a zero fov (fovDot of 1) passes every target (1479); otherwise remove the gravity component from the eye-to-target vector (1492), normalise, and compare the forward dot with `fovDot` (1497).
- Player-side pickers over `enemyList` (`d3xp/Actor.cpp` 1852-1893): `ClosestEnemyToPoint` (non-hidden, nearest to a point, 1865) and `EnemyWithMostHealth` (non-hidden, highest health, 1888).
- Guided shot target (`idGuidedProjectile::Launch`, `d3xp/Projectile.cpp` 1593-1605): if an AI fired it, it takes that AI's current enemy (1593). If the player fired it, trace 1000 units along the view (1598-1599). If the trace hit an actor not on the player's team, take it (1604); otherwise take `EnemyWithMostHealth` (1605). Per-frame turn limit is `turn_max` (default 180) divided by 60 (1613); `clamp_dist` defaults to 256 (1614). The steering body in `Think` was not read.
- Tick: the game frame is `USERCMD_MSEC_PRECISE = 1000/60` ms (`d3xp/Game_local.cpp` 61); the usercmd rate is 60 per second (`framework/UsercmdGen.h` 40).

## 2. Key functions

- `idAI::UpdateEnemyPosition`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/ai/AI.cpp` 3869-3930. Tracked point each frame (3887-3904), sight and FOV flags (3910-3919), hearing fallback (3922-3925).
- `idAI::SetEnemyPosition`: `AI.cpp` 3775-3861. Chase-point copy and refresh (3788-3847).
- `idAI::Event_FindEnemyAI`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/ai/AI_events.cpp` 380-418 (nearest visible). `Event_FindEnemy` at 347-371 and `Event_FindEnemyInCombatNodes` at 424-460.
- `idAI::ReactionTo`: `AI.cpp` 3253-3290 (attack rules by team, notarget, rank).
- `idActor::CanSee` and `CheckFOV`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Actor.cpp` 1478-1527.
- `idActor::ClosestEnemyToPoint` and `EnemyWithMostHealth`: `Actor.cpp` 1852-1893.
- `idGuidedProjectile::Launch` target choice: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Projectile.cpp` 1590-1615.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Visible = trace from eye to eye, no FOV needed; "in FOV" is a separate flag | Trace mask MASK_OPAQUE (theirs, Actor.cpp 1526) |
| FOV as a cone on the horizontal plane: dot >= cos(fov/2), vertical removed | Default fov 90 degrees (theirs, Actor.cpp 539); fovDot = cos(fov x 0.5) (1424); vertical removed (1492) |
| Hearing: a sound from the current enemy within a radius refreshes the chase point | 2048 units (theirs, AI.h 52, tab-separated value) |
| Floor point within 64 units of the enemy's origin before any reachability test | 64 (theirs, AI.cpp 3887) |
| Chase point = previous tracked point, replaced by a fresh reachable point when there is one | None (the rule) (theirs, 3788, 3833) |
| Nearest visible: squared distance, sight checked only for closer candidates | None (the rule) (theirs, AI_events.cpp 407-409) |
| Guided shot: aim trace (1000 units), accept the hit if it is not a teammate, else the most-health hunter | Aim length 1000 (theirs, Projectile.cpp 1598); fallback = most health (1605) |
| Guided turn limit per frame = turn_max / 60 | turn_max default 180 (theirs, 1613); clamp_dist default 256 (1614) |
| Fixed 60 Hz frame | 1000/60 ms (theirs, Game_local.cpp 61) |

## 4. TypeScript sketch

simplified: keeps the FOV cone (horizontal only), nearest-visible pick with sight checked only for closer candidates, the shot-target fallback, and the two-point memory (tracked point every frame, chase point refreshed when seen or heard within 2048). It omits the attack rules (team, notarget, rank), the PVS culling, the combat-node path, the AAS area lookups and floor snapping (reachability is a callback), the flying-monster prediction, the AI_DEST_UNREACHABLE flags, the chat sounds, the enemy-list bookkeeping (SetEnemy and ClearEnemy), and the script side. Order is kept: distance is compared before sight, and the chase point is set to the previous tracked point before the fresh one is tried.

```ts
// Licence: GPL-3.0 with additional id Software terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface V3 { x: number; y: number; z: number; }
export interface Mob { id: string; pos: V3; health: number; team: number; hidden: boolean; alive: boolean; }

const HEARING_RANGE = 2048; // engine constant (donor d3xp/ai/AI.h)

function sub(a: V3, b: V3): V3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function dist2(a: V3, b: V3): number { const d = sub(a, b); return d.x * d.x + d.y * d.y + d.z * d.z; }

// Field of view: horizontal test only (z is up, vertical is ignored); fovCos = cos(fovDeg / 2).
export function inFov(eye: V3, forward: V3, target: V3, fovCos: number): boolean {
  if (fovCos >= 1) return true;
  const d = sub(target, eye);
  const len = Math.hypot(d.x, d.y);
  if (len === 0) return true;
  return (d.x * forward.x + d.y * forward.y) / len >= fovCos; // forward: unit, horizontal
}

// Nearest mob that is alive and not hidden. canSee runs only for a mob already closer than the best so far.
export function pickNearest(me: V3, mobs: Mob[], canSee: (m: Mob) => boolean): Mob | null {
  let best: Mob | null = null;
  let bestD = Infinity;
  for (const m of mobs) {
    if (!m.alive || m.hidden) continue;
    const d = dist2(me, m.pos);
    if (d < bestD && canSee(m)) { best = m; bestD = d; }
  }
  return best;
}

// Shot target: the enemy on the aim line if it is not on the shooter's team, else the healthiest hunter.
export function pickLockTarget(aimHit: Mob | null, shooterTeam: number, hunters: Mob[]): Mob | null {
  if (aimHit && aimHit.team !== shooterTeam) return aimHit;
  let best: Mob | null = null;
  for (const h of hunters) {
    if (h.hidden) continue;
    if (best === null || h.health > best.health) best = h;
  }
  return best;
}

export interface EnemyMemory { tracked: V3 | null; chase: V3 | null; }

// Every frame, while the enemy stands on a reachable point, the tracked point follows it, seen or not.
export function trackEachFrame(mem: EnemyMemory, enemy: Mob, reachable: (p: V3) => boolean): void {
  if (reachable(enemy.pos)) mem.tracked = enemy.pos;
}

// Seen, or heard within HEARING_RANGE, refreshes the chase point: the previous tracked point, then the enemy if reachable.
export function refreshChase(mem: EnemyMemory, enemy: Mob, visible: boolean, heard: boolean, me: V3, reachable: (p: V3) => boolean): void {
  if (!visible && !(heard && dist2(me, enemy.pos) < HEARING_RANGE * HEARING_RANGE)) return;
  mem.chase = mem.tracked;
  if (reachable(enemy.pos)) mem.chase = enemy.pos;
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: sight, FOV, chase point and the enemy pick for an NPC; the lock pick for the player's homing shot). Parity-checklist row 4 (fight loop: aggro, chase, leash). Donor works per game frame at 60 Hz; the Frankendom server tick has to be matched to it. Per-tick NPC budget is not in this donor's code (not read).
- today: no sight or chase-point model in `src/fight/`; the duel step is row 1 and the AI brain is row 2.
- Reuse tag: rewrite-from-idea (GPL-3.0 with additional id terms: clean-room, shape only)
- Brief rule served: 1 (one engine: sight, memory and pick live in src/fight, not in a client); many-on-one target selection lives in the engine; MAX_ATTACKERS = 3 still applies.
Best transferable idea: An NPC that loses sight keeps walking to the last reachable point it tracked, and a sound near the enemy refreshes that point, while the player's homing shot falls back to the healthiest enemy already hunting it.
Decision (proposed): adapt — take the split between "visible" (a trace, no cone) and "in FOV" (a cone flag), the per-frame tracked point, and the lock fallback to the most-health hunter, for the chase, leash and the server's shot-target rule; reject the per-monster script ordering, since Frankendom has one engine and the decision lives there.
Acceptance: A server test asserts that an NPC that loses sight of the player keeps its chase point at the last reachable point it tracked, moves that point again on a sound within 2048 units, and that a player's lock shot with no enemy on the aim line picks the hunter with the most health.

## 6. Gaps and risks

- Licence: GPL-3.0 with id Software additional terms. Clean-room only. The additional-terms text was not read, so any re-use needs that read first.
- The donor's decision layer is in monster scripts (not read). The C++ only supplies sight, memory and picks; the rule for when a monster starts or stops a chase is not verified.
- Units: 2048 and 64 are donor units (their conversion to real distance was not read). Frankendom must choose its own units before the numbers mean anything.
- Frame: the donor runs the monster logic per game frame at a fixed 60 Hz. Frankendom's server tick must match, or the 64-unit floor probe and the 2048 hearing radius move with it.
- Hearing as coded checks only whether the current enemy is the alert entity (3922, `GetAlertEntity` not read); the sound's own position is not used, and a sound from another source does not refresh this enemy's chase.
- The shot-target fallback uses `enemyList`, which holds only monsters that have targeted the player. An NPC that has not yet targeted the player is not a candidate.
- Not read: the guided-projectile steering body; the monster scripts; the base-game copy in `neo/game/` (only grep-checked for these functions).
