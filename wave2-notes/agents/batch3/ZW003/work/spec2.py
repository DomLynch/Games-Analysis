import csv
C='/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c'
H='/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.h'
L='/mnt/frankendom-donors/DCurrent-openbor/LICENSE'
N='DCurrent-openbor'
rows=[
 ('licence: BSD 3-clause redistribution','root LICENSE: binary and source redistribution permitted with conditions',L,'Redistribution and use in source and binary forms','only'),
 ('licence: no endorsement clause','root LICENSE: no endorsement without permission',L,'Neither the name of the Senile Team','only'),
 ('update_scroller entry point','director and scroll run in one function each frame',C,'void update_scroller()','only'),
 ('scroll skipped when time has not advanced or frozen','return when _time behind level advancetime or freezeall',C,'if(_time < level->advancetime || freezeall)','only'),
 ('clock stamp each run','level advancetime set to current time',C,'level->advancetime = _time;','only'),
 ('completion: all entries used, no enemies, a player alive','completion check uses current_spawn, enemies, p_alive',C,'if(current_spawn >= level->numspawns && !findent(TYPE_ENEMY) && p_alive)','only'),
 ('completion sets level_completed','level_completed set when no endlevel entity',C,'level_completed = 1; // can be used for bonus levels','only'),
 ('refill starts only below groupmin','spawn section runs only when enemy count below groupmin',C,'else if(count_ents(TYPE_ENEMY) < groupmin)','only'),
 ('refill loop stops at groupmax and at scroll position','while loop condition: count below groupmax, entries left, pos reached at',C,'while(count_ents(TYPE_ENEMY) < groupmax &&','only'),
 ('entry released when scroll clock reaches at','pos compared to entry at',C,'level->pos >= level->spawnpoints[current_spawn].at','only'),
 ('wait entry sets waiting flag','wait entry branch sets level waiting',C,'else if(level->spawnpoints[current_spawn].wait)','only'),
 ('wait flag set inside branch','waiting set to 1',C,'level->waiting = 1;','only'),
 ('group entry replaces groupmin and groupmax','group entry copies min and max into globals',C,'groupmax = level->spawnpoints[current_spawn].groupmax;','only'),
 ('entries consumed in list order','index advances after each entry',C,'++current_spawn;','first'),
 ('smartspawn called for an ordinary entry','ordinary entry calls smartspawn',C,'smartspawn(&level->spawnpoints[current_spawn]);','only'),
 ('waiting cleared when no enemy remains','waiting block: no enemy then clear flag',C,'if(!findent(TYPE_ENEMY))','only'),
 ('clear sets a 3 unit delay','go_time set to time plus 3 game speed units',C,'go_time = _time + 3 * global_config.game_speed;','only'),
 ('waiting freezes the horizontal scroll','scroll only when not waiting, or cheat',C,'if(!level->waiting || global_config.cheats & CHEAT_OPTIONS_IMPLACABLE_ACTIVE)','only'),
 ('horizontal target is the player midpoint','to from player box midpoint minus half screen plus offset',C,'to = (lm + rm) / 2 - videomodes.hRes / 2 + level->cameraxoffset;','first'),
 ('spread wider than screen holds the camera','if player spread exceeds screen width, hold',C,'if(rm - lm > videomodes.hRes)','first'),
 ('target clamped to scroll bounds','clamp to scrollmaxx',C,'else if(to > scrollmaxx)','first'),
 ('rate limit on the way forward','limit to scrollspeed per update',C,'if(to > advancex + level->scrollspeed)','first'),
 ('right end: clock keeps running','pinned at end: pos increments by one',C,'                level->pos++;','first'),
 ('right scroll: clock follows camera','pos set from advancex when not pinned',C,'level->pos = (int)advancex;','only'),
 ('right end clamp to width','advancex capped at width minus screen',C,'advancex = (float)level->width - videomodes.hRes;','first'),
 ('spawn runs only when player count fits','player count gate on spawnplayer_count',C,'if(props->spawnplayer_count >= (playercount = MAX(1, count_ents(TYPE_PLAYER))))','only'),
 ('spawn position relative to scroll','spawn x is entry x plus advancex',C,'e = spawn(props->position.x + advancex, props->position.z, props->position.y,','only'),
 ('health per player count','health indexed by player count minus one',C,'if(props->health[playercount - 1] != 0)','only'),
 ('per player count health assignment','health taken from per player entry',C,'e->energy_state.health_current = e->modeldata.health = props->health[playercount - 1];','only'),
 ('smartspawn entry point','smartspawn takes a spawn entry',C,'entity *smartspawn(s_spawn_entry *props)','only'),
 ('2P variant sets count 1','2PSPAWN sets spawnplayer_count to 1',C,'next.spawnplayer_count = 1;','only'),
 ('3P variant sets count 2','3PSPAWN sets spawnplayer_count to 2',C,'next.spawnplayer_count = 2;','only'),
 ('default groupmin is 100','globals reset: groupmin 100',C,'    groupmin = 100;','only'),
 ('default groupmax is 100','globals reset: groupmax 100',C,'    groupmax = 100;','only'),
 ('group command clamps max to at least 1','group command: max below 1 becomes 1',C,'next.groupmax = 1;','only'),
 ('group command min 0 becomes 100','group command: min below 1 becomes 100',C,'next.groupmin = 100;','only'),
 ('group command reads min and max','group command reads two integers',C,'next.groupmin = GET_INT_ARG(1);','only'),
 ('entry records at','entry at is the parsed argument',C,'next.at = GET_INT_ARG(1);','only'),
 ('entry appended in file order','entry appended to list, no sort',C,'memcpy(&level->spawnpoints[level->numspawns], &next, sizeof(next));','only'),
 ('entry count increments','numspawns incremented',C,'level->numspawns++;','only'),
 ('model loaded at parse time','spawn entry loads model while the level file is parsed',C,'tempmodel = load_cached_model(GET_ARG(1), filename, 0);','first'),
 ('count_ents counts non-corpse entities','count excludes corpses only',C,'count += (ent_list[i]->exists && (ent_list[i]->modeldata.type & types)','only'),
 ('findent ignores only dead corpses','findent skips entities that are both dead and corpse',C,'!((ent_list[i]->death_state & (DEATH_STATE_DEAD | DEATH_STATE_CORPSE))','only'),
 ('scroll bounds flag bit','scroll min carries flag in top bit',C,'else if(level->spawnpoints[current_spawn].scrollminx & 0x80000000)','only'),
 ('spawn entry struct: group fields','s_spawn_entry has groupmin and groupmax',H,'    int groupmax;','only'),
 ('spawn entry struct: spawn count by player','spawnplayer_count per player count',H,'int spawnplayer_count; // spawn this entity according to the amount of players','only'),
 ('spawn entry struct: blockade','blockade limits how far back the player can go',H,'int blockade; //limit how far you can go back','only'),
]
with open('spec-ZW003-2.tsv','w',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    w.writerow(['note','claim','donor_file','quote','pick'])
    for r in rows:
        assert '\t' not in r[1] and '"' not in r[3], r
        w.writerow([N,r[1],r[2],r[3],r[4]])
print(len(rows))
