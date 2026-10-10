N="evennia-evennia"
E="/mnt/frankendom-donors/evennia-evennia/evennia/"
EV=E+"contrib/tutorials/evadventure/"
rows=[
("licence: BSD 3-Clause title","/mnt/frankendom-donors/evennia-evennia/LICENSE.txt",1,"BSD 3-Clause License"),
("claim: AI handler is a state machine dispatching ai_<state>",EV+"ai.py",111,'getattr(self.obj, f"ai_{state}")()'),
("claim: run() logs and swallows exceptions",EV+"ai.py",112,"except Exception:"),
("claim: targets are player characters in the same room",EV+"ai.py",68,'return [obj for obj in self.obj.location.contents if hasattr(obj, "is_pc")'),
("claim: probabilities normalised and sorted high to low",EV+"ai.py",96,"((key, prob / prob_total) for key, prob in probabilities.items()),"),
("claim: roll is a cumulative walk over sorted probabilities",EV+"ai.py",105,"if rand <= total:"),
("claim: roll uses random.random",EV+"ai.py",101,"rand = random.random()"),
("claim: exits exclude a given destination and need traverse access",EV+"ai.py",81,'exi.destination != exclude_destination and exi.access(self, "traverse")'),
("claim: combat probability table has 'attack' key",EV+"npcs.py",261,'"attack": 0.85,'),
("claim: combat probability table defined on the mob",EV+"npcs.py",259,"combat_probabilities = {"),
("claim: in-combat branch reads self.nbd (typo for ndb)",EV+"npcs.py",283,"if combathandler := self.nbd.combathandler:"),
("claim: action drawn from the weighted table",EV+"npcs.py",286,"action = self.ai.random_probability(self.combat_probabilities)"),
("claim: the attack body queues key 'attack' with a random enemy",EV+"npcs.py",292,'combathandler.queue_action({"key": "attack", "target": random.choice(enemies)})'),
("claim: no-targets branch returns to roam",EV+"npcs.py",315,'self.ai.set_state("roam")'),
("claim: not in combat: attack a random player in the room",EV+"npcs.py",317,"target = random.choice(targets)"),
("claim: roam switches to combat when a player is present",EV+"npcs.py",326,'self.ai.set_state("combat")'),
("claim: roam picks a random target at the switch",EV+"npcs.py",327,'self.execute_cmd(f"attack {random.choice(targets).key}")'),
("claim: flee remembers the room it came from",EV+"npcs.py",341,'past_room = self.attributes.get("past_room", category="ai_state", default=None)'),
("claim: flee excludes the past room",EV+"npcs.py",342,"exits = self.ai.get_traversable_exits(exclude_destination=past_room)"),
("claim: flee picks a random exit",EV+"npcs.py",345,"exi = random.choice(exits)"),
("claim: dead end returns to roam",EV+"npcs.py",349,'self.ai.set_state("roam")'),
("claim: flee state entered from the combat roll",EV+"npcs.py",312,'self.ai.set_state("flee")'),
("claim: combat handler stored on obj.ndb in the combat base",EV+"combat_base.py",283,"combathandler = obj.ndb.combathandler"),
("claim: combat handler set on obj.ndb",EV+"combat_base.py",297,"obj.ndb.combathandler = combathandler"),
("claim: ndb is the non-persistent handler (evennia)",E+"objects/objects.py",251,"ndb - non-persistent attribute handler: same as db but does not create"),
("claim: test expects the 'combat' key",EV+"tests/test_ai.py",37,'self.assertEqual(self.npc.ai.random_probability(probs), "combat")'),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q014/receipts-evennia-tmp.tsv","w") as f:
    f.write("\t".join(["note","claim","donor_file","line","quote"])+"\n")
    for claim,fn,ln,q in rows:
        f.write("\t".join([N,claim,fn,str(ln),q])+"\n")
