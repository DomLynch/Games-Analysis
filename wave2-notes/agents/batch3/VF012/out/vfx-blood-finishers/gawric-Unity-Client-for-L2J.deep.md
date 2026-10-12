# gawric-Unity-Client-for-L2J (vfx-blood-finishers, cell 1)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/MonsterManager/Dead/DeadManager.cs` | Licence: Apache-2.0 (repo root LICENSE, read: "Apache License, Version 2.0, January 2004"; no per-file header) | C# (Unity) | symbol `DeadManager.AddDeadAndRemove`

Checked: `DeadManager.cs` read in full (1-102); `Dead/L2ActorFade.cs` read in full (1-279); `Dead/Model/DeadData.cs` read in full (1-65); caller `World.cs` read at 134-150, 168, 455-515 (`DeleteObject` starts at 466; its item branch and anything after 515 not read). Both callers of `AddDeadAndRemove` (World.cs 487 and 510) were read. Hint file `Editor/L2EffectGenerator/Pipeline/L2EffectGeneratorCompositeBuilder.cs` read 1-120 of 334: an editor builder for composite effect prefabs, not the mechanism. `Scripts/Rendering/Effects/V2/Core/SpawnScheduler.cs` read in full, but it is a separate mechanism and is not written up here (see section 6). Confidence: high for the corpse-fade path. Not read: `Entity.Identity`, `NameplatesManager.Remove`, the NPC disappear path (`BeginActorDisappear`), and how Unity frees material instances.

Best transferable idea: After a server-confirmed kill, keep the body for a fixed 2.0 s, drop its nameplate on the first frame, and fade it linearly to invisible on frame time before removing it.
Decision (proposed): adapt - take the 2 s linear fade as a client-only view of the server kill, and fix the two defects in section 6 in our code; the donor's own rule (no fadable renderer means instant removal) is kept.
Acceptance: In the world, a monster killed by the server's delete packet loses its nameplate at once, its body fades from opaque to invisible over 2.0 s, then leaves the scene; a server test asserts the kill is recorded before any fade starts, and a client test asserts the body is removed on the first frame after 2.0 s.

## 1. Mechanism

- Trigger: the server's delete packet for an object id reaches `World.DeleteObject` (World.cs 466). For a monster (482) that is dead (484), the body is handed to the death fade (487); a living monster is removed at once (492). An NPC that is dead goes to the same fade (510).
- `DeadManager.AddDeadAndRemove` (62-82), run once per death: (a) ignore a null entry or an id already in the dictionary (64); (b) `DeadData.TryBeginFade` (69) swaps the body's renderers to the fade shader, using per-renderer material copies, and does NOT keep a shared-material backup (DeadData.cs 52 calls the 3-argument `TryBegin`, which passes `captureShared` false: L2ActorFade.cs 50, 125-128; `ApplyFadeShader` 252-278); if that fails, `OnReadyToRemove` fires at once and no fade runs (71); (c) otherwise the nameplate is removed (77), alpha is set to 255 (80), and the entry is added to the dictionary (81).
- `DeadManager.Update` (32-60), every frame: an entry whose entity is gone is dropped (42-46); `elapsed += Time.deltaTime` (48); if `elapsed > 2.0` the body finishes (49-52, `Finish` at 84-91 fires `OnReadyToRemove(id)` only when id is not 0); otherwise alpha = `clamp(255 - elapsed * 127.5)` (56; L2ActorFade.cs 39). Finished ids are removed from the dictionary after the loop (59, 93-101).
- Result: the body is visible for 2.0 s, fades in a straight line from opaque to invisible, and then `World.RemoveObject` runs (subscribed at World.cs 145; `RemoveObject` at 168).
- Numbers: 255 / 127.5 = 2.0, so alpha reaches 0 exactly at 2.0 s; removal happens on the first frame where elapsed is strictly greater than 2.0.
- Clock: `Time.deltaTime`, so the fade follows frame time, not a frame count. Unity scales `Time.deltaTime` by `Time.timeScale` (Unity behaviour, not read in the donor), so the fade freezes when the game is paused.

## 2. Key functions

- `DeadManager.AddDeadAndRemove`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/MonsterManager/Dead/DeadManager.cs` 62-82 (dedupe, no-fade check, start at full alpha).
- `DeadManager.Update`: same file, 32-60 (dt accumulate, finish when past 2 s, else set alpha).
- `DeadManager.Finish`: same file, 84-91 (id guard, removal callback).
- `L2ActorFade.AlphaByte`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/MonsterManager/Dead/L2ActorFade.cs` 37-40; constants 11-12.
- `L2ActorFade.TryBegin` (private overload): same file, 100-157; `ApplyFadeShader` 252-278; `IsFadeRenderer` 214-232.
- `DeadData.TryBeginFade`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/MonsterManager/Dead/Model/DeadData.cs` 40-54; `SetAlphaByte` 56-64; `GetIdEntity` 20-23.
- Caller `World.DeleteObject`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/World.cs` 466; monster branch 482-492; NPC branch 508-510.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Linear alpha ramp from opaque to invisible over a fixed duration, clamped to 0..255 | Duration 2f s (theirs, L2ActorFade.cs 11); slope 127.5f per second (theirs, L2ActorFade.cs 12), which is 255 / 2 |
| Death starts a timed presentation; expiry calls a removal callback; a dictionary keyed by entity id ignores duplicates (DeadManager 64) | None |
| Nameplate removed on the first frame of the fade (77) | None |
| Strict greater-than test on elapsed (49) | Threshold 2 s |
| Fade only touches mesh and skinned mesh renderers; particle renderers are excluded (221-231) | Theirs, L2ActorFade.cs 221 and 231 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: add (dedupe, no-fade check, start at full alpha), then tick (add dt, finish when past the duration, else set alpha), and remove finished bodies after the loop. It omits the material swap and restore (DeadData.TryBeginFade, L2ActorFade.ApplyFadeShader), the nameplate removal, the IsValid check for vanished entities, and the render-queue details. `canFade` stands for `L2ActorFade.TryBegin` returning false. It does NOT copy the donor's id-0 guard (a defect, section 6): the sketch always fires `onRemove`.

```ts
// Licence: Apache-2.0 (donor repo LICENSE). Clean-room sketch written from the described mechanism; no donor lines copied.
const FADE_DURATION_S = 2;   // donor L2ActorFade.DurationSeconds
const ALPHA_PER_S = 127.5;   // donor L2ActorFade.AlphaPerSecond (255 / 2)

interface CorpseFade {
  id: number;
  elapsed: number;
  alpha: number; // 0..255
}

// Donor AlphaByte: 255 - elapsed * 127.5, clamped to 0..255, truncated to a byte.
function alphaAt(elapsed: number): number {
  const v = 255 - elapsed * ALPHA_PER_S;
  if (v <= 0) return 0;
  if (v >= 255) return 255;
  return Math.floor(v);
}

class CorpseFadeSet {
  private fades = new Map<number, CorpseFade>();

  constructor(private onRemove: (id: number) => void) {}

  // canFade = the body has at least one fadable renderer. If not, the body is removed at once.
  add(id: number, canFade: boolean): void {
    if (this.fades.has(id)) return;          // duplicate id: ignored
    if (!canFade) {
      this.onRemove(id);
      return;
    }
    this.fades.set(id, { id, elapsed: 0, alpha: 255 });
  }

  // dt in seconds. Finished bodies are collected, then removed after the loop.
  tick(dt: number): void {
    const done: number[] = [];
    for (const f of this.fades.values()) {
      f.elapsed += dt;
      if (f.elapsed > FADE_DURATION_S) {
        done.push(f.id);
        continue;
      }
      f.alpha = alphaAt(f.elapsed);
    }
    for (const id of done) {
      this.fades.delete(id);
      this.onRemove(id);
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/gawric-death-fade.ts), exit 0. The sketch file is `work/gawric-death-fade.ts` in the VF012 folder.

## 5. Lands in

- TARGET `src/fight/death.ts`: the engine emits the server-verified death; a client view in the world reads that event and runs the 2.0 s fade. The fade never changes the outcome.
- Parity-checklist row 17 (death/respawn). Hint row 10 (hit impact) does not fit: this donor code is a corpse fade, not a hit reaction.
- today: (not read) Frankendom's current death presentation.
- Reuse tag: rewrite-from-idea (Apache-2.0, adaptable; the sketch copies no lines)
- Brief rule served: 17 (death/respawn presentation); the ruling that kills are server-verified and that the camera, HUD and sound are client-only.

## 6. Gaps and risks

- Defect 1, id-0 guard: `Finish` calls `OnReadyToRemove` only when `GetIdEntity()` is not 0 (DeadManager.cs 86-89). `GetIdEntity` returns 0 when `Identity` is null (DeadData.cs 22). The entry is still dropped from the dictionary (51-52), so such a body would stay in the scene at alpha 0 (whether anything else removes it: not read). Fix: remove the body through its entity reference, not the id, or fail loudly when the id is 0.
- Defect 2, no material cleanup on the death path: `DeadData` never calls `L2ActorFade.Restore` (a grep of `Assets/Scripts` shows `Restore` is called only from `AppearFadeService.cs` 87, 106, 149, 263). Even if it did, `Restore` returns at once when there is no shared backup (L2ActorFade.cs 71-74), and the death path never creates one (captureShared is false, 50, 125-128). The per-body material instances made by `renderer.materials` (L2ActorFade.cs 144) are therefore not destroyed through `DestroyIfNotShared` (234-250) when the body is removed. Whether Unity frees them with the object: not read. Fix: keep the instances on the body's record and destroy them in the removal callback before the body is released.
- Design point, not a defect: a body with no fadable renderer is removed at once (DeadManager.cs 69-72), so it vanishes with no 2 s beat. For Frankendom, a timed hold would keep the death readable; fix: use a timed hold when there is nothing to fade.
- Defect 3, id reuse: the dedupe on id (64) means a respawn that reuses the same id is ignored until the old body is removed. Fix: key the fade by the death event, not by the object id.
- Time scaling: the fade pauses with `Time.timeScale` (section 1). Fine for a pause menu; the Pit must decide whether a death fade runs during a pause.
- Not written up here: `Scripts/Rendering/Effects/V2/Core/SpawnScheduler.cs` (whole file read) is a fractional spawn accumulator for particle counts: `Accumulator += countPerSecond * deltaTime`, spawns `min(remaining, floor(Accumulator))`, then subtracts what it spawned (lines 19-30). Its caller is `ParticleStreamRuntime.cs` 353. It has no clamp on the accumulator, so one long frame builds a backlog that is paid out in later calls. It is a possible separate cell for blood spray rates; not scored here.
