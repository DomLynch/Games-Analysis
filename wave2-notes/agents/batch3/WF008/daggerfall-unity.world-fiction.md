# daggerfall-unity (world-fiction, cell WF008)

Donor: /mnt/frankendom-donors/daggerfall-unity (read-only, VPS). Code licence: MIT (root LICENSE line 1 "MIT License", line 3 "Copyright (c) 2009-2023 Daggerfall Workshop"; NameHelper.cs line 4 gives the same MIT line). Game-derived data (NameGen, quest scripts, string tables) is class C in AU013: no licence file, rights holder not named. Shape only for data.
Checked: opened NameHelper.cs (full), RumorMill.cs (full), FormulaHelper.cs (building-name function, lines 2923-3122), BuildingNames.cs (full), TalkManager.cs (rumour functions 1355-1600, bulletin and filters, lines 121, 125, 2745-2749), PlayerActivate.cs (ActivateBulletinBoard 706-740), Message.cs (LoadMessage, GetTextTokens, GetTextTokensByVariant), FactionFile.cs (enums, struct, lookup and ally/enemy helpers), PersistentFactionData.cs (ChangeReputation, PropagateReputationChange). Counted data with a parser: Resources/NameGen.txt, Internal_Strings.csv, Internal_Factions.csv, Quests-Factions.txt, Quests-Places.txt, Quests-StaticMessages.txt, StreamingAssets/Quests (265 scripts), StreamingAssets/Text/Quests readme. Confidence: high on the code paths I read; medium on my message line counts (my own parse, not reconciled with the engine parser). Verdict: STRONG for the whole world-fiction cell (name grammar, rumour pool, sign, faction ripple). Half read: both (client code and the DFU data tables). Server half: not applicable (single-player). The DOS data pack (FACTION.TXT, RUMORS, TEXT.RSC) is not in the box and was not read.

## 1. What the player sees and feels
Walk into a Daggerfall town and every shop, tavern and house has a name built from two word lists, so "a shop" becomes a place with a voice. Stand at the notice board and a centred town name sits over one short rumour of what the town is whispering about. Ask a townsperson and you get at most one rumour per talk, drawn with a weight so that a quest's news can outrank background gossip. Guild halls and temples carry the name of the faction that runs them, and a faction you have helped sees its rivals and allies shift a little. The whole layer is text, so it costs nothing on a 375-wide screen: a title line, a spacer and at most three short lines.

## 2. Why it works, or is striking
- Readable at 375 wide: the board is a title, a spacer and a short rumour inside one message box (PlayerActivate.cs:716-740). Quest messages are mostly short: my count of 2,333 quest messages in the 265 QRC blocks gives 389 one-line, 578 two-line, 265 three-line and 1,073 four-line-or-more (28 empty). So a three-line budget already covers about 53 percent of the text.
- One signature behaviour: a rumour weighted toward quest news (QuestRumorWeight, default 50, range 1-100) so the player hears the live story more often than ambient gossip.
- One signature sound: none in this topic (text only).
- Could be made ours at 20-30 percent resemblance: yes. The name grammar and the notice board are generic. Keep the shape (two-part names, a centred title, one rumour), not the lists.

## 3. The rule behind it
Naming, seeded per building:
- Each building has a NameSeed. FormulaHelper.GenerateBuildingName calls DFRandom.srand(seed) (FormulaHelper.cs:2938), so the same building always gets the same name. Then a store name is a prefix from StoresA (19 items) plus a type suffix from one of 10 per-type lists. Counts from Internal_Strings.csv: GeneralStoresB 15, WeaponStoresB 10, ArmorStoresB 12, BookStoresB 8, ClothingStoresB 11, AlchemyStoresB 23, GemStoresB 10, PawnStoresB 8, FurnitureStoresB 9, LibraryStoresB 8. A tavern is TavernsA 36 x TavernsB 36 = 1,296 pairs. LivestockStoresB (9 items) exists in the CSV; I did not see a switch case for it in the part I read.
- Special cases: a bank is "The Bank of" plus the region name (singleton text); a guild hall takes its faction's name; a temple takes the name of its first child faction; the main palace names come from three fixed text ids (475-477); a city wall is a fixed label; a house for sale is a fixed label.
- Person names (NameHelper): 11 banks, 56 sets, 785 parts in NameGen.txt (the Resources copy and the StreamingAssets/Text copy are identical, same MD5). Two-part first names and two-part surnames per culture. Breton first name = set 0 + set 1 (male) or set 2 + set 3 (female), surname = set 4 + set 5: 169 x 169 = 28,561 full names per gender (my arithmetic). Nord surnames reuse the male first-name parts plus a localised suffix (NameHelper.cs:236-246). Monster names: Monster1 = 25 x (one of 16 at a 50 percent chance, or none) x 25, which is 25 x 17 x 25 = 10,625 distinct outcomes (my arithmetic).
- Macro expansion for sign and rumour text: 217 macro entries (216 single-line, 1 multi-line) in MacroHelper (Utility/MacroHelper.cs).

Rumour pool and pick:
- A common rumour is an entry with a region filter, two faction ids and a flags word. Quest rumours come from a "rumor mill N" action in a quest task (RumorMill.cs:52 adds the quest message variants to the pool with the quest id). Counts in the quest scripts (StreamingAssets/Quests, 265 files): RumorsDuringQuest 226 uses, RumorsPostsuccess 225, RumorsPostfailure 223, "rumor mill" action 13 uses across 8 files.
- One rumour per NPC per talk: maxNumAnswersNpcGivesTellMeAboutOrRumors = 1 (TalkManager.cs:125), unless the NPC is a spymaster or knows everything (TalkManager.cs:1391).
- Weighted pick (TalkManager.cs:1450-1466): each rumour gets weight QuestRumorWeight if it has a quest id, else 1. The loop is a weighted reservoir sample: the next candidate replaces the current pick with probability weight/(total+weight). Correct, but unseeded (UnityEngine.Random).
- Filters (GetValidRumors, TalkManager.cs:1468-1519): sign rumours (flag bit 1) are skipped when talking and spoken rumours are skipped when reading a sign. A rumour tied to a faction with faction flag 1 is dropped 75 percent of the time per roll (Dice100.SuccessRoll(75)).
- Sign (bulletin board): GetNewsOrRumorsForBulletinBoard (TalkManager.cs:1355-1386) only considers the 7 text ids in allowedBulletinTextIds (line 121). It then takes the first common rumour in list order (line 1363). No random choice.

Faction ripple:
- FactionData carries parent, children, ally1-3, enemy1-3, region, rep, power, ruler, flags and a race (FactionFile.cs:640-674). Children are relinked from the parent field (RelinkChildren, FactionFile.cs:879-890).
- ChangeReputation with propagate (PersistentFactionData.cs:390-440): allies get half (amount / 2), enemies get minus half. Then it climbs to the root (stopping at the Dark Brotherhood id), and PropagateReputationChange (line 448-461) recurses down the tree: the origin, the root, and questor ids get the full amount, every other node gets half.

## 4. For Frankendom
- 700 zones as data: each zone row carries a region-to-faction id, a name seed, a name bank choice, and a rumour pool (text id, weight, flags, faction ids). The server computes names from seeds and sends ids; the client only presents strings. This keeps one ledger.
- Names: prefix list x type-suffix list, seeded per building or per zone. Our own word lists, never Daggerfall's. Pit characters (100 reused across zones) can take a two-part monster grammar with an optional middle part, which gives variety from small banks.
- Notice board: centred zone name, spacer, one rumour of 1-3 short lines, chosen by weight. Keep it in one message box.
- Rumour pool: server events (a boss falls, a town changes ruler) add rumours to nearby zones, the same way the rumour-mill action does. The client never invents news.
- One rumour per NPC per conversation: a single news slot per talk session.
- Faction map: region -> faction, a tree with a ripple (half to ancestors and siblings, full to the origin), and ally/enemy triples. The ripple runs on the server in the one ledger; the client shows the new standing.
- Many-vs-one: no direct effect; a rumour can flag an encounter zone (for example a roaming boss) without changing combat rules.

## 5. Look test (5 minutes, Dom's phone)
Build one notice board in a starter zone with three rumour variants picked by weight, plus a fixed comparator. Tap the board six times. Judge: (a) does the zone name read as a place, (b) does the rumour vary, (c) does each line fit 375 wide without a fourth line, (d) does a quest rumour outrank ambient gossip often enough to notice. Compare against a board that always shows the first rumour (the Daggerfall behaviour). No release rows, no lock; a style flag only.

## 6. Licence and IP
- Code (NameHelper.cs, FormulaHelper.cs, TalkManager.cs, Message.cs, PersistentFactionData.cs, FactionFile.cs): MIT. The MIT notice must travel with any copied code. Shape only is the default; adapting code is allowed under MIT.
- Data (NameGen.txt, Internal_Strings.csv, Internal_Factions.csv, quest scripts, string tables): class C, game-derived, no licence file. Do not copy lists, names, or rumour text. Category-level only: "two-part names from a culture bank with a seeded pick", "a notice board with one rumour weighted toward quest news".
- Recreate as a clearly distinct original: keep the two-part grammar and the weighted rumour pick; change the word lists, the weights and the sign layout. No legal conclusions.

## 7. Gaps and defects (keep the idea, fix the defect)
Defects in the donor, each with fix:
1. NameHelper.cs:295 picks monsters with UnityEngine.Random.Range(8, 9 + 1), not the seeded DFRandom used everywhere else. Fix: seeded picker keyed by zone or monster seed.
2. NameHelper.cs:295 and :317: Monster3 is unreachable (the range yields only banks 8 and 9; the comment says "for now"). Fix: decide keep (weighted in) or delete.
3. TalkManager.cs:1362-1363: the bulletin board always shows the first common rumour, so it never varies and never shows a quest rumour. Fix: weighted pick over the sign-filtered list (reuse WeightedRandomRumor).
4. TalkManager.cs:1425 and :1459: rumour picks use UnityEngine.Random (unseeded). Fix: seeded pick.
5. PersistentFactionData.cs:408 and :451: amount / 2 is integer division, so a change of plus or minus 1 never reaches allies, enemies or non-origin nodes. Fix: carry the remainder, or round away from zero.
6. Message.cs:165-168: GetTextTokens(int variant) returns variant 0 for any value other than -1, so the int parameter is a trap. The only caller I saw that passes an int passes 0 (TalkManager.cs:1681). Fix: change to a bool, or index properly.
7. PersistentFactionData.cs:418 and :434: the knightly and temple branches re-enter ChangeReputation with propagate = true on a second group faction. I did not verify whether that generic faction matches the same branch (FACTION.TXT is not in the box), so a loop is possible but unproven. Fix: add a visited set.
8. FactionFile.cs:903: IsAlly and IsEnemy check only the first faction's list. Asymmetric data would give one-way relations. Fix: check both directions at load, or validate symmetry.

Not read: CityNavigation.cs, Place.cs, TextManager.cs bodies, CreateNpc.cs, TalkManager.cs outside 121-125 and 1355-1600 and 2665-2745, PlayerNotebook, the content of Internal_RSC.csv and Internal_Locations.csv (I counted them: 1,448 and 15,251 rows; numeric keys, one value each; content type not confirmed), quest script bodies beyond counts, DOS data pack (not in box), Quests-Places.txt bodies (130 entries counted), Quests-Factions.txt bodies (443 entries counted), the faction counts of FACTION.TXT (absent).
Half read: both (client and the DFU tables). Not in the half I read: none for world-fiction in the client; the DOS data pack is absent from the box.

Counts used: NameGen 11 banks / 56 sets / 785 parts; Internal_Strings.csv 990 records; Internal_Factions.csv 366 rows; Quests-Factions.txt 443 entries; Quests-Places.txt 130 entries; Quests-StaticMessages.txt 17 entries; quest scripts 265; quest messages 2,333 (my parse); macro entries 217.

Best transferable idea: a seeded two-part name grammar per building, plus a notice board that shows one weighted rumour under a centred title, with one rumour per NPC per talk.
