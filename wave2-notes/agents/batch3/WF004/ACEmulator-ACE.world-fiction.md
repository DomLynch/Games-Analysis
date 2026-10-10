# ACEmulator-ACE (world-fiction, cell WF004, batch 3)

Donor: ACEmulator-ACE, VPS read-only tree /mnt/frankendom-donors/ACEmulator-ACE/
Licence: code is AGPLv3 (LICENSE; Source/lib/README.md line 1 per AU002). No asset licence line. Client data and world content are not in the box. Verdict is clean-room, shape only: no titles, book text or names copied.

Checked: Source/ACE.Server/WorldObjects/Book.cs, Player_Book.cs, Managers/AllegianceManager.cs (PassXP block, lines 176-318), Entity/AllegianceRank.cs (title functions), Managers/QuestManager.cs (solves, kill-task message), ACE.Entity/Enum/FactionBits.cs, CharacterTitle.cs (enum body counted), WorldObjects/Player_Networking.cs (society chat), Command/Handlers/AdminCommands.cs (telepoi), Database/Base/WorldBase.sql and ShardBase.sql (book, quest, POI, title tables). Grep for rumour, bulletin, signpost found no rumour or sign mechanic in ACE.Server or ACE.Entity. Confidence: high on the quoted lines; medium on the title counts (awk, two regexes disagree: 872 and 895).

Half read: server code and schema. The matching content half (weenie rows, book page rows, quest rows, POI rows, client string tables) is NOT in the box: WorldBase.sql and ShardBase.sql have CREATE TABLE only (per DC003). Client-side language DAT loader (ACE.DatLoader/LanguageDatDatabase.cs) not read.

Depth: thin on content (no text in the box), full on the mechanisms listed below.

## 1. What the player sees and feels
A shared notice is a book with numbered pages. Each page carries the name of whoever wrote it. A page marked "anyone may edit" can be rewritten by any passer-by, which turns a sign into a community wall. A lord's vassal sees a rank word that is one of ten steps, and the word changes with culture and gender. A kill task from a quest-giver prints a running line in chat: "You have killed N ..." then "You must kill M to complete your task." Three named societies each have their own chat channel, and a player can hold one society at a time. On a 375 wide phone every one of these is a single line of text, which is the right scale for the world's fiction.

## 2. Why it works and is striking
- Readable at 375 wide: the rank word and the kill counter each fit one line of chat or a nameplate.
- One signature behaviour: a stamped page. The author stamp and the "anyone may edit" flag decide who can change a shared sign. Verified in Book.cs lines 137 and 155.
- One signature sound or effect: none in the box (client side). Not read.
- Could be ours at 20-30 percent resemblance: a ten-rung rank ladder per culture with male and female forms, and a three-society split with its own chat.

## 3. The rule behind it
### 3a. Rank ladder (naming grammar)
- AllegianceTitle maps (culture, gender, rank 1..10) to a word. There are 17 title functions with 10 ranks each, so 170 title strings (AllegianceRank.cs; each function body is a switch with cases 1 to 10; rank 0 or above 10 returns an empty string).
- Two cultures share one function for both genders: Tumerok (line 36 male, line 66 female), Gearknight and Lugian. Shadowbound and Penumbraen share the Shadowbound functions (lines 32-34 and 62-64).
- Data fields: ladder_length 10; genders 2 (plus a neutral shared ladder for some cultures); culture_groups 10 (heritage groups, several sharing).

### 3b. Shared book pages (signage that can be community-written)
- A book has max pages (schema default 1, WorldBase.sql line 864) and max characters per page (schema default 1000, line 865).
- Each page stores author id, author name, author account, an ignore-author bit, and the text (WorldBase.sql page table, line 886 is the ignore-author comment: "if this is true, any character in the world can change the page").
- Edit and delete rule (Book.cs ModifyPage line 137, DeletePage line 155): allowed for the author (id, name and account all match), or when the page is marked ignore-author, or for admin and sentinel accounts. Otherwise refused.
- A new page inherits the book's ignore-author flag (Player_Book.cs line 85).
- Data fields: max_pages 1 (schema default), max_chars_per_page 1000 (schema default, unit characters), ignore_author bit (per page).

### 3c. Allegiance XP pass-up (the lord-and-vassal ledger)
Formulas as written in the code comment (AllegianceManager.cs lines 242-253) and implemented in DoPassXP (lines 265-316):
- generated = (base + scale * min(loyalty, 291) / 291 * (1 + RT/730 * IG/720)) / 100, where base and scale are 50 and 22.5 for a direct vassal and 16 and 8 for the step above (lines 276-277).
- received = (base + scale * min(leadership, 291) / 291 * (1 + V * RT2/730 * IG2/720)) / 100, with V = min(0.25 * vassals, 1.0) (line 274).
- passup = generated * received, applied to the XP the vassal earned, then recursed one level up with the smaller base and scale.
- At full time factors the code gives a pass-up from 25 percent (loyalty 0, leadership 0, V 0.25) to about 90.25 percent (both 291, V 1.0). That matches the range in the comments at lines 225-227.
- Data fields: skill_cap 291 (unit: skill points, AllegianceManager.cs line 180); real_time_cap 730 (days, line 185); game_time_cap 720 (hours, line 190); direct_base 50 (percent); direct_scale 22.5 (percent); indirect_base 16; indirect_scale 8; vassal_factor_step 0.25 (per vassal, capped at 1.0).

### 3d. Kill task (bounty line)
- The quest row has a minimum delay between completions and a maximum number of solves (WorldBase.sql quest table, lines 184-185; -1 means unlimited, read from the code at QuestManager.cs line 290 and 346).
- Each kill stamps the quest and prints "You have killed N <plural name>!" (line 619), then either "Your task is complete!" or "You must kill M to complete your task." (line 624).
- Data fields: min_delay (unit: seconds, inferred from unix-time arithmetic, not stated in the schema); max_solves (count, -1 unlimited); quest_mindelta_rate (a server property, scales min_delay, QuestManager.cs line 353).

### 3e. Three societies (faction split)
- FactionBits: Celestial Hand (0x1), Eldrytch Web (0x2), Radiant Blood (0x4) (FactionBits.cs lines 10-12). A valid mask is their union (line 15).
- Each society has its own chat channel (Player_Networking.cs line 153 onward). Society members listen to society chat only if the option is on.
- The developer commands for changing society set one society and clear the other two in the quest bits (DeveloperCommands.cs lines 3208-3211). The join rule itself lives in quest data that is not in the box.

### 3f. Teleport by point of interest name
- Points of interest have a name with a unique index (WorldBase.sql lines 166 and 170). @telepoi matches the typed name against the cache and lists all names sorted (AdminCommands.cs). Data fields: poi_name (text, unique).

## 4. For Frankendom
- Rank ladder: a ten-rung title per faction for the name card on a 375 wide screen. Keep the ten rungs and the male and female split (or a neutral ladder). Change the words and the number of cultures. Target: client name card, parity row 14 (HUD). The server computes the rung from the engine; the client only displays it.
- Shared notice board in a zone: keep the author stamp per page and the ignore-author flag. Change: every write goes through the server, and a moderation filter runs before a page is stored. Parity row: none fits (world text). Propose a new row for zone text and reads.
- Kill task: keep the counter and the two messages, and the minimum delay between completions. Fix the unlimited case (see defect 2). Target: src/fight kill event (proposed; the file name is not confirmed), parity row 18 (loot roll and XP award, server-verified kills).
- Lord and vassal pass-up: the one-ledger rule allows it as a second XP line from a vassal's kills. It costs bookkeeping per pair, so keep it only if Dom wants a social layer. Parity row 18 (XP award).
- Three societies: a fixed three-way split with one society per character and a chat per society. Fits the one-ledger ruling because membership is one field. Parity row: none fits; keep as a faction field on the character.
- Point of interest name: a unique name per landmark in the zone data, typed or tapped to travel. Fits 700 zones as data.

## 5. Look test (Dom on his phone)
Build one zone with a notice board. Three pages: one written by a named sprite, one "anyone may edit" page, one empty page. Show the author stamp under each page. Then a kill task card with the counter line, and a nameplate that reads one of ten rank words for a chosen culture. Compare: does the stamp make the page feel like a real town record? Does the ten-rung ladder read at a glance on 375 wide? Do not ship any text beyond placeholders; the look test is about shape.

## 6. Licence and IP
- Code is AGPLv3. Clean-room, shape only. Do not copy the title strings, the page text or the exact formulas' comments. The numeric constants (291, 730, 720, 50, 22.5) are design numbers and can be re-tuned.
- The README says the project is non-commercial and that a trademark has expired. Recorded as the file says, no legal reading.
- Recreate every rank word and society name as an original. Keep the trait (ten rungs, stamp and flag, three societies) and change the trait's name and look.

## 7. Defects found (keep the idea, fix the defect)
1. Allegiance time factors are pinned at their caps. AllegianceManager.cs lines 268, 269, 271 and 272 read `Math.Min(RealCap, RealCap)` and the matching lines for game time and average time. The sworn time is never read. Effect: a vassal with max loyalty and one hour of sworn time gets the same generated share as one sworn for two years. Fix: read the actual sworn real and game time for the vassal and for the average of the patron's vassals, then clamp to the caps.
2. Kill task message with unlimited solves. QuestManager.cs line 290 returns false for max_solves -1, so the else branch at line 624 prints the -1 value: "You must kill -1 to complete your task." Reachable only if a quest row has max_solves -1 (data not in the box). Fix: branch on max_solves > -1, print a different line when unlimited.
3. Book modify response always says success. Player_Book.cs line 97 stores the result in `success`, but line 99 sends the literal `true`. A refused edit still tells the client it worked. Fix: send `success`.
4. ReadBookPage is unused (Player_Book.cs line 58 says so). Fix: remove or wire it to the client for paged reads.
5. Float precision on XP. AllegianceManager.cs line 283: `(ulong)(amount * generated)` multiplies a ulong by a float, so the product is a float. Above about 16.7 million the last unit is lost. Fix: use double for the product.
6. Quest solved text is unused. WorldBase.sql quest table line 186 comment reads "Quest solved text - unused?". A text hook exists but is not wired. Fix: decide whether solved text is part of the world-fiction, then wire or drop it.

## 8. Gaps
- Not read: ACE.DatLoader/LanguageDatDatabase.cs (string tables), Player_Allegiance.cs beyond the grep hits, Confirmation.cs, the 107 .txt files, Mutations/ (item variant scripts; belongs to procgen topics), GameActionSetInscription handler (no length cap was found by grep, but the handler was not read).
- Content absent in the box: book page text, quest rows, POI rows, weenie names, title strings in the client. Sign text and rumour text cannot be assessed beyond the mechanisms above.
- Not found: a rumour mechanic. Not found: a sign mechanic (no sign object type in ACE.Server beyond books).
- Death and respawn presentation, loot reveal, walk density and idle animation: not read in this pass.

Best transferable idea (per mechanism):
- Rank ladder: a ten-rung title per faction, with a gendered form, shown on the name card.
- Shared book: the author stamp plus an ignore-author flag lets a sign be community-written.
- Allegiance pass-up: a vassal's earned XP feeds the patron through two multiplied factors (generated and received), which makes the lord's share depend on both sides' loyalty and leadership.
- Kill task: a running counter in chat with a minimum delay between completions.
- Three societies: one faction per character, each with a chat channel.
- POI names: a unique name per landmark that a player can type to travel.

Verdict per mechanism: rank ladder STRONG; shared book STRONG (authorship rule read); allegiance pass-up STRONG (with defects 1 and 5); kill task STRONG (defect 2); three societies PARTIAL (enum and channels read; the join rule is in absent data); POI names PARTIAL (names only).

Reuse tag: donor-idea reuse, clean-room. Brief rule served: FEEL-TASK world-fiction (naming grammars, faction maps, rumour and sign text).
