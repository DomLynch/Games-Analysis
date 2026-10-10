L="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/loot"
LM=L+"/LootManagerImplementation.cpp"
CM="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/creature/CreatureManagerImplementation.cpp"
S=[
("credits added to corpse cash", CM, "destructedObject->addCashCredits(credits);"),
("credits only for non-player, non-event mobs", CM, "if (destructedObject->isNonPlayerCreatureObject() && !destructedObject->isEventMob()) {"),
("collection failure reported", LM, "trx.abort() << \"Did not win loot rolls.\";"),
("item placed in corpse", LM, "if (container->transferObject(obj, -1, false, true)) {"),
("failed transfer destroys the item", LM, "obj->destroyObjectFromDatabase(true);"),
("item created from its template", LM, "obj = createLootObject(trx, itemTemplate, level, maxCondition);"),
]
for t in S:
    print("\t".join(str(x) for x in t))
