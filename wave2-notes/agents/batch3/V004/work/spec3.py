L="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/loot"
LM=L+"/LootManagerImplementation.cpp"
CM="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/creature/CreatureManagerImplementation.cpp"
TM="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/tangible/threat/ThreatMap.cpp"
TPL="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/templates/LootGroupTemplate.h"
S=[
("creature loot: collection of the dead creature", LM, "return createLootFromCollection(trx, container, lootCollection, creature->getLevel());"),
("collection pass: function header", LM, "bool LootManagerImplementation::createLootFromCollection("),
("collection entry skipped when chance is zero", LM, "if (lootChance <= 0)"),
("first roll per entry against its chance", LM, "if (roll > lootChance)"),
("second roll picks the group", LM, "roll = System::random(10000000);\t720"),
("groups scanned with running total", LM, "tempChance += groupEntry->getLootChance();"),
("group passes when running total reaches the roll", LM, "if (tempChance < roll)"),
("winning group creates its loot (overwrites the id)", LM, "objectID = createLoot(trx, container, groupEntry->getLootGroupName(), level);"),
("collection succeeds when the last id is above zero", LM, "return objectID > 0 ? true : false;"),
("nested group descent: one roll per level", LM, "lootEntry = group->getLootGroupEntryForRoll(System::random(10000000));"),
("nested descent depth cap 32", LM, "int depthMax = 32;"),
("missing item template logged and dropped", LM, "LootMapEntry does not exist"),
("credits: max formula", LM, "int maxcredits = (int) round((.03f * level * level) + (3 * level) + 50);"),
("credits: min formula", LM, "int mincredits = (int) round((((float) maxcredits) * .5f) + (2.0f * level));"),
("credits: random between min and max", LM, "int credits = mincredits + System::random(maxcredits - mincredits);"),
("default collection chance: 20% plus 0.2% per level", L+"/lootgroup/LootGroupCollectionEntry.h", "lootChance = 2000000 + (level * 20000); // 20% + (0.2% * level)"),
("collection chance read from script", L+"/lootgroup/LootGroupCollectionEntry.h", "lootChance = lua->getIntField(\"lootChance\");"),
("group entries sorted by weight, descending (comment)", L+"/lootgroup/LootGroupEntry.h", "Loot Group Entries are sorted by their weights, in descending order."),
("group entry weight read from script", TPL, "int chance = lootItem.getIntField(\"weight\");"),
("group template picks by running total of weights", TPL, "if (totalChance >= roll && weight > 0)"),
("group template: falls through when weights do not reach the roll", TPL, "//Should never get here unless the scripts didn't add up to 10000000."),
("loot owner: highest loot-damage group leader", CM, "ManagedReference<CreatureObject*> player = copyThreatMap.getHighestDamageGroupLeader();"),
("owner id is the group when grouped", CM, "ownerID = player->getGroupID();"),
("owner id is the player when solo", CM, "ownerID = player->getObjectID();"),
("loot only when the leader is a player", CM, "if (creatureInventory != nullptr && player != nullptr && player->isPlayerCreature()) {"),
("corpse container owned by owner id", CM, "creatureInventory->setContainerOwnerID(ownerID);"),
("creature loot call", CM, "if (lootManager->createLoot(trx, creatureInventory, destructedObject)) {"),
("loot damage excludes dotDMG", TM, "uint32 totalDamage = entry->getLootDamage();"),
("group damage: leader check (scan stops on bad leader)", TM, "if (thisleader == nullptr || !thisleader->isPlayerCreature())\t330"),
("pet owner compared as a single entry (not the sum)", TM, "if (totalDamage > highestGroupDmg) {\t370"),
("highest player: total damage includes DOT", TM, "uint32 totalDamage = entry->getTotalDamage();"),
("highest player: strictly greater wins ties to first", TM, "if (damageMap.get(tano->getObjectID()) > maxDamage) {"),
("pet damage credited to owner", TM, "CreatureObject* owner = creo->getLinkedCreature().get();\t280"),
("quest mob loot: 100% chance", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/mobile/quest/corellia/maerzen.lua", "lootChance = 10000000"),
("loot group weight sample (1 in 6)", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/loot/groups/coa2_decoder_components.lua", "weight = 1666667"),
]
for t in S:
    print("\t".join(str(x) for x in t))
