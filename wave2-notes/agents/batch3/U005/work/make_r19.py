D="/mnt/frankendom-donors/ModernUO"
UO=D+"/Projects/UOContent/Engines/Doom/"
rows=[
("PlayersPerSpawn constant is 5", UO+"GauntletSpawner.cs", 18, "public const int PlayersPerSpawn = 5;"),
("Target = ceil(players/5), floor of 1", UO+"GauntletSpawner.cs", 302, "return Math.Max((playerCount + PlayersPerSpawn - 1) / PlayersPerSpawn, 1);"),
("Count taken from the named parent region", UO+"GauntletSpawner.cs", 289, "var reg = Region.Find(loc, map).GetRegion(\"Doom Gauntlet\");"),
("Fallback to the room's own region count", UO+"GauntletSpawner.cs", 299, "playerCount = Region.GetPlayerCount();"),
("Slice timer is 1 s", UO+"GauntletSpawner.cs", 158, "Timer.StartTimer(TimeSpan.FromSeconds(1.0), TimeSpan.FromSeconds(1.0), Slice"),
("Slice returns unless InProgress", UO+"GauntletSpawner.cs", 381, "if (_state != GauntletSpawnerState.InProgress)"),
("Slice top-up only while list shorter than target", UO+"GauntletSpawner.cs", 388, "for (var i = Creatures.Count; i < count; ++i)"),
("Empty creature list is never complete", UO+"GauntletSpawner.cs", 70, "if (Creatures.Count == 0)"),
("Complete only when listed mobs are Deleted", UO+"GauntletSpawner.cs", 79, "if (!mob.Deleted)"),
("Slice checks HasCompleted", UO+"GauntletSpawner.cs", 393, "if (HasCompleted)"),
("Room set to Completed on clear", UO+"GauntletSpawner.cs", 395, "State = GauntletSpawnerState.Completed;"),
("Next room already Completed triggers ring reset", UO+"GauntletSpawner.cs", 399, "if (Sequence.State == GauntletSpawnerState.Completed)"),
("Reset walks to next room", UO+"GauntletSpawner.cs", 374, "Sequence.RecurseReset();"),
("Next room opened to InProgress", UO+"GauntletSpawner.cs", 404, "Sequence.State = GauntletSpawnerState.InProgress;"),
("Spawned mob added to list", UO+"GauntletSpawner.cs", 357, "Creatures.Add(mob);"),
("Spawn point is the spawner location", UO+"GauntletSpawner.cs", 356, "mob.MoveToWorld(GetWorldLocation(), Map);"),
("FullSpawn clears old population first", UO+"GauntletSpawner.cs", 317, "RemoveAllCreatures();"),
("Door locked while InProgress", UO+"GauntletSpawner.cs", 123, "Door.Locked = lockDoors;"),
("Door gets a fresh random key when locked", UO+"GauntletSpawner.cs", 127, "Door.KeyValue = Key.RandomValue();"),
("Trap count is region area", UO+"GauntletSpawner.cs", 213, "var area = RegionBounds.Width * RegionBounds.Height;"),
("Trap count is area divided by 100", UO+"GauntletSpawner.cs", 215, "return area / 100;"),
("Stop clears creature references", UO+"GauntletSpawner.cs", 187, "ClearCreatures();"),
("Stop destroys the room region", UO+"GauntletSpawner.cs", 189, "DestroyRegion();"),
("Six-room ring: sp6 wraps to sp1", D+"/Projects/UOContent/Engines/Doom/GenGauntlet.cs", 108, "sp6.Sequence = sp1;"),
("Ring starts with sp1 InProgress", D+"/Projects/UOContent/Engines/Doom/GenGauntlet.cs", 110, "sp1.State = GauntletSpawnerState.InProgress;"),
("Room bounds passed at creation (example args)", D+"/Projects/UOContent/Engines/Doom/GenGauntlet.cs", 96, "true, 473, 412, 39, 60);"),
("Room bounds set from args as Rectangle2D", D+"/Projects/UOContent/Engines/Doom/GenGauntlet.cs", 150, "spawner.RegionBounds = new Rectangle2D(xStart, yStart, xWidth, yHeight);"),
("Room region parent is the Find() region at spawner", D+"/Projects/UOContent/Engines/Doom/GauntletRegion.cs", 10, "base(null, map, Find(spawner.Location, spawner.Map), spawner.RegionBounds)"),
("GetRegion matches by name up the parent chain", D+"/Projects/Server/Regions/Region.cs", 527, "if (string.Equals(r.Name, regionName, comparisonType))"),
("GetRegion walks Parent until null", D+"/Projects/Server/Regions/Region.cs", 533, "} while (r != null);"),
("GetPlayerCount signature", D+"/Projects/Server/Regions/Region.cs", 590, "public int GetPlayerCount()"),
("GetPlayerCount counts online players inside region", D+"/Projects/Server/Regions/Region.cs", 601, "if (player?.Deleted == false && player.Region.IsPartOf(this))"),
("Parent region is a DungeonRegion in regions.json", D+"/Distribution/Data/regions.json", 3565, "\"$type\": \"DungeonRegion\","),
("Parent region is named Doom Gauntlet", D+"/Distribution/Data/regions.json", 3568, "\"Name\": \"Doom Gauntlet\","),
("Parent region area in regions.json", D+"/Distribution/Data/regions.json", 3570, "\"Area\": [{\"x1\": 256, \"y1\": 304, \"x2\": 512, \"y2\": 560}],"),
("Licence: GPL version 3", D+"/LICENSE", 4, "Version 3, 29 June 2007"),
]
out=open("/private/tmp/p2/wave2-haiku/batch3/U005/receipts.tsv","w")
out.write("\t".join(["note","claim","donor_file","line","quote"])+"\n")
for c,fn,ln,q in rows:
    assert "\t" not in q and "\t" not in c
    out.write("\t".join(["ModernUO",c,fn,str(ln),q])+"\n")
out.close()
print("rows",len(rows))
