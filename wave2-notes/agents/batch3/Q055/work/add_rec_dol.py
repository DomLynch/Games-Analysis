import sys
D="/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/"
G=D+"GameServer/gameutils/"
S=G+"LootGeneratorScroll.cs"
rows=[
("Dawn-of-Light-DOLSharp","GPL header allows any later version",S,"7","of the License, or (at your option) any later version."),
("Dawn-of-Light-DOLSharp","scroll generator class",S,"39","class LootGeneratorScroll : LootGeneratorBase"),
("Dawn-of-Light-DOLSharp","both mob and killer must be in the ToA expansion",S,"49","killer.CurrentRegion.Expansion == (int)eClientExpansion.TrialsOfAtlantis"),
("Dawn-of-Light-DOLSharp","outer gate: level 45+ and the scroll drop chance",S,"51","if (mob.Level >= 45 && Util.Chance(ServerProperties.Properties.SCROLL_DROP_RATE))"),
("Dawn-of-Light-DOLSharp","dungeon wider-pool roll uses 1.5 x the drop rate",S,"55","Util.Chance((int)(ServerProperties.Properties.SCROLL_DROP_RATE * 1.5))"),
("Dawn-of-Light-DOLSharp","dungeon pool is every artifact",S,"57","artifacts = ArtifactMgr.GetArtifacts();"),
("Dawn-of-Light-DOLSharp","zone switch keyed on zone description",S,"61","switch (mob.CurrentZone.Description)"),
("Dawn-of-Light-DOLSharp","one zone-name case maps to a pool",S,"70","case \"Stygian Delta\":"),
("Dawn-of-Light-DOLSharp","pool lookup by artifact zone name",S,"80","artifacts = ArtifactMgr.GetArtifacts(\"Volcanus\");"),
("Dawn-of-Light-DOLSharp","pool pick is a uniform index 0..Count-1",S,"87","String artifactID = (artifacts[Util.Random(artifacts.Count - 1)]).ArtifactID;"),
("Dawn-of-Light-DOLSharp","page 3 above level 55",S,"95","pageNumber = 3;"),
("Dawn-of-Light-DOLSharp","page 2 from level 51",S,"97","else if (mob.Level >= 51)"),
("Dawn-of-Light-DOLSharp","placeholder scroll item level 35",S,"108","loot.Level = 35;"),
("Dawn-of-Light-DOLSharp","placeholder scroll is always added once",S,"110","lootList.AddFixed(loot, 1);"),
("Dawn-of-Light-DOLSharp","server property name and default 25",D+"GameServer/serverproperty/ServerProperties.cs","1938","[ServerProperty(\"pve\", \"scroll_drop_rate\""),
("Dawn-of-Light-DOLSharp","the rate is a static server property",D+"GameServer/serverproperty/ServerProperties.cs","1939","public static int SCROLL_DROP_RATE;"),
("Dawn-of-Light-DOLSharp","Util.Random(max) is inclusive 0..max",G+"Util.cs","169","return RandomGen.Next(max + 1);"),
("Dawn-of-Light-DOLSharp","Util.Chance(p) is true when p >= Random(1,100)",G+"Util.cs","202","return chancePercent >= Random(1, 100);"),
("Dawn-of-Light-DOLSharp","LootMgr.GetLoot runs every generator for the mob",G+"LootMgr.cs","440","lootList = generator.GenerateLoot(mob, killer);"),
("Dawn-of-Light-DOLSharp","generators are loaded from a DB row by class name",G+"LootMgr.cs","101","generatorType = asm.GetType(dbGenerator.LootGeneratorClass);"),
("Dawn-of-Light-DOLSharp","fixed drops always drop",G+"LootList.cs","60","m_fixedItemDrops.Add(loot);"),
("Dawn-of-Light-DOLSharp","artifact zone filter is an exact match",D+"GameServer/gameutils/Atlantis/ArtifactMgr.cs","166","if (artifact.Zone == zone)"),
("Dawn-of-Light-DOLSharp","LICENSE is GPL version 2",D+"LICENSE","2","Version 2, June 1991"),
]
with open(sys.argv[1],'a') as f:
    for r in rows:
        assert '\t' not in ''.join(r)
        f.write('\t'.join(r)+'\n')
print('ok',len(rows))
