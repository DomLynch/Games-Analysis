import json
D="/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/"
G=D+"gameutils/"
obj={
 "game":"Dawn-of-Light-DOLSharp","category":"loot-drops","cell":8,"verdict":"STRONG","depth":"full",
 "donor_path":G+"LootGeneratorScroll.cs",
 "licence":"GNU GPL version 2 (LICENSE file); per-file header: version 2 or any later version (GPL-2.0-or-later)",
 "licence_class":"copyleft",
 "target_module":"src/fight/loot.ts","parity_row":18,
 "pattern_tags":["drop-filter","new:zone-keyed-pool","new:level-tiered-variant"],
 "data_fields":[
  {"name":"drop_rate_pct","donor_constant":"25 (server property scroll_drop_rate, pve)","unit":"ratio","where":"engine constant","donor_ref":D+"serverproperty/ServerProperties.cs:1939"},
  {"name":"min_mob_level","donor_constant":"45","unit":"count","where":"engine constant","donor_ref":G+"LootGeneratorScroll.cs:51"},
  {"name":"dungeon_widen_multiplier","donor_constant":"1.5 applied to the rate, truncated","unit":"ratio","where":"engine constant","donor_ref":G+"LootGeneratorScroll.cs:55"},
  {"name":"zone_pool","donor_constant":"zone name -> artifact pool (switch of zone strings)","unit":"count","where":"zone data","donor_ref":G+"LootGeneratorScroll.cs:61"},
  {"name":"page_level_breaks","donor_constant":"51 for page 2, above 55 for page 3","unit":"count","where":"engine constant","donor_ref":G+"LootGeneratorScroll.cs:93"},
  {"name":"placeholder_item_level","donor_constant":"35","unit":"count","where":"engine constant","donor_ref":G+"LootGeneratorScroll.cs:108"}
 ],
 "best_idea":"Drop a zone-specific pool on one roll: gate by level, gate by a percent chance, pick the pool from the zone where the kill happened, and make a second, wider roll in dungeons.",
 "decision":"adapt",
 "decision_why":"We want the three-gate shape and the zone-keyed pool as zone data, but not the hard-coded zone-name switch and not the two-step placeholder hand-off, because we want one roll and one ledger entry.",
 "decision_status":"proposed",
 "acceptance":"A seeded server test kills a level-46 mob in a zone with a pool and asserts a drop only from that zone's pool at the zone rate (25 by default); a level-44 kill never drops; a zone with no pool never drops; level 52 gives page 2 and 57 gives page 3; each drop is one ledger entry."
}
json.dump(obj,open("/private/tmp/p2/wave2-haiku/batch3/Q055/out/loot-drops/Dawn-of-Light-DOLSharp.json","w"),indent=1)
print("written")
