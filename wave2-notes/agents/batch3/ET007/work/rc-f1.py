import csv,sys
G="alexbatalov-fallout1-ce"
I="/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc"
R="/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/reaction.cc"
IT="/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc"
S="/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/skill.cc"
GD="/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/gdialog.cc"
L="/mnt/frankendom-donors/alexbatalov-fallout1-ce/LICENSE.md"
rows=[
("price starts at 100 and adds barter skills and script modifier",I,4248,"mod += buyer_mod - seller_mod + barter_mod;"),
("price modifier clamped to 10..300",I,4250,"mod = std::clamp(mod, 10, 300);"),
("master trader bonus only when the buyer is the player",I,4240,"if (buyer == obj_dude) {"),
("master trader perk test",I,4241,"if (perk_level(PERK_MASTER_TRADER)) {"),
("currency excluded from modifier; formula",I,4256,"return 100 * (cost - caps) / mod + caps;"),
("cost is total of the NPC side table",I,4252,"int cost = item_total_cost(btable);"),
("caps summed separately from the NPC table",I,4253,"int caps = item_caps_total(btable);"),
("accept check: price above player offer refuses",I,4270,"if (barter_compute_value(a1, a3) > item_total_cost(a2)) {"),
("empty player offer refuses",I,4262,"if (a2->data.inventory.length == 0) {"),
("queued item refuses",I,4266,"if (item_queued(a2)) {"),
("NPC goods move to the player on accept",I,4274,"item_move_all(a4, a1);"),
("player offer moves to the NPC on accept",I,4275,"item_move_all(a2, a3);"),
("reaction BAD gives -25",I,4623,"modifier = -25;"),
("reaction NEUTRAL case",I,4625,"case NPC_REACTION_NEUTRAL:"),
("reaction GOOD case (value +50 on next line, not quotable)",I,4628,"case NPC_REACTION_GOOD:"),
("script base modifier stored at barter open",I,4565,"barter_mod = a5;"),
("per-loop modifier = script base + reaction",I,4652,"barter_mod = a5 + modifier;"),
("exit branch also tests modifier <= -30 (dead for -25/0/50)",I,4654,"keyCode == KEY_LOWERCASE_T || modifier <= -30"),
("M key runs the accept check",I,4662,"if (barter_attempt_transaction(inven_dude, a3, a2, a4) == 0) {"),
("price shown on screen uses the same function",I,4545,"int cost = barter_compute_value(obj_dude, target_stack[0]);"),
("barter opened with the NPC table and player table from dialogue",GD,1305,"barter_inventory(dialogueWindow, dialog_target, peon_table_obj, barterer_table_obj"),
("reaction level: above 75 is GOOD",R,49,"if (reaction > 75) {"),
("reaction level: above 25 is NEUTRAL",R,51,"} else if (reaction > 25) {"),
("reaction_get entry point",R,71,"int reaction_get(Object* critter)"),
("reaction cached per NPC script (flag set)",R,92,"compat_scr_set_local_var(sid, 2, 1);"),
("reaction starts at 50",R,90,"compat_scr_set_local_var(sid, 0, 50);"),
("reaction adds 5 per Charisma point minus 25",R,98,"v2 + 5 * stat_level(obj_dude, STAT_CHARISMA) - 25"),
("reaction adds 10 per Presence level",R,104,"v2 + 10 * perk_level(PERK_PRESENCE)"),
("childkiller branch subtracts 30",R,137,"compat_scr_set_local_var(sid, 0, v2 - 30);"),
("item_cost reads proto cost",IT,663,"int cost = proto->item.cost;"),
("item_total_cost multiplies by quantity",IT,729,"cost += item_cost(inventoryItem->item) * inventoryItem->quantity;"),
("item_total_cost entry",IT,701,"int item_total_cost(Object* obj)"),
("skill_level entry point",S,205,"int skill_level(Object* critter, int skill)"),
("licence name",L,1,"# Sustainable Use License"),
("licence limitation: internal business or non-commercial only",L,15,"You may use or modify the software only for your own internal business purposes"),
]
with open(sys.argv[1],"a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    for claim,fn,ln,q in rows:
        w.writerow([G,claim,fn,str(ln),q])
print(len(rows),"rows")
