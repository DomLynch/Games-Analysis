NOTE="cuteshaun-lineage2-api"
D="/mnt/frankendom-donors/cuteshaun-lineage2-api/"
RT=D+"src/app/api/[chronicle]/locations/route.ts"
IX=D+"src/lib/data/indexes.ts"
LO=D+"src/lib/api/dto/location.ts"
NP=D+"src/lib/api/dto/npc.ts"
TY=D+"src/lib/types.ts"
LI=D+"LICENSE"
R=[
(RT,18,"catalogue entries are centre anchors, not polygons","single `(x, y, z)` center anchor, not a polygon."),
(RT,34,"the catalogue route maps every zone to its reference DTO","const locations = getHuntingZones(parsed.chronicle).map(toLocationRefDto);"),
(IX,649,"zones are sorted by id, so a strict less-than keeps the lowest id on a tie","const huntingZones: HuntingZone[] = [...dataset.huntingZones].sort("),
(IX,1564,"fixed 10000 game-unit threshold","export const LOCATION_NEAREST_DISTANCE_THRESHOLD = 10000;"),
(IX,1599,"resolver signature: chronicle and (x, y), z ignored","export function resolveLocationForCoordinate("),
(IX,1608,"resolver reads the chronicle's zone list","const zones = getChronicleIndexes(chronicle).huntingZones;"),
(IX,1609,"no zones gives null","if (zones.length === 0) return null;"),
(IX,1611,"threshold squared for the comparison","LOCATION_NEAREST_DISTANCE_THRESHOLD * LOCATION_NEAREST_DISTANCE_THRESHOLD;"),
(IX,1615,"offset from anchor to point, x","const dx = z.x - x;"),
(IX,1617,"squared 2D distance","const d2 = dx * dx + dy * dy;"),
(IX,1618,"nearest so far wins","if (d2 < bestDist2) {"),
(IX,1621,"equal distance: lower id wins","} else if (d2 === bestDist2 && best && z.id < best.id) {"),
(IX,1626,"nearest zone returned only within the threshold","return best && bestDist2 <= limit2 ? best : null;"),
(LO,128,"audited override map: NPC id to zone id","const PRIMARY_LOCATION_OVERRIDES_BY_NPC_ID = new Map<number, number>(["),
(LO,147,"home zone is the most frequent resolved zone","export function computePrimaryLocation("),
(LO,155,"each spawn is resolved by the same nearest-anchor rule","const zone = resolveLocationForSpawn(chronicle, s);"),
(LO,170,"most frequent wins; equal counts go to the lowest id","if (count > bestCount || (count === bestCount && zone.id < bestId)) {"),
(LO,189,"NPC wrapper applies the override first","export function resolvePrimaryLocationForNpc("),
(LO,194,"override is looked up by NPC id","const overrideZoneId = PRIMARY_LOCATION_OVERRIDES_BY_NPC_ID.get(npcId);"),
(LO,197,"override zone returned when the chronicle has it","if (zone) return toLocationRefDto(zone);"),
(LO,202,"otherwise the mode rule runs","return computePrimaryLocation(spawns, chronicle);"),
(NP,150,"NPC field is nearest-anchor with a fixed threshold, not containment","nearest-anchor with a fixed 10000-unit 2D"),
(NP,391,"NPC detail resolves its primary location from cleaned spawns","const primaryLocation = resolvePrimaryLocationForNpc("),
(TY,439,"each zone is a single centre anchor","Each record carries a single `(x, y, z)` center anchor — NOT a"),
(TY,442,"resolution is nearest-anchor, not point-in-polygon","`resolveLocationForCoordinate`), not point-in-polygon."),
(TY,446,"territory umbrellas have zero coordinates and are dropped at parse time (comment; parser not read)","`x = y = z = 0` — they are intentionally **dropped at parse"),
(LI,3,"licence: MIT, copyright 2026 Andrii Tsapko","Copyright (c) 2026 Andrii Tsapko"),
]
