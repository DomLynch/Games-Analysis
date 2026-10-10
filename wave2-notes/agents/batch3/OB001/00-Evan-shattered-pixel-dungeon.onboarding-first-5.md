# 00-Evan-shattered-pixel-dungeon (onboarding first 30 min, OB001)

Donor: /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/ (VPS, read-only, nothing copied or run). Code licence GPL v3 (LICENSE.txt line 1-2, per AU001). Art, music and sounds are credited by name in AboutScene.java only; there is no asset licence file (AU001). Class C for art, music, sound and text: inspiration only, we recreate originals.

Checked: AU001 and DC001 first (both re-used, not repeated). Then read: WelcomeScene.java, GameScene.java 740-775 and 1320-1360, MenuPane.java 335-352, HeroSelectScene.java 360-365 and 485-490, Guidebook.java, EntranceRoom.java 77-120, RegularLevel.java 205-290 (createMobs body), Level.java 530-545, MobSpawner.java 60-90, Rat.java and Snake.java stat lines, Mob.java 980-1001, Hero.java 249-265 and 2110-2116, HeroClass.java 100-190, Hunger.java 35-45 and 96-110, SewerLevel.java 140-160, Ghost.java 300-316, Dungeon.java 430-445, Blacksmith/Imp/Wandmaker spawn lines, CharSprite.java 345-362, journal.properties and scenes.properties string keys. Confidence high for the cited lines. Not checked: whether a floor-1 mob can roll as a champion (Level.java createMob, around lines 541-543, calls ChampionEnemy.rollForChampion on every created mob; the roll itself was not read), which could change the HP or EXP used in the XP arithmetic below.

Half read: client code plus data pack (string tables, class constants). No server half read or searched; this is a single-player client build as far as I read.

## Summary
Evan's opening is a story page, then one movement line, with the whole HUD hidden until the hero picks up a guidebook and closes its first page. Floor 1 is sized so that the eight pre-set enemies sum to exactly the first level-up. The donor has no town on the way down: services appear by depth band (shop 6, blacksmith after 11, imp after 16) and the first quest NPC is a one-per-game ghost on depths 2 to 4.

## Onboarding (first 30 minutes), points 1-9 of the focus

1. First 90 seconds, before any control:
- Launch shows the first-run WelcomeScene. Its only body text is the Dungeon region page (WelcomeScene.java:200-201; journal.properties:89, three paragraphs about the Amulet and the dungeon below). The button reads Enter. No control is available.
- HeroSelectScene follows. The exit button is hidden while the intro flag is set (HeroSelectScene.java:362). The class list is six classes with two subclasses each (DC001 section 2; the switch in HeroClass.java:100-130 lists them).
- In GameScene on floor 1 the toolbar, status and inventory are hidden while SPDSettings.intro() is true (GameScene.java:748-765). The log shows one line about movement, with mobile, desktop and controller variants (scenes.properties:50-52). That line is the only instruction before the first fight.
- The guidebook is placed on a random cell of the floor-1 entrance room (EntranceRoom.java:107-116). The intro page exists only through this book (the page is deleted from the room set-up at line 116 and found by Guidebook.doPickUp at Guidebook.java:47).

2. First fight, first kill, first hit feedback, and how it is rigged to be winnable:
- Floor 1 creates 8 pre-set mobs, and the comment says it is so the player can reach level 2 (RegularLevel.java:221-222). The depth-1 rotation is three rats and one snake (MobSpawner.java:76-78). Level.java:538-541 pops from that rotation one mob at a time, so 8 mobs = 6 rats + 2 snakes. This is derived from the code, not run.
- Enemies may not spawn inside an 8-cell field of view of the entrance (RegularLevel.java:238) or within an 8-step walk of it (RegularLevel.java:252). The first monsters start outside those two radii.
- A second mob per room is only added below floor 1 (createMobs comment, RegularLevel.java 220-290; read, line not receipted).
- Rat: 8 hit points (Rat.java:36), damage roll 1 to 4 (Rat.java:56), attack skill 8 (Rat.java:60-61). The hero starts with 20 hit points (Hero.java:252).
- Kill XP: rat 1 (the Mob.java:133 default, Rat has no override); snake 2 (Snake.java:41). Kill XP is handed to the hero at Mob.java:1001. Hero.maxExp(lvl) = 5 + 5 x lvl (Hero.java:2115), so a level-1 hero needs 10.
- Sum: 6 rats x 1 + 2 snakes x 2 = 10, equal to the level-1 threshold. Clearing the floor-1 pool gives exactly one level-up, if no champion roll changes EXP (see the not-checked note above).
- Hit feedback: a blood burst with count min(9 x sqrt(damage / target HT), 9) (CharSprite.java:350). A flash() call sets the colour values to 1 and a flash time of 0.05 s (CharSprite.java:74, 359-362). The on-screen look of the flash is not verified. CharSprite.java has no shake or hit-stop method; camera or GameScene shake was not searched.
- First kill feedback: the floor-1 kill grants the level-up through earnExp (Mob.java:1001). The level-up presentation was not read beyond the while loop at Hero.java:2058.

3. First reward, first loot, first level or unlock, and how each is celebrated:
- Every class starts with cloth armour worn, food, a velvet pouch and a waterskin (HeroClass.java:100-117). The warrior also gets a worn shortsword, throwing stones on quickslot 0, and a broken seal affixed to its armour (HeroClass.java:174-183). Some kinds are pre-identified without being given as items (identify scroll for all; healing potion and rage scroll for the warrior, HeroClass.java:186-187), so the first potion of those kinds is already known.
- First loot is the guidebook. Picking it up flashes the intro page (Guidebook.java:64), queues a log line about the journal button (scenes.properties:53-54), and marks seven guide pages as found at once (Guidebook.java:47-53: intro, examining, surprise attacks, identifying, food, alchemy, dieing).
- Level-up celebration: not read.

4. First hub or town, and how services are introduced one at a time:
- No hub on the way down. The floor-1 entrance is a surface transition (EntranceRoom.java:92-93). Leaving upward without the amulet shows a message and is refused (SewerLevel.java:148-152), so the way back is a locked door with one line of text.
- Services by depth, rolled once per game: a shop room on depths 6, 11 and 16 (Dungeon.java:434); a wandmaker quest path after depth 6 with a one in (10 - depth) roll (Wandmaker.java:355; the other path, type not 0, was not read); a blacksmith after depth 11 with a one in (15 - depth) roll (Blacksmith.java:348); an imp after depth 16 with a one in (20 - depth) roll (Imp.java:306). So the player meets services one band at a time, not in one town.

5. First meaningful choice:
- The class choice on HeroSelectScene, before control. In the first 30 minutes there is no other built-in choice that the read code shows. The ghost quest offer (Ghost.java:303-316) is a choice, but its dialogue and accept/decline flow were not read.

6. Pull-forward hooks (minute 5, 10, 30):
- The donor has no clock. The mapping below is by depth, not minutes. It is a guess about pacing, not measured.
- Depth 1: the locked way up (SewerLevel.java:148-152); a hunger warning that flashes the food page the first time the hero is hungry (Hunger.java:104-110; HUNGRY and STARVING constants at Hunger.java:40-41).
- Depths 2 to 4: a ghost quest NPC with a one in (5 - depth) chance per level, once per game (Ghost.java:304). Its type follows depth: fetid rat, gnoll trickster, great crab (Ghost.java:314).
- Depth 5: the first boss floor (Dungeon.java:442). DC001 names the sewer boss the Goo. A rat king landmark is also on depth 5 (RatKing.java:91; not read beyond that line).
- Region intro pages are described as found on first entry to a region (journal.properties:87 discover_hint text). The trigger code was not read.

7. Tutorial style:
- Show-don't-tell with a hard HUD gate. The text is a single movement line, then the guide pages flash on triggers. Nothing says how to fight; the fight is taught by the 8 mobs at a distance.
- Forced part: the HUD is hidden until the first flashed guide page closes. MenuPane.java:345-349 calls GameScene.endIntro() when the flashed page window hides. endIntro (GameScene.java:1324-1360) runs a 2 s tween (GameScene.java:1327) that fades in the status bar, then the toolbar and inventory, then logs one hero-info and inventory line (scenes.properties:55-56) and reveals floor-1 secret doors (GameScene.java:1356).
- Optional part: a 14-page adventurer's guide (journal.properties:37-63, titles counted 14). Pages flash on triggers: food when hungry (Hunger.java:104-110), dieing on the next start after a death (GameScene.java:767-771).
- Text length: the dungeon region page is about 375 characters in three short paragraphs (journal.properties:89; the line is 414 characters including its key). The movement line is one short sentence.
- Skippable: the gate clears when the page is closed. No separate skip control was found in the code read.

8. Drop-off risks, and what the donor avoids:
- Avoided: no text wall in front of control beyond one story page; no tutorial fight; the first enemies are kept out of sight range; the guide flashes only on triggers.
- Risks: the first page is a long paragraph before control. The HUD gate depends on finding the book, which is always on floor 1 while the intro page is unread (EntranceRoom.java:107-108), so the gate cannot strand the player in practice; not played, so this is read-only. Combat is taught by example, not text, so a player who has never played a roguelike gets no fight guidance (the guide's surprise-attacks page is the only fight text, and it is read in the journal).

9. Could be ours at 20-30 percent resemblance, and the 5-minute look test:
- Idea: the HUD stays hidden until the first story beat is closed, then fades in over 2 s with one line that names the next control. Keep: the gated reveal and the single movement line. Change: our story beat is the gladiator-ring fight, so the reveal fires at the first hit or the first win, not a book.
- Idea: size the first pool so its total XP is exactly the first-level threshold. Keep the arithmetic. Change: our numbers and our Pit characters.
- Idea: an 8-cell clear ring around the entrance (no spawn in view or within walk distance). Keep the radius as data.
- Look test (5 minutes, phone, 375 wide): a style flag on the existing opening (look-test skill, no release rows). Two versions side by side: (a) HUD hidden until the first story card closes, then a 2 s fade-in with one control line; (b) HUD on from the start. Three weak enemies start 8 cells out. Dom judges: does the first kill feel earned in (a), and is the reveal worth the wait. Blood-burst curve: check at 3 damage and at full HT on an 8-HP rat.

## Note (feel template)

1. What the player sees and feels: on a 375-wide phone the first screen is one story page of prose, then a dark room with the HUD missing and one line telling the player how to move. The player walks, finds a small book on the floor, and when it opens a page the controls fade in over about two seconds. The first enemies are small and slow to notice, at least eight cells away. The first hit throws a burst of red particles, then the enemy dies and the hero levels up.

2. Why it works or is striking: readable at 375 wide? Partly: rats are small 16 by 15 frames (AU001), which is hard to read in a crowd; no max-enemies-per-frame count was read. Signature behaviour: the HUD reveal tied to a page. Signature sound: not read (sounds are mp3, not played). Could be made ours at 20-30 percent: yes, see idea list above.

3. The rule behind it: order of operations on floor 1 is story page, movement line, guidebook pickup, page flash, close, 2 s HUD tween, log line, hidden doors revealed. Numbers as designer data fields (donor values are null because the donor is GPL; see JSON):
- pre_set_mobs: 8 (floor 1 only)
- depth1_rotation: rat 3, snake 1 (rotation repeats)
- spawn_clear_radius: 8 cells in view and 8 steps of walk
- first_level_xp_pool: sum of kill XP on floor 1 (6 rats x 1 + 2 snakes x 2 = 10)
- level_threshold(lvl): 5 + 5 x lvl (so 10 at level 1)
- hud_reveal_tween: 2 s
- hit_blood_count_cap: 9; hit_flash: 0.05 s
- ghost_chance: one in (5 - depth), once per game, depths 2 to 4
- service_bands: shop 6, 11, 16; wandmaker after 6 (1 in 10 - depth); blacksmith after 11 (1 in 15 - depth); imp after 16 (1 in 20 - depth)

4. For Frankendom: 700 zones as data: the first zone carries spawn_clear_radius, pool XP and the reveal flag as zone fields; population rules belong to row 23 (spawn caps, respawn, despawn). 100 Pit characters: the ring fight draws from the Pit pool, with at most three attackers. Many-vs-one: Evan's floor-1 pool is spread across rooms, so its fights are mostly one-on-one; our ring is many-vs-one, so cap attackers at 3 and size the ring pool to the first level threshold. Server-verified events: the first kill, the XP award and the loot grant are server-side (ledger); the flash, blood burst and HUD reveal are client-only. Keep: the gated reveal, the sized pool, the clear ring. Change: the book becomes our story beat (the ring win), and the way back up is a town-gate line instead of a locked stair.

5. Five-minute look test: see the list under point 9.

6. Licence and IP: GPL v3 code, so clean-room shape only. Art, music, sound and text are credited to named people with no asset licence (AU001), class C. The guide text is protected prose: do not copy. Category-level inspiration only: "a first-run book that opens the controls". We keep the trait "reveal the controls after the first beat" and change the trait "a physical book on floor 1" to our own story beat.

7. Gaps: not read: the level-up presentation (Hero.java after 2058), champion roll on floor 1 (Level.java:543 and ChampionEnemy), the ghost quest dialogue and reward, the sewer boss and the rat king details, the sprite and sound assets (AU001 gives sizes only), the HeroSelectScene UI text, the camera or GameScene shake, the messages/*.properties beyond the lines cited, any server half (not searched).

Best transferable idea: gate the HUD behind the first story beat, then reveal it over two seconds with one control line, and size the first pool so its XP equals the first level threshold.

Idle and ambient, death and respawn, loot ceremony, walk density, readability:
- Idle and ambient: not read (sprite animation frames only from AU001).
- Death and respawn: a loss is made bearable by the Handling Defeat page that flashes on the next start after a death (GameScene.java:767-771; the page exists in journal.properties:49). No respawn read.
- Loot ceremony: the enchant reveal overlay (fade-in 0.2 s, hold 1.0 s, fade-out 0.4 s, alpha 0.6) is from DC001 section 6, not re-read here.
- Walk density: a level gets 3 + (depth % 5) + random(0 to 2) mobs above depth 1 (RegularLevel.java:212-213 mobLimit, read), with a second mob chance in a room (below floor 1 only). Floor 1 is fixed at 8.
- Readability at 375 wide: rat frames 16 by 15 (AU001), not viewed; max enemies per frame not read.
