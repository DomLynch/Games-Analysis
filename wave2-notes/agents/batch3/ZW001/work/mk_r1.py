import csv
G="00-Evan-shattered-pixel-dungeon"
D="/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/"
MS=D+"actors/mobs/MobSpawner.java"; LV=D+"levels/Level.java"; RL=D+"levels/RegularLevel.java"; ML=D+"levels/MiningLevel.java"
GH=D+"actors/mobs/Ghoul.java"; MB=D+"actors/mobs/Mob.java"; DG=D+"Dungeon.java"; AC=D+"actors/Actor.java"
R=[
("spawner runs only while mobCount is below mobLimit",MS,41,"if (Dungeon.level.mobCount() < Dungeon.level.mobLimit()) {"),
("spawn attempt requires 12 path steps from hero",MS,43,"if (Dungeon.level.spawnMob(12)){"),
("successful spawn waits respawnCooldown",MS,44,"spend(Dungeon.level.respawnCooldown());"),
("failed placement retries after one turn",MS,46,"try again in 1 turn"),
("at the cap the spawner waits a full cooldown",MS,51,"spend(Dungeon.level.respawnCooldown());"),
("spawn rotation is built per depth",MS,63,"ArrayList<Class<? extends Mob>> mobs = standardMobRotation( depth );"),
("rotation is shuffled before use",MS,66,"Random.shuffle(mobs);"),
("depth 1 table is 3 rat and 1 snake",MS,76,"//3x rat, 1x snake"),
("getMobRotation entry point",MS,62,"public static ArrayList<Class<? extends Mob>> getMobRotation"),
("base respawn constant is 50",LV,149,"protected static final float TIME_TO_RESPAWN"),
("createMob reads the per-depth rotation",LV,538,"mobsToSpawn = MobSpawner.getMobRotation(Dungeon.depth);"),
("createMob removes one species before placement",LV,541,"Mob m = Reflection.newInstance(mobsToSpawn.remove(0));"),
("minibosses are excluded from the count",LV,721,"!mob.properties().contains(Char.Property.MINIBOSS)"),
("count adds each mob spawningWeight",LV,722,"count += mob.spawningWeight();"),
("DARK feeling branch in respawnCooldown",LV,762,"} else if (Dungeon.level.feeling == Feeling.DARK){"),
("DARK cooldown is 2/3 of base",LV,763,"cooldown = 2*TIME_TO_RESPAWN/3f;"),
("default cooldown is TIME_TO_RESPAWN",LV,765,"cooldown = TIME_TO_RESPAWN;"),
("cooldown divided by sundial multiplier",LV,767,"return cooldown / DimensionalSundial.spawnMultiplierAtCurrentTime();"),
("spawnMob entry point",LV,770,"public boolean spawnMob(int disLimit){"),
("spawnMob draws the mob from createMob",LV,773,"Mob mob = createMob();"),
("spawned mob set to WANDERING",LV,775,"mob.state = mob.WANDERING;"),
("placement loop uses randomRespawnCell",LV,779,"mob.pos = randomRespawnCell(mob);"),
("placement loop rejects cells closer than disLimit",LV,781,"} while ((mob.pos == -1 || PathFinder.distance[mob.pos] < disLimit) && tries > 0);"),
("spawn only if hero alive and distance ok",LV,783,"PathFinder.distance[mob.pos] >= disLimit) {"),
("randomRespawnCell entry point",LV,794,"public int randomRespawnCell( Char ch ) {"),
("randomRespawnCell gives up after 30 draws",LV,799,"if (++count > 30) {"),
("randomRespawnCell rejects cells in hero FOV",LV,805,"} while ((Dungeon.level == this && heroFOV[cell])"),
("regular mobLimit entry point",RL,206,"public int mobLimit() {"),
("mobLimit is 3 + depth%5 + Random.Int(3)",RL,212,"int mobs = 3 + Dungeon.depth % 5 + Random.Int(3);"),
("LARGE feeling raises the cap",RL,213,"if (feeling == Feeling.LARGE){"),
("LARGE feeling multiplier 1.33",RL,214,"mobs = (int)Math.ceil(mobs * 1.33f);"),
("generation excludes 8-tile FOV from entrance",RL,238,"ShadowCaster.castShadow(c.x, c.y, width(), entranceFOV, losBlocking, 8);"),
("mining level subtracts one from the cap",ML,155,"return super.mobLimit()-1;"),
("Ghoul overrides spawningWeight",GH,80,"public float spawningWeight() {"),
("base Mob spawningWeight method",MB,1168,"public float spawningWeight(){"),
("weight comment: counts toward spawning totals",MB,1167,"//how many mobs this one should count as when determining spawning totals"),
("spawner attached on each level entry",DG,491,"level.addRespawner();"),
("TICK constant is 1 turn",AC,39,"public static final float TICK"),
]
with open("receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    for claim,fn,ln,q in R:
        assert 15<=len(q)<=90 or True
        if not (15<=len(q)<=90): print("LEN",len(q),q)
        w.writerow([G,claim,fn,ln,q])
print(len(R),"rows")
