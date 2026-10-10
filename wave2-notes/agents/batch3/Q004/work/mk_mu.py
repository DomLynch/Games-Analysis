import csv,sys
B="/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/"
M="/mnt/frankendom-donors/ModernUO/Projects/"
L="/mnt/frankendom-donors/ModernUO/LICENSE"
N="ModernUO"
rows=[
("OnTick is the timer callback that runs the spawn step", B+"BaseSpawner.cs", 829, "public virtual void OnTick()"),
("group mode waits while any spawned mob remains", B+"BaseSpawner.cs", 835, "if (Spawned.Count > 0)"),
("group respawn fills to _count", B+"BaseSpawner.cs", 410, "for (var i = 0; i < _count; i++)"),
("respawn first clears the old set", B+"BaseSpawner.cs", 408, "RemoveSpawns();"),
("spawner cap is _count via IsFull", B+"BaseSpawner.cs", 292, "public bool IsFull => Spawned?.Count >= _count;"),
("Spawn returns when entries or cap are exhausted", B+"BaseSpawner.cs", 855, "if (entries.Length <= 0 || IsFull)"),
("weighted roll from 1 to probability sum", B+"BaseSpawner.cs", 876, "var rand = Utility.RandomMinMax(1, probsum);"),
("entry chosen when roll falls inside its weight", B+"BaseSpawner.cs", 886, "if (rand <= entry.SpawnedProbability)"),
("delay drawn uniformly between min and max", B+"BaseSpawner.cs", 1179, "var delay = TimeSpan.FromMilliseconds(Utility.RandomMinMax(min, max));"),
("timer is started only when not full (parks when full)", B+"BaseSpawner.cs", 1211, "_timer.Start();"),
("removal re-arms the timer when not full and not running", B+"BaseSpawner.cs", 400, "if (_running && !IsFull && _timer?.Running != true)"),
("Remove is the removal entry point", B+"BaseSpawner.cs", 391, "public void Remove(ISpawnable spawn)"),
("default min delay 5 minutes", B+"BaseSpawner.cs", 49, "private static readonly TimeSpan DefaultMinDelay = TimeSpan.FromMinutes(5);"),
("default max delay 10 minutes", B+"BaseSpawner.cs", 50, "private static readonly TimeSpan DefaultMaxDelay = TimeSpan.FromMinutes(10);"),
("default max spawn attempts 10", B+"BaseSpawner.cs", 148, "private const int DefaultMaxSpawnAttempts = 10;"),
("first tick one second after init", B+"BaseSpawner.cs", 707, "DoTimer(TimeSpan.FromSeconds(1));"),
("per-entry cap via SpawnedMaxCount", B+"SpawnerEntry.cs", 162, "public bool IsFull => Spawned.Count >= SpawnedMaxCount;"),
("entry defrag drops dead or unlinked records", B+"SpawnerEntry.cs", 170, "if (parent.OnDefragSpawn(spawned, false))"),
("defrag removes deleted, unlinked or owned mobs", B+"BaseSpawner.cs", 814, "remove = spawned.Deleted || spawned.Spawner == null || spawned switch"),
("timer callback calls OnTick on a live spawner", B+"BaseSpawner.cs", 1320, "_spawner.OnTick();"),
("creature death only notifies the spawner (no removal here)", M+"UOContent/Mobiles/BaseCreature.cs", 3479, "spawner.NotifySpawnedDeath(this, LastKiller);"),
("mobile delete unlinks it from the spawner", M+"Server/Mobiles/Mobile.cs", 4649, "Spawner?.Remove(this);"),
("proximity spawner overrides the timer so it never arms one", B+"ProximitySpawner.cs", 69, "public override void DoTimer(TimeSpan delay)"),
("proximity override sets the cooldown end only", B+"ProximitySpawner.cs", 76, "End = Core.Now + delay;"),
("proximity respawn sets cooldown end to now", B+"ProximitySpawner.cs", 83, "End = Core.Now;"),
("proximity trigger gate: empty, cooldown elapsed, in range", B+"ProximitySpawner.cs", 103, "if (IsEmpty && End <= Core.Now"),
("proximity trigger requires a movement step", B+"ProximitySpawner.cs", 104, "m.Location != oldLocation && ValidTrigger(m))"),
("valid trigger is a player (access level check)", B+"ProximitySpawner.cs", 93, "m.AccessLevel == AccessLevel.Player"),
("instant flag sets combatant to the trigger", B+"ProximitySpawner.cs", 117, "mobile.Combatant = m;"),
("trigger range is a per-spawner field", B+"ProximitySpawner.cs", 27, "private int _triggerRange;"),
("proximity file header: GPL terms", B+"ProximitySpawner.cs", 8, "it under the terms of the GNU General Public License as published by"),
("sector cache purpose (header only)", B+"SectorSpawnCache.cs", 26, "Global manager for sector-based spawn position caching."),
("licence is GNU GPL version 3", L, 4, "Version 3, 29 June 2007"),
]
w=csv.writer(open(sys.argv[1],'w',newline=''),delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
w.writerow(["note","claim","donor_file","line","quote"])
for claim,f,ln,q in rows:
    assert '\t' not in q
    w.writerow([N,claim,f,str(ln),q])
