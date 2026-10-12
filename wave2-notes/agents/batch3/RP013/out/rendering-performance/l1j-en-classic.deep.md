# l1j-en-classic (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` (`updateObject` 3401-3419, `removeOutOfRangeObjects` 3595-3613), with `model/L1World.java` (`getVisibleObjects` 326-356), `types/Point.java` (`isInScreen` 137-155) | Licence: GPL-2.0-or-later (read: per-file header "either version 2, or (at your option) any later version"; the repo COPYING file is the GPL version 2 text) | Java | symbol `updateObject` / `getVisibleObjects` / `isInScreen`

Checked: Read `updateObject` (3401-3419), `removeOutOfRangeObjects` (3595-3613), PC `onPerceive` (2211-2220), `startObjectAutoUpdate` (3291-3295), `L1PcAutoUpdate` (whole file), `L1PcMonitor.run` (38-50), `GeneralThreadPool` scheduling (44, 118-122), `L1World.getVisibleObjects` (322-356) and the map store (48, 67-72, 160-168), `Point.getTileLineDistance` (110-113), `Point.isInScreen` (137-155), `L1Character` known-object set (561-595), `Config.PC_RECOGNIZE_RANGE` (726-727), `config/server.properties` line 128. Callers of `updateObject`: 7 matches by grep, including the definition and the periodic caller; read `L1PcAutoUpdate` (the periodic one) and `L1Character` (lines 60-68, a loop that removes and re-perceives around a player, enclosing method name not read). The other callers were found by grep only (`Teleportation`, `L1MonsterInstance`, `L1FindInvis`). Not read: the NPC `onPerceive` bodies (`L1NpcInstance` 1190, `L1MonsterInstance` 85); `approachPlayer`; `S_OtherCharPacks` and `S_RemoveObject` payloads.

Cell fit: this donor is a server, not a renderer. The mechanism is server-side culling: which entities each client is told about (enter and leave), which is the closest thing in this donor to culling. No draw calls, LOD or atlases are present here. Confidence: high that the mechanism is as described (read end to end); medium that it fits the cell as written (it fits the culling and tick idea, not GPU work). The `camera_scope` rule does not apply (not a camera note).

## 1. Mechanism

- Each logged-in player gets a fixed-rate task: 300 ms period, zero initial delay (L1PcInstance 145, 3293-3294). It is run by a pool sized `1 + MAX_ONLINE_USERS / 20` (GeneralThreadPool 44). The task looks the player up by id and skips it if it has no connection (L1PcMonitor 41-43), then calls `updateObject`.
- `updateObject` (3401-3419), order of steps:
  (a) `removeOutOfRangeObjects` (3402): walk the known set; each known entity that is out of range is removed from the known set and a remove packet is sent (3595-3613). With `PcRecognizeRange == -1` the test is `isInScreen` (3601-3604); otherwise it is a Chebyshev distance strictly greater than the range (3606-3610).
  (b) scan the map (3404): `getVisibleObjects(this, PC_RECOGNIZE_RANGE)` returns all objects on the player's map passing the same range test (L1World 326-353). With radius -1 the test is `isInScreen` (340); with radius 0 it is the same tile; otherwise Chebyshev `<= radius` (348).
  (c) for each visible object not yet known (3405), `onPerceive(this)` runs. For a player target, it adds the target to the known set and sends the spawn packet (2219-2220). NPCs and monsters have their own `onPerceive` (not read).
  (d) known hidden NPCs within the screen are sent `approachPlayer` (3408-3411); GM HP bars are refreshed (3415-3417).
- Screen shape (`isInScreen`, Point.java 137-155): a Manhattan distance `dist` from the viewer. `dist > 17` is out (141-142). `dist <= 13` is in (143-144). For 14-17, the code takes a second Manhattan distance `dist2` from the point (viewer.x - 15, viewer.y - 15) (148-149) and admits the tile only if `17 <= dist2 <= 43` (150-152).
- Chebyshev distance (`getTileLineDistance`, Point.java 110-113) is the radius mode.
- Tick: the scan runs every 300 ms for every connected player, even if nothing moved (the monitor has no dirty flag). No movement handler is among the `updateObject` matches by grep, so movement is not what triggers it; other callers (teleport, a GM find-invisible command, a removal loop in `L1Character`) call it directly.

## 2. Key functions

- `updateObject`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` 3401-3419. The per-tick interest update: leave, then enter, then the hidden-NPC and HP-bar extras.
- `removeOutOfRangeObjects`: same file, 3595-3613. The leave step.
- `getVisibleObjects`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1World.java` 326-356. Linear scan of the per-map store, filtered by the range test.
- `isInScreen`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/types/Point.java` 137-155.
- Known set: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Character.java` 561-595. A copy-on-write list with `contains` checks.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Enter and leave against a range, with the known set diffed each tick | Tick period 300 ms (L1PcInstance 145) |
| Screen shape: near zone, outer ring, cut-off | Near zone Manhattan 13 (Point 143); cut-off 17 (141); outer window 17..43 on a corner distance offset by 15 (148-150) |
| Radius mode (Chebyshev) | Default `PcRecognizeRange = 20` when the property is absent (Config 727); shipped config `PcRecognizeRange = -1` (server.properties 128), so the screen shape is the live mode |
| Scheduler pool for per-player tasks | `1 + MAX_ONLINE_USERS / 20` threads (GeneralThreadPool 44) |
| Hysteresis (absent) | none: enter and leave use the same predicate and the same value |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (leave first, then enter) and the known-set diff, so one spawn or despawn packet is sent per change. It uses Chebyshev distance and a caller-supplied candidate list, not the donor's screen shape and full-map scan. It adds the fix the donor lacks: enter at `enterRadius`, leave only beyond `leaveRadius` (hysteresis). It does not send packets, does not run the 300 ms cadence, and does not handle hidden NPCs or HP bars.

```ts
// Licence: GPL-2.0-or-later (donor, per file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Ent {
  id: number;
  x: number;
  y: number;
  map: number;
}

export interface InterestCfg {
  enterRadius: number; // a new entity is perceived when it is within this distance
  leaveRadius: number; // a known entity is dropped only beyond this distance (must be >= enterRadius)
  dist: (a: Ent, b: Ent) => number;
}

// One call per player per cadence tick (the donor uses a fixed 300 ms). Order matches the donor:
// leave first (known entities that moved out), then enter (new entities in range).
export function interestTick(
  self: Ent,
  known: Set<number>,
  byId: Map<number, Ent>,
  candidates: Ent[], // a spatial query result; the donor scans every object on the map instead
  cfg: InterestCfg,
): { spawn: Ent[]; despawn: number[] } {
  const despawn: number[] = [];
  for (const id of [...known]) {
    const e = byId.get(id);
    if (e === undefined || e.map !== self.map || cfg.dist(self, e) > cfg.leaveRadius) {
      known.delete(id);
      despawn.push(id);
    }
  }
  const spawn: Ent[] = [];
  for (const e of candidates) {
    if (e.id === self.id || e.map !== self.map || known.has(e.id)) continue;
    if (cfg.dist(self, e) <= cfg.enterRadius) {
      known.add(e.id);
      spawn.push(e);
    }
  }
  return { spawn, despawn };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/RP013-interest-tick.ts`: exit 0.

## 5. Lands in

- TARGET `origins/server/interest.ts` (server-side, one function per player per tick; the client never reads it). Parity-checklist row 18 (loot roll and XP award) with the tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3): the per-player interest update is per-tick work on the server. Row 18 is the closest row in the list for the server tick; the brief's hint row 12 (combat sound cues) does not fit.
- today: not read in Frankendom by this pass (no Frankendom file opened).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; no donor line adapted)
- Brief rule served: one engine, server-verified state (the server decides what each client knows; the client never decides visibility); zones as data (the screen shape and radius are server-wide engine constants in the donor; Frankendom would make them zone data).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect, no hysteresis: enter and leave use the same predicate (340 and 3602 for screen mode; 348 and 3607 for radius mode). A player who steps back and forth on the edge receives a spawn and a remove on each crossing. Fix: enter at R, leave at R + margin (the sketch's `leaveRadius`).
- Defect, linear scans: `getVisibleObjects` scans every object on the map (331) on each player's 300 ms tick, and the known set is a copy-on-write list checked with `contains` (564-565, 577). Cost per tick is roughly players times map objects, plus players times known objects. Fix: a spatial grid for candidates and a hash set beside the known list.
- Defect, no dirty flag: the 300 ms tick runs the full scan for an idle player. Fix: re-run the scan only when the player or a nearby entity moved, or on a timer slower than 300 ms for idle players.
- Shape, asymmetric and unverified against the client: the outer ring passes only where `17 <= dist2 <= 43`. Worked by hand: a tile at (-17, 0) relative to the viewer has dist2 = 17 and is admitted; a tile at (+17, 0) has dist2 = 47 and is rejected. The comment (Point 129-131) names the corners (2,15), (15,-2), (-15,2), (-2,15), which does not match the Manhattan near zone of 13 in the code. Whether the code or the comment is right was not checked against the client's view. Fix: define the screen as an explicit data shape per zone and test it with a symmetry check.
- Config trap: the default in code is 20 (Config 727), the shipped config is -1 (server.properties 128). A Frankendom port must state which mode is live, or two servers will disagree about what a player can see.
- Cost of a remove packet per leave: a leave packet is sent on each removal (3603-3609). Under the hysteresis fix this drops; the packet count is not measured here.
- Invisible players fail the perceive test (`onPerceive` returns early for GM-invisible, ghost and invisible targets, 2212-2217), so they are never added to the known set and are re-tested on every tick. Cheap per player, but it adds to the per-tick scan.
- Parity note: the camera and rendering are not in this donor; the link is server culling only.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: server decides visibility; clients receive only the entities in their interest set; zones as data for the shape.

Best transferable idea: Each tick, the server diffs a player's known set against the entities within range, sends one spawn when something enters and one despawn when something leaves, and keeps enter and leave radii apart so an edge crossing does not flicker.
Decision (proposed): adapt - keep the enter-then-leave diff with one packet per change and the screen as a data shape; add the hysteresis margin, the spatial query and the dirty flag the donor lacks, since the donor's linear scan and shared threshold would not hold at a many-player zone.
Acceptance: a server test places one player and one creature on the edge of the screen, moves the player back and forth across the boundary 10 times, and asserts at most one spawn and one despawn per crossing band (no churn between the enter and leave radii), with the known set matching the spatial query each tick.
