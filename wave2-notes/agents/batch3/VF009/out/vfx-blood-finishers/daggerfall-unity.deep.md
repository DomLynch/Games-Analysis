# daggerfall-unity (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyBlood.cs` (the list's hint file, which is a thin wrapper; the real rules are in `WeaponManager.cs`, `EnemyAttack.cs`, `EnemyMotor.cs`, `Entities/DaggerfallEntityBehaviour.cs` and the sprite player `Internal/DaggerfallBillboard.cs`) | Licence: MIT (repo `LICENSE` line 1 "MIT License", line 5 grant text; `EnemyBlood.cs` header line 4 "License: MIT License") | C# (Unity) | symbols `EnemyBlood.ShowBloodSplash`, `WeaponManager.WeaponDamage`, `EnemyAttack.ApplyDamageToNonPlayer`, `EnemyMotor` fall damage, `DaggerfallEntityBehaviour.DamageHealthFromSource`, `DaggerfallBillboard.AnimateBillboard`

Checked: category_no 13 (vfx-blood-finishers), camera_scope not applicable. Read in full: `EnemyBlood.cs` (1-56), `EnemyHealth.cs` (1-58, deprecated), `Internal/DaggerfallBillboard.cs` 44-66 and 93-165 (the sprite playback), `Utility/GameObjectHelper.cs` 313-330 (the constructor), `Game/WeaponManager.cs` 490-625 (the hit path to the blood and the start of knockback), `Game/EnemyAttack.cs` 296-340 (the enemy's hit on a non-player target), `Game/EnemyMotor.cs` 1396-1410 (fall), `Game/Entities/DaggerfallEntityBehaviour.cs` 160-177, `Utility/EnemyBasics.cs` 232-234 and 741 (BloodIndex). Not read: `FormulaHelper.CalculateAttackDamage` (the damage source), the contents of TEXTURE.380 (game data, not in the repo), the knockback maths after line 595 of `WeaponManager.cs`, and the callers `EntityEffectManager.cs` 2059-2067 (sparkles), `TransferHealth.cs` 55 and `ContinuousDamageHealth.cs` 56 (seen in grep only). Confidence high on the gating rules and the sprite playback; moderate on the full hit flow, since the damage formula was not read.

## 1. Mechanism

- A "blood splash" here is a one-shot animated sprite (a billboard), not a particle system and not a decal. It is created at the hit point, plays its frames once, and removes itself.
- `EnemyBlood.ShowBloodSplash(bloodIndex, bloodPosition)` (`EnemyBlood.cs` 26-39): checks that the `DaggerfallUnity` instance exists (29-30); creates a billboard from archive 380 with frame `bloodIndex` (32); sets its position to `bloodPosition + transform.forward * 0.02f` (35), so the sprite sits 0.02 units in front of the enemy's facing and not inside the body; sets `OneShot = true` (36) and 10 frames per second (37).
- Sparkles (`ShowMagicSparkles`, 41-54) are the same path with frame 3 (`sparklesIndex`, 24, 47). Magic casters call it (grep only).
- The sprite plays in `DaggerfallBillboard.AnimateBillboard` (`Internal/DaggerfallBillboard.cs` 115-165). The loop reads `FramesPerSecond` on each step (119) and waits `1f / speed` between frames (164). When `CurrentFrame` reaches the frame count it resets to 0 and, if `OneShot`, destroys the object (127-131). The sprite is also turned to face the camera in `Update` (107-111), so it reads from any side.
- Who spawns blood, and when (the order matters):
  1. Player weapon hit on a monster or class enemy (`WeaponManager.cs` 491-625). Damage is computed first (547, from the damage formula, not read). If damage > 0 (562), the hit sound plays, then the blood is shown with the enemy's `BloodIndex` at the impact point (569-572), then knockback (575-595). If damage is 0 the swing or parry sound plays instead, and no blood is shown (609-615). The damage > 0 test runs before the enchantment step (618-623), so a later change to damage does not undo the blood.
  2. Player weapon hit on a non-guard NPC (`WeaponManager.cs` 500-508). Blood is shown first, with index 0 at the impact point, with no damage test (the branch has no damage value at all), then the NPC is deactivated (509), crime requirements are tallied, a murder is recorded and city guards are spawned (510-512).
  3. Enemy hits a non-player target (`EnemyAttack.cs` 303-333). No target means return 0 (305-306). If damage > 0 (321), the target's `BloodIndex` is shown at its centre raised by `height / 8` (325-332).
  4. Fall damage (`EnemyMotor.cs` 1396-1407). Above the fall threshold, the enemy loses health and bleeds at its own position with index 0 (1403-1406). No damage test.
  5. Health removed from a source (`DaggerfallEntityBehaviour.cs` 162-176). Health drops first (165), then if `showBlood` is set (the caller decides) it shows index 0 at the given position (173-175). The damage spell passes `false` (`DamageHealth.cs` 54), so magic damage shows no blood on this path.
- `EnemyHealth.RemoveHealth` (`EnemyHealth.cs` 40-56) is an old standalone example, marked deprecated (19). It shows blood with no damage test (52).
- The per-creature frame comes from `MobileEnemy.BloodIndex` (`DaggerfallUnityStructs.cs` 191: "Index in TEXTURE.380 for blood splash"). `EnemyBasics.cs` 232 says the static table fills in data the game files do not give. Six entries set `BloodIndex = 2` (741 and five more). The rest keep the struct's default of 0 (the object initialiser leaves an unset int at 0; this is reasoning, not a read of a default).

## 2. Key functions

- `EnemyBlood.ShowBloodSplash`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyBlood.cs` 26-39. One-shot 10 fps sprite, 0.02 nudge, index from the caller.
- `WeaponManager.WeaponDamage`, blood block: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/WeaponManager.cs` 561-573. The damage > 0 gate and the enemy's frame.
- `AnimateBillboard`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Internal/DaggerfallBillboard.cs` 115-165. Frame advance, one-shot removal.
- `EnemyAttack.ApplyDamageToNonPlayer`, blood block: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyAttack.cs` 320-333. Position at the target's centre raised by height/8.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| No damage, no blood (zero-damage hits show nothing) | Gate is damage > 0 (theirs, `WeaponManager.cs` 562 and `EnemyAttack.cs` 321) |
| One-shot sprite at the hit point, pulled off the surface | Nudge 0.02 along facing (theirs, `EnemyBlood.cs` 35) |
| Sprite playback rate | 10 frames per second (theirs, `EnemyBlood.cs` 37); the billboard default is 5 (`DaggerfallBillboard.cs` 46) |
| Frame chosen per creature | `BloodIndex` in TEXTURE.380; six table entries = 2, rest 0 (theirs, `EnemyBasics.cs` 741) |
| Sparkles: same sprite path, another frame | Frame 3 (theirs, `EnemyBlood.cs` 24) |
| Centre-of-body splash for a target | Position = centre + height / 8 (theirs, `EnemyAttack.cs` 327-328) |
| Fall: bleed at the centre | Index 0 (theirs, `EnemyMotor.cs` 1406) |

## 4. TypeScript sketch

simplified: the sketch keeps the rule that a hit shows blood only when its damage is above 0, the 0.02 nudge along the creature's facing, the 10 fps playback and the removal after the last frame, and the per-creature frame. It omits the camera-facing billboard, the atlas and archive lookup, the sparkles, the NPC, fall and magic paths (the sketch takes one hit path only), the knockback, the sound calls, and the enchantment step that the donor runs after the blood. Its `frameAt` is a simplification of the donor's coroutine (it uses elapsed time, not a wait loop), so frame timing can differ by up to one frame.

```ts
// Licence: MIT (donor LICENSE, Daggerfall Workshop 2009-2023). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number; }

export interface CreatureVisual {
  bloodFrame: number; // per-creature data field; the donor's struct default is 0
}

export interface Splash {
  frame: number;
  position: Vec3;
  fps: number;
  oneShot: true;
}

export const SPLASH_FPS = 10;   // donor: c.FramesPerSecond = 10
export const FACE_NUDGE = 0.02; // donor: transform.forward * 0.02f, pulls the sprite off the body

function nudge(p: Vec3, forward: Vec3, d: number): Vec3 {
  return { x: p.x + forward.x * d, y: p.y + forward.y * d, z: p.z + forward.z * d };
}

// Called once per landed hit. Blood is shown only when the hit did damage (zero-damage hits show nothing).
export function onHit(
  damage: number,
  creature: CreatureVisual,
  hitPoint: Vec3,
  forward: Vec3,
  spawn: (s: Splash) => void,
): void {
  if (damage <= 0) return;
  spawn({
    frame: creature.bloodFrame,
    position: nudge(hitPoint, forward, FACE_NUDGE),
    fps: SPLASH_FPS,
    oneShot: true,
  });
}

// Frame to show at `elapsedS` seconds after spawn, or null once the sprite should be removed.
// Donor: frames play in order at FramesPerSecond; the object is destroyed after the last frame.
export function frameAt(elapsedS: number, fps: number, frameCount: number): number | null {
  const frame = Math.floor(elapsedS * fps);
  return frame >= frameCount ? null : frame;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/blood.ts` (the client splash layer, the same module the Crawl note targets; it reads the server-verified hit event and draws a one-shot sprite, and the engine never reads it). Parity-checklist row 8 (blood/wounds/decals).
- Reuse tag: adopt (MIT: code may be adapted; this note's sketch is still clean-room)
- Brief rule served: 1 (one combat core, two clients); the splash is client-only per the camera/HUD/sound ruling; rules 7-9 n/a

## 6. Gaps and risks

- The damage > 0 gate is only correct if the damage it reads is server-settled. Frankendom's hit event must carry the final damage the server settles, not a client estimate, or blood could show for a hit the ledger never recorded. (The donor's damage formula was not read, so what it includes is (not read).) The donor takes damage before the enchantment step; Frankendom must choose one order and test it.
- The per-creature frame is a catalogue field (parity row 21), not zone data. The table fills gaps the game files do not give, so Frankendom's catalogue must state the default (0) and the six non-default entries explicitly, or a missing value will look like a bug.
- Billboard sprites face the camera (`DaggerfallBillboard.cs` 107-111). In a third-person follow camera the sprite must face the camera, not the world, or the blood will read edge-on from the over-the-shoulder view. This is a camera-side requirement, not a blood rule.
- The donor has no per-frame budget. A heavy fight with many hits can spawn many sprites; Frankendom needs a cap per frame and per fight, set as data.
- The NPC and fall paths show blood without a damage test. Do not copy those two paths; only the damage > 0 path fits Frankendom's rulings.
- Magic damage passes `showBlood = false` (`DamageHealth.cs` 54). Frankendom may want the same rule (no blood from spells) or not; this is a design choice, not a donor fact to copy blindly.
- Unread: the damage formula (`FormulaHelper`), the knockback maths after line 595 (a separate cell), and the TEXTURE.380 frame contents.

Best transferable idea: show blood only when the hit did damage, as a one-shot 10 fps sprite pulled a little off the body at the hit point, with the creature's blood frame read from its own data entry.

Decision (proposed): adopt — the zero-damage gate, the one-shot playback and the per-creature frame field are small, clear, and fit the client splash layer; take them as they are, with the damage value coming from the server-settled hit.
Acceptance: a server-verified hit of 0 damage shows no blood; a hit of N > 0 shows one one-shot blood sprite at the hit point, nudged 0.02 units along the creature's facing, playing 10 frames per second and removed after its last frame; each creature's blood frame comes from its catalogue entry (default 0, six entries set to 2).
