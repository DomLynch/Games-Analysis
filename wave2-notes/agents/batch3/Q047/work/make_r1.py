import csv
OUT="/private/tmp/p2/wave2-haiku/batch3/Q047/receipts.tsv"
G="afritz1-OpenTESArena"
R="/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/"
rows=[
 ("XP cap function exists and loops from level 2 up to the level",R+"Stats/CharacterClassDefinition.cpp",121,"int CharacterClassDefinition::getExperienceCap(int level) const"),
 ("cap starts from the class initial XP cap",R+"Stats/CharacterClassDefinition.cpp",128,"int experienceCap = this->initialExpCap;"),
 ("cap loop multiplies by the per-level multiplier",R+"Stats/CharacterClassDefinition.cpp",131,"const double multiplier = GetExperienceMultiplierForLevel(currentLevel);"),
 ("cap is floored after each multiply",R+"Stats/CharacterClassDefinition.cpp",132,"std::floor(static_cast<double>(experienceCap) * multiplier)"),
 ("low-band multiplier 30/16 (levels 2-8)",R+"Stats/CharacterClassDefinition.cpp",13,"constexpr double lowLevelMultiplier = 30.0 / 16.0;"),
 ("high-band multiplier 1.50 (level 9 and up)",R+"Stats/CharacterClassDefinition.cpp",14,"constexpr double highLevelMultiplier = 1.50;"),
 ("band test for levels 2 to 8",R+"Stats/CharacterClassDefinition.cpp",15,"if ((level >= 2) && (level <= 8))"),
 ("level-up loop: while XP meets the cap, gain a level",R+"Game/GameState.cpp",1662,"while (player.experience >= charClassDef.getExperienceCap(player.level))"),
 ("level-up is deferred while an enemy is near",R+"Game/GameState.cpp",1656,"if (entityChunkManager.anyEnemiesNearby(playerPosition))"),
 ("bonus points per level use the min constant",R+"Game/GameState.cpp",1680,"bonusPoints += CharacterLevelUpState::BonusPointsRandomMin + extraBonusPoints;"),
 ("HP gain per level includes a d-die roll",R+"Game/GameState.cpp",1683,"(1 + random.next(charClassDef.healthDie))"),
 ("HP gain applied inside the popup callback",R+"Game/GameState.cpp",1696,"player.maxHealth = std::round(player.maxHealth + maxHealthIncrease);"),
 ("bonus points random min is 4",R+"Player/CharacterLevelUpState.h",9,"static constexpr int BonusPointsRandomMin = 4;"),
 ("bonus points random max is 6",R+"Player/CharacterLevelUpState.h",10,"static constexpr int BonusPointsRandomMax = 6;"),
 ("random.next(n) returns 0 to n-1 (modulo)",R+"Math/Random.cpp",38,"return this->next() % exclusiveMax;"),
 ("kill check: only a not-dying target can be killed",R+"Combat/CombatLogic.cpp",379,"canHitEntityBeKilled = !hitEntityCombatState->isInDeathState();"),
 ("award fires when health reaches exactly zero",R+"Combat/CombatLogic.cpp",453,"if (hitEntityCombatState->health == 0.0)"),
 ("dying flag is set at the kill",R+"Combat/CombatLogic.cpp",455,"hitEntityCombatState->isDying = true;"),
 ("creature XP formula: baseExp plus maxHP times multiplier",R+"Combat/CombatLogic.cpp",467,"hitEntityCreatureDef.baseExp + (hitEntityCreatureDef.maxHP"),
 ("creature XP added to player",R+"Combat/CombatLogic.cpp",468,"player.experience += creatureCalculatedExperience;"),
 ("human enemy XP added to player",R+"Combat/CombatLogic.cpp",478,"player.experience += humanEnemyCalculatedExperience;"),
 ("human enemy XP is level squared times class multiplier",R+"Entities/ArenaEntityUtils.cpp",680,"const int experience = (level * level) * humanoidExpMultipliers[index];"),
 ("human multiplier indexed by class category",R+"Entities/ArenaEntityUtils.cpp",678,"const int index = charClassDef.categoryID;"),
 ("creature XP comment: baseExp plus maxHP times expMultiplier",R+"Assets/ExeData.h",167,"// Exp = baseExp + (maxHP * expMultiplier)."),
 ("creature base XP table is in exe data",R+"Assets/ExeData.h",167,"uint32_t creatureBaseExps[24];"),
 ("creature XP multiplier table is in exe data",R+"Assets/ExeData.h",168,"uint8_t creatureExpMultipliers[24];"),
 ("human XP multiplier table (3 entries)",R+"Assets/ExeData.h",196,"uint8_t humanEnemyExpMultipliers[3];"),
 ("initial XP cap table (18 entries, exe data)",R+"Assets/ExeData.h",75,"uint16_t initialExperienceCaps[18];"),
 ("creature base XP loaded from exe table",R+"Entities/CreatureDefinitionLibrary.cpp",25,"this->baseExp = entities.creatureBaseExps[creatureIndex];"),
 ("class initial XP cap field",R+"Stats/CharacterClassDefinition.h",27,"int initialExpCap;"),
 ("safe distance constant used for level-up gate",R+"Player/Player.h",54,"constexpr double SAFE_SLEEP_DISTANCE = 8.0;"),
 ("enemy proximity check uses a squared distance limit",R+"Entities/EntityChunkManager.cpp",2102,"distanceLimitSqr = PlayerConstants::SAFE_SLEEP_DISTANCE"),
 ("proximity check skips enemies in death state",R+"Entities/EntityChunkManager.cpp",2108,"if (entityCombatState.isInDeathState())"),
 ("death state is dying or dead",R+"Entities/EntityChunkManager.cpp",284,"return this->isDying || this->isDead;"),
 ("level-up tick is called once per frame from Game update",R+"Game/Game.cpp",934,"this->gameState.tickPlayerLevel(*this);"),
 ("new-game reset sets level 1 and zero XP",R+"Player/Player.cpp",313,"this->level = 1;"),
 ("new-game reset zeroes experience",R+"Player/Player.cpp",314,"this->experience = 0;"),
 ("licence is MIT",  "/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt",1,"The MIT License (MIT)"),
]
with open(OUT,"w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,fp,ln,q in rows:
        assert "\t" not in q
        w.writerow([G,claim,fp,str(ln),q])
print("wrote",len(rows))
