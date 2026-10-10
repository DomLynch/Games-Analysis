# dhewm-dhewm3 (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Entity.cpp` (DoDormantTests 850-882, CheckDormant 891-905), with the connectivity it reads from `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Pvs.cpp` (GetConnectedAreas 891-925) | Licence: GNU GPL version 3 (`/mnt/frankendom-donors/dhewm-dhewm3/COPYING.txt`; file headers "Doom 3 GPL Source Code", "version 3 of the License, or (at your option) any later version"), plus id Software additional terms stated in the header (`Pvs.cpp` line 22) | C++ | symbol `idEntity::DoDormantTests`

Checked: `DoDormantTests` read in full (game/Entity.cpp 850-882); `CheckDormant` 891-905 read; `DELAY_DORMANT_TIME` (Entity.h:50) and the spawn offset (Entity.cpp 483-484) read; `d3xp/Entity.cpp` 919-950 read, same test order and same constant. Callers: `idAI::Think` (game/ai/AI.cpp 1051-1055, read; d3xp/ai/AI.cpp 1131 seen by grep); `Misc.cpp` 1927/3173 and `Mover.cpp` 4296 seen by grep only. Connectivity: `GetConnectedAreas` (Pvs.cpp 891-925) read in full; `SetupCurrentPVS` connected-only path 1032-1067 read; `MergeCurrentPVS` 1077-1098 read; player set built and merged in `SetupPlayerPVS` (Game_local.cpp 2049-2085, read) and read through `InPlayerConnectedArea` (2123-2128) and `InPlayerPVS` (2109-2114). Gate state: `RenderWorld.h` 266-274 read; the binary door setter `idMover_Binary::SetPortalState` (Mover.cpp 3070-3076) read; `idMover::SetPortalState` (1533-1535) seen by grep only. Not read: the PVS flood that builds the visibility data (`FrontPortalPVS`, `PassagePVS`), the entity's own area lookup (`GetPVSAreas`), `DormantBegin`/`DormantEnd` bodies (empty in the donor), the constructor default of `hasAwakened` (not located). camera_scope: not a camera cell. Confidence: high on the test order and the 3000 ms grace (read in full); medium on "all doors shut the view" (only the binary-mover setter was read). Confidence on what dormant skips: high for idAI::Think only.

Best transferable idea: a zone's NPCs stay awake while a player can reach their zone through open gates, freeze three seconds after the gate shuts, and a never-awake NPC waits for a player's view before it runs at all.
Decision (proposed): adapt - the grace timer on disconnect and the "skip the brain when frozen" gate fit row 23's grace rule and the server tick's per-tick NPC budget; Frankendom has zones as data, so connectivity comes from zone gate data, not a portal BSP, and dormant means frozen, with despawn left to the row 23 empty-zone rule.
Acceptance: server test: a zone reached only through a gate keeps its NPC awake until the gate has been shut for 3000 ms, then the NPC is frozen (its brain does not run); reopening the gate wakes it on the same tick; a never-awake NPC does not run its brain until a test player's view includes its zone.

## 1. Mechanism

- Each NPC (an entity on the active list) asks once per think whether it is dormant. The donor's `DoDormantTests` (game/Entity.cpp 850-882) runs three tests in this order:
  1. Connectivity (857): if the NPC's area is not connected to any player's area (through portals that do not block view), start a timer if none is running (`dormantStart`, 858-860), and stay awake while less than 3000 ms (`DELAY_DORMANT_TIME`, Entity.h:50) have passed (861-863). After that the NPC is dormant (864-865).
  2. First wake (868-874): a connected NPC that has never been awake (`fl.hasAwakened`, Entity.h:157) must also be inside the merged player PVS (`InPlayerPVS`, 871). If it is not, it stays dormant.
  3. Wake (876-878): clear the timer, set `hasAwakened`, and run.
- `CheckDormant` (891-905) calls the test, and on a change calls `DormantBegin` or `DormantEnd` (bodies are empty in the donor).
- `idAI::Think` (game/ai/AI.cpp 1051-1055) returns at once when `CheckDormant()` is true. So a dormant monster skips its brain. The entity stays on the active list, so the per-frame check still runs.
- Connectivity comes from a flood over portals (`idPVS::GetConnectedAreas`, Pvs.cpp 891-925): from the source area it follows each portal whose `blockingBits` lack `PS_BLOCK_VIEW` (908) to the portal's second area (913). For several source areas of one entity, the floods accumulate into one set (`SetupCurrentPVS`, 1056-1060). For several players, the connected sets are OR-merged (`MergeCurrentPVS`, 1077-1098; `SetupPlayerPVS` 2075-2078).
- Doors set the gate state: a binary mover sets its portal to `PS_BLOCK_NONE` when open and `PS_BLOCK_ALL` when shut (Mover.cpp 3073-3075). `PS_BLOCK_ALL` includes `PS_BLOCK_VIEW` (RenderWorld.h 269, 273), so a shut door cuts the flood.
- Spawn: each entity's `dormantStart` (set in its spawn code) starts at `time - 3000 + 5 x msec` (Entity.cpp 484). So a map-start NPC that is not connected goes dormant within about five frames (the comment at 483 says so).

## 2. Key functions

- `idEntity::DoDormantTests`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Entity.cpp` 850-882. The three tests above.
- `idEntity::CheckDormant`: same file, 891-905. Calls the test; the state change hooks.
- `idAI::Think` gate: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/ai/AI.cpp` 1051-1055.
- `idPVS::GetConnectedAreas`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Pvs.cpp` 891-925. Queue-based flood over view-open portals.
- `idGameLocal::SetupPlayerPVS` and `InPlayerConnectedArea`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Game_local.cpp` 2049-2085 and 2123-2128. Built in `RunFrame` (2321) before the think loop (2360), freed after events (2392).
- `idMover_Binary::SetPortalState`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Mover.cpp` 3070-3076. The door-to-gate link.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A zone is live while reachable from a player through open gates (flood over the zone graph) | None (the flood itself); gate state from door movers (theirs, Mover.cpp 3075) |
| Freeze after a grace window once cut off, not at once | 3000 ms (theirs, Entity.h:50; used at Entity.cpp 861) |
| Start the grace window already almost spent, so the map start freezes most NPCs within about five frames | Offset `msec x 5` (theirs, Entity.cpp 484) |
| A never-awake NPC waits for a player's view before it runs | Full PVS for the first wake only (theirs, Entity.h:157 comment; test at 870-871) |
| Multiplayer: union of every player's connected set | None (OR merge, Pvs.cpp 1094) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three-test order and the grace arithmetic (the spawn head start, the reset on wake). It omits: the NPC's area lookup (the caller passes the zone), the neverDormant flag, the cinematic and save-game code, `DormantBegin`/`DormantEnd` (only a comment), the PVS geometry (the view test is a callback), and the portal flood's per-source queue (the sketch floods all player zones at once, which gives the same set). The grace check is written as `>=` on the spent window, which matches the donor's `< DELAY` continue.

```ts
// Licence: GPL-3.0-or-later with id additional terms (donor). Clean-room sketch of the shape only, written from the described order of tests, not a translation.
const DORMANT_GRACE_MS = 3000;   // donor: DELAY_DORMANT_TIME (zone-independent engine constant)

// Zone graph: zones are nodes; a gate (door) joins two zones and is open or shut.
interface ZoneGate { to: number; open: boolean; }
interface ZoneGraph { neighbours(zone: number): ZoneGate[]; }

interface Npc {
  zone: number;            // zone the NPC stands in
  graceStart: number;      // 0 = not timing a shut-off (donor dormantStart)
  awakened: boolean;       // has been awake once (donor fl.hasAwakened)
  dormant: boolean;
}

// Zones reachable from any player zone through OPEN gates only.
// Same result as the donor's BFS over portals that do not block view, merged across players.
function connectedZones(graph: ZoneGraph, playerZones: number[]): Set<number> {
  const seen = new Set<number>(playerZones);
  const queue = [...playerZones];
  for (let i = 0; i < queue.length; i++) {
    for (const g of graph.neighbours(queue[i])) {
      if (!g.open || seen.has(g.to)) continue;
      seen.add(g.to);
      queue.push(g.to);
    }
  }
  return seen;
}

// Spawn offset from the donor: the grace window is almost used up, so a closed-off NPC goes dormant within about 5 frames.
function spawnNpc(zone: number, now: number, frameMs: number): Npc {
  return { zone, graceStart: now - DORMANT_GRACE_MS + 5 * frameMs, awakened: false, dormant: false };
}

// Order of tests, as the donor's DoDormantTests:
// 1. not connected to a player: start the grace timer; dormant only after it runs out.
// 2. connected, never awake: stay dormant until a player can see the NPC (merged view test).
// 3. otherwise: clear the timer, mark awake, run.
function dormantTest(n: Npc, now: number, connected: Set<number>, inPlayerView: (n: Npc) => boolean): boolean {
  if (!connected.has(n.zone)) {
    if (n.graceStart === 0) n.graceStart = now;
    return now - n.graceStart >= DORMANT_GRACE_MS;
  }
  if (!n.awakened && !inPlayerView(n)) return true;
  n.graceStart = 0;
  n.awakened = true;
  return false;
}

// Donor CheckDormant: call at the top of the NPC's think; skip the brain when dormant.
function checkDormant(n: Npc, now: number, connected: Set<number>, inPlayerView: (n: Npc) => boolean): boolean {
  const d = dormantTest(n, now, connected, inPlayerView);
  n.dormant = d;               // donor calls DormantBegin / DormantEnd on the change; omitted here
  return d;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: freeze and grace before despawn; server-owned). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The freeze gate itself is also what the server tick's per-tick NPC budget needs (post-K item 3 sub-line: "server tick: fixed step, input intake, per-tick NPC budget").
- today: not read (no Frankendom repo was read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0 with id additional terms; clean-room, shape only)
- Brief rule served: zones as data (zone gate graph and the grace per zone); one engine (the freeze gate lives in origins/server, not in the client); server decides who is awake.

## 6. Gaps and risks

- GPL-3.0 with id's additional terms: clean-room only. The sketch is written from the described tests; no donor line is copied.
- The donor connects zones by a precomputed portal graph of a BSP map. Frankendom's zones are data, so the gate graph must be authored zone data (open or shut per gate), with a server-side toggle when a gate state changes. Do not port the portal builder.
- "Dormant" is a freeze, not a despawn. Row 23 needs despawn on empty with a grace timer. The donor's grace is only the freeze step; the despawn rule has to be added as its own zone field.
- The first-wake PVS check uses the player's visibility (a client view). On the server, the equivalent must be a server-known rule (for example distance to a player inside the zone), or two clients will disagree about when a monster first wakes. Do not use the client camera.
- The donor's `dormantStart` is 0 for "not timing", so an exact 0 timestamp is ambiguous. Frankendom should use an explicit flag, or a fixed-step server clock that never reads 0.
- The donor freezes by skipping `Think`, but the entity stays on the active list and still pays the check each frame. Frankendom's per-tick NPC budget (server tick) should count frozen NPCs as zero cost, not as a think that returns early.
- `Mover.cpp` only the binary-mover setter was read. Other gate types were not checked, so "every door" is not claimed.
- The donor's flood runs per frame in the think loop. Frankendom should recompute the connected set only when a gate changes (not every tick), which the donor does not do.
