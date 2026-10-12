# daggerfall-unity (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RMBLayout.cs` | Licence: MIT (`/mnt/frankendom-donors/daggerfall-unity/LICENSE`, "MIT License", Copyright 2009-2023 Daggerfall Workshop; the header of `Game/Utility/CityNavigation.cs` also says MIT) | C# | symbol `GetLocationBuildingData`

Checked: `GetLocationBuildingData` (592-701), `GetNextBuildingFromPool` (707-720), `IsNamedBuilding` (725-748), `GetBuildingData` (550-582) and `BuildingPoolItem` (59-63) read in full. Also read in full: `Game/Utility/CityNavigation.cs` (606 lines) and `Game/BuildingDirectory.cs` (227 lines); `Game/Questing/Place.cs` 1125-1275 (quest-site candidate filter). Callers: read two of them (`BuildingDirectory.SetLocation` at `Game/BuildingDirectory.cs:91` and `Place.CollectQuestSitesOfBuildingType` at `Game/Questing/Place.cs:1141`); other callers were found by grep only, not read (`Game/TalkManager.cs:2759`, `Game/ExteriorAutomap.cs:648` and `1435`, `Internal/DaggerfallInterior.cs:372`). Not read: `WorldDataReplacement` (the replacement table), the `DFLocation.BuildingData` struct definition, the MAPS and RMB game data (not in this repo), and the minimap code in `Game/Automap.cs` and `Game/ExteriorAutomap.cs` (grep hits only). Camera scope: not applicable (not a camera cell). Confidence: high on the pool order and on the empty-pool defect (both read end to end, one caller each); medium on what downstream code does with zeroed fields (not read).

## 1. Mechanism

- A city's named services (temple, tavern, bank, guild hall, shops, palace) are not placed by the block layout. They come from a pool of records taken from the location's own building list (map data), and the pool is poured into the layout slots one at a time.
- Order of steps, as the code runs: (a) build the pool: for each map building record whose type is a named service, add a pool entry holding that record and `used = false` (608-618). (b) walk the blocks row by row, y outer and x inner (623, 625). For each block, load its RMB block by name and copy its building array so it can be edited (628-638). (c) for each record in the block: if the record's type is a named service, draw the first unused pool entry of the same type, in pool order (645, 649, 712). Mark it used (715). Copy its NameSeed, FactionId, Sector, LocationId and Quality onto the layout record (655-659). (d) if replacement data exists for this block and record, and its FactionId is not zero, return the pool entry to unused and take the replacement's FactionId, Quality and a NameSeed varied by location index (665-671). Replacement data always sets the building type (673-674). (e) a special case: a block record whose name in the block's `OtherNames` is `KRAVE01.HS2` is forced to GuildHall with faction 414 (678-683). Records that are not named services keep their own layout data.
- Result: the resolved blocks are cached per map id (692-698). The cache holds 12 locations in release builds and drops the oldest first (45, 694-696).
- Failure path: if the pool has no unused entry of the type, `GetNextBuildingFromPool` returns a fresh, empty entry (709) and returns false. The caller only logs (649-651) and then copies the empty entry's fields (655-659), so the slot keeps its layout type but gets zero NameSeed, FactionId, Sector, LocationId and Quality. Nothing else is reported.
- Tick: none. This runs once per location, at layout time, and the result is cached. It is not a per-frame loop.

## 2. Key functions

- `GetLocationBuildingData`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RMBLayout.cs` 592-701. The whole pipeline: pool, block walk, draw, replacement, special case, cache.
- `GetNextBuildingFromPool`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RMBLayout.cs` 707-720. First unused entry of the requested type, in pool order; marks it used.
- `IsNamedBuilding`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RMBLayout.cs` 725-748. The fifteen service types that take part in the pool.
- `GetBuildingData`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/RMBLayout.cs` 550-582. Builds one summary per record: key from block x, block y and record index (562), position and rotation from the sub-record (570-571), and the first model id (577).
- Read for context, not part of the mechanism above: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Place.cs` 1131-1247 (`CollectQuestSitesOfBuildingType`) filters candidate buildings one at a time with a chain of exclusions: player-owned house (1196), guild faction mismatch, Dark Brotherhood and Thieves Guild buildings (1204-1207), buildings already assigned to another quest (1210), and buildings with no usable marker (1216).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Typed pool, each entry used at most once, drawn in fixed layout order | Fifteen named service types (`IsNamedBuilding`, 729-743; Temple at 741) |
| Replacement data that keeps the pool entry free when it names a faction | Rule: FactionId != 0 keeps the entry unused (668). Theirs. |
| Name seed varies by location | NameSeed + location index (671). Theirs. |
| One special record forced to a guild hall | `KRAVE01.HS2` to GuildHall, faction 414 (679-682). Theirs. Hard-coded. |
| Resolved layout cached per location | 12 locations, first in first out, release builds only (45, 694-696). Theirs. |
| Empty pool | Returns an empty entry (709); the caller copies zeros (655-659). Defect, see section 6. |

Secondary numbers from `Game/Utility/CityNavigation.cs` (not part of this note's mechanism; listed because they are road and building grammar numbers): walkable weight per ground tile, stored in the high nibble (241). Water 0 (case 581, return 588), stone 4 (590), dirt 6 (592), grass 12 (594), road and road corners 15 (595-598), everything else 7 (600). The weight is stored only where the automap cell is empty (230-231), that is, where no building, model or flat covers the tile. The line numbers 590, 592, 594, 598 are read from the code; their receipts quote the case lines instead, because the return lines are under 15 characters.

## 4. TypeScript sketch

simplified: keeps the donor order: slots are filled in the order the caller gives (layout order), each pool entry is used once, and the first unused entry of the same type wins. It omits the replacement-data rule (a faction keeps the entry free), the source of the pool (map building list), the named-type filter, the KRAVE special case, the location cache and the NameSeed location offset. It changes one thing on purpose: an exhausted pool gives the slot a seed from its own key and reports the shortfall, instead of copying zeros (the donor defect, 655-659 with 709).

```ts
// Licence: MIT (donor: Daggerfall Unity). Clean-room sketch of the idea, not a line-by-line translation.
// Fix applied: the donor copies the zeroed default fields when its pool is empty; here an empty pool gives the slot a seed from its own key.

type ServiceType = 'temple' | 'tavern' | 'bank' | 'guildHall' | 'armorer' | 'generalStore';

interface ServicePoolItem {
  type: ServiceType;
  nameSeed: number;
  faction: number;
  quality: number;
  used: boolean;
}

interface HubSlot {
  key: number;                 // stable slot key, e.g. packed block x, block y, record index
  type: ServiceType;           // the service this slot asks for
  nameSeed?: number;
  faction?: number;
  quality?: number;
  filledFrom?: 'pool' | 'fallback';
}

// Fill slots one at a time, in the order the caller gives (layout order).
// Each pool item is used at most once. An exhausted pool does not copy zeros:
// the slot gets a seed from its own key and the shortfall is reported.
function fillHubSlots(
  slots: HubSlot[],
  pool: ServicePoolItem[],
  report: (msg: string) => void,
): void {
  for (const slot of slots) {
    const item = pool.find(p => !p.used && p.type === slot.type);
    if (item === undefined) {
      slot.nameSeed = slot.key;
      slot.faction = 0;
      slot.quality = 0;
      slot.filledFrom = 'fallback';
      report(`pool exhausted for ${slot.type} at slot ${slot.key}`);
      continue;
    }
    item.used = true;
    slot.nameSeed = item.nameSeed;
    slot.faction = item.faction;
    slot.quality = item.quality;
    slot.filledFrom = 'pool';
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/cm012-fill-hub-slots.ts`: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: the zone population step (engine logic). A hub's service slots would be filled there, on the server, from the zone's pool (zone data), in the same pass that places the population. Parity-checklist row 23 (zone population).
- Frankendom module for hub service slots: not read in this pass (not read).
- Reuse tag: adapt-allowed (MIT; code may be adapted; the sketch here is written fresh)
- Brief rule served: addendum rules 1-6 (judged the idea, not the genre: a typed one-use pool poured into slots in order); Frankendom rulings: zones as data, one ledger (each pool entry is spent once). Camera and tick rules not applicable.

## 6. Gaps and risks

- Zones as data: the donor's pool and layout come from game files (MAPS and RMB), not from code. Frankendom would write the slot list and the pool as zone data per zone (slot type, pool entries with name seed, faction, quality). Not as constants in the function.
- Server-verified: the donor fills services in a Unity scene build on the client. Frankendom must run the fill on the server and send the result; the client only renders it.
- Layout order is greedy: the first block in row-then-column order gets the first pool entry of each type, so services cluster by map order, not by spread. A hub that should spread its services needs a spacing rule the donor does not have (new rule, not in the donor).
- Defect, empty pool: the caller logs and then copies zeros (649-659 with 709). Fix: the sketch gives the slot a key-derived seed and reports the shortfall. Test it.
- Defect, hard-coded special case: `KRAVE01.HS2` to faction 414 (679-682) is a constant for one game record. Do not copy it; express it as a zone-data override if needed.
- Defect, noticed outside this mechanism: `Game/BuildingDirectory.cs:176` seeds the house-for-sale draw with `buildingDict.GetHashCode()` plus the month (`Random.InitState(buildingDict.GetHashCode()`). The dictionary hash is an object hash, which is not stable across sessions (.NET behaviour, not read in the donor). Fix: seed from the location id and the month, and do not reseed Unity's global random generator for a UI list.
- Pool accuracy: the layout method calls itself "best effort" and says it is "very accurate" most of the time (`RMBLayout.cs` 586-587). The quest-site code calls the map building list "often inaccurate" (`Place.cs` 1128). So the pool can disagree with the layout; Frankendom zones are authored, so check the pool against the slots at load and fail loudly on a mismatch.
- Quest-site filter (Place.cs 1131-1247) is a useful shape (a chain of exclusions, one candidate at a time), but it is tied to the donor's quest system. Not adopted.

Reuse tag: adapt-allowed (MIT; the sketch is written fresh; see section 5)
Brief rule served: addendum rules 1-6; Frankendom rulings zones as data and one ledger

Best transferable idea: Fill each hub's service slots one at a time, in a fixed order, from a typed pool where each pool entry can be spent once, and report a short pool instead of silently zeroing the slot.
Decision (proposed): adapt - the typed one-use pool fits zones as data; change the donor's first-come layout order to a spread rule and fix the zero-copy fallback.
Acceptance: A player entering a zone finds one temple, one tavern and one bank, each drawn from that zone's pool, spread across the hub; a server test asserts no pool entry is spent twice and an empty pool gives a seeded slot plus one report line, never zero values.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: Nit only: note says the 12-location cache is 'release builds only'; the code (RMBLayout.cs 44-45, 693-698) is #if !UNITY_EDITOR, i.e. any non-editor build. All other claims verified (pool 608-618, loop order 623-625, draw 645-659, replacement 665-674, KRAVE01 678-683, cache 695-696, IsNamedBuilding 15 types, GetNextBuildingFromPool empty-return 709, BuildingDirectory.cs:176 seed, Place.cs 1128 and 1196-1216, CityNavigation weights 581-600, MIT headers).
Missed: None significant.
