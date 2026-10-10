import csv
D='/mnt/frankendom-donors/CytopiaTeam-Cytopia/'
N='CytopiaTeam-Cytopia'
rows=[
 ('LICENCE: GPL-3.0 title','license.txt says GNU GPL Version 3 (copyleft, clean-room only)',D+'license.txt','GNU GENERAL PUBLIC LICENSE'),
 ('LICENCE: version line','license.txt version line',D+'license.txt','Version 3, 29 June 2007'),
 ('zone spawn per-tick cap is 5 buildings','constant amountOfBuildingsToSpawn = 5',D+'src/game/ZoneArea.cxx','constexpr int amountOfBuildingsToSpawn = 5;'),
 ('spawn loop stops at cap','loop breaks when count reaches cap',D+'src/game/ZoneArea.cxx','if (buildingsSpawned >= amountOfBuildingsToSpawn)'),
 ('nodes are shuffled before picking','shuffle of zone nodes each call',D+'src/game/ZoneArea.cxx','randomizer.shuffle(begin(), end());'),
 ('occupied nodes are skipped','skip nodes with occupied flag',D+'src/game/ZoneArea.cxx','if (node.occupied)'),
 ('max footprint per node','max footprint from getMaximumTileSize',D+'src/game/ZoneArea.cxx','TileSize maxTileSize = getMaximumTileSize(node.coordinate);'),
 ('tile picked by zone type, density and footprint','random tile for zone, density and max size',D+'src/game/ZoneArea.cxx','getRandomTileIDForZoneWithRandomSize(m_zoneType, m_zoneDensity, maxTileSize)'),
 ('count increments regardless of setTileID result','buildingsSpawned++ runs after setTileID',D+'src/game/ZoneArea.cxx','buildingsSpawned++;'),
 ('setTileID result is not checked','setTileID call whose bool result is ignored',D+'src/game/ZoneArea.cxx','MapFunctions::instance().setTileID(buildingTileID, node.coordinate);'),
 ('footprint check starts with x strip','getMaximumTileSize tests origin row strip',D+'src/game/ZoneArea.cxx','std::vector<Point> xDirection = PointFunctions::getArea('),
 ('footprint check y strip','getMaximumTileSize tests origin column strip',D+'src/game/ZoneArea.cxx','PointFunctions::getArea(originPoint, {originPoint.x, originPoint.y + distance});'),
 ('getArea builds the rectangle between corners','getArea loops over x in corner range',D+'src/engine/basics/PointFunctions.cxx','for (int x = startRect.x; x <= endRect.x; x++)'),
 ('footprint cells extend to -x and +y','getTargetCoordsOfTileID cell formula',D+'src/engine/TileManager.cxx','Point coords = {targetCoordinates.x - i, targetCoordinates.y + j};'),
 ('spawn table filters by zone type','zoneTypes membership test in getAllTileIDsForZone',D+'src/engine/TileManager.cxx','tileData.second.zoneTypes.end(), +zone)'),
 ('spawn table filters by footprint size','RequiredTiles equals requested size',D+'src/engine/TileManager.cxx','tileData.second.RequiredTiles.height == tileSize.height'),
 ('only square footprints are used','comment: only square buildings picked',D+'src/engine/TileManager.cxx','for now only pick square buildings'),
 ('random square size among eligible sizes','random choice of eligible tile size',D+'src/engine/TileManager.cxx','TileSize randomTileSize = *randomizer.choose('),
 ('zone spawn gate: vacant and powered','isVacant and hasPowerSupply gate',D+'src/game/ZoneManager.cxx','if (zoneArea.isVacant() && zoneArea.hasPowerSupply())'),
 ('spawn runs from a real-time task','zone update and spawn registered as real-time task',D+'src/game/ZoneManager.cxx','GameClock::instance().addRealTimeClockTask('),
 ('update runs before spawn in the same task','spawnBuildings called after update in the lambda',D+'src/game/ZoneManager.cxx','        spawnBuildings();'),
 ('periodic task rescheduled from current time','tickTask re-queues with now plus period',D+'src/services/GameClock.cxx','queue.push(Task(task.callback, now + task.m_period, task.m_period, task.hndl));'),
 ('occupancy comes from signal and is applied next update','updatePlacedNodes queues occupy',D+'src/game/ZoneManager.cxx','m_nodesToOccupy.push_back(mapNode.getCoordinates());'),
 ('pending occupy list is applied before spawning','if non-empty check for occupy list',D+'src/game/ZoneManager.cxx','if (!m_nodesToOccupy.empty())'),
 ('setTileID emits per covered node','signal emitted for each target coordinate',D+'src/engine/map/MapFunctions.cxx','SignalMediator::instance().signalSetTileID.emit(currentMapNode);'),
 ('setTileID early return on bad tile or no footprint','bool return on empty footprint',D+'src/engine/map/MapFunctions.cxx','if (!tileData || targetCoordinates.empty())'),
 ('setTileID rejects blocked area','area placement check gates placement',D+'src/engine/map/MapFunctions.cxx','if (!isPlacementOnAreaAllowed(targetCoordinates, tileID))'),
 ('dead branch: size test is never true','condition on line 423 cannot hold because the empty case returned at line 383',D+'src/engine/map/MapFunctions.cxx','if ((!targetCoordinates.size()) == 1)'),
 ('node placement: empty layer allowed','a layer with a tile already present is not allowed here',D+'src/engine/GameObjects/MapNode.cxx','if (m_mapNodeData[layer].tileID.empty())'),
 ('BUILDINGS case returns early only for overplacable','BUILDINGS case returns true early only for overplacable tiles; otherwise general checks run',D+'src/engine/GameObjects/MapNode.cxx','if (tileDataBuildings && tileDataBuildings->isOverPlacable)'),
 ('zone node default occupied false','ZoneNode.occupied defaults to false',D+'src/game/ZoneArea.hxx','bool occupied = false;'),
 ('reset clears zone areas and re-adds nodes','ZoneManager::reset starts from empty',D+'src/game/ZoneManager.cxx','m_zoneAreas.clear();'),
 ('reset queues each zone node as new','reset queues nodes with zone layer',D+'src/game/ZoneManager.cxx','    if (mapNode.getTileData(Layer::ZONE))'),
 ('loadGame then resetManagers','loadGame loads the map file, then calls resetManagers (line 213)',D+'src/Game.cxx','MapFunctions::instance().loadMapFromFile(fileName);'),
 ('resetManagers resets zone manager','GamePlay::resetManagers resets ZoneManager',D+'src/game/GamePlay.cxx','m_ZoneManager.reset();'),
 ('only setVacancy writes occupancy (occupy)','ZoneManager::update sets occupied false when a building appears',D+'src/game/ZoneManager.cxx','zoneArea.setVacancy(nodeToOccupy, false);'),
 ('zone box starts at plus or minus one','initial xmin uses coordinate minus 1',D+'src/game/ZoneArea.cxx','xmin(std::max(0, zoneNode.coordinate.x - 1))'),
 ('zone box grows on edge add','addNode grows xmax by one',D+'src/game/ZoneArea.cxx','xmax = std::min(Settings::instance().mapSize, xmax + 1);'),
 ('zone type enum','zone types RESIDENTIAL INDUSTRIAL COMMERCIAL AGRICULTURAL',D+'src/engine/basics/tileData.hxx','BETTER_ENUM(ZoneType, int, RESIDENTIAL, INDUSTRIAL, COMMERCIAL, AGRICULTURAL)'),
 ('zone density enum declared','ZoneDensity enum opens; values LOW MEDIUM HIGH follow on lines 58-60',D+'src/engine/basics/tileData.hxx','BETTER_ENUM(ZoneDensity, int,'),
 ('agricultural ignores density','agricultural bypasses density filter',D+'src/engine/TileManager.cxx','(zone == +ZoneType::AGRICULTURAL ||'),
 ('fall-through of placement rule is false','final return false when no case allows placement',D+'src/engine/GameObjects/MapNode.cxx','// every case that is not handled is false'),
 ('merge of adjacent zone areas','areas merged when a node touches two',D+'src/game/ZoneManager.cxx','// merge zone areas'),
 ('zone box margin on y','initial ymin uses coordinate minus 1',D+'src/game/ZoneArea.cxx','ymin(std::max(0, zoneNode.coordinate.y - 1))'),
 ('tile lists restrict zone type','zoneTypes list on tile data',D+'src/engine/basics/tileData.hxx','std::vector<ZoneType> zoneTypes;'),
 ('tile lists restrict zone density','zoneDensity list on tile data',D+'src/engine/basics/tileData.hxx','std::vector<ZoneDensity> zoneDensity;'),
 ('registered footprint sizes','tile sizes collected from tile data',D+'src/engine/TileManager.cxx','m_tileSizeCombinations.insert(m_tileData[id].RequiredTiles);'),
 ('no tile found gives empty id','empty result path returns nullopt',D+'src/engine/TileManager.cxx','if (tileIDsForThisZone.empty())'),
 ('unused occupancy count in spawn','occupied counter declared and never read',D+'src/game/ZoneManager.cxx','int occupied = 0;'),
 ('area membership via adjacency and box','addZoneNodeToArea: new area when no neighbour',D+'src/game/ZoneManager.cxx','zoneAreas.emplace_back(zoneNode);'),
 ('spawn attempt ignores placement result','setTileID result not used',D+'src/game/ZoneArea.cxx','buildingsSpawned++;'),
]
with open('spec-ZW003-1.tsv','w',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    w.writerow(['note','claim','donor_file','quote'])
    for r in rows:
        assert '\t' not in r[1] and '"' not in r[3], r
        w.writerow([N,r[1],r[2],r[3]])
print(len(rows))
