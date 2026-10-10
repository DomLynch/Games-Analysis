import csv,sys
S='/mnt/frankendom-donors/ACEmulator-ACE/Source/'
LGF=S+'ACE.Server/Factories/LootGenerationFactory.cs'
TSR=S+'ACE.Common/ThreadSafeRandom.cs'
CT=S+'ACE.Server/Factories/Entity/ChanceTable.cs'
TPI=S+'ACE.Server/Factories/Tables/TreasureProfile_Item.cs'
TD=S+'ACE.Database/Models/World/TreasureDeath.cs'
CD=S+'ACE.Server/WorldObjects/Creature_Death.cs'
CO=S+'ACE.Server/WorldObjects/Corpse.cs'
WOD=S+'ACE.Server/WorldObjects/WorldObject_Decay.cs'
LB=S+'ACE.Server/Entity/Landblock.cs'
LIC='/mnt/frankendom-donors/ACEmulator-ACE/LICENSE'
N='ACEmulator-ACE'
rows=[
("death loot is generated from the DeathTreasure profile when a creature corpse is built","%s"%CD,133,"CreateCorpse(topDamager);"),
("monster branch sends the corpse to GenerateTreasure","%s"%CD,587,"GenerateTreasure(killer, corpse);"),
("GenerateTreasure only rolls when the creature has a DeathTreasure profile","%s"%CD,651,"if (DeathTreasure != null)"),
("GenerateTreasure calls the loot factory with the profile","%s"%CD,653,"List<WorldObject> items = LootGenerationFactory.CreateRandomLootObjects(DeathTreasure);"),
("DeathTreasure is a cached DB profile looked up by DeathTreasureType","%s"%CD,22,"public TreasureDeath DeathTreasure { get =>"),
("entry point rolls the three categories in turn","%s"%LGF,37,"public static List<WorldObject> CreateRandomLootObjects(TreasureDeath profile)"),
("item category chance is a 1..100 roll compared to ItemChance","%s"%LGF,48,"var itemChance = ThreadSafeRandom.Next(1, 100);"),
("item category gate","%s"%LGF,49,"if (itemChance <= profile.ItemChance)"),
("item count drawn from ItemMinAmount..ItemMaxAmount","%s"%LGF,51,"numItems = ThreadSafeRandom.Next(profile.ItemMinAmount, profile.ItemMaxAmount);"),
("mundane category gate","%s"%LGF,77,"if (itemChance <= profile.MundaneItemChance)"),
("extra addon roll sits inside the mundane branch","%s"%LGF,92,"lootWorldObject = TryRollMundaneAddon(profile);"),
("item type is chosen by a profile table index","%s"%LGF,253,"return TreasureProfile_Item.Roll(treasureDeath.ItemTreasureTypeSelectionChances);"),
("coalesced mana addon uses a 0.02 threshold on a float roll","%s"%LGF,393,"if (rng < 0.02f)"),
("tier split for the mundane addon","%s"%LGF,377,"if (profile.Tier <= 4)"),
("integer roll is inclusive of both bounds","%s"%TSR,30,"return random.Value.Next(min, max + 1);"),
("inclusive integer roll documented","%s"%TSR,24,"Returns a random integer between min and max, inclusive"),
("float roll in [min,max) used by chance tables","%s"%TSR,20,"return random.Value.NextDouble() * (max - min) + min;"),
("weighted table: cumulative chance compared with one roll","%s"%CT,38,"var rng = ThreadSafeRandom.Next(0.0f, 1.0f);"),
("weighted table: first entry whose running total exceeds the roll","%s"%CT,44,"if (rng < total && total >= qualityMod)"),
("weighted table: fallback to the last entry with positive chance","%s"%CT,50,"return this.Last(i => i.chance > 0).result;"),
("item profile index lookup, out of range returns Undef","%s"%TPI,120,"return itemProfiles[itemProfile - 1].Roll();"),
("TreasureDeath ItemChance field (percent)","%s"%TD,27,"public int ItemChance { get; set; }"),
("TreasureDeath ItemMaxAmount field","%s"%TD,31,"public int ItemMaxAmount { get; set; }"),
("corpse looting: killer always has permission","%s"%CO,159,"if (KillerId != null && player.Guid.Full == KillerId || IsLooted)"),
("corpse looting: monster corpse opens to all inside the HalfLife window","%s"%CO,188,"if (TimeToRot != null && TimeToRot < HalfLife"),
("code comment says 1/2 decay time, code uses HalfLife seconds","%s"%CO,187,"all players can loot monster corpses after 1/2 decay time"),
("HalfLife constant is 180 seconds","%s"%CO,206,"public static int HalfLife = 180;"),
("Open() refuses when HasPermission is false","%s"%CO,126,"if (!HasPermission(player))"),
("monster corpse default decay is 5 minutes","%s"%WOD,18,"protected TimeSpan DefaultTimeToRot { get; set; } = TimeSpan.FromMinutes(5);"),
("default TimeToRot copied from DefaultTimeToRot when unset","%s"%WOD,60,"TimeToRot = DefaultTimeToRot.TotalSeconds;"),
("heartbeat gate for decay","%s"%LB,516,"if (lastHeartBeat + heartbeatInterval <= DateTime.UtcNow)"),
("decay called on each decayable world object per heartbeat","%s"%LB,528,"wo.Decay(thisHeartBeat - lastHeartBeat);"),
("licence: GNU Affero General Public License","%s"%LIC,1,"GNU AFFERO GENERAL PUBLIC LICENSE"),
]
out=sys.argv[1]
with open(out,'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    for claim,f_,ln,q in rows:
        w.writerow([N,claim,f_,str(ln),q])
print(len(rows),'rows')
