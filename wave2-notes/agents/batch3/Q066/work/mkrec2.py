import csv
R='/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/'
CU=R+'Combat/ArenaCombatUtils.cpp'; CL=R+'Combat/CombatLogic.cpp'; EC=R+'Entities/EntityChunkManager.cpp'
GS=R+'Game/GameState.cpp'; SU=R+'Stats/ArenaStatUtils.cpp'; RN=R+'Math/Random.cpp'; RH=R+'Math/Random.h'
PU=R+'Player/ArenaPlayerUtils.cpp'
LIC='/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt'
N='afritz1-OpenTESArena'
rows=[
('callers','physical impact plays clank when the target is still alive',CL,486,'audioManager.playSoundOneShot(ArenaSoundName::Clank, hitEntityMiddlePosition);'),
('callers','monster miss plays clank then returns',CL,540,'audioManager.playSoundOneShot(ArenaSoundName::Clank);'),
('timing','monster swing gap set on entering melee',EC,1638,'enemyBehaviorState.secondsTillNextAttack = GetEnemyNextWeaponSwingSeconds(random);'),
('timing','monster swing gap redrawn after a finished swing',EC,1693,'enemyBehaviorState.secondsTillNextAttack = GetEnemyNextWeaponSwingSeconds(random);'),
('timing','monster leaves melee when the player is out of range',EC,1687,'enemyBehaviorState.type = EntityEnemyBehaviorStateType::MovingToPlayer;'),
('rng','std default engine seeded from the clock when unseeded',RN,27,'const int seed = static_cast<int>(microsecondsSinceEpoch'),
('licence','MIT licence name line',LIC,1,'The MIT License (MIT)'),
('crit','class has a criticalHit flag that combat does not read',R+'Stats/CharacterClassDefinition.h',29,'bool criticalHit;'),
('licence','MIT licence first line',LIC,1,'The MIT License (MIT)'),
('hit','melee hit function signature takes attacker level and race',CU,8,'bool ArenaCombatUtils::isMeleeHitSuccessful(int attackerLevel'),
('hit','racial chance bonus applies to race IDs 1, 3 and 5',CU,13,'const bool attackerHasRacialBonus = (attackerRaceID == 1)'),
('hit','racial bonus is level scaled to 256',CU,16,'racialChanceBonus = ArenaStatUtils::scale100To256(attackerLevel);'),
('hit','armour term is a todo that is zero',CU,20,'const int defenderArmorClassValue = 0; // @todo look up in defender'),
('hit','base chance 128 plus level gap times five scaled to 256',CU,21,'int chance1 = 128 + ArenaStatUtils::scale100To256((attackerLevel - defenderLevel) * 5)'),
('hit','chance is adjusted by hit bonus minus defence bonus',CU,21,'(attackerHitBonus - defenderDefenseBonus) - defenderArmorClassValue;'),
('hit','class bonus test for defender class IDs 9 and 12',CU,23,'const bool defenderHasClassBonus = (defenderClassID == 9) || (defenderClassID == 12);'),
('hit','class bonus replaces chance with a level-scaled value',CU,26,'chance1 = (chance1 * 8 / 256) * (defenderLevel + 1);'),
('hit','floor chance from attacker level scaled plus 51',CU,29,'const int chance2 = ArenaStatUtils::scale100To256(attackerLevel) + 51;'),
('hit','hit if roll of 256 is below the larger of the two chances',CU,30,'return random.next(256) < std::max(chance1, chance2);'),
('numbers','scale100To256 is value times 256 over 100 (integer)',SU,13,'return (value * 256) / 100;'),
('rng','ArenaRandom multiplies its state by 7143469 each draw',RN,68,'this->value *= 7143469;'),
('rng','ArenaRandom returns the top 16 bits of state',RN,69,'return (this->value >> 16) & 0xFFFF;'),
('rng','next(max) is the draw modulo max',RN,74,'return this->next() % exclusiveMax;'),
('rng','ArenaRandom default seed constant',RH,43,'static constexpr uint32_t DEFAULT_SEED = 12345;'),
('rng','damage uses the std default random engine (separate from the hit RNG)',RN,18,'this->generator = std::default_random_engine(seed);'),
('derived','strength damage bonus is zero at strength 43 or lower',PU,70,'if (strength <= 43)'),
('derived','strength damage bonus is (strength minus 48) over five',PU,75,'return (strength - 48) / 5;'),
('derived','agility to-hit bonus is minus one at agility 45 or lower',PU,103,'if (agility <= 45)'),
('derived','agility to-hit bonus is (agility minus 50) over five',PU,112,'return (agility - 50) / 5;'),
('derived','defence bonus equals agility to-hit bonus',PU,146,'values.bonusToDefend = values.bonusToHit;'),
('derived','strength bonus feeds damage bonus',PU,130,'values.bonusDamage = ArenaPlayerUtils::calculateDamageBonus(strength);'),
('callers','player hit on entity calls the melee hit roll with the defender class',CL,412,'isHitEntityTakingDamage = ArenaCombatUtils::isMeleeHitSuccessful(player.level'),
('callers','hit roll only for physical impacts; spell hits always land',CL,416,'isHitEntityTakingDamage = true; // @todo spell effects/resist/willpower'),
('callers','monster hit on player calls the same hit roll',CL,537,'const bool isPlayerHit = ArenaCombatUtils::isMeleeHitSuccessful(entityCombatLevel'),
('callers','monster miss returns before damage',CL,538,'if (!isPlayerHit)'),
('callers','player luck bonus is a todo of zero',CL,397,'const int playerLuckBonus = 0; // @todo'),
('callers','monster race, hit and luck bonuses are todo zeros',CL,525,'const int entityRaceID = 0; // @todo'),
('callers','entity hit bonus todo zero',CL,526,'const int entityHitBonus = 0; // @todo'),
('callers','entity luck bonus todo zero',CL,527,'const int entityLuckBonus = 0; // @todo'),
('callers','defence bonus of the player taken from derived attributes',CL,534,'int playerDefenseBonus = playerDerivedAttributes.bonusToDefend;'),
('callers','defender defence bonus is a todo zero for enemies',CL,407,'int hitEntityDefenseBonus = 0; // @todo'),
('damage','melee weapon damage: minimum plus a random draw over the range',CL,332,'sourceDamage = weaponItemDef.damageMin + random.next('),
('damage','bare-hand damage is one or two plus gauntlet armour class',CL,356,'sourceDamage = (1 + random.next(2)) + extraGauntletsDamage;'),
('damage','bow damage is three plus a draw of eight',CL,363,'sourceDamage = 3 + random.next(8);'),
('damage','spell damage is ten plus a draw of forty',CL,367,'sourceDamage = 10 + random.next(40);'),
('damage','strength bonus added to melee damage only',CL,359,'sourceDamage += playerDerivedAttributes.bonusDamage;'),
('damage','enemy health reduced and floored at zero',CL,422,'hitEntityCombatState->health = std::max(hitEntityCombatState->health - sourceDamage'),
('damage','death when health is exactly zero',CL,453,'if (hitEntityCombatState->health == 0.0)'),
('damage','dying flag set on kill',CL,455,'hitEntityCombatState->isDying = true;'),
('xp','creature experience is base plus max HP times multiplier (base part)',CL,467,'hitEntityCreatureDef.baseExp + (hitEntityCreatureDef.maxHP'),
('damage','monster weapon damage from its weapon range',CL,565,'damageAmount = humanEnemyEquippedWeaponDef.damageMin'),
('damage','monster fists damage is one plus draw of five, a todo',CL,569,'damageAmount = 1 + random.next(5);'),
('damage','no critical strike: todo',CL,572,'// @todo: Chance for critical strike'),
('damage','creature damage from its min and max',CL,577,'damageAmount = creatureDef.minDamage + random.next('),
('damage','immune-to-damage option zeroes damage',CL,602,'if (game.options.getMisc_ImmuneToDamage())'),
('damage','player health reduced and floored at zero',CL,609,'player.currentHealth = std::max(player.currentHealth - damageAmount, 0.0);'),
('timing','hits applied after physics step, not at contact',GS,1829,'These are applied after physics simulation since contact added handlers'),
('timing','player entity results applied in tick',GS,1837,'CombatLogic::onEntityHitByPlayer(result.entityInstID'),
('timing','enemy melee range min one unit',EC,46,'constexpr double EnemyToPlayerMeleeAttackMinDistance = 1.0;'),
('timing','enemy melee range max 1.15 units',EC,48,'constexpr double EnemyToPlayerMeleeAttackMaxDistance = 1.15;'),
('timing','swing gap is random real times 0.75 seconds',EC,196,'return random.nextReal() * 0.75;'),
('timing','donor comment: arbitrary timing, difficulty tbd',EC,195,'// Arbitrary timing, tbd difficulty settings'),
('timing','swing gap function name',EC,193,'double GetEnemyNextWeaponSwingSeconds(Random &random)'),
('timing','countdown uses variable dt',EC,1656,'enemyBehaviorState.secondsTillNextAttack -= dt;'),
('timing','hit allowed once per swing at half the animation',EC,1668,'const bool isHitAllowed = !enemyBehaviorState.hasAttemptedHit'),
('timing','hit allowed at fifty percent progress',EC,1668,'(animInst.progressPercent >= 0.50);'),
('timing','player hit call inside the monster attack state',EC,1675,'CombatLogic::onPlayerHitByEntity(entityInstID, game);'),
]
with open('/private/tmp/p2/wave2-haiku/batch3/Q066/work/receipts-c2.tsv','w') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    w.writerow(['note','claim','donor_file','line','quote'])
    for cat,claim,path,line,quote in rows:
        assert '\t' not in quote
        w.writerow([N,claim,path,str(line),quote])
print(len(rows))
