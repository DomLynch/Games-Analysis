D="/mnt/frankendom-donors/ModernUO"
GR=D+"/Projects/UOContent/Regions/GuardedRegion.cs"
BG=D+"/Projects/UOContent/Mobiles/Guards/BaseGuard.cs"
RG=D+"/Projects/Server/Regions/Region.cs"
MP=D+"/Projects/Server/Maps/Map.cs"
CM=D+"/Projects/UOContent/Items/Maps/CityMap.cs"
RJ=D+"/Distribution/Data/regions.json"
rows=[
("Town is a TownRegion entry in regions.json", RJ, 118, "\"$type\": \"TownRegion\","),
("Britain town zone name", RJ, 120, "\"Name\": \"Britain\","),
("Child zone takes the town as Parent", RJ, 137, "\"Parent\": { \"Name\": \"Britain\", \"Map\": \"Felucca\" },"),
("A town can be entry-flagged GuardsDisabled", RJ, 688, "\"GuardsDisabled\": true,"),
("Buccaneer's Den town name (GuardsDisabled entry)", RJ, 686, "\"Name\": \"Buccaneer's Den\","),
("GuardedRegion entry type in regions.json", RJ, 1187, "\"$type\": \"GuardedRegion\","),
("Default priority constant 50", RG, 126, "public const int DefaultPriority = 50;"),
("Child priority inherits parent", RG, 176, "Priority = Parent.Priority;"),
("Sector ordering: dynamic zones first", RG, 238, "// Dynamic regions go first"),
("Sector ordering: priority then child depth", RG, 252, "return Priority != regPriority ? reg.Priority - Priority : reg.ChildLevel - ChildLevel;"),
("Find(Point3D) reads the point's sector list", RG, 298, "var sector = map.GetSector(p);"),
("Find(Point3D) returns first region whose Contains holds", RG, 305, "if (region.Contains(p))"),
("Find(Point3D) falls back to the map default region", RG, 311, "return map.DefaultRegion;"),
("Region rectangles registered per sector", RG, 372, "sector.OnEnter(this, rect);"),
("Region.Contains loops over its rectangles", RG, 425, "if (rect.Contains(p))"),
("Sector size is 16 tiles", MP, 57, "public const int SectorSize = 16;"),
("Sector shift is 4 (16 tiles)", MP, 58, "public const int SectorShift = 4;"),
("Sector keeps its region list sorted", MP, 1967, "_regions.Sort();"),
("GuardedRegion candidate table", GR, 13, "private readonly Dictionary<Mobile, GuardTimer> m_GuardCandidates = new();"),
("Guard type default: archer guard on Ilshenar and Malas", GR, 41, "if (Map == Map.Ilshenar || Map == Map.Malas)"),
("Warrior guard is the default guard type", GR, 46, "return typeof(WarriorGuard);"),
("Towns forbid housing", GR, 151, "public override bool AllowHousing(Mobile from, Point3D p) => false;"),
("Reds always candidates when AllowReds is false", GR, 335, "private bool IsAlwaysGuardCandidate(Mobile m) => !AllowReds && m.Murderer;"),
("Entering as a murderer makes a candidate", GR, 174, "if (!AllowReds && m.Murderer)"),
("Aggression by a criminal makes the aggressor a candidate", GR, 203, "if (!IsDisabled() && aggressor != aggressed && criminal)"),
("Guard candidate window timer is 15 s", GR, 352, "base(TimeSpan.FromSeconds(15.0))"),
("Window expiry removes the candidate", GR, 361, "if (m_Table.Remove(m_Mobile))"),
("First crime starts a new candidate window", GR, 243, "if (!m_GuardCandidates.TryGetValue(m, out var timer))"),
("Townsperson shout scan radius 8", GR, 261, "foreach (var v in m.GetMobilesInRange(8))"),
("Shout target rule (BaseCreature or human in region)", GR, 264, "!((v as BaseCreature)?.IsHumanInTown() ?? v.Body.IsHuman && v.Region.IsPartOf(this)))"),
("Immediate guard call by nearby townsperson", GR, 282, "BaseGuard.Spawn(fakeCall, m);"),
("Guards shout: speech keyword check", GR, 193, "args.HasKeyword(0x0007)"),
("CallGuards radius 14", GR, 303, "foreach (var m in Map.GetMobilesInRange(p, 14))"),
("CallGuards candidate test (table or in-region red)", GR, 312, "if (m_GuardCandidates.ContainsKey(m) || m.Region.IsPartOf(this) && IsAlwaysGuardCandidate(m))"),
("CallGuards spawns through BaseGuard.Spawn", GR, 326, "BaseGuard.Spawn(this, m);"),
("Candidate test: criminal or always-candidate, not invulnerable", GR, 344, "return (m as BaseCreature)?.IsInvulnerable != true && (IsAlwaysGuardCandidate(m) || m.Criminal);"),
("BaseGuard.Spawn signature (amount default 1, radius via caller region)", BG, 20, "public static void Spawn(Mobile caller, Mobile target, int amount = 1, bool onlyAdditional = false) =>"),
("Existing guards within 15 tiles are counted first", BG, 30, "foreach (var g in target.GetMobilesInRange<BaseGuard>(15))"),
("Idle guard is recruited to the target", BG, 32, "if (g.Focus == null) // idling"),
("Guards already on the target count against the amount", BG, 38, "else if (g.Focus == target && !onlyAdditional)"),
("Remaining guards are made in the caller's region", BG, 46, "region.MakeGuard(target);"),
("CityMap display uses skill to set extent", CM, 20, "var dist = Math.Max(64 + (int)(skillValue * 4), 200);"),
("CityMap size is clamped 200 to 400", CM, 21, "var size = Math.Clamp(32 + (int)(skillValue * 2), 200, 400);"),
]
out=open("/private/tmp/p2/wave2-haiku/batch3/U005/receipts.tsv","a")
for c,fn,ln,q in rows:
    assert "\t" not in q and "\t" not in c
    out.write("\t".join(["ModernUO",c,fn,str(ln),q])+"\n")
out.close()
print("appended",len(rows))
