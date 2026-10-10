cd /mnt/frankendom-donors/pmbstyle-L2Solo
F=src/GameServer/World/Generics/SpawnNpcs.js
grep -nF "Respawns happen independently" $F
grep -nF "A transient spawn failure" $F
grep -nF "scheduleRaidBossRespawn(world, definition, Date.now() + 1000);" $F
grep -nF "if (isPeriodic(randomDefinition.spawn))" $F
grep -nF "if (isPeriodic(fixedDefinition.spawn))" $F
grep -nF "spawnNpc(this, randomDefinition);" $F
grep -nF "function isPeriodActive" $F
grep -nF "return period === 'always' || period === mode;" $F
grep -nF "module.exports.shouldRespawn" $F
grep -nF "return Number(spawn?.respawn) > 0;" $F
grep -nF "const seconds = Math.max(0, Number(spawn?.respawn) || 0);" $F
grep -nF "const bias = Math.max(0, Number(spawn?.bias) || 0);" $F
grep -nF "return Math.round((seconds - bias + (random() * bias * 2)) * 1000);" $F
grep -nF "return isRaidBossDefinition(definition)" $F
grep -nF "function spawnNpc(world, definition, options = {}) {" $F
grep -nF "function spawnDefinition(" $F
grep -nF "if (!isPeriodActive(definition?.spawn, world?.npc?.periodMode)) return null;" $F
grep -nF "const coords = randomCoords(definition);" $F
grep -nF "if (!npc) return null;" $F
grep -nF "NpcAggro.armSpawnGrace(instance);" $F
grep -nF "notifyNearby(world, npc);" $F
grep -nF "for (let i = 0; i < spawn.total; i++) {" $F
grep -nF "spawn.coords.forEach((info) => {" $F
grep -nF "this.npc.periodDefinitions = [];" $F
echo ---RM
R=src/GameServer/World/Generics/RemoveNpc.js
grep -nF "NpcDecay.schedule(this, session, npc, corpseDelay);" $R
grep -nF "Datapack respawn is measured from the death event, independently of" $R
grep -nF "if (SpawnNpcs.shouldRespawn(definition?.spawn)) {" $R
grep -nF "const delayMs = SpawnNpcs.respawnDelayForDefinitionMs(definition);" $R
grep -nF "const periodRevision = Number(this.npc?.periodRevision || 0);" $R
grep -nF "setTimeout(() => {" $R
grep -nF "if (!canRespawnDefinition(this, definition, periodRevision)) return;" $R
grep -nF "this.spawnNpc(this, definition);" $R
grep -nF "failed to respawn NPC" $R
grep -nF "}, delayMs);" $R
grep -nF "return Number(world?.npc?.periodRevision || 0) === Number(periodRevision || 0)" $R
grep -nF "this.npcRewards(session, npc);" $R
grep -nF "if (!SpawnNpcs.isPeriodic(definition?.spawn)) return true;" $R
echo ---DN
D=src/GameServer/World/DayNightSpawnManager.js
grep -nF "function changeMode" $D
grep -nF "if (world.npc.periodMode === mode) return" $D
grep -nF "world.npc.periodRevision = Number(world.npc.periodRevision || 0) + 1;" $D
grep -nF "inactive.forEach(stopNpc);" $D
grep -nF "const removed = NpcDecay.decayMany(world, inactive);" $D
grep -nF "if (!SpawnNpcs.isPeriodActive(definition.spawn, mode)) return;" $D
grep -nF "if (presentDefinitions.has(definition)) return;" $D
grep -nF "if (SpawnNpcs.spawnNpc(world, definition)) {" $D
grep -nF "}, GameTime.msUntilTransition(now));" $D
grep -nF "else if (world.npc.periodMode !== current) changeMode(world, current);" $D
grep -nF "const cycle" $D
echo ---ND
N=src/GameServer/World/Generics/NpcDecay.js
grep -nF "const DEFAULT_REAPER_INTERVAL_MS = 1000;" $N
grep -nF "const MAX_SWEEP_FAILURES = 3;" $N
grep -nF "npc.corpseDecayAt = Date.now() + delay;" $N
grep -nF "npc.corpseDecayTimer = setTimeout(() => {" $N
grep -nF "Number(npc.corpseDecayAt) <= Number(now)" $N
grep -nF "if (attempts >= MAX_SWEEP_FAILURES" $N
grep -nF "world.npc.corpseDecayReaper = setInterval(() => {" $N
echo ---GT
G=src/GameServer/World/GameTime.js
grep -nF "const REAL_DAY_MS = 4 * 60 * 60 * 1000;" $G
grep -nF "const GAME_MINUTE_MS = 10000;" $G
grep -nF "const SUNRISE_MINUTE = 6 * 60;" $G
grep -nF "return gameMinute(now) < SUNRISE_MINUTE;" $G
grep -nF "const cycleTransition = isNight(now) ? sunriseAt - elapsed : REAL_DAY_MS - elapsed;" $G
echo ---SW
grep -nF "const SPOILED_CORPSE_TIME = 30000;" src/GameServer/Npc/SpoilSweep.js
grep -nF "return this.isSweepable(npc) ? Math.max(corpseTime, SPOILED_CORPSE_TIME) : corpseTime;" src/GameServer/Npc/SpoilSweep.js
echo ---W
W=src/GameServer/World/World.js
grep -nF "World.spawnNpcs();" $W
grep -nF "NpcDecay.start(this);" $W
grep -nF "DayNightSpawnManager.start(this);" $W
grep -nF "periodMode: GameTime.mode(), periodRevision: 0, periodDefinitions: []," $W
echo ---NA
A=src/GameServer/Npc/NpcAggro.js
grep -nF "const SPAWN_AGGRO_DELAY_MS = 10000;" $A
grep -nF "npc.aggroEligibleAt = now + SPAWN_AGGRO_DELAY_MS;" $A
