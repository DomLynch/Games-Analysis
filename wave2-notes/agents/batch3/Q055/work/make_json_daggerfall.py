import json
D="/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/"
obj={
 "game":"daggerfall-unity","category":"loot-drops","cell":8,"verdict":"STRONG","depth":"full",
 "donor_path":D+"Game/Items/LootTables.cs",
 "licence":"MIT License (LICENSE file, Copyright (c) 2009-2023 Daggerfall Workshop; header LootTables.cs:4)",
 "licence_class":"permissive",
 "target_module":"src/fight/loot.ts","parity_row":18,
 "pattern_tags":["loot-cumulative-roll","new:category-chance-matrix","new:level-scaled-category"],
 "data_fields":[
  {"name":"min_gold","donor_constant":"MinGold per key, e.g. 1 (A), 2 (C)","unit":"units","where":"zone data","donor_ref":D+"Game/Items/LootTables.cs:194"},
  {"name":"max_gold","donor_constant":"MaxGold per key, e.g. 10 (A), 20 (C)","unit":"units","where":"zone data","donor_ref":D+"Game/Items/LootTables.cs:194"},
  {"name":"gold_level_multiplier","donor_constant":"x PC level","unit":"ratio","where":"engine constant","donor_ref":D+"Game/Items/LootTables.cs:194"},
  {"name":"category_chance","donor_constant":"percent 0-100 per category, e.g. WP 25 and BK 2 for key C","unit":"ratio","where":"zone data","donor_ref":D+"Game/Items/LootTables.cs:82"},
  {"name":"repeat_halving_factor","donor_constant":"0.5 per success","unit":"ratio","where":"engine constant","donor_ref":D+"Game/Items/LootTables.cs:205"},
  {"name":"level_scaled_categories","donor_constant":"P1, P2, C1, C2 multiplied by PC level; others not","unit":"ratio","where":"engine constant","donor_ref":D+"Game/Items/LootTables.cs:217"},
  {"name":"roll_range_and_zero_rule","donor_constant":"uniform integer 0-99, success if below int chance; chance 0 never succeeds","unit":"none","where":"engine constant","donor_ref":D+"Game/Utility/Dice100.cs:17"},
  {"name":"potion_chance_on_loot_key","donor_constant":"3 percent potion, 2 percent recipe when a loot key is set","unit":"ratio","where":"engine constant","donor_ref":D+"Game/Entities/EnemyEntity.cs:394"},
  {"name":"map_chance_per_enemy","donor_constant":"MobileEnemy.MapChance (value not read)","unit":"ratio","where":"zone data","donor_ref":D+"Game/Entities/EnemyEntity.cs:389"}
 ],
 "best_idea":"A category-by-category repeat roll, where each success halves the next chance, gives mostly small bags with rare big ones, and a per-zone table of percent chances is enough to tune it.",
 "decision":"adapt","decision_why":"We want the matrix and the halving repeat roll as zone data and one engine rule, but not the donor's spawn-time roll, its single local-player level source or its global random reseed.",
 "decision_status":"proposed",
 "acceptance":"A server test with a fixed seed kills a key-C enemy at killer level 5 and asserts gold in 10-100 inclusive, at most 6 P1 items, no 0-chance category in 10,000 seeded rolls, and the ledger gains exactly the logged bag once; the corpse shows the same items."
}
json.dump(obj,open("/private/tmp/p2/wave2-haiku/batch3/Q055/out/loot-drops/daggerfall-unity.json","w"),indent=1)
print("written")
