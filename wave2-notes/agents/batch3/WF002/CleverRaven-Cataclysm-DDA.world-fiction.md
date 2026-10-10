# CleverRaven-Cataclysm-DDA: world-fiction feel note (WF002)

Read over ssh from the VPS donor tree only (read-only, nothing copied or run). Half read: DATA (JSON snippets, name pools, faction files, mapgen placements). One C++ loader checked for one mapping (src/text_snippets.cpp lines 100-116). No server or client code read for the rest.
Audit used first: AU010 (`/private/tmp/p2/wave2-haiku/batch3/AU010/CleverRaven-Cataclysm-DDA.assets.md`). Licence: CC BY-SA 3.0 (LICENSE.txt line 1).

## 1. What the player sees and feels
Walking into a ruined town, the world talks back through small paper-like cards: a billboard ad, a missing poster, a lab door sign, a faded graffiti tag, a grave label. Each one is one or two lines and is placed by the map, not written by hand per building. The same handful of surname and given-name pools make the people on the posters, the faction names and the lab staff feel like one population. Factions read as a short list with a few attitude words (they know your voice, they let you in, they kill on sight). On a 375-wide phone each card is a readable slab of text under a title bar, which is the right size for a short sign.

## 2. Why it works / is striking
- Readable at 375 wide: every sign is short (most entries are one to three lines). Good fit for a card.
- One signature behaviour: a placed sign carries a fixed category, so a lab corridor always reads as a lab and a motel always reads as a motel.
- One signature sound or effect: none in the data half. (Not read: sound files.)
- Could be made ours at 20-30 percent resemblance: yes. The category-plus-template idea transfers; the text does not.

## 3. The rule behind it
A. Name grammar. data/json/snippets/names.json defines weighted full-name forms: backer name (weight 10), given name plus nickname in quotes plus family name (weight 19), and given name plus family name (weight 171) (lines 21-32). The loader (src/text_snippets.cpp lines 107-115) maps the name pools in data/names/en.json to snippet categories: backer and given pools are gendered; family, nickname, city and world pools are not.
   Name pools in data/names/en.json (9 usage groups): nickname 1,685; family 3,045; given female 4,275; given male 1,219; backer female 7, male 111, unisex 20; city 1,158; world 20,900. The world pool's first entries look like real place names, so it is not usable as-is.
B. Sign and ad placement. Mapgen places signage with literal text per building (51 of 904 mapgen JSON files contain place_signs; 348 signage keys in total, e.g. data/json/mapgen/motel.json line 827). Snippet categories are referenced from 43 mapgen snippet slots (for example billboard.json uses the billboard ad category and the graffiti category).
C. Snippet library. 55 files in data/json/snippets/ with 5,180 text entries across the files (counted as list entries, not unique strings). Grammar: placeholders in angle brackets expand to other categories, so one template can build a whole sentence from pools. Categories include billboard ads (14 entries), graffiti (68), missing posters (51), newspapers (115), lab signage (66), grave labels (36), fliers (81), survivor notes (380), and children's notes (90). Some categories hold adult or distressing text; this note does not quote any of it.
D. Factions. data/json/npcs/factions.json: 25 factions, each with a power, a size, two opinion numbers (likes and respects) and a relations table of 113 edges in total. Seven attitude words cover almost all edges: kill on sight (94), knows your voice (82), share my stuff (71), guard your stuff (70), watch your back (69), lets you in (69), defends your space (69). A rarer share public goods appears twice.
E. Monster factions. data/json/monster_factions.json: 138 entries, grouped under 25 base factions (for example insect 25, animal 9, mutant 10, bot 7). Mood-based attitudes, not story text.
F. Faction missions. data/json/faction_missions.json: 17 camp jobs, each with a risk level (none, very low, low, medium, high, very high) and a time window.

Numbers as designer-tunable data fields are in the JSON file (data_fields). Donor values are null because this donor is CC BY-SA 3.0 and not MIT, Apache or BSD.

## 4. For Frankendom
- 700 zones as data: each zone gets a short sign set drawn from a small category list (lab, shop, notice, grave). Signs are data rows, not hand-written per zone.
- 100 Pit characters reused across zones: one name template per character, with a weighted choice of plain, nickname or backer-style form. The weights (about 171 : 19 : 10 here) are a starting point to tune, not a donor value to copy.
- Many-vs-one: faction attitude words shown on the target card (kill on sight, lets you in) set the tone of a duel before the first blow. Keep the short attitude vocabulary, not 25 factions. Five to eight factions is enough for 700 zones.
- Server-verified: the faction attitude and the sign placed in a zone come from the server's zone data; the client only shows the card. Rumours and documents unlock by server event, then the client presents them.
- Keep: category-based placement, weighted name templates, a small attitude vocabulary, one-to-three-line cards.
- Change: no real-place name pool; no adult or distressing snippet text; no 25-faction matrix; write every sign and name fresh in our own voice.

## 5. The 5-minute look test
On one phone at 375 wide, show three cards in a row: (a) one zone card with a title, a placed sign and a two-line body; (b) a faction card with three attitude words and one line of story; (c) one named character card whose name comes from the template, with a nickname version beside it. Dom judges which card reads fastest at a glance and whether the name feels like one population. Build nothing else for the test.

## 6. Licence and IP
- Code and content: CC BY-SA 3.0 Unported (LICENSE.txt line 1). README line 64 says the project has over 1000 volunteers; README line 65 says some bundled code is under other licences (not read). Share-alike applies to derived content, so we use category-level inspiration only and write our own text. No legal conclusion is drawn here.
- Names and snippets are project text (AU010 class B). The world name pool may contain real place names, so it is not used.
- Donor value fields are null (not MIT, Apache or BSD).

## 7. Gaps
- Not read: sound files; the UI code; most of the 5,180 snippet strings (sampled by category and count, not read line by line); speech.json (4,071 lines, counted only); the lab and dimensional snippet sets beyond counts; the overmap naming code path beyond the usage map.
- Half read: data only. The code half (server and client) was not read except the name-usage mapping.
- "A zone telling a story in three lines" is not covered by a dedicated CDDA file in this read; the lab and LIXA snippet sets are the nearest match (counted, not read).
- Receipts: receipts.tsv in this folder, verified with verify_receipts.py.
