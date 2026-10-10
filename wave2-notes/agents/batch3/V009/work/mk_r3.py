import csv
M="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Maps/Map.cpp"
P="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Pools/PoolMgr.cpp"
C="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp"
W="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/World/World.cpp"
N="TrinityCore-TrinityCore"
rows=[
("respawn tick: check timer gate",M,683,"if (_respawnCheckTimer <= t_diff)"),
("respawn tick: ProcessRespawns then spawn-group conditions",M,685,"ProcessRespawns();"),
("respawn tick: timer reset to MinCheckInterval",M,687,"_respawnCheckTimer = sWorld->getIntConfig(CONFIG_RESPAWN_MINCHECKINTERVALMS);"),
("ProcessRespawns: stop at first future entry",M,2242,"if (now < next->respawnTime) // done for this tick"),
("ProcessRespawns: pool members go to the pool, not to a single respawn",M,2245,"if (uint32 poolId = sPoolMgr->IsPartOfAPool(next->type, next->spawnId))"),
("ProcessRespawns: pool update with the member that became due",M,2252,"sPoolMgr->UpdatePool(GetPoolData(), poolId, next->type, next->spawnId);"),
("ProcessRespawns: non-pool path asks CheckRespawn",M,2258,"else if (CheckRespawn(next)) // see if we're allowed to respawn"),
("CheckRespawn: no respawn while a live instance exists",M,2043,"if (alreadyExists)"),
("CheckRespawn: linked respawn waits 5 to 15 seconds after the linked unit",M,2062,"respawnTime = std::max<time_t>(now, linkedTime) + urand(5, 15);"),
("ApplyDynamicModeRespawnScaling signature",M,2287,"void Map::ApplyDynamicModeRespawnScaling(WorldObject const* obj"),
("dynamic scaling only for groups with the dynamic flag",M,2312,"if (!(data->spawnGroupData->flags & SPAWNGROUP_FLAG_DYNAMIC_SPAWN_RATE))"),
("dynamic scaling reads zone player count",M,2318,"uint32 const playerCount = it->second;"),
("dynamic scaling factor = rate / player count",M,2321,"double const adjustFactor = sWorld->getFloatConfig("),
("dynamic scaling does nothing when factor is 1 or more",M,2322,"if (adjustFactor >= 1.0) // nothing to do here"),
("dynamic scaling delay = max(ceil(delay x factor), minimum)",M,2328,"respawnDelay = std::max<uint32>(ceil(respawnDelay * adjustFactor), timeMinimum);"),
("pool members are skipped by the loader unless marked spawned",M,2346,"if (!GetPoolData().IsSpawnedObject(type, spawnId))"),
("zone player count incremented on entering a zone",M,660,"++_zonePlayerCountMap[newZone];"),
("instance unload timer starts when last player leaves",M,3021,"if (!m_unloadTimer && m_mapRefManager.size() == 1)"),
("pool SpawnObject: signature with limit and trigger",P,277,"void PoolGroup<T>::SpawnObject(SpawnedPoolData& spawns, uint32 limit, uint64 triggerFrom)"),
("pool SpawnObject: trigger member is despawned first",P,282,"DespawnObject(spawns, triggerFrom);"),
("pool SpawnObject: count = limit minus spawned",P,284,"int32 count = limit - spawns.GetSpawnedObjects(poolId);"),
("pool SpawnObject: candidates are members not already spawned",P,293,"if (!spawns.IsSpawnedObject<T>(obj.guid))"),
("pool SpawnObject: one explicit-chance roll",P,309,"float roll = rand_chance();"),
("pool SpawnObject: roll subtracts each chance",P,314,"roll -= candidate.chance;"),
("pool SpawnObject: only one chanced object per refill",P,320,"break; // We only roll for one chanced object."),
("pool SpawnObject: remaining slots filled from the rest",P,327,"uint32 remainingCount = count - rolledObjects.size();"),
("pool SpawnObject: random subset of remaining candidates",P,331,"Trinity::Containers::RandomResize(candidates, remainingCount);"),
("pool SpawnObject: spawned set updated before creating the creature",P,339,"spawns.AddSpawn<T>(objToSpawn.guid, poolId);"),
("pool creature spawn only when the grid is loaded",P,352,"if (spawns.GetMap()->IsGridLoaded(data->spawnPoint))"),
("pool DespawnObject: leaves the spawned set",P,192,"spawns.RemoveSpawn<T>(guid, poolId);"),
("RemoveSpawn decrements the pool count",P,105,"uint32& val = mSpawnedPools[pool_id];"),
("AddSpawn increments the pool count",P,84,"++mSpawnedPools[pool_id];"),
("pool update entry point passes MaxLimit",P,749,"it->second.SpawnObject(spawnedPoolData, mPoolTemplate[pool_id].MaxLimit, db_guid);"),
("pool template max_limit loaded from pool_template",P,435,"pPoolTemplate.MaxLimit  = fields[1].GetUInt32();"),
("pool_template query reads max_limit",P,419,"SELECT entry, max_limit FROM pool_template"),
("creature death sets respawn time to now plus scaled delay",C,2234,"m_respawnTime = GameTime::GetGameTime() + respawnDelay;"),
("creature death reads base respawn delay",C,2217,"uint32 respawnDelay = m_respawnDelay;"),
("creature death applies scaling when mode is set",C,2219,"GetMap()->ApplyDynamicModeRespawnScaling(this, m_spawnId, respawnDelay, scalingMode);"),
("creature death saves respawn time to the queue",C,2237,"SaveRespawnTime();"),
("config default: respawn check interval 5000 ms",W,847,"\"Respawn.MinCheckIntervalMS\"sv, .DefaultValue = 5000"),
("config default: dynamic mode off",W,848,"\"Respawn.DynamicMode\"sv, .DefaultValue = 0"),
("config default: dynamic minimum creature 10",W,852,"\"Respawn.DynamicMinimumCreature\"sv, .DefaultValue = 10"),
("config default: dynamic rate creature 10.0",W,928,"\"Respawn.DynamicRateCreature\"sv, .DefaultValue = 10.0f"),
("config default: instance unload delay 30 minutes",W,764,"\"Instance.UnloadDelay\"sv, .DefaultValue = 30 * MINUTE * IN_MILLISECONDS"),
]
with open("receipts.tsv","w",newline="") as f:
    f.write("\t".join(["note","claim","donor_file","line","quote"])+"\n")
    for claim,fp,ln,q in rows:
        assert "\t" not in q and 15<=len(q)<=90, (claim,len(q))
        f.write("\t".join([N,claim,fp,str(ln),q])+"\n")
print("wrote",len(rows))
