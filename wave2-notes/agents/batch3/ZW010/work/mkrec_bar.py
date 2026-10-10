import subprocess, sys
NOTE="beyond-all-reason-Beyond-All-Reason"
D="/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/"
SU=D+"luarules/gadgets/include/startbox_utilities.lua"
LP=D+"common/lib_polygon.lua"
GSC=D+"luarules/gadgets/game_startbox_config.lua"
SC=D+"luarules/gadgets/scav_spawner_defense.lua"
CO=D+"luarules/gadgets/game_coop_II.lua"
LIC=D+"LICENSE.md"
R=[
(SU,63,"override used only if it has at least one box per team","if override and override.startboxes and #override.startboxes >= numTeams then"),
(SU,113,"resolution step 1: per-match override","local match = matchOverride(override, numTeams)"),
(SU,118,"resolution step 2: exact team count","match = matchSetExact(set, numTeams)"),
(SU,123,"resolution step 3: nearest larger team count","match = matchSetLarger(set, numTeams)"),
(SU,128,"resolution step 4: nearest smaller team count","match = matchSetSmaller(set, numTeams)"),
(SU,133,"no arrangement: defer to engine start rectangle","No modoption arrangement applies; defer to the engine startrect."),
(SU,169,"zone data authored on a 200-unit grid scaled to the map","local scaleX, scaleZ = mapSizeX / 200, mapSizeZ / 200"),
(SU,172,"ally team id is the array index minus one","local allyTeamID = i - 1"),
(SU,192,"name taken from the centroid as a fraction of the map","GetStartboxName(centerX / mapSizeX, centerZ / mapSizeZ)"),
(SU,17,"naming threshold 0.33 (west/north side)","if midX < 0.33 then"),
(SU,196,"one start point per box, at the centroid","startpoints = { { centerX, centerZ } },"),
(SU,218,"unboxed allyteams get a whole-map entry","nameLong = \"Anywhere\""),
(SU,228,"fill step gives unboxed allyteams the whole-map entry","config[allyTeamID] = buildWholeMapEntry()"),
(SU,243,"fallback (portrait map): north band top at 0.2 of map depth","{ 0, mapSizeZ * 0.2 },"),
(SU,274,"fallback (landscape map): west band at 0.2 of map width","{ mapSizeX * 0.2, mapSizeZ },"),
(SU,302,"override read from a modoption payload","ModoptionPayload.Decode(modoptions.mapmetadata_startbox_override)"),
(SU,312,"fallback used only when no arrangement applies","startBoxConfig = buildFallback()"),
(SU,321,"polygon edges densified by spline tessellation (TessellateRing not read)","local tessellated = SplineLib.TessellateRing(poly)"),
(SU,328,"z clamp to the map edge minus one","local maxZ = Game.mapSizeZ - 1"),
(SU,237,"fallback shape chosen by map aspect: portrait maps get north and south bands","if mapSizeZ > mapSizeX then"),
(SU,367,"config parsed once inside pcall; a failure leaves engine rectangles","local ok, config, source, explicit = pcall(ParseBoxes)"),
(SU,342,"returns config, source and an explicit flag","return startBoxConfig, configSource, isExplicitSource(configSource)"),
(SU,371,"parse failure is logged, engine rectangles used","Could not parse start boxes"),
(SU,414,"no polygon: engine axis-aligned rectangle test","return x >= xmin and x <= xmax and z >= zmin and z <= zmax"),
(SU,423,"whole-map entry does not count as a start box","return not entry.wholeMap"),
(SU,448,"default candidate draws per call = 100","local DEFAULT_TRIES = 100"),
(SU,457,"GetRandomPos takes an inset and a try count","local function GetRandomPos(allyTeamID, inset, tries)"),
(SU,464,"sampling box shrunk by inset and clipped to the map","xmin, zmin = math.max(xmin + inset, 0), math.max(zmin + inset, 0)"),
(SU,471,"one candidate per draw, uniform in the bounding box","local x = math.random(xmin, xmax)"),
(SU,478,"inset test: point must be inside at the -x offset","IsInside(allyTeamID, x - inset, z)"),
(SU,494,"ClosestPos pulls an outside point to the nearest edge","local function ClosestPos(allyTeamID, x, z)"),
(LP,12,"ray-casting point in polygon","function PolygonLib.PointInPolygon(x, y, vertices)"),
(LP,24,"edge straddles the test row","if (yi > y) ~= (yj > y) then"),
(LP,26,"parity flips when the point is left of the crossing","if x < intersectX then"),
(LP,49,"a start box is any of its sub-polygons","if PolygonLib.PointInPolygon(x, y, entry.boxes[i]) then"),
(GSC,9,"licence string of the config gadget","license = \"GNU GPL, v2 or later\""),
(GSC,21,"choose-in-game mode constant","local SPAWN_CHOOSE_IN_GAME = 2"),
(GSC,35,"only choose-in-game mode uses polygon boxes","if Game.startPosType ~= SPAWN_CHOOSE_IN_GAME then"),
(GSC,38,"other modes widen each box to the whole map","Spring.SetAllyTeamStartBox(allyTeamID, 0, 0, Game.mapSizeX, Game.mapSizeZ)"),
(GSC,50,"choose-in-game engine box expanded to polygon bounds","Spring.SetAllyTeamStartBox(allyTeamID, xmin, zmin, xmax, zmax)"),
(SC,1137,"scav spawn: 100 outer attempts","for _ = 1, 100 do"),
(SC,1138,"scav spawn draws in the box with the spread inset, one try","spawnPosX, spawnPosZ = StartboxLib.GetRandomPos(scavAllyTeamID, spread, 1)"),
(SC,1139,"a nil draw is tested and the loop is left by a break","if not spawnPosX then"),
(SC,1470,"scav boss spawn: zero inset, one try per call","x, z = StartboxLib.GetRandomPos(scavAllyTeamID, 0, 1)"),
(CO,86,"coop start positions pulled into the box by ClosestPos","x, z = StartboxLib.ClosestPos(allyID, x, z)"),
(LIC,2,"repo licence: GPL v2","released under the GPL v2 licence"),
]
import collections
by=collections.OrderedDict()
for f,n,c,q in R: by.setdefault(f,[]).append((n,c,q))
rows=[]
for f,items in by.items():
    lines=sorted({n for n,_,_ in items})
    cmd="awk 'BEGIN{split(\"%s\",a,\",\");for(i in a)w[a[i]]=1} (NR in w){print NR\"\\t\"$0}' '%s'"%(",".join(map(str,lines)),f)
    out=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    got={}
    for l in out.split('\n'):
        if '\t' in l:
            a,b=l.split('\t',1); got[int(a)]=b.rstrip('\r')
    for n,c,q in items:
        ok = n in got and q in got[n] and 15<=len(q)<=90
        if not ok: print("BAD",f,n,repr(q), repr(got.get(n,''))[:120], len(q)); continue
        rows.append((NOTE,c,f,str(n),q))
with open(sys.argv[1],'w') as fh:
    fh.write("note\tclaim\tdonor_file\tline\tquote\n")
    for r in rows: fh.write("\t".join(r)+"\n")
print("written",len(rows),"of",len(R))
