import csv,sys
S='/mnt/frankendom-donors/ACEmulator-ACE/Source/'
LGF=S+'ACE.Server/Factories/LootGenerationFactory.cs'
CO=S+'ACE.Server/WorldObjects/Corpse.cs'
rows=[
("aetheria rate divides the 0.02 window (server property)",LGF,406,"var dropRateMod = 1.0f / aetheria_drop_rate;"),
("aetheria roll range scaled by dropRateMod",LGF,412,"var rng = ThreadSafeRandom.Next(0.0f, 1.0f * dropRateMod);"),
("empty corpse decay constant 15 s",CO,27,"public const double EmptyDecayTime = 15.0;"),
("empty corpse TimeToRot set to EmptyDecayTime (player corpse path)",CO,107,"TimeToRot = EmptyDecayTime;"),
]
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    for claim,f_,ln,q in rows:
        w.writerow(['ACEmulator-ACE',claim,f_,str(ln),q])
print('ok')
