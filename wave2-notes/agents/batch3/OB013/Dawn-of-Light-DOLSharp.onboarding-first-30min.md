# Dawn-of-Light-DOLSharp (onboarding-first-30min, cell OB013)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp` | Licence: GNU GPL v2 or later (LICENSE; gplheader.txt line 7) | GPL: clean-room, shape only | Half read: SERVER (GameServerScripts quests and startup, dbupdater XML, language table). Client half not in this repo.

Checked: Verdict STRONG. Opened and read the quest scripts Albion/ANewHeroesWelcome.cs, Albion/MovementAndInteraction.cs, Albion/CityOfCamelot.cs (steps, rewards, assistant), Albion/ChildsPlay.cs (statue area, reward branch, FinishQuest), Albion/GreetingsArmsman.cs (levels, reward block, whisper steps, commented kill hook), startup/script/CreationStartupEquipment.cs, startup/script/CharacterCreationSettings.cs, startup/script/StartAsBaseClass.cs (property lines), dbupdater/insert/StartupLocation.xml and Zones.xml (row counts and first rows), GameServer/language/EN/Quests/Albion/ANewHeroesWelcome.txt (13 lines). Confidence high for the quest mechanics (read in full or in cited ranges). Not read: client, NPC and mob templates, StarterEquipment rows.

Best transferable idea: a three-beat opener (walk into a ring, whisper one keyword, tap the instructor) where each quest step is a server-side trigger and the journal line names the control to use.

## 1. Mechanism (what the player sees and feels, 375 wide)

- Start: a new character appears at the realm start row (RealmID 1 row: region 27, x 95638, y 101322). The string table names that town as Cotswold. The quest giver Lord Stamford stands about 128 coordinate units away in x (x 95510, y 101313). The client UI before any control is not in the half read.
- Quest 1, Movement and Interaction (levels 1-10, no reward). Stamford's journal line says to speak with him about your training. A whisper with the word "training" moves the quest on. The next line tells the player to left-click the large doors behind Stamford, enter the courtyard and right-click Master Gethin. Walking into a 200-unit circle at Gethin's courtyard advances the step. Right-clicking Gethin finishes it. The journal text is in plain control verbs, as the donor writes them for a PC client.
- Quest 2, Child's Play (levels 1-4). Entering a 500-unit circle at the Albion statue (region 489) sets step 2 with a warning dialog. Talking to Charles then gives a starter armour set chosen by class, with a centre-screen message and a small XP and money grant.
- Quest 3, City of Camelot (level 1 only). Bombard, the Stable Master, gives a chest of coins, a scroll and a necklace for 7 XP. Using the necklace summons a temporary "<name>'s Assistant" NPC with a spell-cast visual. The assistant offers a destination menu of six places: four class trainers, the Vault Keeper (bank) and the main gates. The player carries items between NPCs: coins to the Vault Keeper, a receipt back to Bombard, a letter to Master Frederick. Some steps wait for an NPC to "finish" (the player re-asks with a keyword). Reward: 26 XP, one of two armour items (shield if the class can use it, otherwise a bracer) and a money grant with a random term (`Money.GetMoney` call; its argument meanings were not read).
- Quest 4, A New Hero's Welcome (levels 1-5). Master Claistan offers it, and the herald Pompin the Crier closes it. The reward is a recruit's cloak given as a basic item (no choice), 22 XP and 100 percent of the money share.
- Quest 5, Greetings Armsman (levels 1-10). The captain teaches the five combat-style words by whisper (Crush, Slash, Thrust, Shield, Polearm). Typing "done" moves to step 2. Then the player picks one of six starter weapons, 22 XP, 18 percent money share.

## 2. Why it works / is striking

- Readable at 375 wide: each step is one journal line with one verb ("right-click", "enter", "[done]") and bracketed keywords the player taps or types.
- One signature behaviour: the Camelot Assistant's six-place travel menu. Each service (bank, trainer, gate) is introduced by visiting it on its own, one per trip.
- One signature sound or visual: the assistant's spell-cast animation on the necklace (`SendSpellCastAnimation`), and an NPC thinking emote (`eEmote.Ponder`) while the letter is read. The sound itself is not in the server half.
- Could be ours at 20-30 percent resemblance: a short ring walk, one whisper word, then a six-pin service map that opens one pin per errand.

## 3. The rule behind it

- A quest is a step counter. Triggers are Interact, WhisperReceive with a word, EnterArea with a radius, and GiveItem to a named target. Actions are GiveQuest, IncQuestStep, Talk, FinishQuest (movement quest, `MovementAndInteraction.cs` lines 186-219).
- Level window: each quest has min and max level. The City of Camelot quest closes at level 2, so the first hub tour is a built-in deadline.
- Reward ladder: XP on accept, XP on finish, a basic item or one optional item from a list (ChoiceOf = 1), and a money share.
- Data fields (all donor values are GPL, so donor_value is null):
  - area_radius_units: 200 (training courtyard), 500 (statue area)
  - level_min / level_max: 1/10 (movement), 1/4 (child's play), 1/1 (City of Camelot), 1/5 (welcome), 1/10 (greetings)
  - xp_on_accept: 7 (City of Camelot), 0 otherwise
  - xp_on_finish: 26 (City of Camelot), 22 (Welcome, Greetings), 2 (Child's Play)
  - money_copper_fixed: 67 (Child's Play); City of Camelot uses a Money.GetMoney call with a random term up to 50 (argument meanings not read)
  - money_share_percent: 100 (Welcome), 18 (Greetings)
  - choice_count: 1 (Greetings, one of six optional weapons), 0 (Welcome: basic cloak only; Child's Play: class decides)
- Starter kit: free starter equipment is on by default (`ENABLE_FREE_STARTER_EQUIPMENT`, default true). Gear rows are per class (class 0 means all). Starting level default 1, starting money default 0 copper, starting bounty points default 0.
- Class-branch gear (Child's Play): Rogue, Acolyte and Mauler get leather; Fighter gets studded; other classes get padded. Six pieces each.

## 4. For Frankendom

- Shape match: 700 zones as data fit the quest-offer and area-trigger tables (zone rows, 473 in the data file read here). The 100 Pit characters can serve as the NPCs that carry the errand text. The server owns the step counter; the client only shows the journal and the centre message.
- Keep: the level window as a deadline, the one-verb journal line, the six-place service menu introduced one trip at a time, the one-word whisper lesson, the class-chosen starter set.
- Change: the City of Camelot chain is ten steps with NPC waits. Frankendom's first 30 minutes should use three to five steps, each a visible in-world action. Replace PC verbs with tap verbs. Replace the typed whisper with a tap on a named chip. Drop the "wait for NPC" steps: the server should finish them.
- Target (proposed, file does not exist yet): `src/fight/award.ts`, row 18 (loot roll and XP award). The quest-step trigger is server-side and sits outside the fight engine.

## 5. Five-minute look test (phone)

Build a 375-wide mock with four beats: (a) a ring with a 200-unit-equivalent border, walk in and the journal line changes; (b) one tap-chip labelled with the word "training" replaces the typed whisper; (c) a six-pin service sheet where pins appear one per errand; (d) a reward card with the class-chosen starter set and a centre-screen line. Compare: can Dom find the next tap within 10 seconds on each screen, and does the journal stay at two lines?

## 6. Licence / IP

- Code: GPL v2 or later. Clean-room only: take the shape (step counter, radius triggers, level window, one-of-N reward), never the lines.
- Content: quest titles, NPC names (Lord Stamford, Master Gethin, Bombard, Lord Urqhart, Master Frederick, Charles, Master Claistan, Pompin, Captain Kinzee) and town names are the donor's. Replace every name. Do not copy the string table text. Keep the trait (a six-place service map, a one-word lesson) and change the names, places and wording.
- No legal conclusion is drawn here.

## 7. Gaps

- Not read: client half (not in this repo; paired libraries named in the audit, BifrostTitan-DAoC-Client-Lib and dol-leodagan-DaocClientLib, not opened); NPC and mob template rows (in the database, not in this repo); StarterEquipment rows (database); Midgard and Hibernia equivalents (Childs_Play.cs, ChildsPlay.cs, ImportantDelivery.cs); the Examples and Tutorials folder (author examples, not player onboarding); the EN string files beyond ANewHeroesWelcome.txt (folder count only).
- Half read: server only. Client-side presentation (first-90-seconds screen, sound, camera, hit feedback) is absent from the half read.
- First fight and first kill: the Greetings kill hook is commented out (`GreetingsArmsman.cs` 583-593), so no first-kill gate exists in this half. Mob levels that make the first fight winnable live in the database (not read).
- Death and respawn presentation: not read. Walk density: not read. Idle and ambient animation: only the Ponder emote during a read-letter beat. Readability at 375 wide: not verifiable from the server half.
- Loot reveal ceremony: the Child's Play reward uses a centre-screen message (`CT_ScreenCenter`). Other rewards are silent item grants plus a system message.
- Minute 5, 10, 30 timings: not in this half. They depend on XP tables and mob levels in the database.
