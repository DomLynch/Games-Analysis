# Diablo (1996) and Diablo II (2000): design-intent brief

Source keys (used inline as URLs):
- W1 https://en.wikipedia.org/wiki/Diablo_(video_game)
- W2 https://en.wikipedia.org/wiki/Diablo_II
- GB https://gamebanshee.com/kuuqu  (Brevik GDC 2016 coverage; fetched via http://www.gamebanshee.com/kuuqu)
- MCV https://www.mcvuk.com/development-news/diablos-original-design-doc-reveals-beginnings-of-iconic-rpg/
- TG https://www.thegamer.com/diablo-2-loot-interview/
- GD https://www.gamedeveloper.com/design/how-i-diablo-ii-i-was-made-the-hard-way

## 1 Design pillars
- Randomness as the heart: a dynamic random generator for levels, set pieces, enemies and items was called the heart of the game in the 1994 pitch. [https://www.mcvuk.com/development-news/diablos-original-design-doc-reveals-beginnings-of-iconic-rpg/]
- D&D plus roguelike (Angband) in a town-and-dungeon loop; the town sits next to a multi-storey dungeon. [https://en.wikipedia.org/wiki/Diablo_(video_game)] [https://www.mcvuk.com/development-news/diablos-original-design-doc-reveals-beginnings-of-iconic-rpg/]
- Pick a class and jump in with minimal setup (inspired by NHL '94), not dozens of creation questions. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Loop of killing monsters and collecting loot, with the story deliberately secondary; "one more monster, one more item". [https://www.thegamer.com/diablo-2-loot-interview/]
- Real-time combat (switched from turn-based roughly six months in, after a team vote; Brevik prototyped it in hours/over a weekend). [http://www.gamebanshee.com/kuuqu] [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Diablo II: build "horizontally" across a large open land rather than one vertical dungeon, and fix multiplayer and class distinction. [https://en.wikipedia.org/wiki/Diablo_II]

## 2 Why players loved it
- Reviewers praised addictive gameplay, random dungeons, moody score, and variety of items, enemies and quests; online play extended replay value. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Loot was intentionally richer than roguelike drops, with a simple colour tier (white normal, blue magic up to two effects, gold unique up to six). Unidentified items stay usable. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Erich Schaefer compares the loop to a slot machine: mundane drops build anticipation so a boss burst feels bigger. The designers say the pull came from play, not payments. [https://www.thegamer.com/diablo-2-loot-interview/]
- Commercial proof: 450k+ pre-orders by Dec 17 1996, #1 on PC Data for four months, ~2.5M by mid-2001. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Diablo II: five item quality tiers (normal, magic, rare, unique, set), sockets, and the Horadric Cube; 4M sold by June 2001. [https://en.wikipedia.org/wiki/Diablo_II]
- Free Battle.net was a major success factor for II. [https://en.wikipedia.org/wiki/Diablo_II]

## 3 Pacing and progression feel
- Structure: 16 randomly generated levels under Tristram, each with a theme (catacombs = long corridors and closed rooms; caves = non-linear). [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Quests: a random number from several tiers; most optional but pay out powerful unique items; final two mandatory. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Town loop: durability loss and repair at Griswold, staves recharged in town, so every dungeon run ends with a return trip and spend. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Co-op scaling (II): up to eight players; monster health, damage and drops scale with player count. [https://en.wikipedia.org/wiki/Diablo_II]
- Ladder seasons reset progress periodically (II), giving late-game fresh starts. [https://en.wikipedia.org/wiki/Diablo_II]
- First-hour / mid / late-game curves: UNSOURCED beyond the structural facts above (no source found describing difficulty pacing numerically).

## 4 Signature features and systems
- Random level generation, random quests, tiered loot. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Three classes (Warrior, Rogue, Sorcerer) sharing most items and spells, with attribute caps. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Up to four players on Battle.net, characters saved periodically, weak anti-cheat. [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Diablo II: per-class skill trees (influenced by Civilization and Master of Orion), set items, Horadric Cube crafting, open vs closed Battle.net realms, PvP damage reduction, ladder. [https://en.wikipedia.org/wiki/Diablo_II]

## 5 Known flaws and regrets
- Original pitch had permadeath; the shipped design did not carry that (inference from pitch vs release; the pitch itself states permadeath). [https://www.mcvuk.com/development-news/diablos-original-design-doc-reveals-beginnings-of-iconic-rpg/]
- Weak anti-cheat in D1 led to trainers and editors; D2 open realms were abuse-prone, with dupes and spambots needing patches. [https://en.wikipedia.org/wiki/Diablo_(video_game)] [https://en.wikipedia.org/wiki/Diablo_II]
- Critics: thin story, repetition, ends too soon, "Gauntlet more than RPG". [https://en.wikipedia.org/wiki/Diablo_(video_game)]
- Multiplayer was missing from the build late; Blizzard South staff joined for the last six months to add it (Wikipedia says Blizzard's contract required it; Brevik's GDC coverage disputes that it was a day-one requirement; sources conflict). [https://en.wikipedia.org/wiki/Diablo_(video_game)] [http://www.gamebanshee.com/kuuqu]
- Diablo II had no complete design document, features were added by prototype-and-keep-if-fun, scope crept, and the team crunched seven days a week for nearly a year; Erich Schaefer admits management mistakes. [https://www.gamedeveloper.com/design/how-i-diablo-ii-i-was-made-the-hard-way]
- Brevik initially opposed real-time; he preferred turn-based drama. (Shows the team validated by prototype, not by taste.) [http://www.gamebanshee.com/kuuqu]

## 6 What Frankendom should take
1. Tier loot by simple colour/name class and let unidentified/unknown gear still be usable, so a drop is instantly readable mid-fight. SOURCED for the tier scheme and usable-unidentified items [https://en.wikipedia.org/wiki/Diablo_(video_game)]; applying it to fast duels is INFERRED.
2. Scale many-vs-one encounters by player count (health, damage, drops) so a group boss fight stays tense and rewarding. SOURCED mechanism [https://en.wikipedia.org/wiki/Diablo_II]; use for Frankendom many-vs-one is INFERRED.
3. Make the common drop boring and the rare drop loud (slot-machine pacing) rather than uniformly medium. SOURCED [https://www.thegamer.com/diablo-2-loot-interview/]
4. Zone loop: short run, return to hub, spend/repair/recharge, run again; and make themed zones differ in layout feel (corridor vs cave). SOURCED zone theming and town services [https://en.wikipedia.org/wiki/Diablo_(video_game)]; applying to browser session length is INFERRED.
5. Prototype risky feel changes quickly (real-time was playable in hours) and keep what is fun; do not wait on a full design doc. SOURCED [http://www.gamebanshee.com/kuuqu] [https://www.gamedeveloper.com/design/how-i-diablo-ii-i-was-made-the-hard-way]
6. Ship anti-cheat and server-held characters early for any competitive/loot economy. SOURCED problem [https://en.wikipedia.org/wiki/Diablo_II]; priority is INFERRED.
