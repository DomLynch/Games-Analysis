import csv,sys
G="DCurrent-openbor"
C="/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c"
H="/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.h"
L="/mnt/frankendom-donors/DCurrent-openbor/LICENSE"
rows=[
("selection: scan list, keep only hostile candidates","%s"%C,35541,"if (!faction_check_is_hostile(self, ent_list[i]))"),
("selection: function signature","%s"%C,35497,"entity *normal_find_target(int anim, int detect_adj)"),
("selection: distance window min 0 max 9999 (min used as exclusive bound)","%s"%C,35569,"if(diffd <= min || diffd >= max)"),
("selection: stealth hide must not exceed perception","%s"%C,35575,"if(ent_list[i]->modeldata.stealth.hide > detect)"),
("selection: replace current pick if it cannot be hit now","%s"%C,35582,"!ent_list[index]->animation->vulnerable[ent_list[index]->animpos]"),
("selection: replace if closer and in front of self","%s"%C,35584,"(self->direction == DIRECTION_RIGHT) && diffd < diffo)"),
("chase: stop point on right side of target = target x + range - 1","%s"%C,41564,"acting_entity->destx = target->position.x + range - 1;"),
("chase: stop point on left side of target = target x - range + 1","%s"%C,41568,"acting_entity->destx = target->position.x - range + 1;"),
("chase: range drawn from a random attack (side effect: pick_random_attack(NULL,0))","%s"%C,41540,"randomatk = pick_random_attack(NULL, 0);"),
("chase: range capped at hRes/4","%s"%C,41550,"else if(range > videomodes.hRes / 4)"),
("chase: run when gap > 150","%s"%C,41572,"if(dx > 150 && validanim(acting_entity, ANI_RUN))"),
("chase: z speed is speed.x / 2 (theirs)","%s"%C,41619,"acting_entity->velocity.z = acting_entity->modeldata.speed.x / 2;"),
("target re-acquired each move when no custom target","%s"%C,43086,"target = normal_find_target(-1, 0); // confirm the target again"),
("chase pattern only added automatically for SUBTYPE_CHASE or NPC with parent","%s"%C,43193,"if (target && (acting_entity->modeldata.subtype == SUBTYPE_CHASE ||"),
("chase flags added to pattern","%s"%C,43202,"aimove |= AIMOVE1_CHASEX | AIMOVE1_CHASEZ;"),
("chase x-step call into common_try_chase","%s"%C,43278,"common_try_chase(acting_entity, target, 1, (pz == AIMOVE1_CHASEZ));"),
("stop time after stopping: (game_speed - aggression) / 2 floor game_speed/5","%s"%C,43426,"stall = (global_config.game_speed - acting_entity->modeldata.aggression) / 2;"),
("think beat: nextthink advanced by THINK_SPEED","%s"%C,32575,"self->nextthink = _time + THINK_SPEED;"),
("think order comment: attack decision before move","%s"%C,43873,"// idle, so try to attack or judge next move"),
("attack decision skipped on 1 beat in 4 (_time/THINK_SPEED % 4)","%s"%C,40766,"if(_time / THINK_SPEED % 4 == 0)"),
("constant: GAME_SPEED_DEFAULT is 200","%s"%H,80,"#define     GAME_SPEED_DEFAULT              200"),
("attack chance function signature","%s"%C,39618,"int check_attack_chance(entity *target, float min, float max)"),
("attack chance: distance term (dead for normal attacks, see clamp)","%s"%C,39628,"chance1 = MIN(1.0f, (diff(self->position.x, self->destx)"),
("attack chance: crowd term = (count_ents-1) x group factor","%s"%C,39629,"chance2 = MIN(1.0f, (count_ents(self->modeldata.type) - 1)"),
("attack chance clamp to max","%s"%C,39633,"if(chance > max)"),
("attack chance clamp to min","%s"%C,39637,"else if(chance < min)"),
("attack chance: throttle multiplier","%s"%C,39642,"chance *= (1.0 - self->modeldata.attackthrottle);"),
("attack chance: off-screen multiplier","%s"%C,39644,"if(self->position.x < screenx - 10 ||"),
("attack chance: final roll","%s"%C,39650,"return (randf(1) <= chance);"),
("normal attack passes min == max, so clamp forces the chance","%s"%C,39702,"if(!check_attack_chance(target, 1.0f - min_noatk_chance, 1.0f - min_noatk_chance))"),
("jump attack passes a real window 0.05 to 0.4","%s"%C,39758,"if(!check_attack_chance(target, 0.05f, 0.4f))"),
("normal attack refusal sets cooldown randf(attackthrottletime)","%s"%C,39704,"self->nextattack = _time + randf(self->modeldata.attackthrottletime);"),
("normal attack wait before strike","%s"%C,39709,"self->stalltime = _time + (int)randf((float)MAX(1, global_config.game_speed * 3 / 4"),
("recheck_nextattack definition","%s"%C,39655,"u32 recheck_nextattack(entity *target)"),
("target blocking clears cooldown","%s"%C,39659,"self->nextattack = 0;"),
("target attacking cuts cooldown by 4 when above 4","%s"%C,39661,"else if(target->attacking != ATTACKING_NONE && self->nextattack > 4)"),
("target jumping cuts cooldown by 16 when above 16","%s"%C,39665,"else if(target->jumping && self->nextattack > 16)"),
("normal attack: recheck called once here","%s"%C,39682,"recheck_nextattack(target);"),
("normal attack: recheck called again in the gate (called twice in total)","%s"%C,39684,"if(recheck_nextattack(target) > _time)"),
("normal attack target re-selection","%s"%C,39675,"target = normal_find_target(-1, 0);"),
("normal attack: pick a valid attack for this target","%s"%C,39694,"if(pick_random_attack(target, 1) >= 0)"),
("pick_random_attack signature","%s"%C,39546,"int pick_random_attack(entity *target, int testonly)"),
("normal attack chain order (duck, grab, upper, block, run, normal, jump)","%s"%C,39978,"common_try_normalattack(NULL) ||"),
("victim hit: next hit gate","%s"%C,31773,"target->next_hit_time = _time + (attack->next_hit_time ? attack->next_hit_time"),
("victim hit: cooldown reset so victim can fight back","%s"%C,31774,"target->nextattack = 0; // reset this, make it easier to fight back"),
("post-attack step back when within 80 and (rand32 & 3)","%s"%C,40673,"diff(self->position.x, target->position.x) < 80 && (rand32() & 3))"),
("post-attack step back destination uses 40 step, 80 cap","%s"%C,40676,"self->destx = self->position.x > target->position.x ? MIN(self->position.x + 40"),
("common_runoff takeaction is commented out","%s"%C,40675,"self->takeaction = NULL;//common_runoff;"),
("opponent pairing when contact resolves","%s"%C,30323,"realself->opponent = ent->opponent = realother;"),
("licence: 3-clause BSD wording","%s"%L,5,"Redistribution and use in source and binary forms"),
("licence: no-endorsement clause","%s"%L,11,"Neither the name of the Senile Team, OpenBOR Team nor the"),
]
w=csv.writer(open(sys.argv[1],'w',newline=''),delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
w.writerow(['note','claim','donor_file','line','quote'])
for claim,f,ln,q in rows:
    assert '\t' not in q
    w.writerow([G,claim,f,str(ln),q])
print(len(rows),'rows')
