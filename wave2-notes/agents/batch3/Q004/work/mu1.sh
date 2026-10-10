cd /mnt/frankendom-donors/ModernUO/Projects
echo "--- overrides"
grep -rn -e "override void OnTick" -e "override void Spawn()" -e "override void Respawn" -e "override bool OnBeforeSpawn" -e "override bool OnDefragSpawn" --include=*.cs . | head -20
echo "--- callers of Respawn/Spawn()"
grep -rn -e "\.Respawn()" -e "[^a-zA-Z.]Spawn();" --include=*.cs UOContent Server | head -20
echo "--- group flag"
grep -n "_group" UOContent/Engines/Spawners/BaseSpawner.cs | head
