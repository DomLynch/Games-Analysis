# OpenDAoC-OpenDAoC-Core (zones-world, cell 7)

Donor: /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/WorldMgr.cs | Licence: GPL-3 | C# | symbol WorldMgr.RegisterZone / RegisterRegion / Init

Symbol check (opened, 2026-10-09 correction pass): Init 423-458, RegisterRegion 544-548, RegisterZone 581-639 land on the named methods. Also opened: EarlyInit 231-379 (where regions and zones are actually loaded), instance creation 985-1064 and RemoveInstance 1069-1077.

## 1. Mechanism
- WorldMgr is a static registry: m_regions and m_zones are ConcurrentDictionary<ushort, ...> (137, 147), with a separate per-region zone data list m_zonesData for instances (247, 941).
- Startup is two stages. EarlyInit(out regionsData) (231-379) clears both dictionaries (235-236), loads teleports, loads all mobs (or only the regions in a DEBUG_LOAD_REGIONS list, 259-269) and groups them by region id (271-283). For each DbRegion row it builds a RegionData (id, name, ip, port, expansion, housing, diving, water level, class type, frontier flag) with its mobs attached (288-311), stores it by id and logs an error on a duplicate id (316-322). It sorts the regions (325), registers each (330-334), forces the default frontier region to frontier if none is flagged (340-349), then reads every DbZone row into a ZoneData and calls RegisterZone with the row's XP, RP, BP and coin bonuses and realm (351-372), also keeping the ZoneData per region (368-371).
- Init(regionsData) (423-458) is the second stage. It initialises LootMgr (427), creates and initialises the day and night timer (429-430), then for every region record that has a registered region calls region.LoadFromDatabase to load mobs, merchants, items and bind points (437-441) and logs the four totals (443-449). Any exception is logged and returns false (451-456).
- RegisterRegion(data) (544-548) calls Region.Create(data) and then ConcurrentDictionary.TryAdd by id. A duplicate id returns null. The new Region object is constructed before the check; what Region.Create does is not read.
- RegisterZone (581-639): looks up the region; if missing it logs a warning and returns without registering (583-590). A zone water level of 0 is taken to mean "unset" and is replaced by the region's, and this is written back into the passed ZoneData (593-596). Diving starts as the region's setting; DivingFlag 1 forces it on and 2 forces it off (598-603). The Zone is built with origin = offset * 8192 and width and height = size * 8192 (608-611) plus the lava flag and the four bonuses and realm (615-620), appended to region.Zones and stored in m_zones[zoneID] (634-635), which silently overwrites an existing entry with the same id.
- Instances (985-1064): a new region is added under a requested id, or the first free id from DEFAULT_VALUE_FOR_INSTANCE_ID_SEARCH_START (1003-1015). The skin region's saved ZoneData list is replayed: each entry takes the first free zone id (reserved via m_zones.TryAdd(id, null), 1054) and is registered with all four bonuses 0 and realm 0 (1056), then instance.Start() (1062). RemoveInstance (1069-1077) drops the region and its zones.
- Inputs: region and zone rows. Outputs: registry entries. Startup plus instance create and remove.

## 2. Key functions
- WorldMgr.EarlyInit | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/WorldMgr.cs | 231-379 | loads region and zone rows into the registry, groups mobs by region.
- WorldMgr.Init | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/WorldMgr.cs | 423-458 | second stage: loot, day/night timer, per-region entity load from the database.
- WorldMgr.RegisterRegion | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/WorldMgr.cs | 544-548 | region registry with a duplicate guard.
- WorldMgr.RegisterZone | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/WorldMgr.cs | 581-639 | zone creation from data with region inheritance and 8192 unit scaling.
- WorldMgr instance creation | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/WorldMgr.cs | 985-1064 | clones a template region's zones under fresh ids with zero bonuses.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Registry keyed by id with a duplicate guard | Region and zone ids (theirs, data) |
| Child inherits water level and diving from parent unless set | Diving flag values 1 and 2; water level 0 means unset (theirs, 593, 600-603) |
| Zone bounds in grid units scaled to world units | Unit scale 8192 (theirs, 608-611) |
| Per-zone bonuses carried with the zone; instances get none | XP, RP, BP and coin bonus fields, realm number (theirs, 581, 1056) |
| Template zones cloned into an instance under free ids | Instance id search start (theirs, name only; value not read) |

## 4. TypeScript sketch
simplified: no database, no mobs or merchants load (the Init stage), no region side effects from Region.Create, no lava, realm, rp/bp/coin bonuses, no day/night timer; the donor writes the inherited water level back into the input ZoneData and the sketch does not (it computes it into the new zone only); instance zones are shown without the instance region itself being created or started.
```ts
// Licence: GPL-3 (OpenDAoC-OpenDAoC-Core) | clean-room: written from the mechanism, no donor lines.
const UNIT = 8192; // theirs: world units per zone-grid step
interface RegionData { id: number; waterLevel: number; divingEnabled: boolean; }
interface ZoneData { id: number; regionId: number; offX: number; offY: number; w: number; h: number; waterLevel: number; divingFlag: 0 | 1 | 2; xpBonus: number; }
interface Zone { id: number; regionId: number; x0: number; y0: number; x1: number; y1: number; waterLevel: number; diving: boolean; xpBonus: number; }

const regions = new Map<number, RegionData>();
const zones = new Map<number, Zone>();
const zonesByRegion = new Map<number, Zone[]>();

// A duplicate region id is refused.
function registerRegion(r: RegionData): boolean {
  if (regions.has(r.id)) return false;
  regions.set(r.id, r);
  return true;
}

// The zone inherits water and diving from its region unless it sets them.
// A missing region skips the zone. A repeated zone id overwrites the lookup entry.
function registerZone(z: ZoneData, zoneId: number, regionId: number, xpBonus: number): boolean {
  const region = regions.get(regionId);
  if (!region) return false;
  const waterLevel = z.waterLevel === 0 ? region.waterLevel : z.waterLevel;
  let diving = region.divingEnabled;
  if (z.divingFlag === 1) diving = true;
  else if (z.divingFlag === 2) diving = false;
  const x0 = z.offX * UNIT;
  const y0 = z.offY * UNIT;
  const zone: Zone = { id: zoneId, regionId, x0, y0, x1: x0 + z.w * UNIT, y1: y0 + z.h * UNIT, waterLevel, diving, xpBonus };
  const list = zonesByRegion.get(regionId) ?? [];
  list.push(zone);
  zonesByRegion.set(regionId, list);
  zones.set(zoneId, zone);
  return true;
}

// Instance: copy the template region's zone records under fresh ids with no bonuses.
function registerInstance(templates: ZoneData[], instanceRegionId: number): void {
  let next = 0;
  for (const t of templates) {
    while (zones.has(next)) next++;
    registerZone(t, next, instanceRegionId, 0);
  }
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/world/zone-registry.ts (new, name set by Lead): zone records loaded from data files into a registry at startup; today there is no zone registry (Zone 1 is hand-built in `zone1.ts`).
- Parity-checklist row: 20 (catalogue as runtime source: zone records are data, not code) and 18 (zone XP bonus must go through the server-verified reward path, post-K item 3).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- One engine, zones as data: Frankendom loads zone files, not database rows, and spawns come from the zone record; the donor mixes a world-level mob table into the region load (EarlyInit 258-311). Do not copy that coupling.
- The donor's zone XP/RP/BP/coin bonuses (581) would bypass the one ledger if copied as a multiplier on the client. Any Frankendom zone bonus must be applied by the server reward path only (server-verified kills).
- Instances here are server regions for groups (985-1064). Frankendom's Pit stays a client of the shared engine, not an instance region; instance creation is out of scope for the first port.
- Zone transitions and the region side effects of Region.Create / LoadFromDatabase were not read.
- The 8192 unit scale and the 0 = unset water rule are theirs; Frankendom's rules are Lead's. MAX_ATTACKERS = 3 has no counterpart in this file.
