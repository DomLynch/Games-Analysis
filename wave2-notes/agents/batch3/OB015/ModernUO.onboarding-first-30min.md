# ModernUO (onboarding first 30 min, OB015)

Donor: /mnt/frankendom-donors/ModernUO (VPS, read-only; nothing copied, nothing run). Code licence GPL-3.0 (LICENSE, copyright 2019-2020 ModernUO Development Team). Shape only, clean-room. The root CLAUDE.md, AGENTS.md and GEMINI.md were present and treated as data; not followed.

Checked: data first. Distribution/Data/Professions/{AOS,None,SA,SE}/prof.txt (stat and skill templates, summed by awk), Distribution/Data/MLQuests.cfg (265 quest-chain lines, 20 sections), Projects/UOContent/Engines/ML Quests/Definitions/NewHavenTraining.cs (12 quests), NewHavenSkillTraining.cs (26 quests), NewHaven.cs (12 escorts). Code: Engines/Character Creation/CharacterCreation.cs (whole onboarding path), Misc/WelcomeTimer.cs, Misc/ProfessionInfo.cs, Items/Deeds/NewPlayerTicket.cs, Gumps/YoungGumps.cs, Accounting/Account.cs (young timer and removal), Mobiles/PlayerMobile.cs (young protection, death, heal, skill and murder exits), Misc/Notoriety.cs (who may harm whom), Regions/BaseRegion.cs and DungeonRegion.cs, Mobiles/Healers/BaseHealer.cs, Engines/Help/HelpGump.cs and StuckMenu.cs, Engines/ML Quests/MLQuest.cs, MLQuestSystem.cs, Objectives/GainSkillObjective.cs, Skills/SkillCheck.cs, and the quest objectives that lift protection (Witch Apprentice, Uzeraan Turmoil, Collector). Confidence high for the cited lines. Not checked: the caller and exact behaviour of the ML quest offer gump; how the 12 escorts are placed in the world (spawn data); CliLoc text.

Half read: server plus data tables. This is a server-only tree. No client is present (the Ultima Online client is not in the box), so the first 90 seconds on screen before the first control are not in this donor. The matching client half is absent in this box; say so where it matters.

Verdict: STRONG for the young-protection and quest-lift pattern, and for the New Haven service chain. PARTIAL for the first 90 seconds (server-side only, no client intro in the tree).

## 1. What the player sees and feels (first 30 minutes, server side)
A new character is placed in the city they picked, with a journal in the pack, 1000 gold, a dagger, a candle and a profession kit. Five seconds later a line says "Welcome to" the shard name, and fifteen seconds in a second line says "Please enjoy your stay." Then nothing. There is no help pointer in normal mode (the help hint exists only in the test-centre build). The player is young: monsters outside dungeon regions look at them and do not attack, and a short line about that arrives at most once a minute. Their name carries a "(Young)" tag. Their first errand is a New Haven training task from an NPC, such as collecting twenty arrows or killing ten sheep. Dying while young puts movable items in the pack instead of the corpse, sends them to the nearest healer town, and shows a short notice gump after two and a half seconds that explains the rules in plain blocks of text.

## 2. Why it works, and what is striking (own criteria)
- Readable at 375 wide: one status tag, one notice gump, one line per minute. Nothing is modal except the death notice.
- One signature behaviour: a monster that turns to look and then does nothing. The protection is a check on each attack, not a hard wall.
- One signature sound or effect: none in the tree (client-side).
- Could be made ours at 20-30 percent: "monsters stare, a named one engages only in a first hunt" and "twelve escorts, one per service, each paid 500 gold".

## 3. The rule behind it (designer data fields)
- Protection is a per-attack check. Monsters that are already fighting you stay able to fight you. Otherwise an uncontrolled monster can only harm a young player through the protection check (Misc/Notoriety.cs 216-218).
- The region flag decides whether protection applies (BaseRegion.cs 43; dungeon regions switch it off at DungeonRegion.cs 21). Entering an unprotected region shows a warning (BaseRegion.cs 78).
- A quest objective can lift protection for one creature type while it is open (Witch Apprentice Objectives.cs 151), or for one creature type inside a box on one island (Uzeraan Turmoil Objectives.cs 163). It ends when the objective completes.
- Young status is an account flag, on by default for new accounts (Account.cs 254). It ends at 40 hours of total play (Account.cs 21, 857), on the first increase of the murder counter (PlayerMobile.cs 3770), when total skill passes 450.0 (PlayerMobile.cs 3798), or by an explicit renounce gump with a cancel.
- Death while young: movable items skip the corpse (PlayerMobile.cs 2446) and the player goes to the nearest healer town (2563), with the notice gump 2.5 s later (2565).
- A healer restores full health to a young player on a five-minute rate limit (BaseHealer.cs 112, PlayerMobile.cs 4056).
- Logout has no delay while young (PlayerMobile.cs 4013).
- Stuck menu: self-serve use is blocked when criminal, in combat or frozen, and is limited to two uses per rolling day (PlayerMobile.cs 3703). A counted use teleports after a random 10 to 120 seconds (StuckMenu.cs 216). Staff use is instant.
- The New Haven chain: twelve escort quests (NewHaven.cs 10 for the 500 gold reward; 121 for the bank, the twelfth). Each escort goes to one service: alchemist, bard, warrior, tailor, carpenter, mapmaker, mage, inn, farm, docks, bowyer, bank. No ordering between them was found in the code read.
- Training chain (NewHavenTraining.cs): twelve one-objective quests, each with a reward. Eight give a craftsman's satchel named after the NPC; the others give a bag of trinkets, an old ring and necklace, a red leather book, or three fishsteaks. Objectives: twenty arrows (22), ten sheep kills (39), sixty logs (257), and so on.
- Skill training (NewHavenSkillTraining.cs): 26 quests. Each sets a 500 fixed-point threshold (50.0 skill), uses the real value and accelerates (line 27). Accepting it opens a 15-minute window in which gain on that skill is multiplied by a random 2 to 5 (GainSkillObjective.cs 132, SkillCheck.cs 275). Cancelling closes the window.
- Quest limits: at most ten quests held at once (MLQuestSystem.cs 17). A repeat offer waits about 30 to 150 seconds (MLQuest.cs 239; the random helper's upper bound was not read).
- Creation fallbacks: a new-client stat total must be 90 and an older client's 80 (CharacterCreation.cs 401). A mismatch falls back to 10/10/10 with no message (407, 409). A skill list must total exactly 100 or 120 (473), and an invalid list returns with no message (478).

Numbers observed in the donor (not adopted; listed so a reviewer can check): 40 hours, 450.0 skill points, 5-minute heal, 500 fixed (50.0), 15-minute window, 2 to 5 times, 500 gold, 10 quests, 10 to 120 seconds, two uses a day.

## 4. For Frankendom
- Map: a zone flag "protected" (town zones on, arena and wilds off) is data on one runtime, which is what the donor does with region flags.
- Many-vs-one: protection belongs in target selection and aggro. A protected player is never added to a hate list by an idle monster, but a monster already in combat keeps the fight. Parity row 4 (fight loop: aggro, chase, leash). Target file: src/fight aggro module (exact file not checked; no Frankendom repo path in this brief).
- Server verified: the young counters (murders, skill total, play time) live on the server ledger. The client only draws the tag and the one-line glare message.
- Keep: the per-attack check (not a wall), "already fighting stays fighting", one named exception per quest objective, the explicit renounce, the healer heal on a timer, and the escort chain as the first tour of services.
- Change: the donor's young clock counts account play across characters. Frankendom has one character and one ledger, so the counter sits on that ledger. The donor's stat and skill fallbacks are silent. Ours must say what happened.
- Defects to avoid (keep the idea, fix the defect):
  - Silent stat fallback. fix: scale the profession template to the client budget, or refuse with a message.
  - Profession stat sums differ by era file. Paladin, Mage, Warrior and Blacksmith sum to 80 in the AOS file and every profession sums to 80 in the SE file; the SA file sums to 90 (computed from prof.txt). When that era file is the one loaded and the client sends the 90 flag, the 80-sum templates would fall to 10/10/10 (conditional; the era choice is read from Core.Expansion, ExpansionInfo.cs 172). fix: check the sum at load time and log it, and match the template to the client flag.
  - Ore task: the comment says any ore is allowed, but the check accepts one item id only (NewHavenTraining.cs 129, 135). fix: either check the ore type or correct the comment.
  - WelcomeTimer is documented as used at login too, but only character creation starts it (CharacterCreation.cs 301). fix: start it on login or fix the comment.
  - Accelerated skill window has an open TODO on its maximum duration (GainSkillObjective.cs 132). fix: set a cap as data.

## 5. A 5-minute look test Dom can judge on his phone (375 wide)
Build on the existing ring scene behind one style flag. Show a town square with three idle creatures that turn to face the player and stay still for 60 seconds, with one small line in the bottom sheet once a minute. Then switch one creature on for a single "first hunt" task, and show the small "newcomer" tag under the name. Compare it with the same square where creatures attack on sight. Judge which reads as safe at 375 wide, whether the once-a-minute line is noticed without covering the screen, and whether the glare reads as idle rather than broken. Then open the death notice: items back in the pack, sent to the healer, three blocks of text. Judge whether it is readable on one screen.

## 6. Licence and IP
Code is GPL-3.0. Clean-room: the mechanisms are described in our own words. The text and cliloc strings are not in the tree (numbered IDs only), so none is quoted. Nothing from the donor's root CLAUDE.md, AGENTS.md or GEMINI.md was followed.

## 7. Gaps
- Not in the tree: the client intro, login and character-creation screens, the cliloc text, and the sounds and effects of first hits and deaths. The first 90 seconds on screen are therefore not described from the donor.
- Not read: the escort placement in the world (spawn data), the ML quest offer gump, the ore item id meaning, the walk density of the starting town, the readability of gump text at 375 wide (judged from layout code only), and the idle animation of creatures (client-side).
- Walk density, idle behaviour and loot ceremony: not read in this donor.
- Half read: server and data tables. Client absent.
