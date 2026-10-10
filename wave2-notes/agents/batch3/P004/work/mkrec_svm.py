import csv
OUT = "/private/tmp/p2/wave2-haiku/batch3/P004/receipts.tsv"
NOTE = "scummvm-scummvm"
R = "/mnt/frankendom-donors/scummvm-scummvm/engines/hadesch/rooms"
T = R + "/monster/typhoon.cpp"
P = R + "/monster/projectile.cpp"
M = R + "/monster.cpp"
H = R + "/monster.h"
C = "/mnt/frankendom-donors/scummvm-scummvm/COPYING"
rows = [
 ("licence name", "licence is GPL version 3", C, 1, "GNU GENERAL PUBLIC LICENSE"),
 ("licence version", "licence version 3", C, 2, "Version 3, 29 June 2007"),
 ("file header licence", "typhoon.cpp header allows version 3 or later", T, 9, "either version 3 of the License, or"),
 ("head table", "typhoon head table is 18 records", T, 48, "static const TyphoonHeadInfo typhonHeadInfo[] = {"),
 ("first head record", "first head record", T, 49, "\"head00c1\", 275, 186, 480},"),
 ("last head record", "last head record", T, 66, "\"head17d0\", 257, 107, 497}"),
 ("heads array size", "alive flags array has 18 entries", H, 120, "bool _headIsAlive[18];"),
 ("hit sets head down", "a hit clears the head alive flag", T, 313, "_headIsAlive[idx] = false;"),
 ("die timer captures level", "die-finished event captures the fight level at the hit", T, 317, "TyphoonHeadDieAnimFinishedEvent(backRef, idx, _battleground->_level)"),
 ("all heads down check", "a head still alive blocks the kill", T, 322, "if (_headIsAlive[i])"),
 ("fight killed flag", "all heads down sets the killed flag", T, 328, "_isKilled = true;"),
 ("fight stops on kill", "all heads down stops the fight", T, 329, "_battleground->stopFight();"),
 ("band 1 min", "minimum window for level 21 or less is 15000 less 500 per level", T, 274, "minRespawnInterval = 15000 - 500 * (_level - 1);"),
 ("level 22 min", "level 22 minimum is 4600", T, 276, "minRespawnInterval = 4600;"),
 ("band 3 min", "levels 23 to 25 minimum is 4200 less 200 per level", T, 278, "minRespawnInterval = 4200 - 200 * (_level - 23);"),
 ("level 26 min", "level 26 minimum is 3700", T, 280, "minRespawnInterval = 3700;"),
 ("band 5 min", "level 27 and up minimum is 3600 less 200 per level", T, 282, "minRespawnInterval = 3600 - 200 * (_level - 27);"),
 ("band 1 max", "maximum for level 21 or less is 20000 less 500 per level", T, 285, "maxRespawnInterval = 20000 - 500 * (_level - 1);"),
 ("band 2 max", "maximum above 21 is 9600 less 200 per level", T, 287, "maxRespawnInterval = 9600 - 200 * (_level - 22);"),
 ("random window draw", "respawn time is a random draw in the window", T, 290, "getRandomNumberRng(minRespawnInterval, maxRespawnInterval));"),
 ("respawn guard", "respawn does nothing if the head is alive or the fight is over", T, 241, "if (_typhoon->_headIsAlive[_idx] || _typhoon->_isKilled)"),
 ("respawn sets alive", "respawn sets the head alive again", T, 244, "_typhoon->_headIsAlive[_idx] = true;"),
 ("growl cadence", "growl timer shortens with alive heads", T, 194, "int ha = typhonGetNumAliveHeads() * 50;"),
 ("growl window", "growl window is 1100 to 1200 less 50 per alive head", T, 195, "getRandomNumberRng(1100-ha, 1200 - ha));"),
 ("attack idle roll", "attack cycle idles 3 times in 4", T, 181, "if (g_vm->getRnd().getRandomNumberRng(0, 3)) {"),
 ("attack chains back", "idle animation calls typhoonA again on completion", T, 182, "\"v7050ba0\", 500, PlayAnimParams::disappear(), 15153);"),
 ("volley count loop", "volley fires getNumOfProjectiles shots", T, 112, "i < _battleground->getNumOfProjectiles(); y++, i++)"),
 ("volley count formula", "volley size is (level - 1) / 10 + 1", P, 173, "return (_level - 1) / 10 + 1;"),
 ("miss roll", "a shot misses when a draw in 0 to hit chance is zero", P, 49, "_isMiss = g_vm->getRnd().getRandomNumberRng(0, getProjectileHitChance()) == 0;"),
 ("hit chance top band", "hit chance 6 from level 26", P, 155, "if (_level >= 26)"),
 ("flight length", "flight length is 41 less level, in tenths of seconds", P, 151, "return 41 - _level;"),
 ("flight ms", "flight time is the length times 100 ms", P, 83, "_flightLengthMs = getProjectileFlightLength(_level) * 100;"),
 ("hit event", "a landed shot raises the hit event", P, 64, "g_vm->handleEvent(kHitReceived);"),
 ("leaves decrement", "each hit costs one leaf", M, 287, "_battleground->_leavesRemaining--;"),
 ("leaves stop fight", "no leaves left stops the fight", M, 290, "if (_battleground->_leavesRemaining <= 0) {"),
 ("leaves stop call", "no leaves left stops the fight", M, 291, "_battleground->stopFight();"),
 ("leaves set at start", "the leaves budget starts at 9", M, 136, "_battleground->_leavesRemaining = 9;"),
 ("level step", "the level counter goes up by one", M, 217, "_battleground->_level++;"),
 ("intercept radius", "a click intercepts a shot inside a radius from its scale", P, 292, "if ((int) p.sqrDist(fp.centerPos) > r * r)"),
 ("typhoon leaves reset", "entering the typhoon resets leaves to 9", T, 156, "_battleground->_leavesRemaining = 9;"),
 ("sound cue only", "growl event plays a sound and reschedules itself", T, 106, "room->playSFX(\"v7050ea0\");"),
]
with open(OUT, "a", newline="") as f:
    w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar=None, lineterminator="\n", quotechar="\x00")
    for _k, claim, path, line, quote in rows:
        assert "\t" not in quote and "\t" not in claim
        assert 15 <= len(quote) <= 90, (quote, len(quote))
        w.writerow([NOTE, claim, path, str(line), quote])
print("appended", len(rows))
