# gawric-Unity-Client-for-L2J (loot-drops, cell 2)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Item/ItemDropPresentationService.cs` | Licence: Apache License 2.0 (repo `LICENSE`, "Version 2.0, January 2004") | C# (Unity) | symbol `ItemDropPresentationService` (`PlayDrop`, `TickThrows`, `LandItem`)

Checked: Opened and read `ItemDropPresentationService.cs` at 68-104 (PlayDrop), 114-119 (PlayPickup), 121-147 (TickThrows), 166-202 (BeginThrow), 204-247 (LandItem), 249-270 (StartGroundGlow), 427-470 (coin reveal). Read in full: `ItemDropPresentationIds.cs`, `ItemSpawner.cs`, `ItemDropPresentationRunner.cs`, `DropItemIncoming.cs`, `GetItemIncoming.cs`. Read `World.cs` 379-420 and `ItemDropPose.cs` 1-80. Not read: `ItemDropVisualService.AttachVisual`, `ItemPickupMotion`, `ResolveThrowStart`, `PlayLandBurst`, the tumble/blade helpers in `ItemDropPose.cs` past line 80, and the click-to-pickup send path (`ClickManager.OnClickOnEntity`). Important limit: this donor has NO drop roll, loot table, owner or protection timer. The client only presents drops the server sends; the server is not in this donor. A grep for Random/Range/chance in `Game/Item` and `Game/Spawn` found nothing relevant. Confidence: high on the presentation mechanism; medium that it counts as loot-drops (it is loot feel, not loot rules). camera_scope: not applicable (no camera in this mechanism).

## 1. Mechanism

- The server sends a DropItem packet (object id, item id, count, stackable, position, dropper id). The client spawns a ground item and plays a throw from the dropper's hand. Only weapons that stick on landing (a stick weapon with drop type 0 to 4, `ItemDropPose.cs` 39-40) fly the 0.55 s arc; every other item, other weapons included, flies a 0.35 s arc (`BeginThrow` 183-185). Coins (Adena) skip the throw entirely and land at once.
- Flight: each frame `u = clamp(elapsed / duration, 0, 1)`; position = lerp(from, to, u) plus `sin(u * pi) * arcHeight` on y. Ordinary drops use a fixed 0.45 m lift; stick-on-land weapons use a lift equal to the horizontal distance clamped to 0.45-2.4 m (`ItemDropPose.cs` 51-53).
- Landing: the item snaps to the ground at the landing point. Non-coins sit on the ground and start an 18 s ground glow timer. Coins (Adena) hide their mesh and reveal it 0.7 s after landing, and start the glow the same way.
- Pickup: the server sends GetItem. The world plays a pickup pose on the picker and removes the object. The client never removes a drop on its own.
- Driver: `ItemDropPresentationRunner.Update` calls `Tick(Time.deltaTime)` every Unity frame. This is a variable step: each frame advances the throw timers by that frame's delta. The glow end (268) and the coin reveal time (434) are different: they are absolute `Time.time` stamps set at landing, not advanced per frame.

Order of operations for one drop, as the code runs:
1. DropItem packet -> `World.SpawnOrUpdateGroundItem` (379). If the object exists it is updated in place; otherwise `ItemSpawner.Spawn` creates the object, attaches the visual, registers it and calls `PlayDrop`.
2. `PlayDrop` (68): snaps the landing point, plays the dropper's "drop" animation if the dropper exists, and throws the mesh unless the item is Adena (92). Adena calls `LandItem` directly (101).
3. `BeginThrow` (166): sets the item at the start point, picks the duration (184-185), floors it at 0.05 s (194), and queues a `ThrowArcState`.
4. `TickThrows` (121): advances elapsed, sets the position (133-136), and when elapsed reaches the duration (141) calls `LandItem` with the landing point (145).
5. `LandItem` (204): non-Adena drops sit on the ground (or plant if they are stick weapons) and start the glow (246). Adena hides the mesh (224), plays the land burst, starts the glow (226), and returns.
6. `StartGroundGlow` (249): end time = now + 18 s (268).
7. `RevealCoinDropMesh` (455): fires when the coin reveal time (set at 434) passes, and starts the pickup spin.

## 2. Key functions

- `PlayDrop`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Item/ItemDropPresentationService.cs` 68-104. Entry point for a new drop.
- `TickThrows`: same file, 121-147. Per-frame arc position and landing.
- `BeginThrow`: same file, 166-202. Chooses duration and arc height, floors the duration.
- `LandItem`: same file, 204-247. Landing, Adena branch, glow start.
- `StartGroundGlow`: same file, 249-270. Glow end time from landing time.
- Coin reveal: same file, 427-470 (`HideCoinDropMeshUntilPile` 427, `TickCoinMeshReveals` 438, `RevealCoinDropMesh` 455).
- Server entry points: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/World.cs` 379-418 (`SpawnOrUpdateGroundItem`, `PickupGroundItem`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Arc = lerp along the ground + sine lift that peaks mid-flight | Drop lift 0.45 m (theirs, `ItemDropPresentationIds.cs:33`) |
| Duration floor so a short throw still shows an arc | Floor 0.05 s (theirs, `ItemDropPresentationService.cs:194`) |
| Flight time per item class | Drop 0.35 s (theirs, `ItemDropPresentationIds.cs:32`), used for everything except stick-on-land weapons; stick weapon 0.55 s (theirs, `ItemDropPresentationIds.cs:40`; choice at `ItemDropPresentationService.cs` 183-185) |
| Stick-weapon lift follows horizontal distance, clamped | Clamp 0.45 to 2.4 m (theirs, `ItemDropPose.cs:52`, only when the pose sticks on landing) |
| Timers start at landing, not at the throw | Glow 18 s (theirs, `ItemDropPresentationIds.cs:29`); coin reveal 0.7 s (theirs, `ItemDropPresentationIds.cs:52`) |

## 4. TypeScript sketch

simplified: omits the Unity transform and rotation, weapon stick and tumble, the blade alignment, the dropper's "drop" animation, the throw start point (hand or 0.28 m hover), ground snap, click-area refresh, fall and land effects, and all packet handling. It keeps the donor's timing: flight advances by dt, the position is lerp plus sine lift, and glow and coin-reveal timers start at landing. The caller picks `duration` and `arcHeight` (donor: 0.55 s and a clamped lift only for stick-on-land weapons, else 0.35 s and 0.45 m). It does not implement the Adena no-throw branch as a separate path; a caller would skip `makeArc` and call `landedTimers` at once for coins. Nothing is reordered.

```ts
// Licence: Apache-2.0 (donor). Clean-room sketch written from the mechanism; no donor lines copied.
type Vec3 = { x: number; y: number; z: number };

interface DropArc {
  from: Vec3;
  to: Vec3;        // landing point on the ground
  elapsed: number; // seconds since the throw began
  duration: number;
  arcHeight: number; // metres of lift at mid-flight
}

// Floor the duration so a very short throw still shows an arc.
function makeArc(from: Vec3, to: Vec3, duration: number, arcHeight: number): DropArc {
  return { from, to, elapsed: 0, duration: Math.max(0.05, duration), arcHeight };
}

// Advance the flight by one frame's time. Returns true when the item has landed.
function stepArc(a: DropArc, dt: number): boolean {
  a.elapsed += dt;
  return a.elapsed >= a.duration;
}

// Position on the arc: a linear ground path plus a sine lift that peaks at mid-flight.
function arcPosition(a: DropArc): Vec3 {
  const u = Math.min(1, Math.max(0, a.elapsed / a.duration));
  const lerp = (p: number, q: number) => p + (q - p) * u;
  return {
    x: lerp(a.from.x, a.to.x),
    y: lerp(a.from.y, a.to.y) + Math.sin(u * Math.PI) * a.arcHeight,
    z: lerp(a.from.z, a.to.z),
  };
}

interface LandedTimers {
  glowEndsAt: number;    // absolute seconds on the caller's clock
  coinRevealAt: number | null; // only for coin piles that start hidden
}

// Timers start at landing, not at the throw.
function landedTimers(landedAt: number, glowSeconds: number, coinRevealDelay: number | null): LandedTimers {
  return {
    glowEndsAt: landedAt + glowSeconds,
    coinRevealAt: coinRevealDelay === null ? null : landedAt + coinRevealDelay,
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run this turn).

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module: the drop record and the server-decided pickup). Parity-checklist row 18 (loot roll and XP award), sub-line for the drop view. The drop arc itself is client presentation and belongs in the world client, not in the fight engine.
- Reuse tag: adapt-shape (Apache-2.0: adaptable; the sketch is clean-room anyway)
- Brief rule served: server-verified pickup: the donor removes a drop only when the server's GetItem packet arrives; the client only shows it.

Best transferable idea: A drop flies out on a fixed-time arc (lerp plus sine lift), its glow and reveal timers start at landing, and the server alone decides the drop and its pickup.
Decision (proposed): adapt. Take the arc shape (lerp plus sine lift, glow and reveal timers started at landing) for Frankendom's drop view. Keep the donor's split that the client never rolls: Frankendom rolls on the server (row 18) and the client only plays the drop event it receives.
Acceptance: a player kills a creature and a drop rises in a 0.35 s arc with visible lift, then lands and glows; a server test asserts that only a server pickup event removes the drop record.

## 6. Gaps and risks

- No roll, loot table, owner or protection timer exists in this donor. Everything about who gets the loot and why must come from the server (row 18) and is not covered here.
- Presentation timing is wall-clock `Time.deltaTime` in Unity Update, not a fixed server tick. Frankendom's client may keep these as client constants, but the server must never wait on them.
- Coin special case (Adena skips the throw and hides the mesh) is a currency-pile rule. Frankendom has no direct analogue; take the timing shape only.
- Weapon landing depends on blade geometry in `ItemDropWeaponAligner` and `ItemDropPose` tumble helpers, which are not read.
- Effect ids in `ItemDropPresentationIds.cs` are placeholders (`PickupBurstEffectId = 0`, `CoinSparkleEffectId = 0`) with comments about a prior visual bug. Frankendom must not copy those ids.
- Licence is Apache 2.0, so adaptation is allowed. Per-file headers were not checked; the sketch is clean-room regardless.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Mechanism says weapons fly 0.55 s with lift clamped 0.45-2.4 m and others 0.35 s / 0.45 m, but BeginThrow 183-185 and ItemDropPose.cs 39-40,51-53 apply these only when pose.StickOnLand (stickWeapon && dropType 0..4); other weapons get 0.35 s and 0.45 m. Also 'each frame advances timers by that frame's delta, every timer measured from start' is only true of throws; glow end (268) and coin reveal (434) use absolute Time.time. Constants 0.45, 0.35, 0.55, 0.05 floor, 18, 0.7, 0.28, line refs 68-104, 121-147, 166-202, 204-247, 249-270, 427-470, World.cs 379-418 verified; no roll in donor confirmed.

**Missed:** PlayDrop plays a fall-trail effect (81-88) before the throw and the dropper animation; PickupGroundItem removes the object right after PlayPickup (World.cs 411-418).
