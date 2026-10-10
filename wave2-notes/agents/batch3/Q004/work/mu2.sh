cd /mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners
grep -n -e "public virtual void OnTick()" -e "if (Spawned.Count > 0)" -e "Respawn();" -e "public virtual void Spawn()" -e "if (entries.Length <= 0 || IsFull)" -e "var rand = Utility.RandomMinMax" -e "if (rand <= entry.SpawnedProbability)" -e "public virtual void Respawn()" -e "for (var i = 0; i < _count; i++)" -e "var delay = TimeSpan.FromMilliseconds" -e "public bool IsFull" -e "DefaultMinDelay = TimeSpan" -e "DefaultMaxDelay = TimeSpan" -e "public BaseSpawner() : this" -e "public void Remove(ISpawnable spawn)" -e "if (_running && !IsFull" -e "_timer.Start();" -e "if (!IsFull)" -e "private int _count;" -e "DefaultMaxSpawnAttempts = 10" -e "DoTimer(TimeSpan.FromSeconds(1));" -e "_group = false;" -e "public virtual void DoTimer(TimeSpan delay)" -e "if (_spawner?.Deleted == false)" -e "_spawner.OnTick();" -e "remove = spawned.Deleted" -e "if (_group)" -e "Defrag();" -e "public void Defrag()" -e "private bool _group;" -e "End = Core.Now + delay;" -e "if (IsFull)" -e "_timer?.Stop();" BaseSpawner.cs
echo "--- entry"
grep -n -e "if (parent.OnDefragSpawn(spawned, false))" -e "public bool IsFull" -e "public void Defrag(BaseSpawner parent)" SpawnerEntry.cs
echo "--- creature/mobile"
cd /mnt/frankendom-donors/ModernUO/Projects
grep -n -e "spawner.NotifySpawnedDeath(this, LastKiller);" UOContent/Mobiles/BaseCreature.cs
grep -n -e "Spawner?.Remove(this);" Server/Mobiles/Mobile.cs
grep -n -e "public virtual void OnDelete()" Server/Mobiles/Mobile.cs
echo "--- sector cache"
grep -n -e "Global manager for sector-based" -e "public static bool TryGetRandomPosition(Map map, Rectangle3D bounds" UOContent/Engines/Spawners/SectorSpawnCache.cs
echo "--- licence"
grep -n -e "GNU GENERAL PUBLIC LICENSE" -e "Version 3, 29 June 2007" LICENSE
