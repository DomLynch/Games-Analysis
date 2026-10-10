import csv,sys
M="/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Mob.java"
C="/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java"
B="/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Bee.java"
N="00-Evan-shattered-pixel-dungeon"
rows=[
("AI tick calls chooseEnemy once per act before the state runs",M,289,"enemy = chooseEnemy();"),
("state.act runs with the enemy in FOV flag",M,301,"boolean result = state.act( enemyInFOV, justAlerted );"),
("enemy kept unless dead, gone or wandering",M,393,"enemy == null || !enemy.isAlive() || !Actor.chars().contains(enemy)"),
("wandering forces a fresh enemy choice every tick",M,393,"state == WANDERING) {"),
("enemy candidates: hero in FOV when mob is an enemy",M,464,"if (fieldOfView[Dungeon.hero.pos] && Dungeon.hero.invisible <= 0) {"),
("enemy candidates: allies in FOV when mob is an enemy",M,460,"mob.alignment == Alignment.ALLY && fieldOfView[mob.pos]"),
("nearest candidate measured by path distance to a tile next to it",M,492,"if (PathFinder.distance[curr.pos+i] < currDist){"),
("attackable beats non-attackable (keep closest)",M,499,"else if (canAttack(closest) && !canAttack(curr))"),
("attackable candidate takes over, or nearer one",M,501,"} else if ((canAttack(curr) && !canAttack(closest))"),
("closestDist set only for the first candidate",M,498,"closestDist = currDist;"),
("closest changes without updating closestDist",M,503,"closest = curr;"),
("afterimage swap when hero would be chosen",M,510,"if (closest == Dungeon.hero){"),
("canAttack is adjacency (melee reach 1)",M,560,"if (Dungeon.level.adjacent( pos, enemy.pos )){"),
("sleeping: awaken roll against the picked candidate",M,1264,"Random.Float() < detectionChance(closestHostile)"),
("sleeping: comment says least stealthy hostile wakes it",M,1237,"can be awoken by the least stealthy hostile present"),
("sleeping: loop keeps the candidate with lowest chance",M,1257,"if (bestChance < highestChance){"),
("sleeping chance is 1/(distance + stealth)",M,1282,"return 1 / (distance( enemy ) + enemy.stealth());"),
("wandering: notice if just alerted or roll passes",M,1307,"if (enemyInFOV && (justAlerted || Random.Float() < detectionChance(enemy))) {"),
("wandering chance is 1/(distance/2 + stealth)",M,1320,"return 1 / (distance( enemy ) / 2f + enemy.stealth());"),
("noticing switches to hunting and targets enemy",M,1328,"state = HUNTING;"),
("hunting: attack gate needs in FOV, not charmed, can attack",M,1365,"if (enemyInFOV && !isCharmedBy( enemy ) && canAttack( enemy )) {"),
("hunting: attack call",M,1369,"return doAttack( enemy );"),
("hunting: swap fallback when target cannot be attacked",M,1375,"if (handleRecentAttackers()){"),
("recent hitter swap rule: attackable, no enemy, or nearer",M,1407,"if (canAttack(ch) || enemy == null || Dungeon.level.distance(pos, ch.pos)"),
("recent hitter becomes enemy (last qualifying one wins)",M,1409,"target = ch.pos;"),
("hunting: unreachable target re-chooses once, then wanders if not in view",M,1428,"enemy = chooseEnemy();"),
("flee: escape roll 1 + Random.Int(distance) >= 6 when enemy unseen",M,1482,"1 + Random.Int(Dungeon.level.distance(pos, target)) >= 6"),
("flee: nowhere to run turns to hunting if enemy seen",M,1516,"if (enemySeen) {"),
("hit by a foe while not hunting: aggro the attacker",M,871,"if (state != FLEEING) {"),
("hit while already hunting: queue the attacker",M,876,"recentlyAttackedBy.add(enemy);"),
("hit while wandering: target the attacker's cell",M,874,"target = enemy.pos;"),
("aggro sets the enemy and hunts unless passive",M,921,"public void aggro( Char ch ) {"),
("damage() wakes sleeping mob, alerts non-hunting mob",M,945,"if (!(src instanceof Corruption) && state != FLEEING) {"),
("ranged hero spell aggros via damage()",M,950,"aggro(Dungeon.hero);"),
("defenseProc is called by the attacker (single caller read)",C,483,"enemy.defenseProc( this, Math.round(dmg) )"),
("base stealth is 0 except Obfuscation glyph boost",C,1284,"public float stealth() {"),
("stealth boost comes from Obfuscation glyph level",C,1287,"stealth += Obfuscation.stealthBoost(this, glyphLevel(Obfuscation.class));"),
("beast override of chooseEnemy exists (Bee)",B,148,"return super.chooseEnemy();"),
("candidate set is a HashSet, so iteration order is not fixed",M,416,"HashSet<Char> enemies = new HashSet<>();"),
("sleep wake-up costs TIME_TO_WAKE_UP, value 1f",M,141,"protected static final float TIME_TO_WAKE_UP = 1f;"),
]
out=sys.argv[1]
with open(out,'w',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,path,line,q in rows:
        if not (15<=len(q)<=90): print("LEN",len(q),q)
        w.writerow([N,claim,path,str(line),q])
print("rows",len(rows))
