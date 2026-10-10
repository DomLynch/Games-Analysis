D="/mnt/frankendom-donors/ModernUO/Projects/UOContent"
rows=[
("Zone guard switch property", D+"/Regions/GuardedRegion.cs", 33, "public bool GuardsDisabled { get; set; }"),
("Warrior guard death starts an avenge timer while focus alive", D+"/Mobiles/Guards/WarriorGuard.cs", 145, "if (_focus?.Alive == true)"),
("Warrior guard avenge timer started", D+"/Mobiles/Guards/WarriorGuard.cs", 147, "new GuardAvengeTimer(_focus).Start();"),
("Archer guard avenge timer started", D+"/Mobiles/Guards/ArcherGuard.cs", 131, "new GuardAvengeTimer(_focus).Start();"),
("Avenge timer: 2.5 s delay, 1.0 s interval, 3 ticks", D+"/Mobiles/Guards/BaseGuard.cs", 216, "base(TimeSpan.FromSeconds(2.5), TimeSpan.FromSeconds(1.0), 3)"),
("Each avenge tick calls BaseGuard.Spawn with onlyAdditional true", D+"/Mobiles/Guards/BaseGuard.cs", 219, "BaseGuard.Spawn(_focus, _focus, 1, true);"),
("Spawn loop makes the remaining guards", D+"/Mobiles/Guards/BaseGuard.cs", 44, "while (amount-- > 0)"),
("Second caller of CallGuards: BaseCreature guard call", D+"/Mobiles/BaseCreature.cs", 3113, "guardedRegion.CallGuards(Location);"),
("BaseCreature checks guard candidacy before calling", D+"/Mobiles/BaseCreature.cs", 3110, "guardedRegion.IsGuardCandidate(m)"),
]
out=open("/private/tmp/p2/wave2-haiku/batch3/U005/receipts.tsv","a")
for c,fn,ln,q in rows:
    assert "\t" not in q
    out.write("\t".join(["ModernUO",c,fn,str(ln),q])+"\n")
out.close(); print("appended",len(rows))
