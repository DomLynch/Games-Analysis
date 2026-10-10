# gawric-Unity-Client-for-L2J (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/SceneLoader.cs` (`SceneLoader.Update`, `ResolveSeamlessTiles`, `EventLoadSWMap`, `UnloadSWMap`), with `Assets/Scripts/Utils/VectorUtils.cs` (tile ids and unit scale), `Assets/Scripts/Terrain/Geodata/Geodata.cs` (map size, geodata store) and `Assets/Scripts/Game/Manager/GameManager.cs` (entry point) | Licence: Apache License, Version 2.0, January 2004 (repo root `LICENSE`, line 1-2). SceneLoader.cs has no per-file header. Code may be adapted; keep the NOTICE and licence text if copied. C# (Unity) | symbol `SceneLoader.Update`

Checked: Hint file `Assets/Editor/L2World/L2TreeModulate2XMenus.cs` was opened and is an editor menu for tree material modulate (MenuItem entries at lines 20 and 26), so it is the wrong file. Also opened: `Assets/Scripts/Terrain/MapLoader.cs` (59 lines; the only live code is the usings and an empty class, the map code is commented out, so it is dead). Read in full: SceneLoader.cs (1-379). Read: VectorUtils.cs (1-50), Geodata.cs (1-110 plus a grep of every `_geodata` use in the file), GameManager.cs (172-178, the caller). Not read: GeodataImporter and GeodataImporterFactory (the async import), PlayerController (the position source), the body of the Unity API `Application.CanStreamedLevelBeLoaded` (assumed to mean "in build settings"), what each zone scene contains, and the server packets that feed spawns. Scope: client-side zone streaming only; this is not a camera topic. Confidence: high on the streaming loop, the tile id, the edge band, the one-action-per-frame gate and the geodata lifetime; medium on the Unity-unit conversion, which I checked by arithmetic (32768 / 52.5 = 624.15, matching the fallback map size).

Best transferable idea: Keep a zone loaded while the player is within a preload band of its edge (including the corner neighbour), and start at most one zone load or unload per frame so streaming never stalls the frame.
Decision (proposed): adapt - take the edge-band neighbour set and the one-action-per-frame budget for the client zone loader; reject the donor's missing hysteresis (load and unload use the same line) and its geodata that is never released with the zone.
Acceptance: a client test walks the character back and forth across a zone edge at the band line for 300 frames: the neighbour zone is loaded when the band is entered and stays loaded through a hysteresis margin (no load and unload at each crossing), no more than one load or unload starts in any frame, and the geodata of a zone unloaded for a set time is released (memory check).

## 1. Mechanism

- Units and tile ids. The client turns a Unity position into L2 units by multiplying by 52.5 (VectorUtils.cs 10 divides by `1f / 52.5f`, which is the same as multiplying by 52.5; line 5 is the reverse, multiplying by `1f / 52.5f`). A tile is 32768 L2 units square (VectorUtils.cs 14). Tile id: `floor(l2.x / 32768) + 20` for x and `floor(l2.y / 32768) + 18` for y (18-19). Name: both ids as two-digit C# "00" strings joined by "_" (22-25). The map size `_mapSize` is 624.1524 Unity units (Geodata.cs 11), which equals 32768 / 52.5 (my arithmetic). So the tile is 624.15 Unity units square, and the same square in L2 units is 32768.
- Entry. When the character is selected, `GameManager.OnCharacterSelect` calls `Scenes.LoadSWMap()` (GameManager.cs 172-177). `LoadSWMap` reads the character's L2 position, names its tile, loads the geodata for that tile, loads the scene additively, records it as loaded, and only then sets `_worldStreaming = true` (SceneLoader.cs 75-117; 102, 116).
- Each frame (`Update`, 127-163). Return if not streaming, if a load or unload is busy, or if there is no player (129-132). Convert the player's Unity position to L2 units (134). Compute the wanted set (135, 165-215).
- Wanted set (`ResolveSeamlessTiles`). The own tile is always wanted (169-172). `edge = _tilePreloadDistance / mapSize` (175), with `_tilePreloadDistance = 80` Unity units (SceneLoader.cs 12) and `mapSize` from the geodata or 624.1524 as a fallback (174). So `edge` is 80 / 624.15 = 0.128 of a tile. Let `fx`, `fy` be the position inside the tile (176-177). If `fx < edge` the neighbour on the low x side is wanted, if `fx > 1 - edge` the high x side (181-188); the same for y (190-197). If both an x neighbour and a y neighbour are wanted, the diagonal corner is wanted too (209-212). Duplicates are removed (217-224).
- Load step (141-151). For the first wanted tile that is not loaded and that Unity can stream, start `EventLoadSWMap` and return. `EventLoadSWMap` sets busy, loads the geodata, loads the scene additively, records the tile and clears busy (226-238). So at most one load is in flight, and only one is started per frame.
- Unload step (153-162). If nothing needed loading, the first loaded tile that is not wanted is unloaded and the method returns. `UnloadSWMap` deactivates the scene roots, unloads the scene and removes the tile from the set, all in one call (240-249). So at most one unload is started per frame.
- Loop type: frame-driven (Unity `Update`), not a fixed-step simulation and no accumulator. The position is read once per frame.

## 2. Key functions

- `SceneLoader.Update`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/SceneLoader.cs` 127-163. Gate, wanted set, one load, else one unload.
- `ResolveSeamlessTiles`: same file, 165-215. The edge band and the corner rule.
- `EventLoadSWMap` and `UnloadSWMap`: same file, 226-249.
- `LoadSWMapRoutine`: same file, 87-117. The first tile on entry.
- `VectorUtils.GetSwMapTile` and `FormatSwMapName`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Utils/VectorUtils.cs` 16-25.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep neighbour zones loaded while the position is within a preload band of an edge; add the corner when two edges are near | Preload distance 80 Unity units (theirs, SceneLoader.cs 12); fraction = 80 / 624.15 = 0.128 of a tile (derived, 175) |
| Zone id from the position divided by a zone size, with a fixed offset | Tile 32768 L2 units (theirs, VectorUtils.cs 14); offsets +20 for x and +18 for y (theirs, VectorUtils.cs 18-19) |
| Unity to world units | Scale 52.5 (theirs, VectorUtils.cs 5, 10) |
| One streaming action per frame (one load or one unload) | Budget 1 load and 1 unload per frame, from the early return (theirs, SceneLoader.cs 149-150, 160-161) |
| Map size as the zone size in Unity units | 624.1524 (theirs, Geodata.cs 11) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: gate on busy, compute the wanted set (own tile, edge neighbours, corner), start at most one load of a wanted tile that is not loaded and can stream, otherwise remove at most one loaded tile that is not wanted. Tile names match C#'s "00" format, including the sign for negative ids. It omits the scene and geodata work (the caller's job: `finishLoad` is called when the async load ends), the initial `LoadSWMap` entry, the Unity-to-L2 conversion, the position read, and the geodata store. It does NOT add the hysteresis margin that Frankendom needs; the donor has none, so the same band is used for loading and unloading, as in the donor.

```ts
// Licence: Apache-2.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Grid { tileSize: number; offsetX: number; offsetY: number; }  // tile id = floor(pos / tileSize) + offset
export interface StreamState { loaded: Set<string>; busy: boolean; }
export type Step = { load?: string; unload?: string };

// Matches C# ToString("00"): sign first, then the absolute value zero-padded to two digits.
function pad2(n: number): string {
  const body = String(Math.abs(n)).padStart(2, "0");
  return n < 0 ? "-" + body : body;
}
export function tileName(tx: number, ty: number): string {
  return pad2(tx) + "_" + pad2(ty);
}

// Own tile, plus the neighbour on each edge the player is within `bandFraction` of, plus the corner when both edges are near.
export function wantedTiles(g: Grid, x: number, y: number, bandFraction: number): string[] {
  const tx = Math.floor(x / g.tileSize) + g.offsetX;
  const ty = Math.floor(y / g.tileSize) + g.offsetY;
  const fx = x / g.tileSize - Math.floor(x / g.tileSize);   // position inside the tile, 0..1
  const fy = y / g.tileSize - Math.floor(y / g.tileSize);
  let dx = 0; let dy = 0;
  if (fx < bandFraction) dx = -1; else if (fx > 1 - bandFraction) dx = 1;
  if (fy < bandFraction) dy = -1; else if (fy > 1 - bandFraction) dy = 1;

  const out: string[] = [tileName(tx, ty)];
  const add = (a: number, b: number): void => {
    const n = tileName(a, b);
    if (out.indexOf(n) < 0) out.push(n);
  };
  if (dx !== 0) add(tx + dx, ty);
  if (dy !== 0) add(tx, ty + dy);
  if (dx !== 0 && dy !== 0) add(tx + dx, ty + dy);
  return out;
}

// One action per call: start at most one load (and then stop), else remove at most one tile no longer wanted.
export function streamStep(g: Grid, x: number, y: number, bandFraction: number,
                           st: StreamState, canLoad: (t: string) => boolean): Step {
  if (st.busy) return {};
  const wanted = wantedTiles(g, x, y, bandFraction);
  for (const t of wanted) {
    if (!st.loaded.has(t) && canLoad(t)) {
      st.busy = true;
      return { load: t };
    }
  }
  for (const t of st.loaded) {
    if (wanted.indexOf(t) < 0) {
      st.loaded.delete(t);            // donor: unload is synchronous, busy is cleared at once
      return { unload: t };
    }
  }
  return {};
}

// Called when an async load finishes.
export function finishLoad(st: StreamState, tile: string): void {
  st.loaded.add(tile);
  st.busy = false;
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file /tmp/l2-seamless-tiles.ts). The `bandFraction` input in the sketch is the donor's `edge` (preload distance over map size), so the caller passes 80 / 624.1524.

## 5. Lands in

- TARGET `origins/client/zone-stream.ts` (proposed new client loader; not checked against the repo). Parity-checklist row 23 is the nearest row (zone population), but it covers the server spawn side. The client zone loader does not match any row 1-23 exactly. No row fits client-side streaming; row 23 is cited only because the brief asks for the closest one, and it fits the tile-id and neighbour-zone rules only in part.
- Today: none in Frankendom (the zone loader is not in the checklist).
- Reuse tag: rewrite-from-idea (Apache-2.0; clean-room only, not copied)
- Brief rule served: zones as data (tile size, offsets and preload distance become zone data); the camera, HUD and sound are client-only (this loader is client-only too, so it is not an engine rule).

## 6. Gaps and risks

- Apache-2.0: the sketch is clean-room. The donor is permissive, so a line-by-line adaptation is allowed with the licence kept, but it is not needed.
- No hysteresis. Loading and unloading use the same band (SceneLoader.cs 181-197 and 153-162). A player who jitters across the band line loads and unloads the neighbour each time. Frankendom needs a load band and a larger release band; that is a new field, not in the donor.
- Geodata is never released per zone. `_geodata` is written in `LoadMaps` (Geodata.cs 80) and cleared only in `OnDestroy` (45). `UnloadSWMap` does not touch it (SceneLoader.cs 240-249). Frankendom must release geodata with the zone.
- Hard-coded grid. The tile size (VectorUtils.cs 14) and the offsets +20 and +18 (18-19) are constants in code, not zone data. Frankendom's rulings say zones are data, so these move to the zone file.
- Client decides what is loaded. The donor's streaming decides which zones exist on screen; nothing here checks that the server agrees. Under Frankendom's server-verified rule, the server must not send enemies or loot for zones the client has not asked for, or the client can read them early (not read: the packet side).
- Entry and jumps. The world is shown after the first tile loads (SceneLoader.cs 110-113), and neighbours stream after that. As read, nothing waits for the zone a teleport lands in: the own tile is first in the wanted list (172), so it is requested first, but loads and unloads share one slot per frame. Not tested. Frankendom should block the transition until the own zone is loaded, or show a loading state.
- Unity-unit conversion. The preload distance is in Unity units, the tile id in L2 units. Both are used on purpose here, but the mix is easy to break; Frankendom should keep one unit (its own) in zone data and convert once.
- Not read: the async geodata import, the position source, and what each zone scene holds. The 624.1524 fallback and the Geodata value were checked against each other by arithmetic only.

Reuse tag: rewrite-from-idea (Apache-2.0; clean-room only, not copied)
Brief rule served: zones as data (tile size, offsets and preload band as zone data); client-only streaming (camera, HUD and sound are client-only); server-verified visibility (the server, not the client, decides what a zone holds).
