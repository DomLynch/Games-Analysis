import sys
N="CleverRaven-Cataclysm-DDA"
IG="/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/item_group.cpp"
MO="/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/monster.cpp"
RN="/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/rng.cpp"
RH="/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/rng.h"
OP="/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/options.cpp"
LI="/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/LICENSE.txt"
R=[
("collection: each entry rolled independently, skipped when roll >= p",IG,898,"if( type == G_COLLECTION ) {"),
("collection roll: rng(0,99) against entry percent (maximized bypass)",IG,900,"if( !( flags & spawn_flags::maximized ) && rng( 0, 99 ) >= elem->get_probability("),
("distribution branch",IG,905,"} else if( type == G_DISTRIBUTION ) {"),
("single-result collection path returns first passing entry",IG,921,"if( rng( 0, 99 ) >= elem->get_probability( false ) ) {"),
("collection probabilities capped at 100 on add",IG,880,"ptr->set_probability( std::min( 100, ptr->get_probability( true ) ) );"),
("sum of weights for distribution",IG,882,"sum_prob += ptr->get_probability( true );"),
("zero-probability entries are dropped",IG,876,"if( ptr->get_probability( true ) <= 0 ) {"),
("cumulative weight table",IG,945,"acc += elem->get_probability( true );"),
("distribution pick: inclusive 1..sum",IG,949,"const int picked = rng( 1, sum_prob );"),
("event-based slot yields nothing when inactive",IG,957,"if( elem->is_event_based() && elem->get_probability( false ) == 0 ) {"),
("count range rolled per entry",IG,291,"cnt = ( modifier_count.first == modifier_count.second ) ? modifier_count.first : rng("),
("recursion guard on group entries",IG,308,"if( std::find( rec.begin(), rec.end(), group_id ) != rec.end() ) {"),
("nested group created with the same flags",IG,318,"std::size_t tmp_list_size = isd->create( list, birthday, rec, flags );"),
("global spawn rate read",IG,295,"float spawn_rate = get_option<float>( \"ITEM_SPAWNRATE\" );"),
("spawn rate applied to leaf items only, not mission items",IG,299,"if( flags & spawn_flags::use_spawn_rate && !itm.has_flag( json_flag_MISSION_ITEM ) &&"),
("spawn rate roll is a float test",IG,300,"rng_float( 0, 1 ) > spawn_rate ) {"),
("items_from entry point",IG,1081,"item_group::ItemList item_group::items_from( const item_group_id &group_id,"),
("items_from creates from the group",IG,1090,"group->create( result, birthday, flags );"),
("option default and range",OP,2882,"add( \"ITEM_SPAWNRATE\", \"world_default\", translation(), translation(), 0.01, 10.0,"),
("rng is inclusive integer",RN,20,"int rng( int lo, int hi )"),
("rng uses the uniform int distribution",RN,26,"return rng_int_dist( rng_get_engine(),"),
("rng declared in header",RH,35,"int rng( int lo, int hi );"),
("monster death calls drop_items_on_death",MO,3284,"drop_items_on_death( here, corpse.get_item() );"),
("monster::die is the death handler",MO,3111,"void monster::die( map *here, Creature *nkiller )"),
("death drop roll: items_from death_drops",MO,3418,"std::vector<item> new_items = item_group::items_from( type->death_drops,"),
("death drop roll uses the spawn-rate flag",MO,3420,"spawn_flags::use_spawn_rate );"),
("drop_items_on_death definition",MO,3409,"void monster::drop_items_on_death( map *here, item *corpse ) const"),
("generate_inventory is also called from poly",MO,374,"generate_inventory();"),
("licence: CC BY-SA 3.0 for the project",LI,1,"Creative Commons Attribution-ShareAlike 3.0 Unported"),
]
out=open(sys.argv[1],"w")
out.write("note\tclaim\tdonor_file\tline\tquote\n")
for c,f,l,q in R:
    assert "\t" not in q
    out.write("\t".join([N,c,f,str(l),q])+"\n")
out.close(); print("rows",len(R))
