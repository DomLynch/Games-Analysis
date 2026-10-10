# crawl-crawl (Dungeon Crawl Stone Soup) - encounter-templates (EN001)

Donor root: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ (VPS, read-only). Asset audit read first: AU011/crawl-crawl.assets.md (GPLv2+ code; mixed asset licence; dat/ text under the general GPLv2+ statement).

## 1. What the player sees and feels
A walk across a Crawl level is mostly quiet, then a patch of ground reads as wrong: a ring of statues around an altar with a unique weapon on it, a small camp of crude huts with one bigger brute standing in the middle, a band of jackals or yaks grazing on a lair floor. The ambush is the strongest beat. Nothing is visible, a corridor looks empty, and then two or three monsters step out of the walls while the rest of the ambush waits behind cover, and the game refuses to reveal more until the first ones are dealt with. On a 375-wide screen the readable part is the shape (ring, hut cluster, column of statues) and the count of what is in view, not the whole wave.

## 2. Why it works / is striking
- Readable shape: each template is a small ASCII stamp (camp maps are about 7x7 to 11x11 cells) so the silhouette is a ring, a cross or a hut cluster. Good at 375 wide.
- One signature behaviour: the ambush holds back its members and reveals them through a gate (section 3), so the player meets a trickle, not a flood.
- One signature sound or effect: not read here (audio absent from the tree per AU011). The visible cue in the data is the statue ring and altar on the guardian vault.
- Could be ours at 20-30 percent resemblance: yes. Keep the shape grammar and the reveal gate; name everything ourselves.

## 3. The rule behind it (data, not code)
Three data tables carry the feel. All numbers below are donor values; donor_value is null in the JSON because the code is GPLv2+ and the rule keeps numbers only for MIT/Apache/BSD donors.

a) Band table (leader to group). `bands_by_leader` in source/mon-place.cc, line 1859 onward: 179 leader entries, 133 distinct band types, each entry `{ leader, { conditions, { { BAND_x, {min, max}, natural_leader } } } }`. Example rows: jackal leader with band 1-4 (line 1883); a lair-only pick at source/mon-place.cc line 2146 in `_choose_band`, which weights three bands by branch: yak band 2-5 at weight 3, death-yak band 1-2 at weight 1, dream-sheep band 2-4 at weight 1. Branch conditions gate some leaders (vault-only or hell-only). Read as: leader -> band size range -> weighted pick by branch -> a natural-leader flag that gives the leader the stronger role.

b) Ambush reveal gate. source/mon-lurk.cc `_monster_threat_is_sufficient` (line 204 onward) and `handle_lurkers` (line 249). Lurkers are queued hidden, alerted (the code comment at line 147 onward names noise as the trigger), and placed only when the gate passes: 3 or more ready lurkers (line 218), or a visible monster at tough threat level, or 3 or more visible threats near the player, or at most one unseen threat. A ready lurker is one alerted with its timer within 50 time units of now. Vault size: source/dat/des/variable/ambush.des header says 8 to 24 monsters, many out of depth, with an inner subvault (line 3 and line 7).

c) Camp and guardian stamps. source/dat/des/serial/gnoll_camp.des: 13 NAME entries (1 serial plus 12 camp layouts); the serial places 4 to 6 camps (`local c = 4 + crawl.random2(3)`, line 14) at depth 5 to 10 with CHANCE 10 percent (line 12); 12 camp layouts carry the `patrolling` tag (line 175). source/dat/des/variable/mini_monsters.des holds a guardian altar set (example `grunt_guarded_unrand_obsidian_axe`, line 9057): a unique item on an altar, a ring of statues, and a patrolling guard band of mixed types. The `guarded_unrand` family has 61 NAME entries across dat/des.

Counts (grep, dat/des): 6,264 NAME lines overall (includes subvaults); 395 NAME lines in mini_monsters.des of which 76 tag lines contain `patrolling`; 20 NAME lines containing 'shrine'; 18 containing 'camp' (includes 'camping'); 141 containing 'lair'; 10 NAME lines in ambush.des.

## 4. For Frankendom
- 700 zones as data: each zone holds a weighted list of template picks by depth band and biome, like the band table keyed by depth. A template is (shape, leader slot, follower slots, size range, weight, depth range, optional stamp).
- 100 Pit characters: reuse them as slots, not as one-off monsters. The leader slot maps to one of the 100; the band table decides followers. A camp can reuse the same leader in different zones with a different stamp and follower mix.
- Many-vs-one: the reveal gate threshold of 3 matches our max 3 attackers. Keep the rule: at most 3 active attackers, the rest queued and revealed as slots free up.
- Server-verified: the server rolls the template, the band size and the reveal order, then sends events (`encounter_spawned`, `ambush_reveal(slot, race, from_cover)`, `camp_patrol_step`). The client only presents them. Loot from a guardian altar is one ledger row.
- Keep separate from spawn caps: the gate and band size decide what forms, the spawn cap decides how many can exist in a zone at once. Do not mix the two numbers.

Keep: the reveal gate (queue plus threshold), leader-keyed bands with weights by context, the `patrolling` tag as a group that walks a route, the statue-ring guardian stamp, ASCII stamps for layout.
Change: Crawl's 8 to 24 monster ambush is too large for phone duels, so cap the on-screen wave at 3 and queue the rest. Turn-based timers (50 time units) become fight ticks on our server. Crawl's animal, demon and undead names are not ours. Its 'joke' lair variant is not in scope.

## 5. Five-minute look test (Dom, on his phone)
Build one stub zone with three templates along one 20-second walk: (1) a camp of four small huts with a larger sergeant in the middle and two patrolling; (2) an ambush of 8 queued members that reveals 3 at a time when the player comes within about 6 tiles; (3) a guardian altar with a unique item and two statues flanking. Dom walks it on a 375-wide screen and answers: did the reveal feel like a surprise, could he read the camp shape from 6 tiles, did the altar read as the reward? Then flip the ambush cap from 3 to 2 and from 3 to 4 and say which one feels right.

## 6. Licence and IP
Code: GPL version 2 or later (LICENSE; README line 96 in the donor). Data under dat/ falls under the same general statement (AU011, class B). Art: mixed and not used here. Rule for us: inspiration stays category-level. Use 'a ring of statues around an altar', 'a camp of huts with a sergeant', 'an ambush that reveals a few at a time'. Do not copy monster names, band sizes as published constants, or the vault maps. Our names and our tuned numbers. No legal conclusions drawn.

## 7. Gaps
- Half read: data plus engine. Read: source/dat/des (ambush.des header and first lines, gnoll_camp.des header and first camp, mini_monsters grunt guarded entry, counts across dat/des); source/mon-place.cc (bands_by_leader and _choose_band start); source/mon-lurk.cc (gate function and header). Engine side only partly read.
- Server half: this donor is a single-player roguelike with a webtiles server code path (source/webserver exists per AU011). Not read. Not stated as absent.
- Not read: source/dat/mons (690 yaml files, counted only); dat/des/branches (74k lines) and dat/des/portals; dlua/*.cc; the rest of mon-place.cc beyond the band table; any walk density number. No per-level monster count or 'every 20 seconds' figure was found in the parts read. Crawl has no escort template in dat/des, dat/mons or mon-*.cc, but dlua and the rest of source were not searched.
- The `patrolling` tag is counted by grep. Its runtime meaning (route, wander) was not traced in mon-*.cc.
- Counts are from grep and are not deduplicated (subvaults and multi-line map entries).
