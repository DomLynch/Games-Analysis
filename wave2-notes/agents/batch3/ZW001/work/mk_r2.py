import csv
G="0ad-0ad"
S="/mnt/frankendom-donors/0ad-0ad/source/simulation2/components/"
TM=S+"CCmpTerritoryManager.cpp"; TI=S+"CCmpTerritoryInfluence.cpp"; IH=S+"ICmpTerritoryManager.h"
PF="/mnt/frankendom-donors/0ad-0ad/source/simulation2/helpers/Pathfinding.h"; GR="/mnt/frankendom-donors/0ad-0ad/source/simulation2/helpers/Grid.h"
B="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/"
TPL=B+"public/simulation/templates/"
R=[
("Floodfill signature",TM,343,"void Floodfill(const Tile& origin, const Tile& gridSize, Decider decider)"),
("Floodfill calls decider on origin first",TM,358,"emplaceIfRequested(nullptr, origin);"),
("Floodfill uses 8 neighbours",TM,347,"constexpr std::array<std::array<int, 2>, 8> neighbours"),
("impassable tiles get ImpassableCost",TM,416,"m_CostGrid->set(i, j, m_ImpassableCost);"),
("off-world tiles get cost 255",TM,418,"m_CostGrid->set(i, j, 255); // off the world; use maximum cost"),
("passable tiles get cost 1",TM,421,"m_CostGrid->set(i, j, 1);"),
("ImpassableCost read from XML",TM,144,'GetChild("ImpassableCost").ToInt();'),
("ImpassableCost must fit a byte",TM,145,"ENSURE(0 <= impassableCost && impassableCost <= 255);"),
("CalculateTerritories entry point",TM,428,"void CCmpTerritoryManager::CalculateTerritories()"),
("influence entities collected by interface",TM,454,"GetEntitiesWithInterface(IID_TerritoryInfluence);"),
("owner must be a player 1..31",TM,468,"if (owner <= 0 || owner > TERRITORY_PLAYER_MASK)"),
("weight read per influence",TM,498,"const u32 originWeight = cmpTerritoryInfluence->GetWeight();"),
("radius read per influence",TM,499,"u32 radius = cmpTerritoryInfluence->GetRadius();"),
("relative falloff = weight*8/radius",TM,502,"const u32 relativeFalloff = originWeight *"),
("navcells per tile factor in falloff",TM,503,"(Pathfinding::NAVCELL_SIZE * NAVCELLS_PER_TERRITORY_TILE)"),
("falloff integer division by radius",TM,504,".ToInt_RoundToNegInfinity() / radius;"),
("root influences collected",TM,510,"if (cmpTerritoryInfluence->IsRoot())"),
("per-tile falloff scaled by tile cost",TM,519,"const u32 falloffPerTile{relativeFalloff *"),
("falloff uses neighbour cost",TM,520,"m_CostGrid->get(neighbour.x, neighbour.z)};"),
("diagonal falloff x362/256",TM,522,"const u32 falloff{diagonalProgression ? (falloffPerTile * 362) / 256 :"),
("relaxation test against entity grid",TM,528,"entityGrid.get(current->x, current->z) <="),
("relaxation test second half",TM,529,"entityGrid.get(neighbour.x, neighbour.z) + falloff)"),
("tile weight = predecessor minus falloff",TM,535,"const u32 weight{current ? entityGrid.get(current->x, current->z) - falloff :"),
("player total adds this entity",TM,537,"const u32 totalWeight{weight + (current ?"),
("player total stored",TM,541,"playerGrid.set(neighbour.x, neighbour.z, totalWeight);"),
("best total decides owner",TM,544,"if (totalWeight > bestWeightGrid.get(neighbour.x, neighbour.z))"),
("owner written to territory grid",TM,547,"m_Territories->set(neighbour.x, neighbour.z, owner);"),
("connectivity pass floods from each root",TM,569,"Floodfill({i, j}, {tilesW, tilesH}, [&](const Tile*, const Tile& neighbour)"),
("connectivity expands only own tiles",TM,572,"if (m_Territories->get(neighbour.x, neighbour.z) != owner)"),
("connected flag set",TM,574,"m_Territories->set(neighbour.x, neighbour.z, owner | TERRITORY_CONNECTED_MASK);"),
("passable connected tiles counted",TM,575,"if (m_CostGrid->get(neighbour.x, neighbour.z) < m_ImpassableCost)"),
("MakeDirty drops the territory grid",TM,266,"SAFE_DELETE(m_Territories);"),
("influence entity change marks dirty",TM,235,"CmpPtr<ICmpTerritoryInfluence> cmpTerritoryInfluence(GetSimContext(), ent);"),
("TerritoryInfluence value change marks dirty",TM,194,'if (msgData.component == L"TerritoryInfluence")'),
("terrain change drops cost grid",TM,203,"SAFE_DELETE(m_CostGrid);"),
("change message broadcast on update",TM,212,"BroadcastMessage(CMessageTerritoriesChanged());"),
("GetOwner reads owner bits",TM,745,"return m_Territories->get(i, j) & TERRITORY_PLAYER_MASK;"),
("IsConnected reads connected bit",TM,798,"return (m_Territories->get(i, j) & TERRITORY_CONNECTED_MASK) != 0;"),
("neighbour query stops at owner boundary",TM,780,"if (owner == 0 || !filterConnected ||"),
("territory percentage over passable tiles",TM,612,"u8 percentage = (m_TerritoryCellCounts[player] * 100) / m_TerritoryTotalPassableCellCount;"),
("influence weight from XML",TI,59,'m_Weight = (u16)paramNode.GetChild("Weight").ToInt();'),
("influence radius from XML",TI,60,'m_Radius = paramNode.GetChild("Radius").ToInt();'),
("weight can be modified at query time",TI,91,'ApplyModifications(L"TerritoryInfluence/Weight"'),
("NAVCELLS_PER_TERRITORY_TILE is 8",IH,50,"static const int NAVCELLS_PER_TERRITORY_TILE = 8;"),
("connected bit is 0x20",IH,53,"static const int TERRITORY_CONNECTED_MASK = 0x20;"),
("navcell size is one world unit",PF,143,"inline constexpr fixed NAVCELL_SIZE = fixed::FromInt(1);"),
("grid reset zeroes data",GR,164,"// Reset the data to its default-constructed value (usually 0), not changing size."),
("civil centre root influence",TPL+"template_structure_civic_civil_centre.xml",136,"<Root>true</Root>"),
("civil centre radius 140",TPL+"template_structure_civic_civil_centre.xml",137,"<Radius>140</Radius>"),
("civil centre weight 10000",TPL+"template_structure_civic_civil_centre.xml",138,"<Weight>10000</Weight>"),
("storehouse radius 20",TPL+"template_structure_economic_storehouse.xml",72,"<Radius>20</Radius>"),
("storehouse weight 30000",TPL+"template_structure_economic_storehouse.xml",73,"<Weight>30000</Weight>"),
("wall weight 65535",TPL+"template_structure_defensive_wall.xml",36,"<Weight>65535</Weight>"),
("military base radius 50",TPL+"template_structure_military.xml",25,"<Radius>50</Radius>"),
("military base weight 40000",TPL+"template_structure_military.xml",26,"<Weight>40000</Weight>"),
("fortress radius 80",TPL+"template_structure_military_fortress.xml",104,"<Radius>80</Radius>"),
("territory parameter file ImpassableCost 4",B+"mod/simulation/data/territorymanager.xml",3,"<ImpassableCost>4</ImpassableCost>"),
]
lines=open("receipts.tsv").read().split("\n")
lines=[l for l in lines if l and not l.startswith(G+"\t")]
for claim,fn,ln,q in R:
    if not (15<=len(q)<=90): print("LEN",len(q),claim,q)
    assert "\t" not in q and "\t" not in claim
    lines.append("\t".join([G,claim,fn,str(ln),q]))
open("receipts.tsv","w").write("\n".join(lines)+"\n")
print(len(R),"rows")
