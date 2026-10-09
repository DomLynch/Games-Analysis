# OpenXcom-OpenXcom (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp | Licence: GPL-3 | C++ | symbol BattlescapeGenerator::deployAliens / addAlien (opened: deployAliens 1045-1167, addAlien 1178-1244; SavedBattleGame::getSpawnNode in /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedBattleGame.cpp 1245-1281)

## 1. Mechanism

- `deployAliens` (1045-1167) runs once when a battle map is built, not during the fight. The deployment record picks a race (with an underwater variant at depth) and a list of entries. Each entry names a rank, a low and high quantity, a random extra (`dQty`), an extra quantity (`extraQty`), and a percentage that the unit starts outside the UFO.
- Quantity by difficulty band (1080-1089): the random part is `RNG::generate(0, dQty)` (inclusive); below `DIFF_VETERAN` the quantity is `lowQty` plus that part; from `DIFF_VETERAN` up to below `DIFF_SUPERHUMAN` it is `lowQty + (highQty - lowQty) / 2` plus the part; `DIFF_SUPERHUMAN` and above use `highQty` plus the part. Then `RNG::generate(0, extraQty)` is added. In demigod mode both random parts are replaced by their maxima (`dQty`, `extraQty`).
- For each unit, a percentage roll decides whether it starts outside the UFO (only if a UFO exists). `addAlien` (1178-1244) builds the unit (clamping the rank to 7) and asks for a spawn node by rank. Outside units ask for node rank 0 only (it repeats the same call up to 7 times). Other units try seven node ranks from the table `Node::nodeRank[alienRank][i]` (the table was not read); each try calls `getSpawnNode` (SavedBattleGame.cpp 1245-1281), which skips dummy nodes and keeps nodes of that rank, whose small-unit and flying flags suit the unit, whose priority is above zero and whose position the unit could stand on (`setUnitPosition(..., true)`), takes the highest priority present, and returns one of those at random. The first rank that yields a node wins. If no node is found, or `setUnitPosition` then fails at the node, the unit is discarded, except in demigod mode, where `placeUnitNearFriend` is tried; on success the unit gets an AI with no node, its rank and facing as usual (`addAlien` 1220-1235).
- Back in `deployAliens`, for each unit that was placed: the item level is `alienItemLevels[month][RNG(0,9)]` (month is the months passed clamped to the table, or `_alienItemLevel` when months passed is -1, 1064-1075, 1098). Built-in weapons come from that level, clamped to the weapon list length (1102-1120). A living-weapon unit gets the item named by its race (after the first four characters) plus `_WEAPON` (1123-1140). Any other unit gets the deployment entry's item set for that level (clamped), and the code throws if the entry has no item sets (1143-1162). The entry's race may be replaced by the deployment's race and gets an `_UNDERWATER` suffix at depth (1048-1056); an unknown race throws.
- A unit with a node gets an AI module at that node, its rank and a special weapon, and its facing starts as the direction of the nearest window (`faceWindow`); if the node is within 20 tiles of the craft (the position of the first unit in the battle's unit list, 1205), it turns to face the craft with a chance of `20 * difficultyCoefficient` percent. Only when the resulting direction is -1 does it face a random direction (1197-1211). A unit is added to the battle only if it got a node (or the demigod fallback).
- Inputs: deployment record, race, month, difficulty, map nodes. Outputs: units with AI and loadout, placed on nodes.
- Tick: once at map build; no runtime reinforcement in these functions.

## 2. Key functions

- `BattlescapeGenerator::deployAliens`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` lines 1045-1167. Race, quantity bands, outside roll, loadout, per-unit placement call.
- `BattlescapeGenerator::addAlien`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` lines 1178-1244. Creates the unit; node search by rank list with fallback; AI attach; facing.
- `SavedBattleGame::getSpawnNode`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedBattleGame.cpp` lines 1245-1281. Free, rank-matched, size- and flight-compatible nodes; highest priority; random pick among ties.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Quantity band by difficulty: low, mid or high base, plus a random delta | difficulty thresholds (theirs: Veteran, Superhuman) |
| Demigod mode uses the fixed maxima | demigod flag (theirs) |
| Spawn by rank: a preference list of node ranks; first rank with a free node wins | per-rank node list table (theirs, not read) |
| Node choice: highest priority among free, compatible nodes; random among ties | priority 0 means no spawn place (theirs) |
| Outside-the-vehicle roll per unit | percent per entry (theirs, data) |
| Facing bias toward the player's craft by distance and difficulty | 20 tiles (theirs, line 1206); 20 times the difficulty coefficient percent (theirs, line 1206) |
| Loadout bracket by time index plus a random index | 10 item-level entries (theirs, line 1098); month table (theirs) |

## 4. TypeScript sketch

Licence: GPL-3. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the loadout (built-in weapons, living weapon, item sets), race and underwater selection, unit creation, AI attach, rank and special weapon, the node-rank table (passed in as `prefs`), the size / flying / occupied tests on nodes, the rank clamp and the 7-try loop are omitted; the difficulty band is passed as a three-way label; `hasUfo` gates the outside roll as in the donor; a node that is found but fails `setUnitPosition` is not modelled.

```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Entry { rank: number; lowQty: number; highQty: number; dQty: number; extraQty: number; pctOutside: number; }
interface SpawnNode { id: number; rank: number; priority: number; free: boolean; }

// Quantity by difficulty band, with a random delta; demigod mode uses the fixed maxima.
function quantity(e: Entry, band: "low" | "mid" | "high", demigod: boolean, rand: (n: number) => number): number {
  const base = band === "low" ? e.lowQty : band === "mid" ? e.lowQty + Math.floor((e.highQty - e.lowQty) / 2) : e.highQty;
  const delta = demigod ? e.dQty : rand(e.dQty + 1);
  const extra = demigod ? e.extraQty : rand(e.extraQty + 1);
  return base + delta + extra;
}

// Node choice: for each preferred rank, take the free nodes at the highest priority, pick one at random.
function findNode(nodes: SpawnNode[], rankPrefs: number[], outside: boolean, rand: (n: number) => number): number | null {
  for (const r of outside ? [0] : rankPrefs) {
    const pool = nodes.filter(n => n.rank === r && n.priority > 0 && n.free);
    if (pool.length === 0) continue;
    const top = Math.max(...pool.map(n => n.priority));
    const best = pool.filter(n => n.priority === top);
    return best[rand(best.length)].id;
  }
  return null;
}

// Facing: start from the window direction (-1 if none); near the player's craft, face it with a
// difficulty-scaled chance; random only when the result is still -1.
function facing(windowDir: number, distance: number, craftDir: number, difficulty: number, rand: () => number): number {
  let dir = windowDir;
  if (distance <= 20 && rand() * 100 < 20 * difficulty) dir = craftDir;
  return dir !== -1 ? dir : Math.floor(rand() * 8);
}

// Per entry: each unit rolls outside-the-vehicle, then takes a node; a unit with no node is dropped,
// unless demigod mode places it next to a friendly unit instead.
function deploy(e: Entry, band: "low" | "mid" | "high", demigod: boolean, hasUfo: boolean, rand: (n: number) => number, nodes: SpawnNode[], prefs: number[], nearFriend: () => boolean): number {
  let placed = 0;
  const count = quantity(e, band, demigod, rand);
  for (let i = 0; i < count; i++) {
    const outside = rand(100) < e.pctOutside && hasUfo;
    if (findNode(nodes, prefs, outside, rand) !== null) placed++;
    else if (demigod && nearFriend()) placed++;
  }
  return placed;
}
```

## 5. Lands in

- TARGET origins/mobs/populate.ts (camp placement from rows + zone Params + seed; today `stand(x, z)` is a yes/no test and the opener rule is in origins/world/zone-rules.ts) with the node data in the zone's `layout` (origins/zones/loader.ts). What is genuinely new from this donor is small: a priority per spawn site (highest priority among free sites, random among ties) and a start facing toward the entry; the count-by-difficulty bands are already the zone's `density.creatures` budget and `difficulty` (levelMin / levelMax). Not a new `src/fight/spawn-points.ts`: populate.ts already places camps. Checklist row 4 (fight loop: where creatures start and which way they face); feature map: zones as data.
- Parity-checklist row: 4.
- Reuse tag: rewrite-from-idea
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- Zones as data: the node table (rank, priority, size and flying flags) is map data in the donor. In Frankendom it must be fields of the zone's `layout` / Params, not code; the donor's rank-to-node table (`Node::nodeRank`) was not read and cannot be judged.
- Server-verified kills: the donor draws counts, node picks and facing from the shared `RNG` at build time. The server must replay placement from the seeded stream (origins/mobs/populate.ts is pure and seeded), so the 0..dQty and node-tie draws must come from that stream.
- One engine / no respawn: this is a one-time battle build with no reinforcement or respawn. The respawn clock is the server's (origins/server/world-spawns.ts), not in these functions.
- MAX_ATTACKERS = 3: a deployment of many units says nothing about engagement; at most 3 may be engaged on one player and the rest hold at the ring (src/fight/world.ts). The donor's aliens all act on their own turns.
- Difficulty is a campaign setting (`getDifficulty` and `isDemigod`); a zone's difficulty is `difficulty.levelMin..levelMax` in the zone Params. The demigod "spawn as many as possible" fallback must not be copied: it breaks the zone budget.
