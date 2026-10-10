import csv, sys
OUT = "/private/tmp/p2/wave2-haiku/batch3/P004/receipts.tsv"
NOTE = "diasurgical-DevilutionX"
M = "/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp"
H = "/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.h"
D = "/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp"
L = "/mnt/frankendom-donors/diasurgical-DevilutionX/LICENSE.md"
rows = [
 ("InitMonsters defined", "InitMonsters() is the level population entry point", M, 3686, "std::expected<void, std::string> InitMonsters()"),
 ("open-tile scan start", "open-tile count scans the interior from 16", M, 3707, "for (int s = 16; s < 96; s++) {"),
 ("open-tile test", "a tile counts when it is not solid", M, 3709, "if (!IsTileSolid({ s, t }))"),
 ("density divisor", "population is open tiles divided by 30", M, 3713, "size_t numplacemonsters = na / 30;"),
 ("multiplayer bonus", "multiplayer adds half again", M, 3715, "numplacemonsters += numplacemonsters / 2;"),
 ("population cap", "cap is MaxMonsters minus 10", M, 3716, "if (ActiveMonsterCount + numplacemonsters > MaxMonsters - 10)"),
 ("total target", "total target = placed plus new", M, 3718, "totalmonsters = ActiveMonsterCount + numplacemonsters;"),
 ("scatter loop", "scatter loop runs until the total is met", M, 3728, "while (ActiveMonsterCount < totalmonsters) {"),
 ("group size level 1", "level 1 groups are size 1", M, 3730, "if (currlevel == 1 || FlipCoin())"),
 ("group size crypt or level 2", "level 2 or crypt groups are 2 to 3", M, 3733, "na = GenerateRnd(2) + 2;"),
 ("group size else", "other levels groups are 3 to 5", M, 3735, "na = GenerateRnd(3) + 3;"),
 ("PlaceGroup call from scatter", "scatter loop calls PlaceGroup with no leader", M, 3736, "PlaceGroup(typeIndex, na);"),
 ("PlaceGroup defined", "PlaceGroup takes a size and optional leader", M, 308, "void PlaceGroup(size_t typeIndex, size_t num"),
 ("seed attempts", "up to 10 seed attempts", M, 312, "for (int try1 = 0; try1 < 10; try1++) {"),
 ("rollback of failed group", "a failed attempt is rolled back before the next", M, 313, "while (placed != 0) {"),
 ("rollback removes monster", "rollback decrements the active count", M, 314, "ActiveMonsterCount--;"),
 ("rollback frees tile", "rollback clears the tile occupancy", M, 317, "dMonster[position.x][position.y] = 0;"),
 ("seed random x", "seed tile x is 16 plus a random 0-79", M, 329, "xp = GenerateRnd(80) + 16;"),
 ("seed must pass test", "seed repeats until CanPlaceMonster", M, 331, "} while (!CanPlaceMonster({ xp, yp }));"),
 ("clip to budget", "group size is clipped to the remaining budget", M, 336, "if (num + ActiveMonsterCount > totalmonsters) {"),
 ("member tries", "up to 100 failed member tries per seed", M, 341, "for (unsigned try2 = 0; j < num && try2 < 100;"),
 ("y-step quirk", "the y step reads deltaX (BUGFIX comment)", M, 341, "BUGFIX: `yp += Point.y`"),
 ("region match", "members must share the seed's dTransVal region", M, 343, "(dTransVal[xp][yp] != dTransVal[x1][y1])"),
 ("leash radius", "leashed members stay within 3 of the seed", M, 344, "(leashed && (std::abs(xp - x1) >= 4 || std::abs(yp - y1) >= 4))"),
 ("placed count", "a member placement increments the active count", M, 367, "ActiveMonsterCount++;"),
 ("partial group kept", "a group that met its size stops the seed loop", M, 372, "if (placed >= num) {"),
 ("CanPlaceMonster occupancy", "tile must have no monster", M, 285, "&& dMonster[position.x][position.y] == 0"),
 ("CanPlaceMonster visibility", "tile must not be visible to the player", M, 287, "&& !IsTileVisible(position)"),
 ("PlaceMonster facing", "facing is a random one of 8 directions", M, 304, "auto rd = static_cast<Direction>(GenerateRnd(8));"),
 ("leader pack minion hp", "pack minions get double max hit points", M, 352, "minion.maxHitPoints *= 2;"),
 ("leader pack call", "unique boss packs call PlaceGroup with the leader", M, 3403, "PlaceGroup(minionType, bosspacksize, &monster,"),
 ("MaxMonsters constant", "MaxMonsters is 200", H, 38, "constexpr size_t MaxMonsters = 200;"),
 ("scatter flag", "PLACE_SCATTER is a flag on a monster type", H, 134, "PLACE_SCATTER = 1 << 0,"),
 ("skeleton types scatter", "skeleton types are registered as scatter", M, 3481, "AddMonsterType(skeltypes[GenerateRnd(skeletonTypeCount)], PLACE_SCATTER)"),
 ("in-fight skeleton spawn cap", "skeleton spawn checks the cap", M, 2406, "if (IsTileAvailable(monster, newPosition) && ActiveMonsterCount < MaxMonsters) {"),
 ("in-fight Hork spawn cap", "Hork spawn checks the cap", M, 3042, "if (IsTileAvailable(monster, position) && ActiveMonsterCount < MaxMonsters) {"),
 ("Hork spawn call", "Hork spawn starts a ranged special attack", M, 3043, "StartRangedSpecialAttack(monster, MissileID::HorkSpawn, 0);"),
 ("level setup call", "InitMonsters runs during level setup", D, 3153, "RETURN_IF_ERROR(InitMonsters());"),
 ("licence name", "licence is Sustainable Use License", L, 1, "# Sustainable Use License"),
 ("licence limits", "use limited to internal or non-commercial", L, 15, "You may use or modify the software only for your own internal business"),
]
with open(OUT, "w", newline="") as f:
    w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar=None, lineterminator="\n", quotechar="\x00")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim_key, claim, path, line, quote in rows:
        assert "\t" not in quote and "\t" not in claim
        w.writerow([NOTE, claim, path, str(line), quote])
print("wrote", len(rows))
