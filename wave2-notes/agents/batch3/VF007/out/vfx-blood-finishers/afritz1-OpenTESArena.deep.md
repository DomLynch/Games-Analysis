# afritz1-OpenTESArena (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/CombatLogic.cpp` | Licence: MIT (`LICENSE.txt`: "The MIT License (MIT)", Copyright (c) 2016-2026 The OpenTESArena Developers) | C++ | symbols `CombatLogic::onEntityHitByPlayer`, `CombatLogic::getPhysicalHitVfxEntityInitInfo`, `EntityChunkManager::updateVfx`

Checked: read in full: `CombatLogic::onEntityHitByPlayer` (CombatLogic.cpp 305-505; damage 330-368, blood block 420-451, kill test 453-481, clank else 483-488); `getPhysicalHitVfxEntityInitInfo` (153-185); `EntityChunkManager::updateVfx` (1958-1999); the death loop (EntityChunkManager.cpp 1888-1955); frame order (Game.cpp 938-945, GameState.cpp 1827-1856). Callers: the only src caller of `onEntityHitByPlayer` is `GameState::tickCombatResults` (GameState.cpp 1837, grep); the only caller of `updateVfx` is `updatePrePhysicsStep` (2225), called from GameState.cpp 1789. (not read): `ArenaCombatUtils::isMeleeHitSuccessful` (the enemy hit roll, body not read); the `creatureBlood` byte values in the Arena executable; the frame counts of the blood clips (asset metadata); the spawn sound asset; physics-body setup for VFX. Confidence: high on the hit-to-blood path. Finishers: a case-insensitive grep for finisher/execut/gore/decal/wound in Combat, Entities, Game and Collision found no finisher or execution code (the "execut" hits are comments about the original executable and an error string). camera_scope: not a camera cell.

Best transferable idea: a hit effect is one short-lived event whose kind comes from a per-target data field, spawned at the hit point only when the server-confirmed hit landed, and removed when its clip ends.
Decision (proposed): adapt - Frankendom keeps the shape (kind from data, spawn at the hit point, self-remove at clip end) but the event must come from the server's hit, not a local swing; the donor's clank-on-miss is not copied without a ruling.
Acceptance: a server-confirmed landed hit on a creature shows one blood clip at the hit point for frames/12 s, then it is gone; a killing blow shows blood and no clank; a server test asserts the client effect is emitted only from a server-confirmed hit event.

## 1. Mechanism

- Blood here is a sprite, not a decal. On each landed physical hit (melee or bow) the engine queues one short VFX entity at the hit point. It plays once and is destroyed; nothing stays on the wall or ground (EntityChunkManager.cpp 1965-1967).
- Order of steps on one hit, inside `onEntityHitByPlayer` (CombatLogic.cpp 305):
  (a) Damage is rolled from the source first: melee weapon = `damageMin` + roll (332); unarmed = 1 + roll of 2 + gauntlet armour class (356); bow = 3 + roll of 8 (363). The rest applies only when the target can still be killed, i.e. it is not already in its death state (379).
  (b) For enemies only, a physical hit must pass `ArenaCombatUtils::isMeleeHitSuccessful` (412). Citizens keep the default of "taking damage" (body not read in detail).
  (c) If the hit landed (420): health = max(health - damage, 0) (422). The blood point is the target's entity position plus height min(top-of-head x 0.60, half height) (425), nudged horizontally by -player ground direction x 0.05 (428), "to avoid z-fighting with entity" (comment, 427). The blood kind is the creature's own blood index for creatures (164) and 24 - 24 = 0 for everything else (155, 168-169). The VFX is queued at 449.
  (d) Kill test (453): if health is exactly 0, the target gets `isDying = true` (455) and the XP award block runs (not detailed here). Blood was already queued in (c), so a killing blow still shows blood.
  (e) If health is above 0 (a non-lethal hit or a miss on a living target), a Clank sound plays for physical attacks (486). A miss therefore clanks too.
- Frame order (Game.cpp 938-945): player attack, pre-physics entity step, `physicsSystem.Update` (940), post-physics entity step, then `tickCombatResults` (944) which applies the hit, then `tickEntityInstantiations` (945) which creates the queued VFX. The GameState comment (1829) says hits are applied after physics because contact handlers may not create bodies.
- Blood lifetime: VFX clips are loaded non-looping (EntityAnimationLibrary.cpp 238) at 1/12 s per frame (ArenaAnimUtils.h:83; state length at ArenaAnimUtils.cpp 1360). `updateVfx` (1965) removes a VFX once `isFinished()` is true (EntityAnimationInstance.cpp 15: finished = not looping and progress 1.0). Lifetime = frame count / 12 s; frame count not read.
- Kinds: there are three physical-hit clips (EntityAnimationUtils.h:20; comment at EntityAnimationLibrary.cpp 196 reads "Blood, demon, undead"). Creature kind comes from a 24-byte table in the Arena executable (ExeData.h:176, read at CreatureDefinitionLibrary.cpp 37). The byte values were not read.
- Death: after `isDying`, `updateDeathStates` (called at 2224; loop at EntityChunkManager.cpp 1888-1955) starts the death animation if one exists, then turns the entity into a corpse or destroys it when the animation finishes (1931-1951). With no death animation it destroys at once (1910). This is the only "finisher-like" step: there is no separate execution move.

## 2. Key functions

- `CombatLogic::onEntityHitByPlayer`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/CombatLogic.cpp` 305-505. Damage, hit roll, health clamp, blood queue, kill test, clank.
- `CombatLogic::getPhysicalHitVfxEntityInitInfo`: same file, 153-185. Picks the blood clip index (base 24, minus 24) and the VFX definition key.
- `EntityChunkManager::updateVfx`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 1958-1999. Destroys finished VFX each frame.
- `GameState::tickCombatResults` / `tickEntityInstantiations`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/GameState.cpp` 1827-1856. Apply queued hits, then create the queued entities.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A landed hit spawns one effect; a miss does not; a kill still spawns it | none (the branch at 420) |
| The effect ends when its clip ends, not on a timer | 1/12 s per frame (ArenaAnimUtils.h:83); 3 clips (EntityAnimationUtils.h:20) |
| Effect height is min(top of head x 0.60, half height) | 0.60 (CombatLogic.cpp:425); top-of-head value from Player.h:30 (value not read) |
| Effect nudged a little toward the player to avoid z-fighting | 0.05 (CombatLogic.cpp:428) |
| Effect kind comes from a per-target table, default 0 | base 24 (CombatLogic.cpp:155); creatureBlood[24] exe table (values not read) |
| Health floor at 0 and the kill test is "exactly 0" | floor 0 (CombatLogic.cpp:422, 453) |
| Clank when the target survives | none (486) |

Damage sources for context (the combat-sim topic, not this note's focus): weapon min + roll (332), unarmed 1 + roll of 2 + gauntlet class (356), bow 3 + roll of 8 (363), spell 10 + roll of 40 (367, magic branch not used by the sketch).

## 4. TypeScript sketch

simplified: keeps the donor order for the blood path: damage applied and clamped first, then the blood effect only when the hit landed (kill blood included), then the clank only when the target survives (a miss clanks, as in the donor). Physical hits only; the magic explosion branch is omitted. It also omits the enemy hit roll (not read), the damage sources, the XP award, the spawn sound name, the instantiate queue and physics body, and the death-animation state. Two deliberate changes: the donor crashes (DebugCrash) on an out-of-range creature blood index, and the sketch falls back to clip 0 instead; the per-frame removal is a plain time check (ageS against lifeS), not the donor's animation progress flag.

```ts
// Licence: MIT (donor). Clean-room sketch of the mechanism; not a line-by-line translation.
// clean-room
export interface PhysicalHit {
  landed: boolean;        // the swing connected (enemies roll to hit; the roll itself is not in this sketch)
  hpBefore: number;       // target health before the hit
  damage: number;         // damage already rolled by the caller
  targetKind: 'creature' | 'human' | 'citizen';
  bloodKind: number;      // creature blood clip index from the catalogue; ignored for non-creatures
  feetX: number;
  feetY: number;
  feetZ: number;
  halfHeight: number;     // target bounding-box half height
  biasX: number;          // small horizontal nudge toward the attacker, supplied by the caller
  biasZ: number;
}

export interface HitTuning {
  topOfHeadUnits: number; // engine constant: the player's top-of-head height
  heightFrac: number;     // share of top-of-head used as the hit height (0.60 in donor)
  clipCount: number;      // number of blood clips (3 in donor)
  clipFps: number;        // clip playback rate (12 in donor)
}

export interface VfxSpawn { clip: number; x: number; y: number; z: number; lifeS: number; }

export interface HitOutcome {
  health: number;         // health after the hit
  lethal: boolean;        // health reached exactly 0 on this hit
  vfx: VfxSpawn | null;   // blood clip, only when the hit landed
  playClank: boolean;     // metal-on-body cue, when the target is still alive
}

export function resolvePhysicalHit(hit: PhysicalHit, tune: HitTuning, framesOf: (clip: number) => number): HitOutcome {
  const health = hit.landed ? Math.max(hit.hpBefore - hit.damage, 0) : hit.hpBefore;
  const lethal = health === 0;

  let vfx: VfxSpawn | null = null;
  if (hit.landed) {
    // Non-creatures always use clip 0; creatures use their own clip, which must be in range.
    const clip = hit.targetKind === 'creature' && hit.bloodKind >= 0 && hit.bloodKind < tune.clipCount ? hit.bloodKind : 0;
    const h = Math.min(tune.topOfHeadUnits * tune.heightFrac, hit.halfHeight);
    vfx = {
      clip,
      x: hit.feetX + hit.biasX,
      y: hit.feetY + h,
      z: hit.feetZ + hit.biasZ,
      lifeS: framesOf(clip) / tune.clipFps, // one-shot: lives exactly as long as its clip
    };
  }
  return { health, lethal, vfx, playClank: !lethal };
}

export interface LiveVfx { spawn: VfxSpawn; ageS: number; }

// Called once per frame with the frame delta; a one-shot is removed when its clip has played out.
export function tickVfx(live: LiveVfx[], dtS: number): LiveVfx[] {
  const next: LiveVfx[] = [];
  for (const v of live) {
    const ageS = v.ageS + dtS;
    if (ageS < v.spawn.lifeS) {
      next.push({ spawn: v.spawn, ageS });
    }
  }
  return next;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp/VF007-afritz1-blood.ts with `export {}` appended), exit 0.

## 5. Lands in

- TARGET `src/fight/hitfx.ts`: the engine emits one hit event (landed, lethal, creature blood kind, feet point, half height); the spawn and tick run in the client. The brief does not name a client module for this, so none is claimed. Parity-checklist row 8 (blood/wounds/decals).
- Frankendom side: not checked in this pass (no repo access here).
- Reuse tag: adapt-from-idea (MIT: code may be adapted; this sketch is still clean-room from the mechanism)
- Brief rule served: 1 (one engine: the hit is one event, the client only draws it); server-verified kills (the effect follows the server's confirmed hit, not the local swing)

## 6. Gaps and risks

- Blood here is a one-shot sprite, not a decal. There is no stain, no wound that stays, and no gore state. If Frankendom wants lasting marks, this donor gives nothing for them.
- No finisher in this donor. The only end-of-life step is the death animation (EntityChunkManager.cpp 1931-1955), then a corpse or a destroy. The "finishers" half of the category is NONE in this donor.
- Server-verified kills: the donor decides the hit, the damage and the blood in one local call (`onEntityHitByPlayer`). Frankendom must not let the client decide "landed"; the effect has to follow the server's hit event.
- Order: the donor queues blood before the kill check, so a killing blow shows blood. Frankendom needs one ledger: the health change and the effect come from the same event.
- Clank on a miss: the donor plays it against a living target even when the swing misses (486). Not copied without a ruling.
- Creature blood kind values are bytes in the Arena executable and were not read. Frankendom's catalogue field (parity row 21) needs real values from the asset data.
- The clip count (3) and frame rate (12 per second) are donor constants. Frankendom should make them per-effect data with these defaults.
- The donor crashes on an out-of-range creature blood index; the sketch falls back to clip 0 instead. That is a deliberate change.
- Phone performance of many concurrent one-shots was not evaluated.
