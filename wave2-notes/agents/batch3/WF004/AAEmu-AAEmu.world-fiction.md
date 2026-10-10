# AAEmu-AAEmu (world-fiction, cell WF004, batch 3)

Donor: AAEmu-AAEmu, VPS read-only tree /mnt/frankendom-donors/AAEmu-AAEmu/
Licence: conflicting in the repo (README.md lines 33-46 say LGPL v3; LICENSE.GPL is GPL v3; LICENSE.MIT is MIT), recorded as conflicting in AU002. Data files carry no licence line. README line 48: not affiliated with XLGames. Verdict is clean-room, shape only: no faction names, place names, bubble text or NPC names copied.

Checked: AAEmu.Game/Models/StaticValues/FactionsEnum.cs; Models/Game/Faction/SystemFaction.cs (GetRelationState); Core/Managers/World/FactionManager.cs (loader); Models/Game/Units/BaseUnit.cs (CanAttack); Models/Game/Char/Character.cs (GetCrimeState, InfamyPoint); Models/Game/Crime/CrimeKind.cs, TrialStep.cs, TrialSentenceResult.cs, TrialJuryBox.cs, CrimeEvent.cs, BountyDescription.cs, TrialData.cs (jail time, verdict, step entry); Core/Managers/TrialManager.cs (timer constants, UpdateTrialStates, jury seats); Scripts/SubCommands/Crimes/CrimeAddPointSubCommand.cs; Models/Game/DominionData.cs (fields); Models/Game/Skills/Effects/SpecialEffects/DeclareDominion.cs; Core/Packets/C2G/CSUpdateDominionTaxRatePacket.cs; Models/Game/AI/v2/Behaviors/Common/TalkBehavior.cs (greeting); Data/Doodads.xml and Data/Creatures.xml (name rows, counted); Data/Worlds folder list (from DC003). Confidence: high on quoted lines; medium on doodad name counts (name-attribute regex, not hand-checked for false hits).

Half read: server code and the name tables. The matching data half is NOT in the box: system_factions and system_faction_relations rows, zone faction ids, quest and dialogue rows, and the localisation strings live in compact.sqlite3, which is not in the repo (AU002, DC003). Faction names come from a localisation lookup (FactionManager.cs line 51) whose table is not in the box.

Depth: full on the crime, court, faction and greeting mechanisms; thin on sign text (names only, no text in the box).

## 1. What the player sees and feels
Walk into a nation's town and the townsfolk are friends, neutrals or enemies depending on the faction you carry. Their safe zone stops a fight from starting there unless you are flagged. Commit a crime and a wanted mark appears; if you are taken, you are held in a jail room until a court room is free. Five jury seats vote on a sentence, and the verdict is shown as a countdown. An NPC that sees you nearby greets you once every five minutes with a speech bubble and a sound, and the line it picks depends on your level: a new player can be given a higher-weight line than a veteran (the weight meaning is the code's, the wording is not in the box). The data holds signs, notice boards and tombstones as prop rows (285 sign-named rows, by name only; no sign text in the box).

## 2. Why it works and is striking
- Readable at 375 wide: one speech bubble, one wanted mark, one countdown, one verdict line.
- One signature behaviour: a five-seat jury tally that maps to one of five sentence grades (0.2, 0.5, 0.8, 1.0, 1.2 of the base). The crowd sets how bad it is.
- One signature sound or effect: the greeting sends a sound packet along with the bubble (TalkBehavior.cs line 106 onward). The sound id is data, not in the box.
- Could be ours at 20-30 percent resemblance: an attitude table with three root stances (friendly, neutral, hostile) that a sub-faction inherits from its mother faction, and a safe-zone rule tied to the zone's faction.

## 3. The rule behind it
### 3a. Attitude and attack (faction map)
- FactionsEnum (FactionsEnum.cs lines 3-26): three root stances (Friendly 1, Neutral 2, Hostile 3), four nations, two nation alliances, two teams, and several non-player factions. 17 values in total.
- GetRelationState (SystemFaction.cs lines 24-71), in order: (1) if this faction's root is a stance (neutral, friendly, hostile), that stance wins (lines 32-40); (2) if the target's root is a stance, that wins (lines 43-51); (3) same root gives friendly (line 53); (4) if this faction has a mother faction, the mother's relation table decides (lines 57-66); (5) otherwise this faction's own table, default neutral (line 70).
- The relation is directional: A's view of B can differ from B's view of A (the first root check wins for each viewer).
- CanAttack (BaseUnit.cs lines 53-125): a character cannot attack a target whose mother faction equals the zone's faction (line 75-78, "protected by mother zone"). A player cannot attack a player of the zone's faction unless the attacker is actively hostile or the target has the Retribution flag (lines 86-92). A flagged target is attackable by a friendly attacker not on the same team (line 95). Otherwise the attack is allowed only when the relation is Hostile (line 125).
- Data fields: root_stances 3; faction_count 17 (enum values); zone_faction_id (per zone, data not in box); default_relation neutral (line 70).

### 3b. Crime, wanted and court
- CrimeKind (CrimeKind.cs lines 3-11): None, Assault, Murder, Theft, BotReport, FalseBotReport.
- Wanted state (Character.cs line 3050 onward): 0 clean, 1 wanted (Wanted buff), 2 held for trial (ForciblyAwaitingTrial buff, line 3053-3054).
- Jail time (TrialData.cs CalculateJailTime, lines 85-132): each evidence event adds minutes by kind: Murder 20 (line 106), Theft 8 (line 109), Assault 0 (line 103). A victim below level 30 multiplies the event by 10 (lines 115-117). The sum is multiplied by an infamy factor (line 123). A pirate defendant is set to a fixed 40 minutes (lines 124-126).
- Verdict (TrialData.cs FinalizeVerdict, lines 394-485): votes are counted per sentence key. Keys 0 and 1 are not guilty. Keys 2 to 6 map to the grades Guilty1 to Guilty5 with multipliers 0.2, 0.5, 0.8, 1.0, 1.2 (lines 447-466). With no votes the default key is 3, which is Guilty2 at 0.5 (line 420).
- Step timers (TrialManager.cs): trial init 10 s (line 29); awaiting jury summons 2 min, skipped at once if the jury queue is empty (lines 199-205); confirm criminal record 5 min; closing statement 1 min; jury verdict 1 min; end of trial 30 s constant (line 34), which is set at lines 736 and 800 (the functions around them were only partly read). On the normal verdict path the end step uses the 1 minute jury constant (line 256).
- Jury seats: five (TrialManager.cs line 507, loop 1 to 5).
- Data fields: jail_minutes per kind: murder 20, theft 8, assault 0 (unit: minutes); low_level_victim_multiplier 10 (victim level below 30); victim_level_threshold 30; pirate_fixed_minutes 40; infamy_divisor 1000; default_jail_minutes 15 (TrialData.cs line 39); verdict_multipliers 0.2, 0.5, 0.8, 1.0, 1.2; default_vote_key 3; init_seconds 10; summons_minutes 2; confirm_minutes 5; closing_minutes 1; verdict_minutes 1; end_seconds 30; jury_seats 5.

### 3c. Dominion (territory and tax, declared by an expedition)
- DeclareDominion (DeclareDominion.cs): an expedition declares on a house (lodestone). The new dominion starts with tax rate 50 (line 48), national tax rate 500 (line 60), and three money pools (house tax 500000, hunt tax 9000, peace tax 300000; lines 51-53). The unit of the rates is not stated in the code.
- The dominion tax-rate update packet from the client is log-only (CSUpdateDominionTaxRatePacket.cs lines 8-14). The rate is not stored or applied in the code read.
- Data fields: dominion_tax_rate_start 50 (unit not stated); national_tax_rate_start 500 (unit not stated); pool_house 500000; pool_hunt 9000; pool_peace 300000.

### 3d. Greeting bubble (ambient NPC voice)
- Range 5 m, cone constant 0.6667 (the file's comment reads 120 of 180 degrees; how GetPlayersInRange applies it was not read), cooldown 5 min per player (TalkBehavior.cs lines 19-26).
- Event choice (DetermineEventType, lines 125-163): an enemy-seen event wins when the NPC can attack the player and the player is not friendly. Otherwise, events named OnClientGreeting and OnFriendNearSeen are compared with a level cap: under 15 gives 500, under 30 gives 300, under 45 gives 200, else 60 (lines 146-152). The highest weight not above the cap is chosen (lines 155-158).
- The bubble and a sound packet are sent together (lines 98-112). Ends the behaviour when no player is in range (line 66-67).
- Data fields: greet_range_m 5; greet_cone 0.6667; greet_cooldown_min 5; level_caps 15/30/45 with weights 500/300/200/60.

## 4. For Frankendom
- Attitude table: keep the three root stances, the mother-faction override and the directional view. Change the faction names. Target: a relations module in the engine (proposed src/fight/relations.ts; not existing). Parity row 4 (aggro, chase, leash), since the attack gate is what the engine checks before a hate entry.
- Safe zone as zone data: keep the rule that a zone's faction protects its own citizens, with the flag exception. Target: zone data field owner_faction (fits 700 zones as data). Parity row 4.
- Wanted state: keep the three states (clean, wanted, held). The court screen is too heavy for 375 wide duels; keep the wanted mark and the countdown only. Parity row: none fits; propose a row for world justice.
- Verdict tally: keep the five-grade multiplier from a vote count; it reads as one line on a phone. Change the grades and drop the jury. Parity row: none fits.
- Ambient bubble by level: keep the level cap (lower-level players get a higher cap on line weight) and the one-bubble-per-five-minutes cooldown. Target: NPC greeting in the zone actor (parity row 7, creature actor and clips, as the nearest fit).
- Dominion tax: not kept. The packet is a stub, and no economy is wired. Leave out until the ledger has a tax line.
- Signage: 285 sign-named doodad rows (word match: sign, signboard, signpost) are a ready list of readable props. Keep as a prop category in zone data; the text is not in the box.

## 5. Look test (Dom on his phone)
Build one zone with two factions and one safe zone. An NPC greets a new character at level 5 and a veteran at level 40; compare the lines the two get (the weight cap differs by level, the wording is not in the box). Then commit a theft: the wanted mark appears, and a countdown shows the minutes. Compare the attitude of a friendly townsperson and a hostile one in the same zone. Does the safe zone stop a fight that the wanted mark allows? Keep the bubbles short. The look test is shape only.

## 6. Licence and IP
- Code licence conflicting in the repo. Clean-room, shape only for everything above.
- The faction names, nation names and place names are the donor's; recreate each as an original. Keep the trait (three stances, mother override, safe zone; five grades; level-capped bubbles) and change the names, numbers and look.
- No legal conclusion is drawn about the game data or the XLGames affiliation statement.

## 7. Defects found (keep the idea, fix the defect)
1. Integer division in the infamy factor. TrialData.cs line 123: `JailTime *= (1 + (Defendant.InfamyPoint / 1000));` with InfamyPoint an int (Character.cs line 130). The factor is 1 below 1000 infamy and steps to 2 at 1000. The header comment (line 89) states a continuous 1 + infamy/1000. Fix: `1.0 + infamy / 1000.0`, round once at the end.
2. Pirate maximum exceeded after the multiplier. Line 126 sets 40 minutes. Line 465 multiplies by 1.2 for Guilty5, so the pirate's maximum sentence is 48 minutes. Fix: clamp the final sentence minutes after the grade multiplier, not before.
3. The first trial step is never held. TrialData.cs line 170 sets the step to VerifyCriminalRecord with a 10 s end time (line 171), then line 178 overwrites it with AwaitingJurySummons on the same call. UpdateTrialStates (TrialManager.cs lines 177-200) has no check for the verify step. Effect: the 10 s is not shown or held on the server. Fix: keep the verify step until its end time, then move on.
4. End-of-trial length differs from its constant. Normal path uses JuryVerdictMinutes (1 min; TrialManager.cs line 256). EndTrialSeconds (30 s; line 34) is used at lines 736 and 800, which are other paths. Fix: pick one and name it.
5. Unknown faction relation falls back to friendly. SystemFaction.cs line 65 reads "TODO not found, so enemy", but line 66 returns Friendly. The comment and code disagree. Fix: decide the default (neutral is the safer default for an attack gate), and validate the relation table at load.
6. CanAttack fails open. BaseUnit.cs lines 55-56 return true (attack allowed) when either faction is missing. Fix: fail closed, log the missing faction.
7. The greeting null check never fires. TalkBehavior.cs line 90 checks `eventType == null`, but DetermineEventType returns string.Empty (line 162), so the check is never true; the call then depends on GetEvent returning null for an empty name. Fix: test string.IsNullOrEmpty.
8. Dominion declaration does not check for an existing claim. DeclareDominion.cs line 33 comment says "Check target is not already claimed", but lines 34-35 check only the type. Fix: look up an existing dominion for the house before creating one.
9. Verdict comment rates are stale. TrialData.cs line 434 lists 0, 1/3, 1, 5/3, 9/4 while the code uses 0.2 to 1.2 (lines 449-465). Fix: move the grades into a data table and delete the stale comment.
10. Victim lookup defaults to no penalty. TrialData.cs line 115 uses `victim?.Level < 30`; if the victim is not online the test is null and the x10 penalty is skipped. Open question, not a clear bug: decide whether an offline victim counts as low level.
11. Assault yields zero jail time. Line 103 gives 0 minutes, and line 122 replaces the default with the sum, so an assault-only conviction sets 0. Open question: intended, or a missing default.

## 8. Gaps
- Not read: TrialCourtRoom.cs (76 lines), CrimeCreateSubCommand.cs, CrimeCourtSubCommand.cs and the other crime subcommands beyond the point-adjust one, Quests/Quest.cs, the Mails types, the localisation lookup, AiGameData.GetEvent (which chooses the bubble for a given weight; whether greetings vary between visits is unknown until it is read), the zone faction data.
- Content absent in the box: faction rows, zone faction ids, quest text, dialogue bubbles, sign text, respawn content beyond names (respawns.json in Data/Portal not read).
- Death and respawn presentation, loot reveal, walk density and idle animation: not read in this pass. respawns.json is named but not read.
- Half read: server code (crime, faction, greeting) and name tables; the faction data half is not in the box.

Best transferable idea (per mechanism):
- Attitude table: three root stances that override a sub-faction, with a directional view.
- Safe zone: a zone's faction protects its own citizens, lifted by an active-hostility or flag exception.
- Wanted state: clean, wanted, held, as a three-value state on the character.
- Verdict tally: five grades from a vote count, each a fixed multiple of the base sentence.
- Level-capped greeting: the weight cap falls as the player levels, so new players can get higher-weight lines than veterans; one bubble per five minutes per player.

Verdict per mechanism: attitude table STRONG (read in full; order of operations stated); safe zone STRONG (read; one defect at 6); wanted state STRONG (read; small); verdict tally STRONG (read; defects 1, 2, 4, 9); level-capped greeting STRONG (read; defect 7; GetEvent not read so variety unknown); dominion PARTIAL (declaration read, tax path is a stub); signage PARTIAL (names only).

Reuse tag: clean-room shape reuse. Brief rule served: FEEL-TASK world-fiction (faction maps, rumour and sign text, naming and zone story).

## Doodad and creature name counts (named rows, not text)
- Data/Creatures.xml: 13,382 Creature rows (DC003, not re-counted here).
- Data/Doodads.xml: root element is Creatures and the rows are doodads; 285 rows whose name holds the word sign, signboard or signpost (word match); 107 rows with board in the name (substring, not checked); 15 tombstone-named rows; 18 grave-named rows (substring); 64 book-named rows (substring, may include unrelated words).
- Data/Worlds: 18 world folders, including 15 instance folders (names listed in DC003). Instance names are compound place names (a descriptor and a place type, or a "X of Y" form). Recreate the pattern, not the names.
