import csv,sys
G="alexbatalov-fallout2-ce"
D="/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/"
I=D+"inventory.cc"; R=D+"reaction.cc"; IT=D+"item.cc"; PM=D+"party_member.cc"; C=D+"critter.cc"; L="/mnt/frankendom-donors/alexbatalov-fallout2-ce/LICENSE.md"
rows=[
("price function entry point",I,4673,"static int _barter_compute_value(Object* dude, Object* npc)"),
("companion branch returns carry weight, not value",I,4676,"return objectGetInventoryWeight(_btable);"),
("companion test in compute",I,4675,"if (gGameDialogSpeakerIsPartyMember) {"),
("cost of NPC-side table",I,4679,"int cost = objectGetCost(_btable);"),
("caps of NPC-side table",I,4680,"int caps = itemGetTotalCaps(_btable);"),
("master trader gives 25 points on the multiplier",I,4686,"perkBonus = 25.0;"),
("master trader perk test",I,4685,"if (perkHasRank(gDude, PERK_MASTER_TRADER)) {"),
("best party barter skill",I,4690,"int partyBarter = partyGetBestSkillValue(SKILL_BARTER);"),
("NPC barter skill",I,4691,"int npcBarter = skillGetValue(npc, SKILL_BARTER);"),
("multiplier from script modifier plus 100 minus perk",I,4694,"double barterModMult = (_barter_mod + 100.0 - perkBonus) * 0.01;"),
("skill ratio with offset 160",I,4695,"(160.0 + npcBarter) / (160.0 + partyBarter)"),
("uncapped cost doubled",I,4695,"(costWithoutCaps * 2.0)"),
("multiplier floor when negative",I,4698,"barterModMult = 0.0099999998;"),
("result truncated and caps added at face value",I,4701,"int rounded = (int)(barterModMult * balancedCost + caps);"),
("caps function counts money prototype quantity",IT,3162,"if (item->pid == PROTO_ID_MONEY) {"),
("caps added by quantity",IT,3163,"amount += inventoryItem->quantity;"),
("caps total entry point",IT,3153,"int itemGetTotalCaps(Object* obj)"),
("object cost entry point",IT,864,"int objectGetCost(Object* obj)"),
("party best skill loop threshold",PM,1190,"if (value > bestValue) {"),
("party best skill entry point",PM,1182,"int partyGetBestSkillValue(int skill)"),
("attempt: carry check on incoming goods for every trade",I,4711,"if (objectGetInventoryWeight(barterTable) > weightAvailable) {"),
("attempt: companion offer checked by NPC carry",I,4722,"if (objectGetInventoryWeight(offerTable) > npcWeightAvailable) {"),
("attempt: empty offer refuses (non-companion)",I,4732,"if (offerTable->data.inventory.length == 0) {"),
("attempt: queued offer, Geiger counter exception",I,4736,"if (offerTable->pid != PROTO_ID_GEIGER_COUNTER_I"),
("attempt: price above offer cost refuses",I,4744,"if (_barter_compute_value(dude, npc) > cost) {"),
("attempt: moves goods to the player and offer to the NPC",I,4759,"itemMoveAll(barterTable, dude);"),
("attempt: offer moves to the NPC",I,4760,"itemMoveAll(offerTable, npc);"),
("base modifier stored at open",I,5035,"_barter_mod = barterMod;"),
("mood read from script",I,5091,"int npcReactionValue = reactionGetValue(barterer);"),
("mood BAD case",I,5094,"case NPC_REACTION_BAD:"),
("mood GOOD case (value on next line)",I,5100,"case NPC_REACTION_GOOD:"),
("mood GOOD value -15",I,5101,"modifier = -15;"),
("loop sets script modifier plus mood",I,5124,"_barter_mod = barterMod + modifier;"),
("exit branch dead test (modifier -25/0/25 never <= -30 here: values 25, 0, -15)",I,5126,"keyCode == KEY_LOWERCASE_T || modifier <= -30"),
("on-screen price uses the same function (non-companion)",I,5012,"int cost = _barter_compute_value(gDude, _target_stack[0]);"),
("on-screen weight for companion uses the same function",I,5008,"int weight = _barter_compute_value(gDude, _target_stack[0]);"),
("mood translation: above 10 is GOOD",R,20,"if (a1 > 10) {"),
("mood translation GOOD return",R,21,"return NPC_REACTION_GOOD;"),
("mood translation: above -10 is NEUTRAL",R,22,"} else if (a1 > -10) {"),
("mood translate entry point",R,18,"int reactionTranslateValue(int a1)"),
("mood read: script local 0",R,46,"if (scriptGetLocalVar(critter->sid, 0, programValue) == -1) {"),
("mood get entry point",R,42,"int reactionGetValue(Object* critter)"),
("mood set writes script local 0",R,13,"scriptSetLocalVar(critter->sid, 0, programValue);"),
("one engine call sets mood to -3 (context not read)",C,1299,"reactionSetValue(a1, -3);"),
("licence name",L,1,"# Sustainable Use License"),
("licence limitation text",L,15,"You may use or modify the software only for your own internal business purposes"),
]
with open(sys.argv[1],"a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,fn,ln,q in rows:
        assert '\t' not in q
        w.writerow([G,claim,fn,str(ln),q])
print(len(rows),"rows")
