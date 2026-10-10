# afritz1-OpenTESArena: world-fiction design note (WF009)

Donor root (VPS, read-only): /mnt/frankendom-donors/afritz1-OpenTESArena/
Donor/Licence: code MIT (LICENSE.txt line 1). No game assets or game text in the box (README line 9, "No game assets are distributed"). The original Arena files are user-supplied (README line 120). Clean-room fan engine.
Half read: CLIENT/ENGINE (OpenTESArena/src). DATA PACK NOT IN BOX: the exe string values, TEMPLATE.DAT and NAMECHNK.DAT are not in the repo, so every name, rumour and oath string is '(not read)'. The exe string file holds offsets only (data/exe/aExeStrings.txt). Server half: none (single engine). Paired donor with the data: none in the box.
Checked: read or grepped 14 candidate files on the VPS (see verdict.txt; 68 receipts pass the verifier). Confidence high on the code paths and table sizes (declared in ExeData.h). Confidence medium on the reroll and dedupe behaviour, which I read but did not run.

## 1. What the player sees and feels (375 wide)
- A town's tavern, shop and temple carry a sign name built from two words: a first word from a list of 23 and a second word from a list of 23 for taverns. A coastal town draws its second word from a separate sea-flavoured list.
- Equipment shops read as a type word plus a personal first name (the first name is seeded from the building's position, so it does not change between visits).
- Ask a tavern for rumours: a modal with a title and a few buttons. Ask a citizen: buttons for general talk or for work. The work answer changes with where you stand: a city answer or a wild answer.
- Ask any citizen "where is" something: the reply names the nearest building of that type. The rumour therefore points at a real sign you can walk to.
- A province's ruler is named by a seeded name. The dialogue uses the first word only. The centre province has one fixed ruler string.
- On a phone each line is short: one sign line, one rumour sentence built from template pieces.

## 2. Why it works / is striking
- Readable at 375: a sign is two words; a rumour is one sentence with a few short tokens.
- One signature behaviour: a rumour names a real, nearby entrance. The world feels connected because the story points at places the player can reach.
- One signature sound: none in the code read (data/audio/MusicDefinitions.txt is a music definition list, contents not read in depth).
- Could be made ours at 20-30 percent resemblance: keep the two-word sign grammar, the per-town no-repeat set and the nearest-entrance rumour. Change every word list and the suffix split.

## 3. The rule behind it (grammar, with data fields)
Sign names (World/MapGeneration.cpp, Assets/ExeData.h lines 127-135):
- Tavern: prefix + space + suffix. Prefix 23 (MapGeneration.cpp:2104), suffix 23 (:2105). Coastal city uses the marine suffix list (:1995). Repeat-avoidance: a seen-set of prefix/suffix hashes, redrawn until new (:2107). Pool of 529 pairs per city.
- Equipment store: prefix 20 and suffix 10 (:2117-2118), giving 200 pairs. Two tokens are substituted: a city-type token (replaced by the city type name) and a first-name token (a male first name from a local RNG seeded by building x and z, :2010 onward). Repeat-avoidance as for taverns (:2120).
- Temple: three models, each with its own prefix and its own suffix pool of 5, 9 or 10 (ModelVars at :2131). The name is prefix + suffix with no space. 24 suffixes in total across the models. Repeat-avoidance (:2135).
- Wild interiors (no city context): the same tavern and temple grammar, drawn from a per-chunk seed, with NO seen-set and NO marine list (:2214 and :2217 always read the land suffix list; :2279-2280).

NPC names (Assets/TextAssetLibrary.cpp):
- Rule table: 24 race rule sets (Race0 to Race23, TextAssetLibrary.cpp:172 onward), each with a male and a female rule list of 3 to 6 rules. Four rule kinds: pick one entry from a chunk list; a fixed string; pick with a chance; pick plus a fixed string with a chance (comment at :18-24; struct NameRule at :31).
- Chunk lists come from NAMECHNK.DAT (loader at :637, not in box). The highest chunk index used in the rule table is 57, so the file must hold at least 58 lists (count inferred from indices, not read).
- Generator: generateNpcName (:928) walks the rule list in order and concatenates the picks. Example shape from race 0 male: two given parts, a space, then two parts that read as a family part (rule table line :73). Shape only.
- Chance check: the test is (random % 100) <= chance (:953 and :964). That passes for chance+1 values out of 100, not chance. This is an off-by-one.

Ruler and provinces:
- Nine province slots (ExeData.h:409, PROVINCE_COUNT = 9 in Assets/CityDataFile.h:47). Centre province id is 8 (WorldMap/ArenaLocationUtils.h:23).
- Ruler name: seeded by the city's ruler seed (Interface/DialogueFunctions.cpp:538) and gender from the city record. Dialogue shows the first word only (get_rf, :531-548). Centre province returns a fixed string (:544).

Dialogue and rumour templates:
- Token map: about 80 '%' tokens in FunctionMappings (Interface/DialogueFunctions.h:95 onward). Tokens cover nearest tavern, temple and equipment name, ruler, direction, pronouns, and a few oath and town forms.
- Substitution (Interface/DialogueManager.cpp:285-325): scan for '%', match the longest token of 4, 3 or 2 characters, replace, then line-wrap.
- Template entries: a random index into the entry's value list drawn from the game's global RNG (:276-283). Two asks for the same line can give different text.
- NPC occupation index: ArenaRandom seeded by the NPC instance id, next(100) (:205-211). Stable per NPC; the code marks it @todo.
- Oath line: key 364 plus province id (:257-266). The centre province draws its province id from the global RNG (:264), so the oath text can change between visits.

Rumour flow (Interface/GameWorldUiState.cpp):
- Tavern rumours button (:1791).
- Citizen rumours: title, then general or work (:1682-1687). Work answer is the city line or the wild line (:3482-3486).
- Where-is options: 9 city and 9 wilderness options (ExeData.h:641-642).

Data fields (designer-tunable; donor value shown only where the number is a declared array size in MIT code):
- tavern_prefix_n: 23 (unit: entries; donor 23 declared, ExeData.h:127)
- tavern_suffix_n: 23 (donor 23, ExeData.h:129)
- tavern_coastal_suffix_n: 23 (donor 23, ExeData.h:128)
- equip_prefix_n: 20 (donor 20 declared, ExeData.h:134)
- equip_suffix_n: 10 (donor 10 declared, ExeData.h:135)
- temple_model_n: 3 (donor null)
- temple_suffix_n per model: 5, 9, 10 (donor null)
- city_dedupe: true; wild_dedupe: false (flags)
- npc_chance_pct: the rule's chance, integer 0-100 (donor null)
- chance_test: strictly less than (donor: <=, a defect)
- province_slots: 9; centre_slot: 8 (donor 9 and 8)
- oath_base_key: 364 (donor null, string key only)

## 4. For Frankendom
- 700 zones as data: each zone carries a name seed (its id) and two word pools (land and coastal). Sign names are built at zone load from the seed, never rolled on the client.
- 100 Pit characters: a name rule set per culture (the donor uses 24 rule sets with two genders each; we would use about six to eight cultures). The character id is the seed. The rule table is data; the chunks are our own.
- Rumours and sign text are client presentation, but the server picks the text id from a seeded roll (zone id and NPC id). The donor's global-RNG reroll must not be copied, or two players on one ledger would see different rumours.
- "Where is" answers point at a real, named entrance in the zone data. The nearest entrance is found by the zone graph, not by a text table.
- Province slots map to our 9 world regions; the centre slot is a fixed region with one fixed ruler line.
- Keep: two-word sign grammar, per-zone no-repeat set, seeded first-name tokens, nearest-entrance rumour, first-word-only ruler line.
- Change: our own word lists; fix the chance off-by-one; always-seed the oath line; no wild-path skip of the dedupe set; add a diegetic fallback line in place of "<no nearby ...>" (DialogueManager.cpp:225, :238).
- Engine: names and rumour text are presentation. Authority over which text is shown sits on the server ledger. Row 20 (catalogue as runtime source) and row 21 (catalogue fields) for the word pools and rule tables. Row 14 (HUD) for the sign and rumour card.

## 5. Five-minute look test (Dom on his phone)
- Build: one flag on the existing zone card that shows three lines at 375 wide: a tavern sign (two words), a rumour sentence built from the seeded pick, and a "where is the forge" line that names a real nearby entrance.
- Compare: (a) revisit the same zone: sign and rumour must be the same; (b) two zones, one coastal flag on and off: the second word changes; (c) ask the same citizen twice: the same line, not a reroll. Publish to /preview/ with no release rows.
- Target file: src/fight/zone-names.ts (proposed; does not exist; the name generator is not a fight module, so Lead may place it elsewhere). Parity row: 20 (catalogue as runtime source).

## 6. Licence / IP
- Code: MIT (LICENSE.txt line 1). Code may be adapted with the MIT notice kept. The grammar shape (two-word sign, seeded tokens, no-repeat set) is the idea; no donor code is copied in this note.
- Content: the word lists, rule chunks, rumour text and ruler names are NOT in the box and come from the user's own game files. Class D for us. Use category level only: "a two-word tavern sign with a second word that changes on the coast".
- Trait kept: two-part sign grammar, per-town no-repeat set, seeded first name, nearest-entrance rumour. Trait changed: every word, our own suffix split, our own rule chunks, and the defects above fixed. No legal conclusion.

## 7. Gaps
- Not read: exe string values (only offsets in the box); TEMPLATE.DAT contents and entry count; NAMECHNK.DAT contents (count inferred from indices); the audio definitions in depth; the city layout code in ArenaCityUtils beyond the name calls; the wild chunk generator beyond the name calls.
- Half read: client only. The original data pack is not in the box and is not paired.
- Not present in this donor: idle or ambient behaviour, death and respawn presentation, loot reveal ceremony, walk density, 375-wide readability tests.
- Defects found and fix (keep the idea, fix the defect):
  1. Chance check off by one: (random % 100) <= chance gives chance+1 out of 100. Fix: use `<`. (TextAssetLibrary.cpp:953, :964)
  2. Template lookup returns a neighbour silently: lower_bound then only an end() check, so a missing key returns the next key's entry. Fix: test iter->key == key and log or fall back. (TextAssetLibrary.cpp:213-218)
  3. Substitution rescans inside inserted text: the search resumes at index + token length, which lands inside a longer replacement. Fix: advance by replacement length. (DialogueManager.cpp:313, :321)
  4. Wild path skips the no-repeat set and the marine list. Fix: give the wild path the same dedupe and coastal flag (MapGeneration.cpp:2214, :2217, :2279).
  5. Repeat-avoidance loops with no cap: the do-while redraws until a new pair appears, with no limit (:2107, :2120, :2135). Fix: cap the attempts and fall back to a duplicate.
  6. Centre-province oath draws from the global RNG (DialogueManager.cpp:264). Fix: seed from the world seed.
  7. Debug-style fallback strings reach the player (DialogueManager.cpp:225, :238). Fix: diegetic fallback line.

Best transferable idea: a two-word sign grammar with a per-zone no-repeat set and a seeded first-name token, where every rumour points at a real entrance the player can walk to.
