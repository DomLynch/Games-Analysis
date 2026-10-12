# LostCityRS-Engine-TS (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/build.ts` (with `info.ts`, `coord.ts`, `renderer.ts`, `src/engine/World.ts`, `src/engine/entity/BuildArea.ts`, `NetworkPlayer.ts`) | Licence: MIT (per `LICENSE` line 1 "MIT License" and line 3 "Copyright (c) 2023-2026 Lost City") | TypeScript | symbol `BuildArea.resize` / `PlayerInfoEncoder.encode`

Checked: The culling here is server-side interest management: what each player's client is sent each tick. Read in full: `rsbuf/build.ts` (261 lines), `rsbuf/info.ts` player encoder (1-268), `engine/entity/BuildArea.ts` (94), `rsbuf/coord.ts` distance test (24-26), `World.ts` tick order (processClientsOut 1096-1133, processCleanup 1139-1206; call order at 408 and 415). NPC encoder read only 269-345 (not the rest). The hint file `public/client/client.js` is a 350 KB minified bundle (one line; top of the file is audio decode code); grep found one `drawImage`, no `frustum`, `cull` or `requestAnimationFrame`. So the client renderer is not in the box as readable source; the culling evidence is the server side only. Donor's `src/` has no render code. Confidence high on the interest-set logic and the drop-on-budget finding (tick order and resets read end to end). The resize growth rate was checked by hand-transcribing the donor's branch order (build.ts 85-92) and running it: it grows every tick after tick 10. camera_scope: not a camera cell.

Best transferable idea: Cap what each phone is sent with an adaptive radius (shrink while over the cap, grow one tile every 10 quiet ticks), nearest first, and carry over hit blocks that do not fit the byte budget instead of dropping them.
Decision (proposed): adapt - keep the cap, the adaptive radius and the byte budget; fix the grow step (it grows every tick, not every 10 ticks); pick nearest first at every radius, not only when the radius has shrunk; and carry over hit blocks rather than dropping them, because the donor silently drops hits, chat and animations for an observer when the packet is full. Donor is MIT, so adaptation is allowed; the sketch is clean-room anyway.
Acceptance: A server test puts 60 enemies around one phone client within 15 tiles: the set holds at most the phone cap (taken from zone data; 24 is a proposed design number, not a donor number), nearest first; the view radius grows back by one tile every 10 quiet ticks, not every tick; and a hit that does not fit the packet budget is delivered on the next tick, not lost.

## 1. Mechanism

- What a player's client knows is a per-observer set of entity ids plus a view radius (`build.ts`). Each tick, `processClientsOut` writes the player info, then the NPC info, then zone updates, then flushes (`World.ts` 1108-1123). `processCleanup` runs after that in the same tick (`World.ts` 408, 415) and resets each entity's masks (`PathingEntity.ts` 606) and clears the temporary info caches (`rsbuf/index.ts` 299, `renderer.ts` 128-131).
- Order inside `PlayerInfoEncoder.encode` (`info.ts` 21-49): (a) if the observer moved more than its radius in one tick, or on a rebuild, rebuild the set (24-25); otherwise `resize()` (27). (b) Existing players: each is removed if it is teleporting, on another level, inactive, hard-hidden, or outside the current square radius (73-74). Otherwise its movement is written, and its extended block (anim, say, hit, chat) is written only if it fits the byte budget (79-86). (c) New players: walk `getNearbyPlayers` in order; stop at the player cap (100-101); add only if the next entry fits the byte budget (110-112).
- Radius rules (`build.ts` 72-93, `resize`): if the set is at the cap (250), shrink the radius by one (not below 1) and reset the counter (77-83). Otherwise count quiet ticks; at 10, grow by one toward 15 (85-88). The counter is reset only at the maximum (90). A rebuild puts the radius back to 15 (102) and drops it by one if 250 or more candidates exist (106-116).
- Candidate choice (`build.ts` 127-132): at radius below 15, a nearest-first square spiral (166-210); at radius 15, a zone-bucket scan in fixed order (134-164). Both stop at the cap. A candidate is within the square radius (`coord.ts` 25; a square, not a circle).
- Budget: the info packet is a 5000-byte buffer (`info.ts` 18). `fits` allows 4997 bytes in total (264-266). Cost of a new player header is 23 bits (`info.ts` 13).
- Tick: the info phase runs once per server tick, inside the server loop. The loop's own fixed-step or accumulator code (not read) is what drives it. No client frame timing is in the box.

## 2. Key functions

- `BuildArea.resize`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/build.ts` 72-93 (grow and shrink).
- `BuildArea.rebuildPlayers`: same file 99-117.
- `BuildArea.getNearbyPlayers` (choice of scan): same file 127-132; `getNearbyPlayersZones` 134-164; `getNearbyPlayersNearest` 166-210 (both read in full).
- `BuildArea.filterPlayer`: same file 244-251.
- `PlayerInfoEncoder.encode`, `writePlayers`, `writeNewPlayers`, `fits`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/info.ts` 21-49, 67-92, 94-117, 264-266.
- Tick order and reset: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 408, 415, 1096-1133, 1139-1206; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/renderer.ts` 128-131.
- Server-side zone streaming (fold-in): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/BuildArea.ts` 23-93 (`rebuildZones` 31-55, `rebuildNormal` 57-93); `NetworkPlayer.ts` 294-315 (`updateZones`: a full snapshot when a zone first loads, then partial updates each tick).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-observer set with an adaptive radius: shrink fast while over the cap, grow slowly when quiet | Preferred radius 15 tiles (theirs, build.ts 57); grow interval 10 ticks (theirs, build.ts 54); shrink 1 tile per tick over cap (theirs, build.ts 79) |
| Hard cap on set size | Players 250 (theirs, build.ts 55); NPCs 255 (theirs, build.ts 56) |
| Byte budget for one tick's packet; check before adding an entry | 5000-byte buffer (theirs, info.ts 18); 4997 usable (theirs, info.ts 265); player add header 23 bits (theirs, info.ts 13) |
| Movement always, optional blocks only if they fit | Walk/run/idle always written; extended block gated by `fits` (theirs, info.ts 79-86) |
| Build area for zone streaming | 13x13 zones (theirs, BuildArea.ts 77 comment); reload when the player is 4 zones west or 5 east of origin (theirs, BuildArea.ts 61-62) |
| Square distance test | Chebyshev (`max(abs dx, abs dz) <= radius`), theirs (coord.ts 25) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three parts: the shrink-fast and grow-slow radius, nearest-first selection under a cap, and the byte budget with movement counted first. It omits the donor's zone-bucket scan and spiral search (it sorts the in-range list instead; the same set results, only the cost differs), the rebuild path on large moves, the appearance and low-definition caches, the NPC encoder, and the teleport and level rules. It changes two things from the donor: (1) the grow step resets the counter, so one tile per 10 quiet ticks; (2) hit blocks that do not fit stay in `pendingHits` for the next tick instead of being dropped at tick end. The sketch has no maximum age for a carried hit; a real port needs one. Byte costs (2 and 4) are illustrative, not the donor's.

```ts
// Licence: MIT (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const PREFERRED_VIEW = 15;   // tiles; the view is a square (Chebyshev) radius
export const PREFERRED_CAP = 250;   // max entities in one observer's set
export const RESIZE_INTERVAL = 10;  // ticks between view-distance grow steps
export const BYTE_BUDGET = 4997;    // per-tick info packet budget (donor)
export const MOVE_BYTES = 2;        // illustrative cost of a movement entry
export const HIT_BYTES = 4;         // illustrative cost of one hit block

export interface Ent {
  id: number; x: number; z: number; level: number; active: boolean;
  pendingHits: number[];            // hit ids not yet sent to this observer
}

export interface Observer {
  x: number; z: number; level: number;
  view: number;                     // current view radius, tiles
  lastResize: number;               // ticks since the last grow step
}

export function resizeView(o: Observer, knownCount: number): void {
  if (knownCount >= PREFERRED_CAP) {
    if (o.view > 1) o.view--;       // shrink fast while over the cap
    o.lastResize = 0;
    return;
  }
  o.lastResize++;
  if (o.lastResize >= RESIZE_INTERVAL) {
    if (o.view < PREFERRED_VIEW) o.view++;   // fix: donor keeps lastResize >= interval after a grow, so it grows every tick
    o.lastResize = 0;
  }
}

function dist(o: Observer, e: Ent): number {
  return Math.max(Math.abs(e.x - o.x), Math.abs(e.z - o.z));
}

// Nearest first, within the current radius, capped. Sorting is a simplification of the donor's spiral search.
export function pickSet(o: Observer, world: readonly Ent[], cap: number): Ent[] {
  const inRange = world.filter(e => e.active && e.level === o.level && dist(o, e) <= o.view);
  inRange.sort((a, b) => dist(o, a) - dist(o, b) || a.id - b.id);
  return inRange.slice(0, cap);
}

// Movement for every entity in the set is always counted; hit blocks fill what is left.
// Hits that do not fit stay in pendingHits for the next tick (the donor drops them at tick end).
export function sendTick(set: Ent[], budget: number = BYTE_BUDGET): { sentHits: number; carriedHits: number; bytes: number } {
  let used = set.length * MOVE_BYTES;
  let sentHits = 0;
  let carriedHits = 0;
  for (const e of set) {
    const keep: number[] = [];
    for (const hit of e.pendingHits) {
      if (used + HIT_BYTES <= budget) { used += HIT_BYTES; sentHits++; }
      else { keep.push(hit); carriedHits++; }
    }
    e.pendingHits = keep;
  }
  return { sentHits, carriedHits, bytes: used };
}

export {};
```

The sketch was typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0). Run on the VPS after compiling to JS: 30 quiet ticks from radius 5 gave 8 (the intended one step per 10 ticks); a shrink at the cap gave 14; the nearest-first pick with cap 2 gave ids 2 and 1; a budget of 10 with one entity and three hits sent two and carried one. The donor's growth was checked by hand-transcribing its branch order (build.ts 85-92): radius 5 reaches 15 by tick 19, one tile per tick after tick 10.

## 5. Lands in

- TARGET `origins/server/interest.ts` (new): the per-phone entity set, radius and byte budget for the server's client output. Parity row: 18, cited through its server-tick sub-line (row 18 / post-K item 3: "server tick: fixed step, input intake, per-tick NPC budget"). Row 18 itself is loot and XP; the per-tick byte budget and the NPC cap are the parts that sit on that sub-line. The row hint in the brief was 12, which is combat sound cues and does not cover culling.
- Client-side draw culling is not in this donor (the client renderer is not readable here). The gain on a phone is fewer entities reaching the draw loop; the draw cost is not measured here.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed; this sketch is clean-room)
- Brief rule served: 1 (one engine; interest is decided on the server, the client only draws what it is sent); rules 7-9 n/a

## 6. Gaps and risks

- Defect, grow step: `resize` grows one tile every tick once the counter reaches 10, because `lastResize` is not reset after a grow (build.ts 85-90). The intent (one tile per 10 ticks) is not what runs; the reset at line 90 sits only in the else branch, taken at the maximum radius. Fix: reset after each grow (in the sketch).
- Defect, dropped blocks: an extended block that does not fit the byte budget is replaced by idle (info.ts 83, 86 for players; 323, 326 for NPCs). The per-tick masks are reset at tick end (PathingEntity.ts 606) and the temporary caches are cleared (rsbuf/index.ts 299, renderer.ts 131), so a hit, a chat line or an animation is lost for that observer, not deferred. Movement still goes through. Fix: carry hits (and chat) into the next tick's queue, with a maximum age. Frankendom's hit feedback (row 10, hit impact) must not be dropped.
- Gap, selection at full radius: at radius 15 the cap is filled in zone-bucket order, not nearest first (build.ts 128-131). Nearest first applies only after the radius has shrunk. For a many-on-one fight the nearest attackers must win the cap at every radius. The sketch sorts at every radius.
- Gap, square view: the radius is a square (coord.ts 25). A fight camera that looks down a corridor would see a square's corners it does not need; a directional filter is not here.
- Gap, rebuild shrink: `rebuildPlayers` shrinks by one at most (build.ts 114-116), so a very crowded arrival can keep 250 entries at radius 14 for the first tick. The next tick's resize corrects it. Acceptable, but not stated in the donor.
- Cost: `IdBitSet.iter()` copies the id array on every call (build.ts 43-45) and `remove` uses `indexOf` and `splice` (build.ts 28-37). Fine at 250, not at thousands. Frankendom's server can use a Set and a per-tick array.
- The NPC encoder shares the drop-on-budget path (info.ts 323-326) and uses a fixed radius of 15 with a 255 cap (build.ts 213, 56). It has no adaptive radius, so a crowd of NPCs is capped but not thinned by distance.
- Not read: the rest of the NPC encoder (info.ts 346-471), `Zone.writeFullFollows` and `writePartialEncloses` (the zone streaming payloads), and the client renderer. The client bundle `public/client/client.js` was only grepped (see Checked).
