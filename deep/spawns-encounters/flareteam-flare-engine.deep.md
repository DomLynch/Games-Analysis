# flareteam-flare-engine (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/flareteam-flare-engine/src/EnemyGroupManager.cpp | Licence: GPL-3 | C++ | symbol EnemyGroupManager::getRandomEnemy (opened: constructor 30-70, getRandomEnemy 76-123, getEnemiesInCategory 125-132; call sites at MapRenderer.cpp 94, EntityManager.cpp 266, Avatar.cpp 1008 found by search, bodies read only for the call lines)

## 1. Mechanism

- At start-up, `EnemyGroupManager` (30-70) lists every file under `enemies` and parses it. Each file yields one `Enemy_Level` record (its `type` is the file path, plus the `level` and `rarity` keys; a later value overwrites an earlier one) and a comma-separated `categories` list. The record is pushed once into each category it names (65-68). If a file cannot be opened the constructor returns at once (line 38), so the files after it are not loaded. `rarity` is stored as a raw string and defaults to "common" and level to 0 (constructor in EnemyGroupManager.h line 30).
- `getRandomEnemy(category, minlevel, maxlevel)` is the pick. It looks up the category and fails with an empty enemy (and a logged error) if the category is unknown.
- It builds a candidate list: an enemy is kept if its level is in [minlevel, maxlevel]. The window is ignored when both bounds are 0. Each kept enemy is pushed into the list 6, 3 or 1 times for common, uncommon or rare, so rarity is a weight by repetition. Any other rarity string adds zero copies and logs an error.
- If the candidate list is empty, it logs an error and returns an empty enemy. Otherwise it returns one candidate chosen with `rand() % size`.
- Inputs: category name, level window. Output: one enemy record (type path, level, rarity). Nothing is stored; each call is independent.
- Called when the game places an enemy, not on a tick: a map's enemy group places each member with the group's category and level band (MapRenderer.cpp 94), an enemy spawn uses its type with a (0, 0) window (EntityManager.cpp 266), and a player transform does the same (Avatar.cpp 1008). Only the call lines were read.
- `getEnemiesInCategory` (125-132) returns the whole category unfiltered, or an empty list with a logged error.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| EnemyGroupManager::EnemyGroupManager | /mnt/frankendom-donors/flareteam-flare-engine/src/EnemyGroupManager.cpp | 30-70 | Parses enemy files; fills categories with level and rarity |
| EnemyGroupManager::getRandomEnemy | /mnt/frankendom-donors/flareteam-flare-engine/src/EnemyGroupManager.cpp | 76-123 | Filters by level window, weights by rarity repetition, picks with rand() |
| EnemyGroupManager::getEnemiesInCategory | /mnt/frankendom-donors/flareteam-flare-engine/src/EnemyGroupManager.cpp | 125-132 | Returns every enemy in a category (no filtering) |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted pick by repeating candidates in an array | Weights common 6, uncommon 3, rare 1 (theirs) |
| Level window filter, with a zero-window meaning "any level" | Zero-zero window means no filter (theirs) |
| Category index built once at load | Categories declared in enemy files (theirs) |
| Fallback to an empty record with a logged error | Error text and empty-record fallback (theirs) |

## 4. TypeScript sketch

Licence: GPL-3. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: file parsing (one record per file), the logged errors and the empty-record fallback (the sketch returns `undefined`), the unknown-rarity error branch (the sketch gives it zero copies silently) and `rand() % size` (the sketch uses `floor(rnd() * size)`) are omitted or changed.

```ts
// clean-room sketch of a level-banded, rarity-weighted pick.
// Licence line: GPL-3 donor; this sketch is clean-room, written from mechanism only.
type Rarity = 'common' | 'uncommon' | 'rare';
interface Entry { type: string; level: number; rarity: Rarity; }
const WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 3, rare: 1 }; // theirs
// Build once at load: category name -> entries.
function indexByCategory(entries: { cats: string[]; e: Entry }[]): Map<string, Entry[]> {
  const out = new Map<string, Entry[]>();
  for (const { cats, e } of entries) {
    for (const c of cats) {
      const list = out.get(c) ?? [];
      list.push(e);
      out.set(c, list);
    }
  }
  return out;
}
// Pick one entry for a category inside [minLevel, maxLevel].
// A window of (0, 0) means no level filter.
function pickEncounter(
  index: Map<string, Entry[]>,
  category: string,
  minLevel: number,
  maxLevel: number,
  rnd: () => number,
): Entry | undefined {
  const pool = index.get(category);
  if (!pool) return undefined;
  const bag: Entry[] = [];
  for (const e of pool) {
    const inWindow = (minLevel === 0 && maxLevel === 0) || (e.level >= minLevel && e.level <= maxLevel);
    if (!inWindow) continue;
    const copies = WEIGHT[e.rarity] ?? 0;
    for (let i = 0; i < copies; i++) bag.push(e);
  }
  if (bag.length === 0) return undefined;
  return bag[Math.floor(rnd() * bag.length)];
}
```

## 5. Lands in

- TARGET origins/mobs/populate.ts (`pickRow`) with origins/mobs/row.ts (`rungWeights`, `RARITY_WEIGHT`, `RARE_DEFAULT`). The donor's idea is already there: a seeded weighted draw among eligible rows by rarity weight (common 1, uncommon 0.3, rare 0) and a level window (`zone.difficulty.levelMin..levelMax`), with rares as a seeded replacement chance for a placeholder row. The donor's integer repetition (6/3/1) adds nothing new. Not src/roster.ts or src/ladder.ts: those are the Pit opponent recipes and rungs, not zone encounters.
- Parity-checklist row: 4 (zone encounter picking); the weights are catalogue / row fields (row 21). Feature map: zones as data.
Reuse tag: rewrite-from-idea
Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: the donor draws with unseeded global `rand()`. Frankendom's pick (populate.ts `prng` seeded from the zone seed) is replayable by the server; do not introduce an unseeded draw.
- Zones as data: the donor's weights 6/3/1 and the (0, 0) = any-level window are literals in code; Frankendom's equivalents are `RARITY_WEIGHT` and the zone's level window in data. A rare in Frankendom is never drawn alone (it replaces a placeholder), unlike the donor where rare is weight 1.
- The donor returns an empty record on failure and keeps going; Frankendom's validator (`validateMobRow` issues) rejects a malformed band by name instead.
- The constructor stops loading at the first unreadable file (line 38); a loader must report which row failed, not silently drop the rest.
- MAX_ATTACKERS = 3 is unaffected: the pick says what a camp holds, not how many fight at once (src/fight/world.ts).
