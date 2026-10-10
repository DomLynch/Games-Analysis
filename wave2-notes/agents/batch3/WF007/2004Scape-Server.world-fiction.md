# 2004Scape-Server (world-fiction, WF007)

Donor: 2004Scape-Server, a TypeScript server and data pack (Lost City project; the name points at 2004). Donor tree on the VPS at /mnt/frankendom-donors/2004Scape-Server/, read over read-only ssh.
Half read: DATA PACK (data/src/scripts/ .rs2, .npc, .loc, .obj text; data/src/scripts/_unpack/all.npc and all.loc; data/src/maps/labels.txt) plus one pack-tool loader (tools/pack/map/Worldmap.ts, lines 648-661). Not read for this topic: the server engine under src/ (chat handling) and the client under public/client/ (the matching client half, same repo, not read). The paired client is not verified from the box.
Licence: code MIT (LICENSE line 1; README.md line 62). Game-derived content (names, dialogue, signs, quest text) has no stated source or licence (AU002, class C). Dialogue in the data cites a commercial game by name in places, so treat it as category-level only.

## 1. What the player sees and feels
Walking the streets, the signs say what a place is in one short line: a signpost that tells you which way is which, a shop sign with a name and a trade line, a danger sign with one word. Place names on the world map are short labels set on the terrain: some are one word, some carry a slash that splits them over two lines. NPCs in one town speak as a crowd: citizens, guards, pirates, monks, each saying a short line in a small chat box. Rumours come up as a topic in a dialogue: the player picks "I hear wild rumours" from a menu and the NPC answers with a gossip line. The Zanaris area (the area_lostcity folder) is the clearest three-line voice I found: the faerie aura that grows the crops, a meeting point of cultures, and a one-way ladder with no way back.

## 2. Why it works / is striking
- Readable at 375 wide: a sign is a name plus a one-line function ("This tells you which way is which."). Map labels are short and carry a size class (0, 1 or 2) so the big regions read first.
- One signature behaviour: a dialogue topic menu (player picks a topic, NPC answers with a rumour) instead of a shout. The rumour is a choice, so it feels earned.
- One signature sound or effect: none read in this topic (synth and jingle data not read here).
- Could be made ours at 20-30 percent resemblance: yes. The one-way gate and the three-beat zone voice are generic; the lines and names are not ours to copy.

## 3. The rule behind it
Naming grammar:
- NPC keys in the data use a base plus a numeric ladder: the key list in _unpack/all.npc starts with a base and numbered variants, for example man, man2, man3 (lines 1, 34, 67) and guard1, guard2 (lines 296, 344). Names within the list take a descriptive prefix on one base: "Giant" (6 names), "Ice" (5), "Poison" (3), "Jungle" (3), "Dark" (3). These are name tokens counted by a grep over the name lines of _unpack/all.npc (179 name lines).
- Map labels: data/src/maps/labels.txt has 107 lines in the form name, x, z, size. Size class counts: 0 for 78 lines, 1 for 21, 2 for 8. 56 labels contain a slash that splits a name over two lines. The loader (tools/pack/map/Worldmap.ts line 653) keeps only lines that start with the equals sign, passes the name text through unchanged, and writes the size as one byte. The client draws the slash; that part is not read.
- Sign objects in _unpack/all.loc: 18 Signpost blocks (desc line 5620 "This tells you which way is which."), 12 Sign blocks (shop and inn signs, for example the inn line at line 5738 with the form "<name> - <licensed trade line>"), 1 Danger sign (line 5615, one word). Counts from a grep over .loc, .obj and .npc files under data/src/scripts; all Signpost hits are in all.loc.
- Faction map: 75 data files mention Zamorak, 47 mention Saradomin, 30 mention Guthix. The Mage Arena folder carries the most (8 files). The NPC category list (all.npc) carries monk_of_zamorak (line 4934, 3 rows) and guard (2 rows), citizen (6), pirate (4), barbarian (2). The faction map is thus by zone and by NPC category, not one global map.
- Zone names: 30 area_* folders plus areas_heroes_guild and monastery (32 zone folders). The zone name is the folder name; the in-game name is in the label list.

Rumour and sign text:
- Dialogue volume (grep line counts over data/src/scripts, 1,159 .rs2 files): lines with chatnpc 7,076, chatplayer 4,968, mes 3,566. Lines that mention a rumour, hearing, or "they say" 72.
- A rumour is a player-chosen topic: a p_choice menu offers "I hear wild rumours about a prince" (area_alkharid/scripts/osman.rs2 line 12). The chosen branch (line 18) has the player say it, and the NPC answer on line 19 says the subject is away and points to a named next NPC. So a rumour is a breadcrumb that routes the player to the next character. Another NPC closes a rumour with "There's always someone ready to spread rumours." (area_draynor/scripts/lady_keli.rs2 line 22). A plague rumour is a story hook in area_ardougne_west/scripts/mourner.rs2 line 109.
- Provenance marker: lady_keli.rs2 line 13 contains a line that names a commercial game. Treat dialogue as data for category shape only.

Zone telling a story in three lines (Zanaris, area_lostcity):
- Line 1, a world rule: the plants grow in the aura of faerie, so there is no sunlight need (area_lostcity/scripts/fairy_queen.rs2 line 5).
- Line 2, an identity: Zanaris is a meeting point of cultures (fairy_queen.rs2 line 8).
- Line 3, a commitment: the ladder leads out of Zanaris, and once passed you cannot return that way (area_lostcity/scripts/ladder_fairy.rs2 line 9). The ladder then teleports the player out (line 18).
- The shop title is "Zanaris General Store" (area_lostcity/configs/lostcity.npc line 159).

## 4. For Frankendom
- 700 zones as data: each zone gets a name, a size-class label, and one sign per junction from one grammar (place + function). Labels become data rows with a size field, and the slash split becomes a two-line field.
- 100 Pit characters reused across zones: the descriptive prefix on one base family (Giant, Ice, Poison, Jungle, Dark) is a naming field, so a single family reads as a region variant without new art.
- Many-vs-one: the faction map by NPC category (monk, guard, pirate) is a faction field the engine reads for the hate list; the name is presentation.
- Server-verified events: the rumour is a dialogue topic whose answer is server data. The engine decides what the NPC says from the choice; the client only shows it.
- Keep: sign as name plus one line; a zone voice of three lines (world rule, identity, one-way gate); the rumour as a topic choice; label size class 0-2 with the slash split.
- Change: all dialogue text (ours); the faerie wording and the Zanaris identity (ours); the trade-line sign format (ours); no copies of the donor's sign or NPC names.

## 5. Five-minute look test
Build one zone entrance with three lines (world rule, identity, one-way or one-gate line) and one junction sign in the same style. Place it on the phone at 375 wide next to a current Pit zone label. Dom checks: does the sign read in one glance, does the zone voice tell him where he is in three lines, and does the one-way line make him stop before stepping through. Compare the label with a slash split against a single line.

## 6. Licence and IP
Code: MIT (LICENSE line 1; README line 62). Game-derived content: no licence line and no source statement in the repo (AU002). Treat all names, dialogue, signs and quest text as class C. Inspiration stays category-level: "a one-way gate that ends a zone voice" and "a rumour as a dialogue topic" are structures; the donor names and lines are not reused. Recreate as a distinct original, naming the kept trait (three lines, one-way gate, rumour topic) and the changed trait (our world rule, our identity, our gate name).

## 7. Gaps and half read
- Half read: data pack (scripts, all.npc, all.loc, labels.txt) plus the pack-tool loader. Server engine chat handling not read. Client half (public/client) not read.
- Not read: the bodies of most of the 1,159 .rs2 files (counts only, plus the lines cited), the 116 .npc configs beyond lostcity and osman, the full all.loc sign list beyond the blocks cited, the Worldmap client drawing of labels, the wilderness depth text (already in DC002, not re-read here), the synth and jingle sound data for speech.
- Not in this half: death and respawn presentation, loot reveal ceremony, idle animation vocabulary, walk density (spawns are in per-area .npc configs, not read for this topic), readability of the chat box at 375 wide (client-side).
- Counts are grep counts over the data pack (line hits, not de-duplicated); the name-token counts are token occurrences over the name lines.
