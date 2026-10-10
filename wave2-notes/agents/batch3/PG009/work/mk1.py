import csv
D="/mnt/frankendom-donors/diasurgical-DevilutionX/"
G="diasurgical-DevilutionX"
rows=[
("claim: AddPlrMonstExper signature (the XP award entry point)",D+"Source/player.cpp",2469,"void AddPlrMonstExper(int lvl, unsigned exp, char pmask)"),
("claim: divisor counts set bits over all player slots, no activity check",D+"Source/player.cpp",2473,"if (((1 << i) & pmask) != 0) {"),
("claim: equal integer share exp / count of tagged slots",D+"Source/player.cpp",2479,"const unsigned e = exp / totplrs;"),
("claim: only the local tagged player is credited",D+"Source/player.cpp",2480,"if ((pmask & (1 << MyPlayerId)) != 0)"),
("claim: credit goes through addExperience with monster level",D+"Source/player.cpp",2481,"MyPlayer->addExperience(e, lvl);"),
("claim: tag sets the attacker's bit in whoHit",D+"Source/monster.cpp",4973,"whoHit |= 1 << tagger.getId();"),
("claim: MonsterDeath awards XP from the whoHit mask",D+"Source/monster.cpp",3999,"AddPlrMonstExper(monster.level(sgGameInitInfo.nDifficulty)"),
("claim: player minions give no XP",D+"Source/monster.cpp",3998,"if (!monster.isPlayerMinion())"),
("claim: melee/hit path tags the attacker",D+"Source/monster.cpp",3983,"monster.tag(player);"),
("claim: kill start tags the killer before MonsterDeath",D+"Source/monster.cpp",4035,"monster.tag(player);"),
("claim: minion damage tags its owner",D+"Source/monster.cpp",1129,"target.tag(player);"),
("claim: remote damage message tags the sending player",D+"Source/msg.cpp",2055,"monster.tag(player);"),
("claim: resisted missile still tags the shooter",D+"Source/missiles.cpp",330,"monster.tag(player);"),
("claim: whoHit reset at monster init",D+"Source/monster.cpp",229,"monster.whoHit = 0;"),
("claim: live sync ORs incoming mask into local monster",D+"Source/sync.cpp",207,"monster.whoHit = static_cast<int8_t>(monster.whoHit | monsterSync.mWhoHit);"),
("claim: live sync priority gate can return before the OR",D+"Source/sync.cpp",173,"if (delta < monsterSync._mdelta || (delta == monsterSync._mdelta && isOwner)) {"),
("claim: sync entries also reach the per-level delta store",D+"Source/sync.cpp",313,"delta_sync_monster(monsterSyncs[i], level);"),
("claim: delta store overwrites the stored mask by assignment",D+"Source/msg.cpp",2857,"monster.mWhoHit = monsterSync.mWhoHit;"),
("claim: level reload assigns the stored mask back to the monster",D+"Source/msg.cpp",875,"monster.whoHit = deltaMonster.mWhoHit;"),
("claim: level-gap scale 1 + gap/10, floor 0",D+"Source/player.cpp",2440,"experience * (1 + levelDelta / 10.0)"),
("claim: multiplayer cap term threshold/20",D+"Source/player.cpp",2446,"getNextExperienceThreshold() / 20U"),
("claim: multiplayer cap term 200 x character level",D+"Source/player.cpp",2446,"200U * getCharacterLevel()"),
("claim: grant gate, dead or non-local player returns",D+"Source/player.cpp",2432,"if (this != MyPlayer || hasNoLife())"),
("claim: multiplayer-only cap applied",D+"Source/player.cpp",2443,"if (gbIsMultiplayer) {"),
("claim: grant added up to max-level threshold",D+"Source/player.cpp",2454,"_pExperience += std::min(clampedExp, maxExperience - _pExperience);"),
("claim: addExperience(monster level) passes level gap",D+"Source/player.h",841,"_addExperience(experience, monsterLevel - getCharacterLevel());"),
("theirs: base exp from monster data",D+"Source/monster.h",359,"unsigned int monsterExp = data().exp;"),
("theirs: nightmare exp formula",D+"Source/monster.h",362,"monsterExp = 2 * (monsterExp + 1000);"),
("theirs: hell exp formula",D+"Source/monster.h",364,"monsterExp = 4 * (monsterExp + 1000);"),
("theirs: unique exp doubles",D+"Source/monster.h",368,"monsterExp *= 2;"),
("theirs: unique level fallback data level + 5",D+"Source/monster.h",404,"baseLevel = data().level + 5;"),
("theirs: nightmare level +15",D+"Source/monster.h",409,"baseLevel += 15;"),
("theirs: hell level +30",D+"Source/monster.h",411,"baseLevel += 30;"),
("theirs: max slots 4",D+"Source/multi.h",26,"#define MAX_PLRS 4"),
("claim: packet mask routes to slots whose bit is set",D+"Source/multi.cpp",656,"if ((v & pmask) != 0) {"),
("licence: repo LICENSE title",D+"LICENSE.md",1,"# Sustainable Use License"),
("licence: non-commercial limit",D+"LICENSE.md",15,"for non-commercial or personal use."),
]
with open("/private/tmp/p2/wave2-haiku/batch3/PG009/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    for claim,fn,ln,q in rows:
        assert "\t" not in q and "\n" not in q
        w.writerow([G,claim,fn,str(ln),q])
print(len(rows),"rows")
