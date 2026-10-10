import csv,sys
S='/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/'
rows=[
("death sets KillerId to the top damager",S+'WorldObjects/Creature_Death.cs',104,"KillerId = topDamager.Guid.Full;"),
("death animation delay before the corpse is made",S+'WorldObjects/Creature_Death.cs',129,"dieChain.AddDelaySeconds(deathAnimLength);"),
("no-corpse creatures drop loot on the ground",S+'WorldObjects/Creature_Death.cs',430,"if (NoCorpse)"),
("no-corpse path calls GenerateTreasure with a null corpse",S+'WorldObjects/Creature_Death.cs',434,"var loot = GenerateTreasure(killer, null);"),
("corpse owner is the killer",S+'WorldObjects/Creature_Death.cs',507,"corpse.KillerId = killer.Guid.Full;"),
("corpse owner is the pet owner when the killer is a pet",S+'WorldObjects/Creature_Death.cs',513,"corpse.KillerId = petOwner.Guid.Full;"),
("empty monster corpse decays in EmptyDecayTime",S+'WorldObjects/WorldObject_Decay.cs',77,"TimeToRot = Corpse.EmptyDecayTime;"),
("quality mod is a TODO, not implemented in RollWcid",S+'Factories/LootGenerationFactory.cs',130,"// TODO: quality mod"),
]
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    for claim,f_,ln,q in rows:
        w.writerow(['ACEmulator-ACE',claim,f_,str(ln),q])
print('ok')
