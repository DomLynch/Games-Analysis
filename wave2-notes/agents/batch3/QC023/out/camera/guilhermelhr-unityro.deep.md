# guilhermelhr-unityro (camera, cell 14)

Donor: `/mnt/frankendom-donors/guilhermelhr-unityro/UnityClient/Assets/Scripts/GameCamera/CharacterCamera.cs` | Licence: AGPL-3.0 (`/mnt/frankendom-donors/guilhermelhr-unityro/LICENSE`, read: "GNU AFFERO GENERAL PUBLIC LICENSE", "Version 3, 19 November 2007") | C# (Unity) | symbol `CharacterCamera`

Checked: camera_scope: world camera. Read in full: `GameCamera/CharacterCamera.cs` (141 lines), `GameCamera/CameraControlProfile.cs` (55 lines), and the camera component in `Resources/Prefabs/Player/PlayerCameraController.prefab` (61 lines). Callers: grep only (`Utils/OfflineUtility.cs` 86-87 and `Scenes/Map/MapController.cs` 71-72 call `SetTarget` with the entity's viewer transform; those files were not read in full). The frame-pace calculators read `CharacterCamera.ROCamera.Direction` (grep only). A grep of all of `Assets/Scripts` for FOV, shake, lock-on and camera collision found nothing; the raycasts found are for picking, not the camera. Confidence high on the control flow and on the serialized values (the receipts in `receipts.tsv` are verified). Offsets and the coast figures are hand-computed, not run in Unity. Not read: the camera's parent transform in the scene (the code writes `localPosition`), the Unity input axis definition, the entity side. The donor is a chase camera with a 30-45 deg pitch band: no over-the-shoulder offset.

## 1. Mechanism

- An orbit camera around the target's root transform. State: yaw (`m_Yaw`), pitch (`Pitch`, clamped to 30-45 deg), and distance (`Distance`, clamped to 20-50 by the prefab). The position is `target - HorizontalDirection * Distance`, where the horizontal part is `cos(yaw) * cos(pitch)` and `sin(yaw) * cos(pitch)` and the vertical part is set to `-sin(pitch)` (`CharacterCamera.cs` 110-111, 131, 136-137). So the camera sits on a sphere of radius Distance around the target, above it at the pitch elevation, and then looks at the target (117).
- Input, in Update (`CharacterCamera.cs` 55-95). With the right mouse button (button 1) held: if Shift is down, mouse Y and the scroll wheel change pitch by `value * dt` (64-67); otherwise mouse X sets the yaw inertia (61, 71). Releasing the button releases the yaw inertia when Shift is not down (73-76). A wheel tick without Shift sets the zoom inertia to `wheel * 50` and releases it at once (79-82).
- Inertia (`CameraControlProfile.cs`). SetInertia stores the velocity and sets the ratio to 1 (24-29). Release starts a coast only when `|velocity|` is at least the threshold (49; yaw threshold 0.1, zoom 0 in the prefab, lines 52 and 55). It sets the clock to LerpTime (51; 0.5 s for yaw, 0.2 s for zoom). Update (31-45) counts the clock down by dt and sets the ratio to `clamp01(clock / LerpTime)`, so the effective velocity fades linearly from its release value to zero over LerpTime.
- Apply, in Update (84-94). Yaw: `m_Yaw -= effective yaw velocity * dt`; the code adds 2 pi only when yaw goes below zero (85-88). Zoom: `Distance = clamp(Distance + effective zoom velocity * dt, 20, 50)` (93).
- Order: Update does input, inertia, yaw and zoom; LateUpdate (97-100) writes the position from the target's current transform and then looks at it. Because the position is set in LateUpdate with no smoothing, the camera follows the target with no lag of its own.
- Pitch clamp. Awake converts the degree band to radians (51) and calls RecomputeCameraAngle (52), which clamps Pitch and recomputes `m_Altitude = sin(pitch)` and `m_SphereSliceRadius = cos(pitch)` (134-137). Shift routing and the clamp are the only way pitch changes.
- Direction (120-127). An 8-way octant computed from yaw in LateUpdate, for sprite facing. Consumers were not read.

## 2. Key functions

- `CharacterCamera.Update`: `/mnt/frankendom-donors/guilhermelhr-unityro/UnityClient/Assets/Scripts/GameCamera/CharacterCamera.cs` 55-95 (input routing, inertia, yaw and zoom application).
- `CharacterCamera.LateUpdate`, `UpdateCameraPosition`, `UpdateCameraLookAt`: 97-128.
- `CharacterCamera.RecomputeCameraAngle`: 134-139; `RecomputeHorizontalDirection`: 130-132.
- `CameraControlProfile.SetInertia` 24-29, `Update` 31-45, `Release` 47-54: `/mnt/frankendom-donors/guilhermelhr-unityro/UnityClient/Assets/Scripts/GameCamera/CameraControlProfile.cs`.
- Serialized values: `/mnt/frankendom-donors/guilhermelhr-unityro/UnityClient/Assets/Resources/Prefabs/Player/PlayerCameraController.prefab` 47-59 (sensitivities, coast times and thresholds, distance, zoom band, pitch band).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Orbit on a sphere around the target, pitch in a fixed band | Pitch 30-45 deg (prefab 59); default pitch 45 deg (`CharacterCamera.cs` 29) |
| Distance band | 20-50 (prefab 58); serialized default 50 (prefab 57; the code default is 30, line 20) |
| Drag inertia with a linear coast after release | Yaw coast 0.5 s (prefab 51), threshold 0.1 (prefab 52); zoom coast 0.2 s (prefab 54), threshold 0 (prefab 55) |
| Sensitivities | Yaw mouse 10 (prefab 47); wheel zoom 50 (prefab 49); wheel pitch 10 (prefab 48) |
| Start yaw | 7.869574 rad (`CharacterCamera.cs` 31), about 90.9 deg after taking off 2 pi (hand-computed) |

Hand-computed, not run:
- At Distance 50: pitch 45 deg gives 35.4 units up and 35.4 units back; pitch 30 deg gives 25.0 up and 43.3 back.
- A zoom velocity of 50 per wheel unit that fades linearly over 0.2 s adds about 5 distance units in total (50 x 0.2 / 2), before the clamp to 20-50.
- The yaw step is the Unity mouse X value times 10 times `Time.deltaTime` (61, 71, 85). That multiplies a per-frame value by dt, so the turn rate per second depends on the frame time. The donor's units were not checked in Unity and the figure was not measured.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (inertia, yaw and zoom in update; placement in the late update). It omits the Shift routing (the caller picks `nudgePitch` or `dragYaw`), the mouse-to-velocity conversion (the sketch takes radians per second; the donor multiplies a per-frame axis value by dt, which is not copied), the scroll-pitch sensitivity, the null-target check, the Direction octant, the start camera, and the reset (the donor's double right-tap reset is only a TODO at line 38). It adds the clamp of the initial pitch, which the donor does in Awake.

```ts
// Licence: AGPL-3.0 (guilhermelhr-unityro). Clean-room sketch of the shape only; not a line translation.
// camera_scope: world
type Vec3 = { x: number; y: number; z: number };

interface Inertia { velocity: number; ratio: number; clock: number; changed: boolean }
interface InertiaTuning { lerpTime: number; threshold: number }
interface OrbitTuning { minPitchRad: number; maxPitchRad: number; minDistance: number; maxDistance: number }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function setInertia(c: Inertia, velocity: number): void {
  c.velocity = velocity;
  c.ratio = 1;
  c.changed = true;
}

// Donor (CameraControlProfile.Release): a coast starts only when the last velocity reaches the threshold in either direction.
function releaseInertia(c: Inertia, t: InertiaTuning): void {
  if (Math.abs(c.velocity) >= t.threshold) {
    c.clock = t.lerpTime;
    c.ratio = 1;
  }
}

// Donor (CameraControlProfile.Update): while the clock runs, the ratio falls linearly from 1 to 0 over lerpTime.
// Returns true when the value should be applied this tick.
function tickInertia(c: Inertia, t: InertiaTuning, dt: number): boolean {
  if (c.clock > 0) {
    c.clock -= dt;
    c.ratio = clamp(c.clock / t.lerpTime, 0, 1);
    return true;
  }
  if (c.changed) {
    c.changed = false;
    return true;
  }
  return false;
}

function effectiveVelocity(c: Inertia): number {
  return c.velocity * c.ratio;
}

class OrbitCamera {
  yaw: number;
  pitch: number;
  distance: number;
  private readonly yawIn: Inertia = { velocity: 0, ratio: 1, clock: 0, changed: false };
  private readonly zoomIn: Inertia = { velocity: 0, ratio: 1, clock: 0, changed: false };

  constructor(
    private readonly t: OrbitTuning,
    private readonly yawT: InertiaTuning,
    private readonly zoomT: InertiaTuning,
    private readonly zoomPerUnit: number,
    initial: { yaw: number; pitch: number; distance: number },
  ) {
    this.yaw = initial.yaw;
    this.pitch = clamp(initial.pitch, t.minPitchRad, t.maxPitchRad);
    this.distance = initial.distance;
  }

  // Sketch: velocity in radians per second. The donor multiplies a per-frame axis value by dt; that is not copied.
  dragYaw(radPerSecond: number): void {
    setInertia(this.yawIn, radPerSecond);
  }

  releaseYaw(): void {
    releaseInertia(this.yawIn, this.yawT);
  }

  // Donor: a wheel tick without shift sets zoom inertia and releases it at once.
  wheel(units: number): void {
    setInertia(this.zoomIn, units * this.zoomPerUnit);
    releaseInertia(this.zoomIn, this.zoomT);
  }

  // Donor: shift + drag or shift + wheel changes pitch; the result is clamped to the pitch constraint.
  nudgePitch(radDelta: number): void {
    this.pitch = clamp(this.pitch + radDelta, this.t.minPitchRad, this.t.maxPitchRad);
  }

  // Donor Update(): apply yaw and zoom inertia.
  update(dt: number): void {
    if (tickInertia(this.yawIn, this.yawT, dt)) {
      this.yaw -= effectiveVelocity(this.yawIn) * dt;
      if (this.yaw < 0) this.yaw += 2 * Math.PI;
    }
    if (tickInertia(this.zoomIn, this.zoomT, dt)) {
      this.distance = clamp(this.distance + effectiveVelocity(this.zoomIn) * dt, this.t.minDistance, this.t.maxDistance);
    }
  }

  // Donor LateUpdate(): place the camera on a sphere of radius distance around the target, then look at it.
  place(target: Vec3): Vec3 {
    const r = Math.cos(this.pitch);
    const hx = Math.cos(this.yaw) * r;
    const hy = -Math.sin(this.pitch);
    const hz = Math.sin(this.yaw) * r;
    return {
      x: target.x - hx * this.distance,
      y: target.y - hy * this.distance,
      z: target.z - hz * this.distance,
    };
  }
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only module; the engine never imports it). Parity-checklist row 11 (fight camera). There is no world-camera row yet (see section 6).
- today: Frankendom's current world camera file (not read in this pass).
- Reuse tag: rewrite-from-idea (AGPL-3.0, clean-room: shape only; this note does not copy the code).
- Brief rule served: the camera is client-only and the engine never reads it; owner ruling 2026-10-10 (world camera improved, Pit camera untouched).

## 6. Gaps and risks

- No over-the-shoulder offset. `LookAt(target)` at the target's root transform (117) centres the character; there is no lateral offset. The shoulder offset would be our addition, as a data field.
- No smoothing of the follow. The camera position is set to the target every LateUpdate (98, 110-112), so a step or a jump in the target shows on screen at once. Frankendom needs lag; see the korangar note for a smoothed focus.
- No collision. The file has no raycast (read in full), so walls will clip. The pull-in step is ours to write.
- No lock-on, no framing of several enemies, no FOV change in combat, no shake (grep of all `Assets/Scripts`).
- The donor's own TODO (`CharacterCamera.cs` 38) says the double right-tap reset is not done. Our reset would be new.
- AGPL-3.0 is copyleft with a network clause. Write from the shape only; do not copy lines.
- The per-frame mouse value times dt (61, 71, 85) may make the turn rate frame-rate dependent. Do not copy the units; use radians per second.
- Pitch and distance bands are zone data in our design (per zone framing); the sensitivities are player settings. Both are data in the donor and should stay data.
- Rulings check (one engine, server-verified kills, one ledger, MAX_ATTACKERS = 3): the camera changes no kill, no ledger entry and no attacker count, so it adds no engine rule. A lock-on or multi-enemy frame must read enemy positions from the engine's state and must not hold any of them itself.
- Not read: the frame-pace calculators (they consume `Direction`), the scene parent transform, the entity side.

Best transferable idea: a release-coast for the world camera's yaw (a fast flick keeps turning for a fixed short time, then stops, and a slow drag does not coast), with pitch and zoom held in clamped bands that come from zone data.
Decision (proposed): adapt - take the release coast with a threshold and the clamped pitch and distance bands; reject the per-frame mouse value times dt and the zero-lag LateUpdate follow, because our camera needs per-second rates and lag.
Acceptance: a drag faster than the threshold, released, turns the yaw for about 0.5 s and then stops (a test asserts no yaw change after 0.5 s), a slower drag does not coast, and 100 wheel notches never leave the distance outside its zone-data band.
