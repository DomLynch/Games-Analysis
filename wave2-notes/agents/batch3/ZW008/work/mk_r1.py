import csv,sys
R='/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/'
N='afritz1-OpenTESArena'
rows=[
(R+'src/World/ChunkManager.cpp',46,'update takes centre chunk and chunk distance','void ChunkManager::update(const ChunkInt2 &centerChunkPos, int chunkDistance)'),
(R+'src/World/ChunkManager.cpp',76,'window work is skipped unless centre or count changed','if (!activeChunksNeedUpdate)'),
(R+'src/World/ChunkManager.cpp',84,'chunk is freed when outside the active range','if (!ChunkUtils::isWithinActiveRange(centerChunkPos, chunkPos, chunkDistance))'),
(R+'src/World/ChunkManager.cpp',86,'freed chunks are queued for the frame','this->freedChunkPositions.emplace_back(chunkPos);'),
(R+'src/World/ChunkManager.cpp',101,'new chunks are queued for the frame','this->newChunkPositions.emplace_back(chunkPos);'),
(R+'src/World/ChunkUtils.cpp',18,'window side is 1 + 2 x distance','const int count = 1 + (chunkDistance * 2);'),
(R+'src/World/ChunkUtils.cpp',25,'chunk count is side squared','return chunksPerSide * chunksPerSide;'),
(R+'src/World/ChunkUtils.cpp',73,'active test is a square (Chebyshev) range','return (xDiff <= chunkDistance) && (yDiff <= chunkDistance);'),
(R+'src/World/ChunkUtils.h',8,'chunk is 64 voxels per side','constexpr int CHUNK_DIM = 64;'),
(R+'src/Game/Options.h',93,'min chunk distance is 1 (option range)','static constexpr int MIN_CHUNK_DISTANCE = 1;'),
(R+'src/Game/Options.h',94,'max chunk distance is 32 (option range)','static constexpr int MAX_CHUNK_DISTANCE = 32;'),
(R+'src/Game/Game.cpp',921,'per-tick read of the distance option','const int chunkDistance = this->options.getMisc_ChunkDistance();'),
(R+'src/Game/Game.cpp',923,'window update runs in the game tick with the player chunk','chunkManager.update(oldPlayerChunk, chunkDistance);'),
(R+'src/Game/GameState.cpp',1168,'scene change repopulates everything at once (comment)','Clear and re-populate scene immediately so it\'s ready for rendering this frame'),
(R+'src/Game/GameState.cpp',1172,'scene change calls the same window update once','chunkManager.update(playerChunk, options.getMisc_ChunkDistance());'),
(R+'src/Game/GameState.cpp',1175,'scene change clears entity chunks before repopulating','sceneManager.entityChunkManager.clear(physicsSystem, renderer);'),
(R+'src/Entities/EntityChunkManager.cpp',2137,'freed chunks are processed first in the entity pass','for (const ChunkInt2 chunkPos : freedChunkPositions)'),
(R+'src/Entities/EntityChunkManager.cpp',2143,'entities in a freed chunk are queued for destroy','this->queueEntityDestroy(entityInstID, false);'),
(R+'src/Entities/EntityChunkManager.cpp',2150,'new chunks are populated in the entity pass','for (const ChunkInt2 chunkPos : newChunkPositions)'),
(R+'src/World/SpecializedChunkManager.h',134,'spawnChunk pushes into activeChunks before populate','this->activeChunks.emplace_back(std::move(this->chunkPool.back()));'),
(R+'src/Entities/EntityChunkManager.cpp',2153,'a new entity chunk is spawned for each new chunk','const int spawnIndex = this->spawnChunk();'),
(R+'src/Entities/EntityChunkManager.cpp',2170,'each new chunk is populated from its level def','this->populateChunk(entityChunk, voxelChunk, *levelDefPtr'),
(R+'src/Entities/EntityChunkManager.cpp',2339,'queueEntityDestroy signature (chunk-notify variant)','void EntityChunkManager::queueEntityDestroy(EntityInstanceID entityInstID,'),
(R+'src/Entities/EntityChunkManager.cpp',2347,'destroy is queued, flagged before removal','entityInst.isQueuedForDestroy = true;'),
(R+'src/Entities/EntityChunkManager.cpp',2384,'citizen id is removed from the cache on destroy','entityInstIDsToUpdate->erase(idIter);'),
(R+'src/Entities/EntityChunkManager.cpp',1043,'citizen id is cached on create','this->citizenEntityInstIDs.emplace_back(entityInst.instanceID);'),
(R+'src/Entities/EntityChunkManager.cpp',1067,'placements from the level def are walked per chunk','for (int i = 0; i < levelDefinition.getEntityPlacementDefCount(); i++)'),
(R+'src/Entities/EntityChunkManager.cpp',1090,'fixed placement positions drive spawns','for (const WorldDouble2 &worldPosition : placementDef.positions)'),
(R+'src/Entities/EntityChunkManager.cpp',1191,'citizen block runs only when a citizen gen info exists','if (citizenGenInfo.has_value())'),
(R+'src/Entities/EntityChunkManager.cpp',1195,'30 voxel tries per citizen spawn','constexpr int maxSpawnAttemptsCount = 30;'),
(R+'src/Entities/EntityChunkManager.cpp',1203,'spawn voxel must be empty with a floor below','const bool isValidSpawnVoxel = (voxelTraitsDef.type == ArenaVoxelType::None)'),
(R+'src/Entities/EntityChunkManager.cpp',1215,'active chunk count taken from entity chunks','const int activeChunkCount = static_cast<int>(this->activeChunks.size());'),
(R+'src/Entities/EntityChunkManager.cpp',1216,'scene cap uses the active chunk count','const int maxCitizenCountInScene = CitizenUtils::getMaxCitizenCountForScene('),
(R+'src/Entities/EntityChunkManager.cpp',1218,'per-chunk target is the scene headroom capped per chunk','const int targetCitizensToSpawn = std::min(maxCitizenCountInScene - currentCitizenCount,'),
(R+'src/Entities/EntityChunkManager.cpp',1219,'half of the target is male, the rest female','const int remainingMaleCitizensToSpawn = targetCitizensToSpawn / 2;'),
(R+'src/Entities/EntityChunkManager.cpp',1238,'citizens are placed in a loop over the per-gender count','for (int i = 0; i < citizensToSpawn; i++)'),
(R+'src/Entities/EntityChunkManager.cpp',1241,'a failed voxel search skips that citizen','if (!citizenSpawnVoxel.has_value())'),
(R+'src/Entities/CitizenUtils.cpp',45,'base cap is per-chunk max times chunk count','const int baseMaxCitizensPerScene = CitizenUtils::MAX_CITIZENS_PER_CHUNK * chunkCount;'),
(R+'src/Entities/CitizenUtils.cpp',46,'scene cap is 5/4 of the base, integer division','return (5 * baseMaxCitizensPerScene) / 4;'),
(R+'src/Entities/CitizenUtils.h',34,'per-chunk citizen max is 30 (comment says arbitrary)','constexpr int MAX_CITIZENS_PER_CHUNK = 30;'),
(R+'src/World/MapDefinition.cpp',56,'wilderness picks a level def per chunk coordinate','int MapDefinitionWild::getLevelDefIndex(const ChunkInt2 &chunk) const'),
(R+'src/World/MapDefinition.cpp',63,'in-range chunk reads its level def index from a 2D buffer','return this->levelDefIndices.get(chunk.x, chunk.y);'),
(R+'src/World/MapDefinition.cpp',67,'out-of-range fallback is still a todo (comment)','@todo: use fallbackSeed when outside the defined wild chunks.'),
(R+'src/Voxels/VoxelChunkManager.cpp',817,'voxel pass also recycles freed chunks first','for (const ChunkInt2 chunkPos : freedChunkPositions)'),
(R+'src/Voxels/VoxelChunkManager.cpp',834,'voxel pass picks the wilderness level def per chunk','const int levelDefIndex = mapDefWild.getLevelDefIndex(chunkPos);'),
(R+'src/World/SpecializedChunkManager.h',153,'chunk changes are not saved when recycled (todo)','@todo: save chunk changes'),
(R+'src/World/SpecializedChunkManager.h',159,'recycled chunk leaves the active list','this->activeChunks.erase(this->activeChunks.begin() + index);'),
(R+'src/Entities/EntityChunkManager.cpp',2170,'populate is only called on the new-chunk path','this->populateChunk(entityChunk, voxelChunk, *levelDefPtr'),
(R+'src/Entities/EntityChunkManager.cpp',1094,'placements are kept only when inside the chunk writing range','if (!ChunkUtils::IsInWritingRange(worldVoxel'),
]
out=sys.argv[1]
with open(out,'w',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    w.writerow(['note','claim','donor_file','line','quote'])
    for path,line,claim,quote in rows:
        assert '\t' not in quote and '\t' not in claim
        w.writerow([N,claim,path,str(line),quote])
    print('rows',len(rows))
    for path,line,claim,quote in rows:
        if not (15<=len(quote)<=90): print('LEN',len(quote),line,quote[:40])
