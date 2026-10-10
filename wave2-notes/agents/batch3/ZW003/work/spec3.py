import csv
B='/mnt/frankendom-donors/DFHack-dfhack/plugins/burrow.cpp'
Z='/mnt/frankendom-donors/DFHack-dfhack/plugins/zone.cpp'
T='/mnt/frankendom-donors/DFHack-dfhack/library/include/TileTypes.h'
R='/mnt/frankendom-donors/DFHack-dfhack/LICENSE.rst'
N='DFHack-dfhack'
rows=[
 ('licence: Zlib for the core and plugins','LICENSE.rst states Zlib for DFHack and its plugins unless noted',R,'DFHack is distributed under the Zlib license, with some MIT- and BSD-licensed','only'),
 ('licence: plugins use Zlib unless noted','LICENSE.rst: plugins use Zlib',R,'The core, plugins, scripts, and other DFHack code all use the ZLib license','only'),
 ('dig start records the tile before the dig','jobStartedHandler stores the tile type at dig start',B,'active_dig_jobs[pos] = *tt;','only'),
 ('dig start only for digging jobs','started handler returns unless digging',B,'if (type != job_type_class::Digging)','first'),
 ('dig completion reads the previous tile','completion reads the stored previous tile type',B,'df::tiletype prev_tt = active_dig_jobs[pos];','only'),
 ('expansion runs only when the tile changed','completion compares the new tile with the previous one',B,'if (tt && *tt && *tt != prev_tt)','only'),
 ('completion clears the stored entry','stored entry erased after completion',B,'active_dig_jobs.erase(pos);','only'),
 ('completion is hooked to JOB_COMPLETED','plugin_enable registers the completion listener',B,'EventManager::EventType::JOB_COMPLETED','only'),
 ('expansion only when the new tile is walkable','expand_burrows returns unless new tile walkable or ramp top',B,'if (!isWalkable(tt) && tileShape(tt) != tiletype_shape::RAMP_TOP)','only'),
 ('expansion applies to auto-expand zones only','zone name ending in plus sign and tile assigned',B,"if (!b->name.ends_with('+') || !Burrows::isAssignedTile(b, pos))",'only'),
 ('wall ring added when a wall opened','when the previous tile was not walkable, wall ring is added',B,'if (!isWalkable(prev_tt)) {','only'),
 ('ring is the 3 by 3 block around the tile','add_walls on pos minus one to pos plus one',B,'add_walls_to_burrow(out, b, pos+df::coord(-1,-1,0), pos+df::coord(1,1,0));','only'),
 ('only wall terrain is added to the zone','add_walls_to_burrow adds wall terrain only',B,'if (tt && isWallTerrain(*tt))','only'),
 ('wall terrain predicate','isWallTerrain is the basic shape Wall',T,'== tiletype_shape_basic::Wall;','only'),
 ('walkable predicate from tile shape','isWalkable reads the walkable attribute of the shape',T,'return ENUM_ATTR(tiletype_shape, walkable, tileShape(tiletype));','only'),
 ('flood fill entry point','flood_fill takes the burrow, seed and an enable flag',B,'static void flood_fill(lua_State *L, bool enable) {','only'),
 ('seed outside flag stored','start outside flag from the seed tile',B,'bool start_outside = is_outside(start_pos, start_des);','only'),
 ('seed walk group stored','start walk group from the seed tile',B,'uint16_t start_walk = Maps::getWalkableGroup(start_pos);','only'),
 ('cells must match the seed outside and hidden state','cell skipped if outside or hidden differ from the seed',B,'is_outside(pos, des) != start_outside ||','only'),
 ('a grouped seed never spreads into ungrouped cells','unwalkable-group seed skips cells that have a group',B,'if (!start_walk && walk)','only'),
 ('already-set cells are not revisited','cell skipped when it is already in the requested state',B,'if (pos != start_pos && enable == Burrows::isAssignedTile(burrow, pos))','only'),
 ('fringe: other group cells are taken but not crossed','one tile outside the group, trees do not count',B,'if (start_walk && start_walk != walk && tt && !is_tree_trunk(tt))','only'),
 ('fringe comment','comment: only go one tile outside of a walkability group',B,'// only go one tile outside of a walkability group (trees don\'t count)','only'),
 ('eight neighbours are pushed','flood pushes eight neighbours on the same level',B,'flood.emplace(pos.x-1, pos.y-1, pos.z);','only'),
 ('z neighbours only without zlevel option','vertical neighbours checked when zlevel is off',B,'        if (!zlevel) {','only'),
 ('outside test: outside flag or light tree above','is_outside checks the outside bit',B,'if (des->bits.outside)','only'),
 ('walk group ignores hidden tiles','get_walk_group returns zero for hidden designations',B,'if (!des || des->bits.hidden)','only'),
 ('zone filter registry is a map of predicates','civilian zone filters are a name to predicate map',Z,'static unordered_map<string, function<bool(df::unit*)>> zone_filters;','only'),
 ('zone filter example: caged','a zone filter maps a name to a unit predicate',Z,'= isContainedInItem;','only'),
]
with open('spec-ZW003-3.tsv','w',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    w.writerow(['note','claim','donor_file','quote','pick'])
    for r in rows:
        assert '\t' not in r[1]
        w.writerow([N,r[1],r[2],r[3],r[4]])
print(len(rows))
