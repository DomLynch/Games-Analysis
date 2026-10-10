# 00-Evan-shattered-pixel-dungeon: world-fiction feel note (WF002)

Read over ssh from the VPS donor tree only (read-only, nothing copied, run or viewed). Half read: DATA (English base message files under core/src/main/assets/messages/, key names and counts, a few short titles). Code half not read beyond file listings in the levels folder, so no zone code, name generator or faction logic was read.
Audit used first: AU001 (`/private/tmp/p2/wave2-haiku/batch3/AU001/00-Evan-shattered-pixel-dungeon.assets.md`) and DC001 (`/private/tmp/p2/wave2-haiku/batch3/DC001/00-Evan-shattered-pixel-dungeon.catalogue.md`). Not repeated here except where the text side adds to them.

Protected text: the message files are class C in AU001. This note uses key names, counts and sentence counts. Story text is not copied or paraphrased beyond the structure.

## 1. What the player sees and feels
Arriving on a new zone, the player gets a short zone card of two or three sentences: the place, what changed, and a hint about the next danger. Lying around the zone are a few readable props (a shelf, a statue, a patch of rubble), each with its own one-line description. Some zones have a quest-giver who leaves notes; each note is a small page with a title and a short body, and the pages unlock in order as the player goes deeper. On a 375-wide phone each zone card is a clean three-line block, and each note is a card of its own.

## 2. Why it works / is striking
- Readable at 375 wide: zone intros are 2-3 sentences (sentence count from the body text; 363 to 512 characters per intro). Lore pages per zone are 2 sentences each.
- One signature behaviour: each zone's quest-giver writes one chained set of six notes, and they unlock in order.
- One signature sound or effect: not in the message files (sound is in sounds/ and music/ per AU001; not read here).
- Could be made ours at 20-30 percent resemblance: yes. The zone card plus chained notes is a pattern, and the text stays ours.

## 3. The rule behind it
A. Zone card. messages/journal/journal.properties has one intro per zone: five zones (sewers, prison, caves, city, halls) each with a title, a body and a discover hint (journal.document.intros.*). Bodies are 2 or 3 sentences each.
B. Region lore page. messages/items/items.properties has five region lore pages (items.journal.regionlorepage$<zone>.name and .desc). Each description is 2 sentences.
C. Quest-giver note chains. messages/journal/journal.properties has five quest-giver chains (sewers_guard, prison_warden, caves_explorer, city_warlock, halls_king). Each chain has six notes with a title and a body each, plus a discover hint, so 30 note bodies in total. Note topics are generic categories (a new position, a warning, a creature, a faction, a lost person, a dismissive line); the wording is not copied here.
D. Ghost-hero lines. messages/items/items.properties has six dialogue lines per zone (items.artifacts.driedrose$ghosthero.dialogue_<zone>_1 to _6), so 30 lines over five zones. Lines are numbered, so the order is a fixed sequence.
E. Props and room text. messages/levels/levels.properties has 97 name keys and 109 description keys in total. Room types: 34 keys over 11 room types (quest 6 types and 22 keys; special 4 types and 8 keys; secret 1 type and 4 keys). Examples of room types by id: blacksmith room, mass grave room, ritual site room, rat king room, sentry room, toxic gas room, weak floor room, vault, mine entrance, ambitious improvised room, magical fire room. Feature keys: chasm (6). Traps: 33 trap name keys and 85 trap keys in total (levels.traps.*).
F. Guides. messages/journal/journal.properties has an adventurer's guide (15 titles, 14 bodies) and an alchemy guide (10 titles, 9 bodies). Bestiary and catalogue titles also sit in this file (178 keys in total).
G. NPC talk keys. messages/actors/actors.properties has 164 NPC keys (14 NPC families with a name key). Talk lines are keyed by zone and by class (talk_prison_* for each of seven hero classes, talk_caves, talk_city, talk_halls, talk_ascent). Keys whose last part starts with "intro": 21; with "desc": 17 (counts of key suffixes, not of text).
H. Names. NPC names are fixed keys (for example shopkeeper, blacksmith, wandmaker, ratking, vault sentry), not a generated name grammar. No name generator was read.
I. Factions. None as a formal system (DC001 section 2). The message files show shopkeepers, quest-givers and the vault guardians; no faction attitude table was found in the data half read.

Counts: base English files (no locale suffix) hold 4,976 keys across nine folders (actors 1,609; items 2,073; journal 178; levels 241; misc 235; plants 67; scenes 148; ui 49; windows 376). Each folder also has about 22 locale files (not counted).

## 4. For Frankendom
- 700 zones as data: each zone gets a zone card of 2-3 lines as a data row, with an optional lore page. Five zone-tier templates (for example sewer, prison, caves, city, halls) cover the 700 zones through a shared card shape, not 700 written cards.
- 100 Pit characters reused across zones: each character keeps one fixed name, and the zone card only changes place and hint. Quest-giver chains give six notes per character, not per zone.
- Many-vs-one: the ghost-hero lines (six per zone) are a pacing device for a zone, not combat. Keep the numbered sequence; it can unlock as a server event after a kill count or zone clear.
- Server-verified events (our design, not Evan's code): each note unlock is a server event in the ledger, for example after a named milestone such as a zone clear. The client only shows the card.
- Keep: 2-3 line zone card, six-note chain per character, one prop line per prop, numbered ghost lines.
- Change: no real text copied; our own voice and our own names; no protected message strings; the note topics must be re-written, not reused.

## 5. The 5-minute look test
On one phone at 375 wide, show the same zone twice: (a) a zone card with a two-line body and a title, (b) the same card with a three-line body and one prop line under it. Then show one quest-giver note card with its title and body. Dom judges whether the three lines read in one glance and which card feels like a place.

## 6. Licence and IP
- Code: GNU GPL v3 (LICENSE.txt lines 1-2; source headers say version 3 or later).
- Assets and text: no asset licence file in the repo (AU001). Art, music and sounds are credited by name in AboutScene.java only. The message files are protected text (AU001 class C). Use for inspiration only; we write originals.
- Category-level inspiration only: a zone card, a chained note set, a numbered sequence. No protected sentence, title or name is carried over.

## 7. Gaps
- Not read: the zone and quest code (levels/*.java beyond names), the room and painter code, the trap code, faction or name code (none found by listing), locale files, the full AboutScene credits.
- Message values were not opened one by one. Counts are from key lines; sentence counts are from the intros and lore bodies only.
- Half read: data only (message keys and short values). Code half not read.
- Receipts: receipts.tsv in this folder, verified with verify_receipts.py.
