# angband-angband: world-fiction design note (WF001)

Donor root (VPS, read-only): /mnt/frankendom-donors/angband-angband/
Half read: DATA PACK only (lib/gamedata, lib/screens, lib/customize). The C++ engine (src/) is present in the same tree and was NOT read, so anything about how names, charts or stores are chosen at runtime is '(not read)'. Counts come from grep, cut and awk run on the VPS in this session. No donor prose quoted beyond short titles.

## 1. What the player sees and feels (375 wide)
- The town is a row of eight fixed shop fronts with plain identifiers (general, armour, weapon, book, alchemy, magic, black market, and the home). Each has an owner from a list of 32 named owners, so the shop reads as a person behind a counter.
- Unknown things carry invented words. An unidentified potion or ring shows as a flavour word (a gem, wood or metal word). An unknown scroll shows as a made-up word drawn from a pool of 587 words. Naming is the mystery: the player learns the real name by use.
- Vaults and rooms are labelled by a type word (interesting room, lesser, medium, greater) and a depth band. Walking into a labelled room tells you how dangerous it is before you enter.
- A character's backstory is built from a chain of short phrases, three to eight per race. The chain is short, so the player reads a few sentences that feel like a life.
- The endgame is two fixed named foes, at levels 99 and 100 (quest.txt). The ladder ends in a pair, not a generated list.

## 2. Why it works / is striking
- Readable at 375: an unknown item is one short word; a shop is one line; a vault is one type word plus a depth.
- One signature behaviour: the unknown name is a pool word, not a placeholder. A scroll and a potion look equally mysterious, so the mystery is the game's signature, not a bar.
- One signature sound: none read in the data pack. Sound files (lib/sounds, 213 mp3) and sound.prf are the audit's reference (AU004). Not opened here.
- Could be made ours at 20-30 percent resemblance: keep the pool-word unknown name and the race-chained backstory; change every word and the number of chain steps.

## 3. The rule behind it (grammar, with data fields)
Naming (lib/gamedata/names.txt):
- 1188 word lines in two sections. Section 1 has 601 words and is labelled in the file as Tolkien-style names. Section 2 has 587 words and is labelled as scroll names. Average word length is 6.8 to 6.9 letters; section 2 runs from 2 to 15 letters.
- Scroll section is the unknown-name pool. It is the reusable pattern (a pool of invented words, one drawn per unknown scroll). Section 1 is NOT reusable as words (see licence).

Flavours (lib/gamedata/flavor.txt):
- 294 flavour entries, plus 8 kind lines (which object kind a flavour attaches to) and 8 fixed lines (flavours that never change). Flavours are colour, gem, wood and metal words, so the pool reads as materials.

Backstory charts (lib/gamedata/history.txt):
- 165 charts. Each chart has one phrase line and one chart line of the form chart:id:next:roll (four colon fields).
- Each race has a fixed chain of charts (the file's header gives the chains; for example, humans run charts 1, 2, 3, 50, 51, 52, 53).
- The roll field reads as a cumulative threshold. One chart carries rolls 96, 99, 100, which I read as weights of 96, 3 and 1 percent. This reading is from the file pattern, not checked against the C source.
- Donor phrase text not copied or summarised.

Quest ladder (lib/gamedata/quest.txt): 18 lines, two fixed quests, each with name, level, race (title), and number fields. Levels 99 and 100. Fixed named pair, not a generated list.

Vaults (lib/gamedata/vault.txt):
- 161 vault entries, each with name, type, rating, min-depth, max-depth, rows, columns; 35 carry a flags field (FEW_ENTRANCES appears on 35).
- Types: interesting room 66; greater vault 27 plus 13 "(new)"; medium vault 14 plus 15 "(new)"; lesser vault 14 plus 12 "(new)". Sum 161.
- Two lines mark a block as derived from another variant ("From Zangband"). Provenance must be checked before any reuse.

Lairs (lib/gamedata/pit.txt): 40 pit entries, each with name, mon-base (a base family), alloc (allocation), room, obj-rarity, and optional spell-ban and spell-req lines. A pit is a room template with a monster family filter. Good shape for encounter-lair.

Monsters (lib/gamedata/monster_base.txt, monster.txt): 56 base families. 624 monster entries; each has a base reference line (624 base: lines). 1116 desc: lines in monster.txt (about two per monster; not verified per monster). 106 lines mention a UNIQUE flag.

Items (lib/gamedata/object.txt, artifact.txt, ego_item.txt): 375 object name lines, 138 artifact name lines, 107 ego-item name lines.

Shops (lib/gamedata/store.txt): 8 store blocks with 84 normal, 38 buy, 17 always lines and 32 owner lines; 7 turnover and 7 slots lines.

Hints: lib/gamedata/hints.txt, 112 lines. Entries not counted (file format differs from a key-per-line table).

Timed world (lib/gamedata/world.txt): 128 level records (depth list).

## 4. For Frankendom
- 700 zones as data: a zone card is a vault-style row: type word, depth band, one short line, and a shop or a lair id. Depth bands from world.txt-style records; the zone card, not the zone prose, is the thing the server sends.
- 100 Pit characters reused across zones: a backstory chain of three to four steps per character, chosen by a seeded threshold roll (seed-discipline: the seed is the character id). The same chain shape serves every character; the phrase pool differs per culture.
- Many-vs-one: a pit is a lair template (family filter, allocation, room). Our Pit fights use the same template shape: one family per room, one rarity line, optional ban and require lines for spells.
- Loot hiding: unidentified items show a flavour or pool word; the ledger reveals the real name on identify. One rule covers potions, rings and scrolls.
- Keep: the pool-word unknown name; the race-chain backstory with cumulative rolls; fixed two-foe endgame; vault type word plus depth band.
- Change: no Tolkien-style names at all; our own pools; the number of chain steps and the roll bands; our own shop owners; no Zangband-derived block without a provenance check.

## 5. Five-minute look test (Dom on his phone)
Build three cards only, no gameplay:
1. An unknown item row: a potion with a flavour word, a scroll with a pool word, a ring with a material word. Compare: does an unknown name feel like a mystery worth solving?
2. A zone card: a type word, a depth band, one short line, and a shop line. Compare: does one card read as a place at 375 wide?
3. A three-step backstory for one Pit character, using the chain shape with our own phrases. Compare: does a short chain feel like a life?
Publish to the preview folder only. No release rows.

## 6. Licence and IP
- Code: Angband licence or GPL version 2 (docs/copying.rst line 5; src/z-file.c header). The Angband licence permits copying for educational, research and not-for-profit purposes (copying.rst line 10).
- Assets: per the AU004 audit (which read docs/copying.rst), tiles and sounds carry their own licences; the data pack has the dual licence stated in headers, and "other copyrights may also apply" (copying.rst and file headers).
- names.txt section 1 is labelled Tolkien-style names in the file. Treat that section as a donor word list with third-party origin. Do not reuse its words, do not reuse its character names (quest.txt uses two such names). Inspiration stays at category level: an invented-word pool for unknown names.
- vault.txt marks a Zangband-derived block. Check its provenance before any reuse; not assessed here.
- Donor numeric values are not usable (not MIT/Apache/BSD), so every data_fields donor_value is null.
- Recreate as a clearly distinct original: keep the trait (pool word for an unknown name; a race-chain backstory with cumulative rolls); change every word, owner and number.
- No legal conclusions.

## 7. Gaps
- Read in structure and counts: lib/gamedata/names.txt (section structure and word counts), history.txt (chart structure and header comment), quest.txt (all 18 lines, keys only), store.txt (keys and counts), vault.txt (keys and type counts), pit.txt (keys and counts), flavor.txt (keys and counts), world.txt (count), monster_base.txt, monster.txt, object.txt, artifact.txt, ego_item.txt (counts).
- Not read: the words in names.txt; phrase text in history.txt; vault maps; monster and item prose; hints text; lib/screens text; sound and image files; src/ C++ (engine half: how names, charts and stores are chosen at runtime).
- '(not read)' applies to the engine half and to prose.
- Half read: DATA only. Engine half (src/) not read.
