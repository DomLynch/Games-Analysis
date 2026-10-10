import csv,sys
S='/mnt/frankendom-donors/ACEmulator-ACE/Source/'
CD=S+'ACE.Server/WorldObjects/Creature_Death.cs'
CO=S+'ACE.Server/WorldObjects/Corpse.cs'
LGF=S+'ACE.Server/Factories/LootGenerationFactory.cs'
CT=S+'ACE.Server/Factories/Entity/ChanceTable.cs'
rows=[
("GenerateTreasure header",CD,646,"private List<WorldObject> GenerateTreasure(DamageHistoryInfo killer, Corpse corpse)"),
("GenerateTreasure returns the dropped items list",CD,709,"return droppedItems;"),
("rare: killer-level comparison",CD,600,"if (killerPlayer != null && Level > killerPlayer.Level)"),
("owner check: players can loot their own corpse",CO,155,"if (VictimId == null || player.Guid.Full == VictimId)"),
("fellowship loot-sharing check",CO,192,"if (player.Fellowship != null && player.Fellowship.ShareLoot)"),
("magic category roll uses the 1..100 gate",LGF,62,"itemChance = ThreadSafeRandom.Next(1, 100);"),
("magic category gate",LGF,63,"if (itemChance <= profile.MagicItemChance)"),
("aetheria off when the server rate is zero or less",LGF,403,"if (aetheria_drop_rate <= 0.0f)"),
("chance table verification against 1.0",CT,24,"if (Math.Abs(1.0M - total) > threshold)"),
]
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    for claim,f_,ln,q in rows:
        w.writerow(['ACEmulator-ACE',claim,f_,str(ln),q])
print('ok')
