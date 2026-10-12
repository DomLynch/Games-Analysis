# Top 70 learnings (2026-10-12)
The reviewed top 50 plus 20 new learnings (magic, sound, status effects, quests, events, skills, boards, phone care, save safety, two feel items), ranked together. Relative order of the original 50 is kept.
Part 1 is the phone version. Part 2 adds donors, licence tier and tags. Build lanes are HELD by Dom; analysis only, nothing here is an assignment. Not committed.

# PART 1: PHONE VERSION

## Do now (1-10)
1. If the server falls behind, it drops the backlog instead of bursting.
   No sudden stalls or speed-ups for everyone. [easy]
2. A new boss, weapon, finisher, spell or zone is one data row, never a code change.
   Content ships daily without a release risk. [medium]
3. The camera sits over the shoulder and pulls in before walls.
   You can always see your hero. [hard]
4. Zones nobody is in go to sleep; far creatures get checked rarely.
   700 zones cost almost nothing until players arrive. [medium]
5. Content is checked when it loads, with named reasons for any refusal.
   Bad zone data never reaches players. [medium]
6. "Which zone am I in" comes from the zone rows, not a short fixed list.
   Every one of the 700 zones can actually run. [medium]
7. Each camp has its own seed, and each system its own random stream.
   One camp can be rebuilt alone and fights replay exactly. [medium]
8. Each zone refills its own creatures, one at a time, out of sight.
   Zones feel alive and nothing pops up in your face. [hard]
9. Actions are limited per account, and a refusal changes nothing.
   Phone users on shared networks are not punished for others. [easy]
10. A matching stack tops up before it needs a new slot.
   Fewer "pack full" refusals. [easy]

## Next (11-25)
11. One budget for effects, one picture-cost ceiling, one quality ladder.
   The game stays smooth on weaker phones. [medium]
12. Loot is worked out first: what fits goes in, the rest stays claimable.
   A full pack never eats your take-one pick. [medium]
13. Every item or metal move is checked in full, then done in one step.
   No lost items and no duplicated loot. [hard]
14. Saves carry a version number and old saves are upgraded forward on load; a retry or a reconnect never pays or creates anything twice.
   Your hero, pack and metal survive updates and bad signal with no loss and no duplicates. [hard]
15. A quest reward pays once, only if the bag has room, all or nothing.
   Finishing a quest always feels clean. [medium]
16. A quest or feud is a forward-only list of stages moved by named events, such as a guardian falling or a place reached, with optional timers; never "kill ten rats" or "collect ten herbs" errands.
   Quests read like a story and always say what is next. [medium]
17. A hunting creature has moods: notice, chase, search, go home.
   Enemies chase you, give up, and reset instead of standing still. [hard]
18. Pursuit ends on a clock, and weak creatures run from a much stronger player.
   Fights end fairly instead of dragging across the map. [hard]
19. A creature sticks with its target unless another is clearly ahead.
   Enemies stop flickering between heroes. [medium]
20. Magic rides on the special-move rows: a spell names a template and its numbers.
   Dragons, necromancy, telepathy and persuasion arrive as rows, not new engines. [medium]
21. A spell row holds its own cost and recovery: charges that refill or a cooldown, never a second bar.
   Each spell feels different with no new engine, and the screen stays clean on a phone. [medium]
22. A resisted spell still lands part of its power, and each creature's resist is a number in its own row.
   Magic is never all-or-nothing, and tough foes and bosses can shrug it off by data. [medium]
23. One world clock drives day, night and townsfolk daily routines.
   Towns look lived-in. [hard]
24. Every zone has a quiet background sound, such as wind or a dripping cave, that fades smoothly at borders, with rare random touches.
   Zones sound like places; the game has no ambience at all today. [medium]
25. A zone row can name a parent and change only a few keys.
   700 zones are easier to author. [medium]

## Soon (26-40)
26. Shops buy back for less than they sell, and check room first.
   A clean first place to spend metal. [easy]
27. Swapping gear is one tap and puts the old piece back in the pack.
   No fiddly unequip steps. [easy]
28. When the sound mixer is full, the least important sound is dropped, your own hits outrank the world, and one sound cannot pile up.
   Crowd fights stay clear instead of turning to noise. [easy]
29. The thumb stick ramps up smoothly, and a tap during recovery is not lost.
   Controls feel right on the phone. [easy]
30. Every zone move uses one path and lands you outside the trigger.
   Zones connect without stuck or exploitable doors. [medium]
31. Loot tables pay by rules, and weak or repeat victims pay less.
   Farming the easy stuff stops being the best plan. [medium]
32. Only landed damage cuts a spell, the earlier it is cut the longer the caster is locked out, and no build casts faster than half the base time.
   Casting is a risk you can read, and no one gets instant spells. [easy]
33. Each spell belongs to a school such as fire, frost or shadow, and creatures resist or fear a school by a number.
   Picking the right spell for the foe matters, and a new school is one new row. [medium]
34. Every screen is checked in Safari at the smallest phone landscape, not just Chrome.
   No layout break that only Apple phones see. [easy]
35. Heavy work in a fight (skinning, raycasts, shader builds) is warmed up or done once per frame.
   No stutter in the middle of a fight. [medium]
36. When the tab is hidden, or the phone runs hot or low on charge, the game lowers its frame cap and effects first and never touches the fight rules.
   Long sessions stay cool and the fight stays fair. [medium]
37. Teach one hint at a time, when it matters, and always allow skip.
   New players are guided, never lectured. [medium]
38. Always show what is next, and open town services one at a time.
   Players know their next goal after every fight. [medium]
39. Skills and spells are rows that name the rank they unlock at, the class that may take them, and a cap by level; credit counts past the cap.
   A clear route of unlocks with no grinding by use and no level-up ceremony. [medium]
40. Cap how many enemies attack at once; the rest wait their turn.
   Crowds stay fair and readable on a small screen. [medium]

## Later (41-55)
41. An enemy health bar shows only when targeted, hurt or hunting you.
   A clean screen with the useful bars. [easy]
42. The map fits the zone, shows a direction line, and reveals only what you know.
   You find the forge without getting lost. [hard]
43. Many hits on one target show as one clear reaction.
   Group fights stay readable. [medium]
44. Every attack has a named warning cue a fixed beat before the damage lands, and hit sounds come from a table by creature family with a fallback.
   You see and hear danger coming, and hits sound like what was hit. [medium]
45. Bosses show their next move, change at health steps, and cap helpers at three.
   Boss fights are tough but fair. [hard]
46. Elite and boss versions look like the base creature with clear extra cues.
   You read the danger at a glance. [medium]
47. Summoned helpers are capped per caster; the one nearest to expiring goes when a new one arrives, and all vanish when their summoner falls.
   Dragon-callers and necromancers stay dangerous without flooding a small screen. [hard]
48. Music follows the moment: a zone or town tune, a fight tune after sustained damage, short stingers, and the bed dips under big sounds and voices.
   Fights and bosses feel bigger. Needs Dom's go, because music is parked. [hard]
49. Zones get names, signs, a short card and rumours from a seeded set.
   Each zone feels like a place. [medium]
50. Townsfolk lines rotate through every line once before repeating, quest-giver lines come first, and a rumour points at a real nearby quest.
   Towns talk back with variety and hint at what to do. [medium]
51. Your own walking shows at once, and the server quietly corrects drift. Test first.
   Moving feels instant even on a bad signal. [hard]
52. A replay mismatch names the first moment that differs.
   Disputes and bugs get solved quickly. [easy]
53. Suspicious accounts are flagged for a person, never banned by a machine.
   Honest players are not banned by mistake. [hard]
54. Walking speed is limited by real elapsed time, warn first, then act. Test first.
   Speed hacks fail without punishing a laggy phone. [medium]
55. Boards and the after-fight card use verified fights only, ties go to the earlier result, and fights against players pay nothing yet.
   Rankings are honest and the card after each fight is clear. [medium]

## Parked (56-70)
56. Chat has one gate: refused lines cost nothing, then a warning, then a timed mute.
   Chat stays calm from day one, and one report never silences anyone for good. [medium]
57. Who can hear whom is one gate: staff, block, privacy, friends only.
   Blocked really means blocked. [medium]
58. Barter trade closes if players move apart, and any change resets both confirms.
   Safe swaps with no scams and no lost items. [medium]
59. The server sends only what is near and what changed; slow phones get fewer updates.
   One slow phone cannot hurt the rest. [hard]
60. World events fire once, with the end time sent by the server.
   Banners and countdowns always agree. [medium]
61. A zone event is one row on a calendar; it sets a flag that turns on a spawn and a townsfolk line together, and it survives a server restart without firing twice.
   A siege, storm or festival changes the creatures and the chatter of a zone as one thing. [medium]
62. A hit can pull the camp, with a cap; some camps ambush or patrol.
   Camps feel like groups, not statues. [medium]
63. A new kind of anything is a row in a registry; names, labels and looks live in rows, never as if-this-name branches.
   The game never needs a code change to grow. [medium]
64. One slot per status effect on a target; the stronger replaces the weaker.
   Status effects stay readable. [easy]
65. Each effect row says how it combines (stronger replaces, equal refreshes, or it is ignored), what cleanses it, and that damage over time can hurt but never kill; bosses shrug some by data.
   Poison, bleed and fear stay fair and readable, and no tick ever kills you. [hard]
66. A small badge over a target shows the effect with a time ring and one number a second, never one per attacker.
   You always see what is on you and for how long. [easy]
67. Widen the existing ranked ladder's match window the longer a player waits.
   Fair, fast matches. [easy]
68. In group fights, credit follows who really did the damage (waits for parties).
   Loot goes to people who earned it. [hard]
69. Every number on the character sheet comes from one ordered stack (base, gear, perk, stance), so points can be re-spread for free.
   You can try a build and change your mind with no penalty, and no numbers go out of step. [medium]
70. A boss gets a short walk-in with its name in gold and a skip button, and a typed finish card when it falls.
   Boss fights feel like events and never hold up a player who wants to skip. [easy]

---

# PART 2: FULL VERSION

HEADER COUNT: of the 50 original entries, 27 have at least one tier-A donor they could be ported from, 19 have B or C donors only, and 4 are unclear (no donor tied to them: new positions 2, 34, 35, 63). Method: for each original entry I took the donors named in the draft, read each donor's licence line from the checked notes (and the gap-check licence notes), kept the most permissive donor per entry and, for a donor with mixed licences inside its code, its most restrictive part; where a repo's code is permissive but its art or data terms are separate or unstated I judged the code (it is what would be ported) and said so in the entry.

How to read this:
- Tier A (permissive MIT/Apache/BSD/CC0/Unlicense/zlib): code may be ported to TypeScript with the notice kept. A tier A port goes through the same row and registry shape as our own (no foreign data formats left in the source), keeps its own tests, and its notice lives in the licences folder so the credits test covers it.
- Tier B (copyleft GPL/AGPL/LGPL/CC BY-SA): ideas only, clean-room. "Ideas only" means the behaviour as described in our own note, never a reimplementation from memory of the source.
- Tier C (no licence file, non-commercial, leaked, game-rip data, CC BY-NC): ideas only, never close recreation; assets at 30 to 40 percent resemblance (Dom 2026-10-12). This applies to assets only, never to the code or numbers of copyleft or restricted donors.
- Name rule (Dom, second ruling 2026-10-12): resemblance up to 30 to 40 percent is fine ONLY with a completely different name and context. No donor name, nickname, place name, faction name, spell or item name, or lore line is ever reused, not even translated or respelled; the thing gets a Frankendom name and its own one-line story. The same name rule applies to Tier B. Rule of thumb: a 20 percent lookalike with the donor's name is a legal problem; a 40 percent lookalike with its own name and story is not.
- Caution: this is a product rule, not legal advice. A different name does not by itself cure copying of protected art or design; confirm with counsel before launch.
- Recolour rule (Dom, L6 in the rulings file): Frankendom is gritty, so a borrowed look is re-made in our palette (dark red, crimson, black, obsidian), with a different name, a different size, and decorative parts such as sparkles and crystals removed.
- Case 1, the mesh is ours or tier A: recolour, resize, strip and rename it and it is ours; keep a tier A notice in the licences folder. The same applies to textures, sounds and music that are ours or permissive: reuse and reshape.
- Case 2, the mesh is tier B or C (rip, no licence, non-commercial, copyleft): the donor model is REFERENCE ONLY, because recolouring the donor mesh does not clear it (copyright sits in the geometry). Build the new creature through our own pipeline (FLUX picture, TRELLIS 3D, Blender fit, the standing character recipe) in the gritty palette with our name and our one-line story, aiming at the 30 to 40 percent look with zero shared geometry or textures.
- Same split for textures, sounds and music: ours or permissive means reuse and reshape; otherwise reference only.
- Ease: easy = a day or less in one lane, medium = a few days, hard = a new system or a migration. For the original 50 these are Lead's estimates from the lane side (his numbers refer to the original top-50 numbering; shown here at the new positions). For the 20 new entries they are my own estimates from the build-list sizes and the as-data and phone-first tags.
- Layer (Engine, Core, Modes) is still the analyst's guess. As-data and phone-first are my reading of the draft and build-list tags; "no (test at 375)" means a risk to test at 375 wide, not a stop.
- Standing rules respected throughout: no death penalty, never gear loss, no skill or stat gain by use, barter-only player trade, no kill-N or collect-N quests, take-one loot, one ledger, favour is a long-lived ledger, parties and guilds deferred, zones, items, skills and spells are data rows.
- "New" marks the 20 added entries; "was N" gives the original top-50 number.

## Do now (1-10)
**1. If the server falls behind, it drops the backlog instead of bursting.** (was 1)
- Seen in: colyseus, SuperTuxKart, ioquake3
- Licence tier: A (best donor: colyseus, MIT)
- Layer: Engine. As data: no. Phone-first: yes. Ease: easy.
**2. A new boss, weapon, finisher, spell or zone is one data row, never a code change.** (was 2)
- Seen in: none tied to this entry
- Licence tier: unclear (no donor)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: medium.
- Note: new in the reviewed 50; no single donor, the draft rows on checked content and inheriting rows are the nearest
**3. The camera sits over the shoulder and pulls in before walls.** (was 3)
- Seen in: OpenMW, SRB2, OpenAC
- Licence tier: A (best donor: OpenAC, MIT)
- Layer: Engine. As data: no. Phone-first: no (test at 375). Ease: hard.
**4. Zones nobody is in go to sleep; far creatures get checked rarely.** (was 4)
- Seen in: EQEmu, dhewm3, OpenGothic
- Licence tier: A (best donor: OpenGothic, MIT)
- Layer: Core. As data: partly. Phone-first: yes. Ease: medium.
**5. Content is checked when it loads, with named reasons for any refusal.** (was 5)
- Seen in: Cataclysm, OpenRA, Wesnoth
- Licence tier: B (best donor: Cataclysm, CC BY-SA 3.0)
- Layer: Engine. As data: partly. Phone-first: yes. Ease: medium.
**6. "Which zone am I in" comes from the zone rows, not a short fixed list.** (was 6)
- Seen in: L2Solo, Microverse, LostCityRS
- Licence tier: A (best donor: L2Solo, Apache-2.0)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**7. Each camp has its own seed, and each system its own random stream.** (was 7)
- Seen in: Cubyz, OpenBW, boardgame.io
- Licence tier: A (best donor: boardgame.io, MIT, per the replay gap-check)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
- Note: draft entry also named OpenBW (no licence file); tier taken from the best donor
**8. Each zone refills its own creatures, one at a time, out of sight.** (was 8)
- Seen in: Shattered Pixel Dungeon, Daggerfall Unity, DOOM
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: hard.
**9. Actions are limited per account, and a refusal changes nothing.** (was 9)
- Seen in: OpenRCT2, SpacetimeDB, Nakama
- Licence tier: A (best donor: Nakama, Apache-2.0)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: easy.
**10. A matching stack tops up before it needs a new slot.** (was 10)
- Seen in: Shattered Pixel Dungeon, EQEmu, Barony
- Licence tier: A (best donor: Barony, BSD-2)
- Layer: Core. As data: partly. Phone-first: yes. Ease: easy.

## Next (11-25)
**11. One budget for effects, one picture-cost ceiling, one quality ladder.** (was 11)
- Seen in: Mindustry, Luanti, Levy Street
- Licence tier: A (best donor: Levy Street, MIT)
- Layer: Engine. As data: partly. Phone-first: yes. Ease: medium.
**12. Loot is worked out first: what fits goes in, the rest stays claimable.** (was 12)
- Seen in: Angband, Forgotten Server, Endless Sky
- Licence tier: B (best donor: Angband, GPL-2 or own licence)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**13. Every item or metal move is checked in full, then done in one step.** (was 13)
- Seen in: SpacetimeDB, LostCityRS, OpenRA
- Licence tier: A (best donor: LostCityRS, MIT)
- Layer: Core. As data: no. Phone-first: yes. Ease: hard.
**14. Saves carry a version number and old saves are upgraded forward on load; a retry or a reconnect never pays or creates anything twice.** (NEW)
- Seen in: none tied to this entry
- Licence tier: unclear (no donor)
- Layer: Core. As data: partly. Phone-first: yes. Ease: hard.
- Note: No donor note covers it. Precedent is our own: a unique key on each fight already stopped a re-sent fight counting twice. Lead asked for this item.
**15. A quest reward pays once, only if the bag has room, all or nothing.** (was 14)
- Seen in: ModernUO, DOLSharp, EQEmu
- Licence tier: B (best donor: ModernUO, GPL-3)
- Layer: Core. As data: partly. Phone-first: yes. Ease: medium.
**16. A quest or feud is a forward-only list of stages moved by named events, such as a guardian falling or a place reached, with optional timers; never kill-N or collect-N.** (NEW)
- Seen in: Evennia, OpenMW, ModernUO, AzerothCore
- Licence tier: A (best donor: Evennia, BSD-3)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
- Note: Quest core and reward claim are built but not in the game page; stage events are not yet fed from the server. Stages go by id, never by display name.
**17. A hunting creature has moods: notice, chase, search, go home.** (was 15)
- Seen in: Crawl, Brogue, Veloren
- Licence tier: B (best donor: Crawl, GPL-2+)
- Layer: Core. As data: no. Phone-first: yes. Ease: hard.
**18. Pursuit ends on a clock, and weak creatures run from a much stronger player.** (was 16)
- Seen in: Crawl, Veloren, Angband
- Licence tier: B (best donor: Crawl, GPL-2+)
- Layer: Core. As data: no. Phone-first: yes. Ease: hard.
**19. A creature sticks with its target unless another is clearly ahead.** (was 17)
- Seen in: AzerothCore, cMaNGOS, TrinityCore
- Licence tier: B (best donor: AzerothCore, GPL-2)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: medium.
**20. Magic rides on the special-move rows: a spell names a template and its numbers.** (was 18)
- Seen in: Daggerfall Unity, OpenEnroth, EQEmu
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: medium.
- Note: new in the reviewed 50; donors are from the older magic notes
**21. A spell row holds its own cost and recovery: charges that refill or a cooldown, never a second bar.** (NEW)
- Seen in: Daggerfall Unity, Segs, OpenEnroth, Brogue
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: medium.
- Note: Follows ruling: item charges, not a mana pool (S17). Cost and recovery sit beside the existing special-move numbers.
**22. A resisted spell still lands part of its power, and each creature's resist is a number in its own row.** (NEW)
- Seen in: Daggerfall Unity, EQEmu, l1j
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: medium.
- Note: Draws come from the recorded random stream so replays match. Needs a rule-version bump. Hit-chance dice for ordinary attacks stay out.
**23. One world clock drives day, night and townsfolk daily routines.** (was 19)
- Seen in: OpenGothic, Wesnoth, LostCityRS
- Licence tier: A (best donor: OpenGothic, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: hard.
**24. Every zone has a quiet background sound, such as wind or a dripping cave, that fades smoothly at borders, with rare random touches.** (NEW)
- Seen in: Daggerfall Unity, Quake, OpenDiablo2, Cubyz, OpenXcom
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: medium.
- Note: Zone data already names a bed ("wind") that nothing plays. Needs original or CC0 sound files; check any donor sound file by file, never a donor track.
**25. A zone row can name a parent and change only a few keys.** (was 20)
- Seen in: OpenRA, 0 A.D., Evennia
- Licence tier: A (best donor: Evennia, BSD-3)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: medium.

## Soon (26-40)
**26. Shops buy back for less than they sell, and check room first.** (was 21)
- Seen in: 2004Scape, EQEmu, Veloren
- Licence tier: A (best donor: 2004Scape, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: easy.
**27. Swapping gear is one tap and puts the old piece back in the pack.** (was 22)
- Seen in: Daggerfall Unity, Evennia, OpenTESArena
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: easy.
**28. When the sound mixer is full, the least important sound is dropped, your own hits outrank the world, and one sound cannot pile up.** (NEW)
- Seen in: Terasology, Pinball, SRB2, OpenRCT2
- Licence tier: A (best donor: Terasology, Apache-2.0)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: easy.
- Note: Today the mixer drops the oldest sound whatever it is. A priority number per sound and a small limits table per sound fix it.
**29. The thumb stick ramps up smoothly, and a tap during recovery is not lost.** (was 23)
- Seen in: SRB2, Barony, Teeworlds
- Licence tier: A (best donor: Barony, BSD-2)
- Layer: Engine. As data: no. Phone-first: yes. Ease: easy.
**30. Every zone move uses one path and lands you outside the trigger.** (was 24)
- Seen in: Card Forge, Quake, Veloren
- Licence tier: B (best donor: Card Forge, GPL-3)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**31. Loot tables pay by rules, and weak or repeat victims pay less.** (was 25)
- Seen in: EQEmu, Cubyz, KeeperRL
- Licence tier: B (best donor: EQEmu, GPL-3)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**32. Only landed damage cuts a spell, the earlier it is cut the longer the caster is locked out, and no build casts faster than half the base time.** (NEW)
- Seen in: ModernUO, rAthena, GemRB
- Licence tier: B (best donor: ModernUO, GPL-3)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: easy.
- Note: Rulings S15 (blocks and parries do not cut) and S16 (half-time floor). The lockout formula is one small change to the existing cut-cast rule.
**33. Each spell belongs to a school such as fire, frost or shadow, and creatures resist or fear a school by a number.** (NEW)
- Seen in: Card Forge, EQEmu, Daggerfall Unity
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: medium.
- Note: Analyst reading: the notes show a fixed list of effects (Card Forge) and per-type resist (EQEmu); the word school is mine. Daggerfall may offer a permissive source but the notes do not confirm it, so tier B is kept. Our own school names only, none from a donor.
**34. Every screen is checked in Safari at the smallest phone landscape, not just Chrome.** (was 26)
- Seen in: none tied to this entry
- Licence tier: unclear (no donor)
- Layer: Engine. As data: no. Phone-first: yes. Ease: easy.
- Note: new in the reviewed 50; a house rule from our own device testing, no donor
**35. Heavy work in a fight (skinning, raycasts, shader builds) is warmed up or done once per frame.** (was 27)
- Seen in: none tied to this entry
- Licence tier: unclear (no donor)
- Layer: Engine. As data: no. Phone-first: yes. Ease: medium.
- Note: new in the reviewed 50; no donor named in any note I read
**36. When the tab is hidden, or the phone runs hot or low on charge, the game lowers its frame cap and effects first and never touches the fight rules.** (NEW)
- Seen in: GemRB, FreeOrion
- Licence tier: B (best donor: GemRB, GPL-2+)
- Layer: Engine. As data: partly. Phone-first: yes. Ease: medium.
- Note: Lead asked for this item. Donors only show a frame cap for background tabs. Browsers give no reliable heat signal, so heat response is an open question.
**37. Teach one hint at a time, when it matters, and always allow skip.** (was 28)
- Seen in: Mindustry, Cataclysm, Endless Sky
- Licence tier: B (best donor: Mindustry, GPL-3)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**38. Always show what is next, and open town services one at a time.** (was 29)
- Seen in: Barony, KeeperFX, 2004Scape
- Licence tier: A (best donor: Barony, BSD-2)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**39. Skills and spells are rows that name the rank they unlock at, the class that may take them, and a cap by level; credit counts past the cap.** (NEW)
- Seen in: Barony, CellAO, AzerothCore, OpenRA, freeciv
- Licence tier: A (best donor: Barony, BSD-2)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
- Note: Strictly inside the rule of no skill or stat gain by use. The cap-by-level, rank ladder and class rows come from data; stat allocation is still parked by scope.
**40. Cap how many enemies attack at once; the rest wait their turn.** (was 30)
- Seen in: KeeperFX, OpenDUNE, Angband
- Licence tier: B (best donor: KeeperFX, GPL-2)
- Layer: Core. As data: partly. Phone-first: yes. Ease: medium.

## Later (41-55)
**41. An enemy health bar shows only when targeted, hurt or hunting you.** (was 31)
- Seen in: Veloren, KeeperRL, Angband
- Licence tier: B (best donor: Veloren, GPL-3)
- Layer: Engine. As data: partly. Phone-first: no (test at 375). Ease: easy.
**42. The map fits the zone, shows a direction line, and reveals only what you know.** (was 32)
- Seen in: Mindustry, OpenRA, isometric-city
- Licence tier: A (best donor: isometric-city, MIT)
- Layer: Engine. As data: no. Phone-first: no (test at 375). Ease: hard.
**43. Many hits on one target show as one clear reaction.** (was 33)
- Seen in: Quake, Veloren, Barony
- Licence tier: A (best donor: Barony, BSD-2)
- Layer: Engine. As data: no. Phone-first: no (test at 375). Ease: medium.
**44. Every attack has a named warning cue a fixed beat before the damage lands, and hit sounds come from a table by creature family with a fallback.** (NEW)
- Seen in: SCAR, Warzone 2100, OpenMW, xoreos
- Licence tier: A (best donor: SCAR, MIT)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: medium.
- Note: The merged-reaction rule for many hits is the existing entry; this is the cue and sound-table side. Needs fights with several attackers to matter.
**45. Bosses show their next move, change at health steps, and cap helpers at three.** (was 34)
- Seen in: DOOM, Veloren, DevilutionX
- Licence tier: B (best donor: Veloren, GPL-3)
- Layer: Modes. As data: partly. Phone-first: yes. Ease: hard.
- Note: DOOM licence is unclear and DevilutionX is non-commercial; the rest are copyleft
**46. Elite and boss versions look like the base creature with clear extra cues.** (was 35)
- Seen in: TrinityCore, flare, ModernUO
- Licence tier: B (best donor: TrinityCore, GPL-2)
- Layer: Core. As data: yes. Phone-first: no (test at 375). Ease: medium.
**47. Summoned helpers are capped per caster; the one nearest to expiring goes when a new one arrives, and all vanish when their summoner falls.** (NEW)
- Seen in: flare, Crawl, EQEmu
- Licence tier: B (best donor: flare, GPL-3)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: hard.
- Note: No summons exist in the game today. The cap joins the three-attacker rule. Raising corpses (ModernUO) is skipped: no corpse state.
**48. Music follows the moment: a zone or town tune, a fight tune after sustained damage, short stingers, and the bed dips under big sounds and voices.** (NEW)
- Seen in: Barony, OpenGothic, Beyond All Reason, 0 A.D.
- Licence tier: A (best donor: Barony, BSD-2)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: hard.
- Note: Music is parked by the owner (audio state notes). Original or free-to-use tracks only. Changes use a hold time so the tune does not flicker on every hit.
**49. Zones get names, signs, a short card and rumours from a seeded set.** (was 36)
- Seen in: Cataclysm, Daggerfall Unity, OpenTESArena
- Licence tier: A (best donor: Daggerfall Unity, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**50. Townsfolk lines rotate through every line once before repeating, quest-giver lines come first, and a rumour points at a real nearby quest.** (NEW)
- Seen in: Yarn Spinner, inkjs, Daggerfall Unity
- Licence tier: A (best donor: Yarn Spinner, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
- Note: Each character has their own rotation order (rulings S63-S67). One rumour per townsperson per talk. The server refuses a choice that was not on offer.
**51. Your own walking shows at once, and the server quietly corrects drift. Test first.** (was 37)
- Seen in: OTClient, colyseus
- Licence tier: A (best donor: OTClient, MIT)
- Layer: Engine. As data: no. Phone-first: yes. Ease: hard.
**52. A replay mismatch names the first moment that differs.** (was 38)
- Seen in: OpenRA, OpenBW, Beyond All Reason
- Licence tier: B (best donor: OpenRA, GPL-3)
- Layer: Engine. As data: no. Phone-first: yes. Ease: easy.
**53. Suspicious accounts are flagged for a person, never banned by a machine.** (was 39)
- Seen in: Angband, lila, Warzone 2100
- Licence tier: B (best donor: Angband, GPL-2 or own licence)
- Layer: Core. As data: no. Phone-first: yes. Ease: hard.
**54. Walking speed is limited by real elapsed time, warn first, then act. Test first.** (was 40)
- Seen in: EQEmu, Luanti, claudecraft
- Licence tier: A (best donor: claudecraft, MIT)
- Layer: Engine. As data: partly. Phone-first: yes. Ease: medium.
**55. Boards and the after-fight card use verified fights only, ties go to the earlier result, and fights against players pay nothing yet.** (NEW)
- Seen in: EQEmu, ModernUO, TrinityCore, ACE
- Licence tier: B (best donor: EQEmu, GPL-3)
- Layer: Core. As data: partly. Phone-first: no (card layout at 375). Ease: medium.
- Note: Rating changes and rewards stay behind the PvP-pays-nothing switch. A duel-rating board can be a simple view beside the daily and season boards.

## Parked (56-70)
**56. Chat has one gate: refused lines cost nothing, then a warning, then a timed mute.** (was 41)
- Seen in: Evennia, OpenDAoC, Veloren
- Licence tier: A (best donor: Evennia, BSD-3)
- Layer: Core. As data: yes. Phone-first: no (test at 375). Ease: medium.
**57. Who can hear whom is one gate: staff, block, privacy, friends only.** (was 42)
- Seen in: LostCityRS, Nakama, ACE
- Licence tier: A (best donor: LostCityRS, MIT)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**58. Barter trade closes if players move apart, and any change resets both confirms.** (was 43)
- Seen in: l1j, AzerothCore, EvEmu
- Licence tier: B (best donor: l1j, GPL-2)
- Layer: Core. As data: partly. Phone-first: no (test at 375). Ease: medium.
**59. The server sends only what is near and what changed; slow phones get fewer updates.** (was 44)
- Seen in: ioquake3, Teeworlds, SpacetimeDB
- Licence tier: A (best donor: Teeworlds, zlib code; art/data not covered)
- Layer: Engine. As data: no. Phone-first: no (test at 375). Ease: hard.
- Note: Teeworlds code is zlib but its art/data terms are separate; SpacetimeDB is restricted
**60. World events fire once, with the end time sent by the server.** (was 45)
- Seen in: EQEmu, ACE, 2004Scape
- Licence tier: A (best donor: 2004Scape, MIT)
- Layer: Core. As data: yes. Phone-first: no (test at 375). Ease: medium.
**61. A zone event is one row on a calendar; it sets a flag that turns on a spawn and a townsfolk line together, and it survives a server restart without firing twice.** (NEW)
- Seen in: Evennia, 2004Scape, AzerothCore, cMaNGOS, rAthena
- Licence tier: A (best donor: Evennia, BSD-3)
- Layer: Core. As data: yes. Phone-first: no (banner clutter at 375). Ease: medium.
- Note: The banner and countdown side is the existing events entry. This is the ledger and flag side. Evennia's scheduler can fire an old task twice, so only the overdue-at-boot idea is used.
**62. A hit can pull the camp, with a cap; some camps ambush or patrol.** (was 46)
- Seen in: flare, Shattered Pixel Dungeon, Crawl
- Licence tier: B (best donor: flare, GPL-3)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
**63. A new kind of anything is a row in a registry; names, labels and looks live in rows, never as if-this-name branches.** (was 47)
- Seen in: none tied to this entry
- Licence tier: unclear (no donor)
- Layer: Engine. As data: yes. Phone-first: yes. Ease: medium.
- Note: merged in the review (registry rows); no single donor
**64. One slot per status effect on a target; the stronger replaces the weaker.** (was 48)
- Seen in: Keldaan, Crawl, EQEmu
- Licence tier: B (best donor: Keldaan, GPL-3)
- Layer: Modes. As data: yes. Phone-first: no (test at 375). Ease: easy.
**65. Each effect row says how it combines (stronger replaces, equal refreshes, or it is ignored), what cleanses it, and that damage over time can hurt but never kill; bosses shrug some by data.** (NEW)
- Seen in: Showdown, EQEmu, Wesnoth, ACE
- Licence tier: A (best donor: Showdown, MIT)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: hard.
- Note: Builds on the one-slot rule and the built stun ladder; does not repeat them. Rules only, never donor names or creatures (S26). It changes the fight record, so a rule-version bump. Tier A rests on Showdown MIT alone.
**66. A small badge over a target shows the effect with a time ring and one number a second, never one per attacker.** (NEW)
- Seen in: OpenMW, Wesnoth, Cataclysm, EQEmu
- Licence tier: B (best donor: OpenMW, GPL-3)
- Layer: Modes. As data: yes. Phone-first: no (badge size at 375). Ease: easy.
- Note: Presentation only, so it can be look-tested first. Needs effects to exist before it shows anything.
**67. Widen the existing ranked ladder's match window the longer a player waits.** (was 49)
- Seen in: TrinityCore, ACE, Open-RSC
- Licence tier: B (best donor: TrinityCore, GPL-2)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: easy.
**68. In group fights, credit follows who really did the damage (waits for parties).** (was 50)
- Seen in: 2004Scape, ModernUO, rAthena
- Licence tier: A (best donor: 2004Scape, MIT)
- Layer: Core. As data: partly. Phone-first: yes. Ease: hard.
**69. Every number on the character sheet comes from one ordered stack (base, gear, perk, stance), so points can be re-spread for free.** (NEW)
- Seen in: Open Duelyst, Wesnoth, flare, rAthena
- Licence tier: A (best donor: Open Duelyst, CC0)
- Layer: Core. As data: yes. Phone-first: yes. Ease: medium.
- Note: The free respec is the analyst's own reading, not a donor idea. Waits until Dom un-parks stat allocation.
**70. A boss gets a short walk-in with its name in gold and a skip button, and a typed finish card when it falls.** (NEW)
- Seen in: OpenGothic, Ikemen GO, xoreos, DevilutionX, Quake
- Licence tier: A (best donor: OpenGothic, MIT)
- Layer: Modes. As data: yes. Phone-first: yes. Ease: easy.
- Note: Builds on the existing 800 ms draw-in. Slow-motion on the kill is optional and look-tested first. Boss phases and helper cap are the existing boss entry.

## Already built or in flight (marked, not ranked as new)
- Shared registry loader with named refusals: partly #5; the as-data programme is #2 and #63; magic as special-move rows is #20 (in flight); Mac and WebKit rows are #34; the gore skinning memo is #35; the ranked ladder is #67; the one gear authority is part of #13 and #27. (Numbers are the new positions.)
- Asset licence manifest and credits page: built per Lead's check, so not ranked. Dom's rule 2026-10-12 attaches to it: a new asset or row FAILS the check if its name matches a donor name list (built from the donor notes as we go).
- Already built and not repeated: the stun ladder, server replay before reward, zone-run lifetime (dropped by Strategy).

## Skipped and why
- Skill or stat gain by use, hit-chance dice, and skill-up rolls (ruling S5 is superseded): standing rule, fights are timing and contact.
- Death costs (reclaim delay, item loss, killer takes an item, XP tax): no death penalty and never gear loss.
- Mana pools and a second bar: ruling S17 chose item charges; also corpse-raising, spell-building parts, spell scrolls and fizzle rolls.
- Kill-N and collect-N objectives, daily-count boards and wagers: banned in Region 1; wagers not authorised.
- Wider sound extras (footsteps, pan and distance mixing for a fixed 1v1 camera, many-emitter merging): parked or no gain for the duel; creature growl distance gain is left for later.

## What we still do not know
- Whether Dom reopens music (parked by owner) and whether original or free tracks exist; no ambience files exist either.
- Whether the crowd-control ladder and the attacker cap are really in the code (notes mention them only in the lane state file), which several status and summon entries depend on.
- How a browser can read heat or battery on iPhone Safari; the donors only show frame caps, so the phone-care entry may only be partly doable.
- No donor note covers save versioning or respec, so the save-safety entry and the free respec rest on our own design, and stat allocation is still parked by scope.
- Licence reading is from the notes' licence lines, not a fresh read of each repo; art, sound and data terms for most repos were not checked, and counsel has not reviewed the name rule.

## Deferred by ruling (not ranked)
Text size, colour-blind-safe cues and localisation-ready strings: Strategy ruled accessibility and localisation deferred.
