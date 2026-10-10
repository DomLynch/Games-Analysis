import csv,sys
R="/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/"
SP=R+"L2Dn.GameServer.Model/Model/Spawn.cs"
RTM=R+"L2Dn.GameServer.Model/TaskManagers/RespawnTaskManager.cs"
NPC=R+"L2Dn.GameServer.Model/Model/Actor/Npc.cs"
TPL=R+"L2Dn.GameServer.Model/Model/Spawns/NpcSpawnTemplate.cs"
LIC="/mnt/frankendom-donors/ax-grymyr-l2dn-server/LICENSE.txt"
RME="/mnt/frankendom-donors/ax-grymyr-l2dn-server/README.md"
N="ax-grymyr-l2dn-server"
rows=[
("spawn group purpose","Spawn manages spawn and respawn of a group of Npcs",SP,22,"This class manages the spawn and respawn of a group of Npcs"),
("maximum count field","cap per spawn point",SP,37,"private int _maximumCount;"),
("current count field","alive count per spawn point",SP,39,"private int _currentCount;"),
("scheduled count field","respawns queued and not yet fired",SP,41,"public int _scheduledCount;"),
("min delay field","respawn delay band lower bound",SP,47,"private TimeSpan _respawnMinDelay;"),
("respawn-on flag","respawn enabled flag",SP,53,"private bool _doRespawn = true;"),
("decrease entry","runs when an npc decays, with the npc object",SP,198,"public void decreaseCount(Npc oldNpc)"),
("decrease sanity","no decrement below zero",SP,201,"if (_currentCount <= 0)"),
("decrement alive","alive count drops by one",SP,207,"_currentCount--;"),
("cap gate","schedule only if queued plus alive is under the cap",SP,213,"if (_doRespawn && _scheduledCount + _currentCount < _maximumCount)"),
("scheduled increment","queued count goes up when scheduled",SP,216,"_scheduledCount++;"),
("delay draw","uniform band draw when min and max differ, else min",SP,219,"Rnd.get(_respawnMinDelay, _respawnMaxDelay) : _respawnMinDelay"),
("init fill","fill to the cap at setup",SP,229,"while (_currentCount < _maximumCount)"),
("init enables respawn","respawn on only if min delay is above zero",SP,233,"_doRespawn = _respawnMinDelay > TimeSpan.Zero;"),
("doSpawn gate","no spawn when respawn is off",SP,264,"return _doRespawn ? doSpawn(false) : null;"),
("band has random","random only when min differs from max",SP,485,"return _respawnMinDelay != _respawnMaxDelay;"),
("delay setup min","min = delay minus random, floor 10 s",SP,455,"TimeSpan minDelay = delay.Value - (randomInterval ?? TimeSpan.Zero);"),
("delay setup floor","floor of 10 seconds on the min",SP,458,"_respawnMinDelay = Algorithms.Max(TimeSpan.FromSeconds(10), minDelay);"),
("respawn entry","respawns the same npc object",SP,520,"public void respawnNpc(Npc oldNpc)"),
("respawn initialize","the same npc object is re-initialised",SP,525,"initializeNpc(oldNpc);"),
("alive increments on init","initializeNpc increments the alive count",SP,430,"_currentCount++;"),
("sweep entry","1 second sweep of pending respawns",RTM,18,"ThreadPool.scheduleAtFixedRate(this, 0, 1000);"),
("sweep reentry guard","a run sets the working flag so a second run is skipped",RTM,27,"_working = true;"),
("sweep due filter","due when now is past the due time",RTM,32,"PENDING_RESPAWNS.Where(x => currentTime > x.Value)"),
("sweep respawn","respawn then decrement queued count",RTM,40,"spawn.respawnNpc(npc);"),
("sweep decrement","queued count drops after respawn",RTM,41,"spawn._scheduledCount--;"),
("queue add","pending respawn stored with a due time",RTM,51,"PENDING_RESPAWNS.put(npc, time);"),
("decay entry","decrease runs in the decay path, not at the kill",NPC,1066,"public override void onDecay()"),
("decay schedule","death path adds the npc to the decay manager",NPC,913,"DecayTaskManager.getInstance().add(this);"),
("db spawn guard","db-defined spawns are not counted down",NPC,1078,"if (_spawn != null && !DbSpawnManager.getInstance().isDefined(getId()))"),
("decay calls decrease","decay path decreases the spawn count",NPC,1080,"_spawn.decreaseCount(this);"),
("template respawn gate","respawn set only for positive delay or pattern",TPL,372,"if (respawn > TimeSpan.Zero || respawnPattern != null)"),
("template sets delay","delay and random band passed to the spawn",TPL,374,"spawn.setRespawnDelay(respawn, respawnRandom);"),
("template stops respawn","zero delay with no pattern stops respawn",TPL,380,"spawn.stopRespawn();"),
("licence","MIT, Copyright 2024-2025 Grymyr, L2Dn Server Project",LIC,3,"Copyright (c) 2024-2025 Grymyr, L2Dn Server Project"),
("provenance","README says the code began as a port of L2J (Java)",RME,9,"The project code initially is the port of the L2J server written in Java."),
]
w=csv.writer(sys.stdout,delimiter='\t',lineterminator='\n',quoting=csv.QUOTE_NONE,escapechar=None)
w.writerow(["note","claim","donor_file","line","quote"])
bad=0
for name,claim,f,l,q in rows:
    if not (15<=len(q)<=90): print("LEN",len(q),q,file=sys.stderr); bad+=1
    if '\t' in q or '"' in q: print("BADCHAR",q,file=sys.stderr); bad+=1
    w.writerow([N,name+": "+claim,f,l,q])
print("len-problems",bad,file=sys.stderr)
