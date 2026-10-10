import csv,sys
rows=[
("evennia-evennia","corpse steal amount is a 1d10 roll","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py","111","max_steal = rules.dice.roll(\"1d10\")"),
("evennia-evennia","steal is capped at the coins the corpse holds","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py","99","amount = min(amount, self.coins)"),
("evennia-evennia","corpse loses the stolen coins","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py","100","self.coins -= amount"),
("evennia-evennia","looter receives the stolen coins","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py","114","looter.coins += stolen"),
("evennia-evennia","NPC carries 1 coin by default (coin loot)","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/npcs.py","57","coins = AttributeProperty(default=1, autocreate=False)"),
("evennia-evennia","living base defeat calls at_death","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py","85","self.at_death()"),
("evennia-evennia","turn handler defeats any combatant at hp <= 0","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/combat_turnbased.py","325","if combatant.hp <= 0:"),
("evennia-evennia","defeat hook is called from the turn handler","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/combat_turnbased.py","328","combatant.at_defeat()"),
("evennia-evennia","dice roll is a plain sum of randint dice","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/rules.py","67","return sum(randint(1, diesize) for _ in range(number))"),
("evennia-evennia","at_do_loot hands the loot to at_looted (no caller in donor)","/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py","143","defeated_enemy.at_looted(self)"),
]
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n') if False else None
    for r in rows:
        assert '\t' not in ''.join(r)
        f.write('\t'.join(r)+'\n')
print('ok',len(rows))
