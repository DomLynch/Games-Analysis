# crawl-crawl (Dungeon Crawl Stone Soup): world-fiction design note (WF001)

Donor root (VPS, read-only): /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/
Half read: DATA PACK only (dat/database, dat/dlua, dat/des, dat/descript, dat/mons). The C++ engine half (src/) is in the same tree and was NOT read, so anything about how gods, factions or ally rules behave in the engine is '(not read)'.
Counts come from wc, grep and awk run on the VPS in this session. Nothing copied beyond short titles.

## 1. What the player sees and feels (375 wide)
- A level tells you it has life before you see it. Out of sight, a monster noise arrives as a line of text in the message log, phrased as "you hear" a sound. In sight, the same sound event becomes a named creature doing the sound. Two wordings, one event.
- Walls carry graffiti signed by a type of author (an orc, a generic human, an ancestor, or a rare one). A wall reads like a past visitor left it, and the signature tells you who.
- A vault or event with a clock speaks in a rising tone. The noise line changes its adjective as the timer runs down (stately, then brisk, then urgent, then frantic), and its distance word changes as you get closer (very distant, distant, nearby, very nearby). The player hears a countdown without a HUD timer.
- Uniques carry a title line under the name (a name, then a short epithet). Ancestors and orc apostles take names from culture-tagged pools, so a named foe feels like a person, not a number.
- Unidentified rings and amulets show as an adjective plus a material (a metal or gem word). The true name is hidden until identified, so a found item is a small mystery at 375 wide.

## 2. Why it works / is striking
- Readable at 375: each line is one sentence, one event, under about 80 characters in the message log.
- One signature behaviour: the seen/unseen pair. The sound table has 52 keyword blocks, of which 24 are unseen-only and 25 are seen-only variants of the same event (shout.txt). That split is the strongest idea here.
- One signature sound: a noisemaker word with a distance adjective and a countdown adjective (lm_tmsg.lua).
- Could be made ours at 20-30 percent resemblance: keep the pair of wordings and the escalating adjective, change every word.

## 3. The rule behind it (grammar, with data fields)
Naming grammar (dat/database/randname.txt, rand_all.txt, rand_wpn.txt, rand_arm.txt, randbook.txt):
- A name is a keyword template: an adjective-or-prefix, a base noun, then "of" plus a weighted keyword. Example shape in own words: "[adjective] [base] of [group]", or "of the [group] [group]".
- Keyword groups are named blocks (headers beginning and ending with an underscore). Across the database there are 511 distinct group headers and about 747 distinct @keyword@ tokens.
- Each alternative carries a weight; the default is 10. Weight tags total 1136 across the database files.
- A generated name is capped at 25 characters and rerolled if longer (randname.txt header).
- Half of weapon and armour names use the keyword table, the rest are fully random (randname.txt header). Jewellery uses the table for one in five.
- Unidentified appearances (randname.txt, last block group): "appearance" plus "material" for ring and amulet, drawn from a metals-and-gems list.

Ancestor and person names (dat/database/monname.txt):
- 52 pool headers. 34 are culture-by-gender pools (17 cultures, male and female each). Plus an orc pool, an orc-apostle pool per type (warrior, wizard, priest), and a bland pool.
- About 850 name lines total (not de-duplicated; includes some keyword references).

Epithets and titles (dat/database/montitle.txt): 88 title blocks, each a unique's name plus a title.

Speech and sound (dat/database/monspeak.txt, shout.txt, insult.txt, monflee.txt):
- monspeak: 742 blocks, 9344 lines, verbs grouped in families (for example a shouts family and a yells family), weights on alternatives.
- shout.txt: 52 keyword blocks, 24 unseen and 25 seen.
- insult.txt: 33 blocks. monflee.txt: 2 blocks.

Graffiti (dat/database/graffiti.txt): 58 blocks, 1092 lines, 46 group headers. Author classes include any, orc, bland, non-orc, changeable, non-randgen and rare. Non-randomised names are used when a wall should look settled.

Timed messages (dat/dlua/lm_tmsg.lua, full read):
- Five remaining-time bands pick the countdown adjective (the top band is stately, the bottom is frantic). A "finished" line fires near zero.
- Five distance bands pick the distance word, from very distant down to a plain form at zero distance.
- time_messages(total, ...) spaces the message lines so each interval is 1.2 times the previous shorter interval (in the code comment). Donor interval values are not copied.
- Used by dat/des/sprint/menkaure.des (two uses of time_messages with a 27000 total). Donor number null (GPL).

Zone story: dat/descript/branches.txt (37 blocks, each a title line then about 6 wrapped lines, about 60 words). Titles include Dungeon, Temple, Orcish Mines, Elven Halls, Lair, Swamp, Shoals, Snake Pit, Spider Nest, Slime Pits, Vaults, Crypt, Tomb and Hell. Each branch is a people or beast and a place, which is a zone-as-story unit.

Factions and gods (dat/descript/gods.txt, dat/database/godname.txt, godspeak.txt):
- gods.txt has 83 blocks; the god entries cover about 27 gods, and three further blocks are power lists.
- godname.txt: 24 blocks, 23 of them with a 'lastname' key (name and title pairs).
- godspeak.txt: 195 blocks, 1612 lines. One god (Xom) has 103 of those blocks, so one voice dominates the speech table.

Monsters (dat/mons/*.yaml, 689 files with a name field; not every file is a monster-body row, the count is files with name:):
- 99 files carry the unique flag. The holiness tag split across files is roughly: nonliving 134, demonic 67 (plus 6 natural+demonic), undead 79, plant 26, holy 11.
- Example file read (agnes.yaml): name, glyph, flags list, speaks, species, shout type (shout), speed, size. This is a unique with a shout tag, showing how one data row carries voice and body.
- shout tag counts: shout 232, roar 33, hiss 24, loud_roar 16, moan 13.

Story-driven vaults (dat/des, 144 .des files): stamp names are author-prefixed (for example <author>_elf_arrival_<theme>). Arrival rooms take a theme word per stamp. Not read in full.

## 4. For Frankendom
- 700 zones as data: give each zone a branch-style card (title line, one wrapped paragraph of 3-4 lines, plus the three story lines below). The card is a row in a table; no zone needs hand-written prose at runtime.
- 100 Pit characters reused across zones: a culture-by-gender name pool shared by all zones, plus a bland fallback, keyed by a seed from the character id (seed-discipline). A Pit name is a grammar result, never a stored string per zone.
- Many-vs-one: a server-verified event (for example, a rival is coming, time left N, distance band D). The server sends the event id, the time band and the distance band; the client picks the adjective and the line from the table. The client never decides the outcome.
- Loot hiding: unidentified items show an adjective plus material from a pool; the ledger reveals the real name on identify. One rule, one line on the phone.
- Keep: the seen/unseen pair of wordings; the escalating countdown adjective; the distance word; weighted alternatives; a 25-character cap on generated names; graffiti signed by a class.
- Change: no god pantheon, no orc-specific or Xom voice; all words are ours; our own cultures and naming pools; no GPL text.

## 5. Five-minute look test (Dom on his phone)
Build three cards only, no gameplay:
1. A zone card: title line, one wrapped line, and a graffiti line signed by an author class. Compare: does the card read as one place at 375 wide?
2. A countdown: three messages for one event, with the adjective changing from distant-and-slow to near-and-urgent. Compare: does the rise feel like a clock without a HUD?
3. An unidentified item pair: one with an adjective-and-material name, one revealed. Compare: does the hidden name make the find feel like a find?
Publish to the preview folder only. No release rows.

## 6. Licence and IP
- Code: GPLv2 or later (LICENSE; README line 96 says GPLv2+).
- Text data (dat/database, dat/descript, dat/des, dat/mons): covered by the general GPLv2+ statement only (asset audit AU011, which read the files). Donor numeric values are NOT usable here (GPL, not MIT/Apache/BSD), so every data_fields donor_value is null.
- Inspiration stays at category level: a countdown with escalating adjectives, a seen/unseen pair, a culture-tagged name pool. No donor string, no donor name.
- Recreate as a clearly distinct original: keep the trait (two wordings for one event; escalating countdown adjective), change every word and number.
- No legal conclusions.

## 7. Gaps
- Read in structure and counts: dat/database name tables (keys, block counts, weights, pool headers); dat/dlua/lm_tmsg.lua (logic); dat/des header lines of elf.des; dat/mons agnes.yaml and counts; dat/descript block counts and sizes.
- Not read: the content of most name tables, monspeak, graffiti and insult lines; dat/des vault text; dat/descript prose (branches, gods, features); src/ C++ (engine half: god and faction behaviour, branch logic); the tile and title art.
- '(not read)' applies to: src/, monster prose in dat/descript/monsters.txt, lore text.
- Half read: DATA only. Engine half (src/) not read.
