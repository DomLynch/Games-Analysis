N="evennia-evennia"
E="/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/"
rows=[
("claim: docstring says sold items are destroyed", E+"shops.py", 13, "we will instead _destroy_ sold items, so as to remove them"),
("claim: docstring promises services (not implemented in shops.py)", E+"shops.py", 18, "The most notable services are healing and converting coin to XP."),
("claim: sell value is percent of value", E+"shops.py", 12, "Sell items to the shop for a certain percent of their value."),
("claim: upsell factor applied to object wares (float kept)", E+"shops.py", 100, "value = obj.value * shopkeeper.upsell_factor"),
("claim: upsell factor applied to prototype wares (int)", E+"shops.py", 174, "_get_attr_value(\"value\", prototype, optional=False) * shopkeeper.upsell_factor"),
("claim: create_from_obj takes shopkeeper", E+"shops.py", 81, "def create_from_obj(obj, shopkeeper):"),
("claim: create_from_prototype takes self and shopkeeper (staticmethod)", E+"shops.py", 126, "def create_from_prototype(self, prototype_or_key, shopkeeper):"),
("bug: buy list calls create_from_obj with one argument", E+"shops.py", 244, "obj_wares = [BuyItem.create_from_obj(obj) for obj in list(shopkeep.contents)]"),
("bug: buy list calls create_from_prototype with one argument", E+"shops.py", 246, "BuyItem.create_from_prototype(prototype)"),
("note: buy map cache must be reset after shop buys", E+"shops.py", 240, "We will need to reset this"),
("claim: buy takes coins from player", E+"shops.py", 304, "caller.coins -= item.value"),
("bug: shopkeeper credited with +=, no coins attribute", E+"shops.py", 305, "shopkeep += item.value"),
("claim: buy confirm is the only coin check", E+"shops.py", 363, "if caller.coins >= item.value and item.size <= (max_slots - used_slots):"),
("claim: sell price = int(value x miser factor)", E+"shops.py", 384, "value = int(obj.value * shopkeep.miser_factor)"),
("claim: only positive value and not quest items are offered", E+"shops.py", 385, "if value > 0 and obj.obj_type is not ObjType.QUEST:"),
("bug: sellmap builder has self parameter", E+"shops.py", 377, "def _get_or_create_sellmap(self, caller, shopkeep):"),
("bug: sellmap called with two arguments", E+"shops.py", 404, "sellmap = _get_or_create_sellmap(caller, shopkeep)"),
("bug: remove() result used as one object", E+"shops.py", 421, "obj = caller.equipment.remove(item)"),
("bug: attribute set on the returned value", E+"shops.py", 422, "obj.location = shopkeep"),
("claim: player is paid the sell value", E+"shops.py", 425, "caller.coins += value"),
("claim: remove() returns a list", E+"equipment.py", 313, "list: A list of 0, 1 or more objects emptied from the inventory."),
("theirs constant: upsell_factor 1.0", E+"npcs.py", 235, "upsell_factor = AttributeProperty(1.0, autocreate=False)"),
("theirs constant: miser_factor 0.5", E+"npcs.py", 237, "miser_factor = AttributeProperty(0.5, autocreate=False)"),
("licence: BSD 3-Clause", "/mnt/frankendom-donors/evennia-evennia/LICENSE.txt", 1, "BSD 3-Clause License"),
]
with open("receipts.tsv","a",newline="") as f:
    for claim,fp,ln,q in rows:
        assert "\t" not in q and 15<=len(q)<=90,(claim,len(q))
        f.write("\t".join([N,claim,fp,str(ln),q])+"\n")
print(len(rows))
