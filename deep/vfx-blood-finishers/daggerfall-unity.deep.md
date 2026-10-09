# daggerfall-unity (vfx-blood-finishers, cell 13)

Donor: /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyBlood.cs | Licence: MIT | C# | symbol EnemyBlood.ShowBloodSplash
Symbol check: EnemyBlood.ShowBloodSplash (26-39) confirmed. The file is 56 lines and was read whole again. The class also has ShowMagicSparkles (41-54), which uses the same code shape.

## 1. Mechanism
- A one-shot effect on an enemy. Given a frame index and a world position, it creates a billboard that plays its animation once and then ends.
- Inputs: the blood frame index from the game's texture archive (archive 380) and the hit position. Output: a new GameObject with a billboard component.
- Steps: confirm the game instance exists. Create the billboard from archive 380 and the frame index. Name it "BloodSplash". Move it to the hit position, pushed 0.02 units along `transform.forward` of the object the EnemyBlood component sits on (assumed to be the enemy; the attachment is not shown in this file), so it sits just off the surface. The third argument to the billboard factory is null (no parent). Set it to one-shot and play at 10 frames per second.
- No tick and no game state in this file. Who calls it and when is not in the file (callers not read); it is a public method on a MonoBehaviour, so a caller supplies the frame index and the position.

## 2. Key functions
- EnemyBlood.ShowBloodSplash (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyBlood.cs | 26-39 | one-shot blood billboard at the hit point (the null check on the Unity instance is line 30).
- EnemyBlood.ShowMagicSparkles (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyBlood.cs | 41-54 | the same shape for the magic sparkle frame.
- EnemyBlood constants (daggerfall) | /mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyBlood.cs | 23-24 | the blood archive (380, line 23) and the sparkle frame (3, line 24); ShowMagicSparkles reuses archive 380.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| One-shot animated sprite at the hit point, offset off the surface along the facing direction | Offset 0.02 units (theirs, lines 35 and 50) |
| Frame rate for one-shot sprite playback | 10 frames per second (theirs, line 37) |
| Sprite archive and frame chosen by the caller | Archive 380 and sparkle frame 3 (theirs, lines 23-24) |

## 4. TypeScript sketch
simplified: no GameObject or texture lookup (the donor builds the billboard from archive and frame through `CreateDaggerfallBillboardGameObject`), no parent argument, no sparkles variant; `facing` stands in for the component's `transform.forward` (the enemy's facing, not the surface normal); one-shot playback and removal belong to the Billboard component (not read).

```ts
// Licence: MIT (daggerfall-unity). Logic lifted from Assets/Scripts/Game/EnemyBlood.cs
// (ShowBloodSplash) and rewritten in TS with local types.
interface Vec3 { x: number; y: number; z: number; }
interface Billboard { archive: number; frame: number; oneShot: boolean; fps: number; pos: Vec3; name: string; }

const SURFACE_OFFSET = 0.02; // theirs
const FPS = 10;              // theirs
const BLOOD_ARCHIVE = 380;   // theirs

function showBloodSplash(frame: number, hit: Vec3, facing: Vec3, gameReady: boolean): Billboard | null {
  if (!gameReady) return null;
  return {
    archive: BLOOD_ARCHIVE,
    frame,
    oneShot: true,
    fps: FPS,
    name: 'BloodSplash',
    pos: {
      x: hit.x + facing.x * SURFACE_OFFSET,
      y: hit.y + facing.y * SURFACE_OFFSET,
      z: hit.z + facing.z * SURFACE_OFFSET,
    },
  };
}

```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/blood-splash.ts (proposed new module; today src/gore.ts (moving)), the splash layer of row 8.
- Parity-checklist row: 8 (blood, wounds, pools, decals, hero blood-edge; K5).
- Reuse tag: reuse-as-is for the pattern (MIT); the sprite archive is Daggerfall's own
- Brief rule served: (category default, not per-cell) 2 (engage is a state change); rules 7-9 n/a

## 6. Gaps and risks
- Minimal: one billboard per hit. It does not handle wounds, decals, finishers or any state.
- No server or sync concern: the splash is cosmetic and client-only, which fits one engine and server-verified kills as long as the hit is decided on the server and the splash is driven by the engine's hit event, not the other way round. With MAX_ATTACKERS = 3 splash count per frame is small. The offset uses the enemy's forward vector, so it would float off a wound on a hero turning mid-hit; Frankendom should use the hit point's own normal.
- Uses Daggerfall's billboard component, so Frankendom must supply its own sprite-at-point primitive.
- The lifetime of the one-shot billboard is handled by the Billboard component (OneShot flag); this file does not show the end condition.
