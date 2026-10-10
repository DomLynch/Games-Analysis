# kcopelandmgmt-Shadowbane (design catalogue, reader DC030)

Donor/Licence: code MIT (LICENSE lines 9-11, plain MIT text). The header names the Magicbane Emulator Project 2013-2022. The README says it is a community emulator for the Ubisoft MMO Shadowbane (README line 13). The original game's data and art are not in the box and their rights status is unknown. Not on the RESTRICTED list. MIT allows adaptation with the notice kept; I still work shape-first and do not copy code, constants or names. Dom's rule applies: recreate as a clearly distinct original, about 20-30 percent resemblance in mood, name the trait KEPT and the trait CHANGED. I am not giving a legal opinion.

Halves read:
- SERVER (src/engine): read in part. Read: Enum.java (vocabularies), objects/Bane.java (siege phase), objects/Zone.java and gameManager/ZoneManager.java (zones, hot zone), mobileAI/MobAI.java (call for help, wimpy, roam), objects/Blueprint.java and Building.java (spire caps), objects/PromotionClass.java, objects/PlayerCharacter.java (race scale line), server/MBServerStatics.java (corpse timer). Only listed, not read: the other ~800 Java files.
- CLIENT: not in this donor. The top level holds LICENSE, README.md, .gitignore and src/ (src/ holds only discord and engine; I listed it).
- DATA: not in the box. Records load from a database (LootManager.java lines 53-56 per AU028; Zone(ResultSet) at Zone.java line 67; PromotionClass rows at PromotionClass.java lines 87-92). The paired donors in the box that may hold the client or cache side are blinkdog-ShadowbaneCacheExporter and shoff-ShadowbaneCacheViewer (listed under AU007 and AU049). I did not read them, so I cannot say what they hold.

Counts (what this box holds; records are zero, vocabularies are counted with grep on Enum.java):
- creatures: 0 records. Monster tags: 35 (MonsterType, Enum.java lines 80-118).
- classes: 4 base classes (ClassType, line 1449). 23 promotion-shrine class names (ShrineType lines 1492-1572). Races: 26 race rows over 14 race families (RaceType lines 126-205).
- weapons: 0 records (ItemType WEAPON is one enum value, line 567-575).
- gear_sets: 0 records. Modifier kinds: 68 (ModType, lines 1173-1257). Gear mods are the closest thing to tiers (see section 4).
- zones: 0 records. Zone shape only. Named ruins: 8 (line 430-484). Guard post kinds: 6 (lines 485-540). Portal kinds: 9 (lines 541-566). Spire types: 21 (lines 630-697). Shrine kinds: 34, 11 race shrines and 23 class shrines (lines 1492-1572). Minion kinds: 36 rows (MinionType, lines 2643-2714). Mob behaviour types: 31 (MobBehaviourType, lines 2823-2878).

## 1. Creatures / beasts
- No creature records in the box. Mob stats, levels and loot are in the database (not read).
- Families are tags, not stats: MonsterType (Enum.java lines 80-118) has 35 tags. Creature-like tags include Dragon, Undead, Insect, Reptile, Troll, Giant, Goblin, Rat, Construct, Infernal, Celestial, Plant, Animal, Minotaur, Grave, Shade, Summoned, Vampire. The race rows point at these tags (section 2), and MobAI aggro filters on them (per AU028).
- Behaviour is a matrix, not a list. MobBehaviourType (Enum.java lines 2823-2878, 31 types) is five flags per type: wimpy (does not attack), aggressive, can roam, calls for help, responds to a call for help, plus a helper type. Power, Aggro and Spell are the three bases. Each has Helpee (responds to calls), Wimpy (does not attack) and Grouper variants. There is an Epic spell variant (SpellAggroHelpeeEpic). Independent types: GuardCaptain, GuardMinion, GuardWallArcher, Wanderer, HamletGuard, AggroWanderer, Simple, Pet1, SimpleStandingGuard.
- Escalation with level: not in the box (level bands are DB data; Zone.minLvl and maxLvl at Zone.java lines 49-50).
- Boss pattern: none found in the code read.

Top 8 creatures (labels are mine):
1. "Pack-call guardian" (MobBehaviourType callsForHelp and respondsToCallForHelp; MobAI.java lines 99, 554-576, 567). Why: a mob in combat calls its same-type pack in the zone (see section 8: as written this call never starts). Keep: only same-type mobs answer, and the call sets their target to the caller's target. Change: responders need a radius and line-of-sight check (none in line 567), and the broken cooldown must be fixed (defect in section 8).
2. "Race-scaled humanoid" (RaceType scaleHeight, Enum.java lines 137-140; PlayerCharacter.java line 5393). Why: the same humanoid reads at different sizes (Elf male 1.4, Dwarf male 0.8, CSR female 0.66). Keep: a per-race size and a per-sex variant. Change: our scale range is fixed for 375-wide readability.
3. "Fast brute" (RunSpeed MINOTAUR row, Enum.java lines 206-258: first two speed values 6.63 and 15.95, against 6.19 and 13.97 for the standard row; the labels of each slot were not checked). Why: a heavy creature whose speed row is higher than the standard humanoid row. Keep: a heavy-type speed row. Change: our brute gets a readable wind-up, not just speed.
4. "Leader-follower guard" (GuardMinion has GuardCaptain as its helper type, MobBehaviourType lines 2823-2878; MinionType rows 2643-2714). Why: a minion type is tied to a captain type. Keep: the follower is declared by its leader type. Change: the follow and target rule is ours (its code was not read).
5. "Wall archer" (GuardWallArcher: canRoam false, aggressive true; MobBehaviourType). Why: a post that never moves but shoots. Keep: a static ranged post. Change: its line of fire is drawn on the ground so the phone player can read it.
6. "Wimpy support" (isWimpy, MobAI.java line 1153: a wimpy mob skips the attack step). Why: a mob that does not attack but helps or calls. Keep: a no-attack helper role. Change: our support role gives a heal or buff, not only a call.
7. "Epic caster that answers calls" (SpellAggroHelpeeEpic, Enum.java MobBehaviourType: it responds to calls and does not call). Why: a caster that joins a pack fight when called. Keep: caster plus responder as one type. Change: the response is a cast with a windup and a sound.
8. "Shade" (MonsterType Shade; race Shade male and female, scale 1, RaceType). Why: a shadow kin tag used for races and enemies. Tag only, no stats read. Keep: the tag as a faction label. Change: our shade visual is not a copy of any look.

## 2. Classes / races / factions
- Base classes: FIGHTER, HEALER, ROGUE, MAGE (ClassType, Enum.java lines 1449-1455). Progression: promotion classes are DB rows with name, description and token, plus health, mana and stamina multipliers (PromotionClass.java lines 87-92). The 23 promotion-shrine names are shrine kinds (ShrineType, lines 1492-1572): Assassin, Barbarian, Bard, Channeler, Confessor, Crusader, Doomsayer, Druid, Fury, Huntress, Prelate, Priest, Ranger, Scout, Sentinel, Templar, Thief, Warlock, Warrior, Wizard, Nightstalker, Necromancer, Vampire. Names are titles only.
- Races: 14 families, 26 rows (RaceType, lines 126-205). Each row has a rune id, an aggro group, a run-speed group, a sex and a scale. Families: Aelfborn, Aracoix, Centaur, Dwarf, Elf, Half-giant (male and female, plus an old-male row), Human, Irekei, Minotaur, Nephilim, Shade, Archon (Celestial), CSR, Vampire.
- Factions: cities and realms (Zone.java playerCityID line 36 and isPlayerCity line 57; Realm.java and Nation.java present, not read). Guild types are in Enum.java lines 2320 onward (not read).
- Team or class-based gating: MobAI aggro checks race against an enemy list (per AU028 MobAI.java lines 703-760, not re-read).

## 3. Weapons
- No weapon records in the box. ItemType has one WEAPON value (Enum.java lines 567-575).
- Note on the modifier list below: the behaviour words are inferred from the enum names. The code that applies each modifier was not read, so treat each "keep" as a shape to check, not a verified rule.
- Weapon-related modifiers (ModType, lines 1173-1257): WeaponProc, WeaponRange, WeaponSpeed, ArmorPiercing, Slay, Ambidexterity, ConstrainedAmbidexterity, AttackDelay, BladeTrails, MinDamage, MaxDamage, DamageCap, ExclusiveDamageCap, IgnoreDamageCap, AdjustAboveDmgCap. These are the families. Elemental properties come from spire types (section 5), not from weapons.
- Tiers: none in the box. Damage caps are modifiers on the item, not tiers.

Top 5 striking (weapon-side):
1. BladeTrails as a modifier (ModType line 1182): a weapon can carry a trail flag. Keep: trail as a data flag on the item. Change: our trail is a ribbon, with a colour per hero.
2. WeaponProc (ModType): an on-hit effect carried by the item. Keep: a proc chance on the item. Change: our proc is shown as a ring on hit.
3. Ambidexterity and ConstrainedAmbidexterity (ModType): dual wield as a modifier. Keep: a flag that changes how many weapons are used. Change: the second weapon has a different fighting speed row.
4. Slay (ModType): a damage bonus against one enemy family. Keep: family-based bonus. Change: our family is a MonsterType-like tag set, not a copy.
5. ArmorPiercing and IgnoreDamageCap (ModType): a bypass flag. Keep: a clear bypass rule. Change: shown in the combat log as a short word.

## 4. Armour / gear and how tiers show
- Gear is modifiers. Items carry a set of typed modifiers (ModType, 68 kinds). The loot code adds prefix and suffix mod tables on top of a base (per AU028, LootManager.java lines 138-234, not re-read).
- Visual modifiers in the same enum: ScaleHeight, ScaleWidth, AnimOverride, Invisible, BlackMantle, BladeTrails (ModType lines 1173-1257). These are looks as data, which is useful for a catalogue.
- Gear sets: no set records in the box. Runes (RuneBase, CharacterRune, RuneBaseEffect in objects/) are present, not read.
- Material looks (metal, gold, crystal): none in the box (no art).

Top 5 striking:
1. Visual modifiers as data (ModType ScaleHeight, ScaleWidth, BlackMantle, AnimOverride). Keep: an item changes its look through a typed flag. Change: our flags are few and readable.
2. Invisible as a modifier (ModType). Keep: a modifier that hides the wearer. Change: a dither, not a full hide, so a phone player can still see it.
3. Modifier count and stacking (68 kinds): the bigger value is a short, typed list. Keep: a typed list. Change: fewer kinds, each readable in one line.
4. Race scale applied to the body (PlayerCharacter.java line 5393, an unlabelled "x scale" term multiplied by the race scale). Keep: size is set by race. Change: our fit is tested at 375 wide.
5. Corpse with a cleanup job (Corpse.java makeCorpse, lines 88-100, schedules a removal job; the timer is 15 minutes at MBServerStatics.java line 329). Keep: death leaves a body that waits and then goes. Change: our window is a zone data field. Whether gear drops into the corpse was not read.

## 5. Zones / dungeons
- Zone shape (Zone.java lines 31-63, constructor line 67): a zone tree (parent and child nodes), a level band (minLvl, maxLvl, lines 49-50), a safe-zone flag, a city owner, NPC-city and player-city flags (lines 56-57), sea level and altitude, map icons (Icon1 to Icon3, lines 43-45), a hot-zone flag (line 51).
- Zone kinds in the enums and code: sea floor is a special zone (ZoneManager.java line 258 excludes it from hot zones). Named ruins: 8 (Ruins enum lines 430-484). Guard posts: 6 (Guards enum lines 485-540; humans and undead, archer, guard and mage each). Portals: 9 kinds with a 2D offset and a bit flag (PortalType, lines 541-566).
- Hazards: no hazard data in the box. Spires (21 types, lines 630-697) are the effect objects in a city; most spire rows carry a bit flag (e.g. WATCHFUL at line 632).
- Zone archetypes ranked: the siege, the hot zone and the spire cap are the three below.

Top 5 striking (zones):
1. Siege phase clock (Bane.java lines 355-365). Keep: three phases from one timestamp: challenge if no live date, war after it, standoff between. Change: our phase has a rules table (what each phase allows) and the 2 unused phases are dropped or used (section 6).
2. Hot zone rotation (ZoneManager.java setHotZone at line 154, flag set at line 161; eligibility at lines 255-268). Keep: one bonus zone at a time, a level floor (line 268), no repeat within a cycle (line 263), and a reset (lines 132-133). Change: the rotation runs on the server tick and feeds zone population (row 23).
3. Spire cap per city rank (Blueprint.java lines 96-112: rank 0-2 gives 0, 3-4 gives 1, 5-6 gives 2, 7-8 gives 3). Keep: a cap per rank. Change: our cap is a zone data table.
4. Excess spire removal on demotion (Building.java lines 664-675: the excess spire is disabled and its rank set to -1). The comment says "random", but the code takes the first item of the list (line 669). Keep: the excess is removed, not kept. Change: pick the rule on purpose (newest or oldest) and tell the owner.
5. Zone tree with level band (Zone.java lines 31-63). Keep: a parent zone with children, each with a level band and a safe flag. Change: our zone tree is data on one runtime (Frankendom ruling).

## 6. Item and effect looks worth recreating
- Look as data: ModType visual flags (section 4).
- Shrine kinds per race and class (ShrineType lines 1492-1572): one shrine per race and per class, each row with a numeric id and a number and a flag (the meaning of those is not read). Keep: a per-kind shrine look. Change: our shrine is a silhouette per class, not per race.
- Spire kinds (Enum.java lines 630-697): 21 spire types, each row with an id, a bit flag and a number (meaning not read). Keep: a small set of aura types. Change: our aura is a ground ring with one colour per type.
- Portal kinds (lines 541-566): each has a 2D offset and a bit flag. Usage not read. Keep: the offset per kind (a visual nudge). Change: our portal has its own footprint.
- Death: corpse persists for 15 minutes (MBServerStatics.java line 329, Corpse.java makeCorpse at line 88). Keep: a visible body that waits. Change: our corpse fades in the thumb-zone view.
- Race scale (PlayerCharacter.java lines 5390-5394): a size per race applied to the body. Keep: size is the first thing to read.

## 7. Inspiration for Frankendom (originals, not copies)
1. Pack Call (MobBehaviourType callsForHelp and responds, MobAI.java lines 554-576). Keep: same-type pack members answer a call; a call sets their target. Change: radius and line-of-sight check; cooldown fixed (section 8); engine-owned (row 4 hate list).
2. Siege Clock (Bane.java 355-365). Keep: one timestamp derives three phases. Change: a phase rules table; use or drop the two unused phases.
3. Rank Cap Towers (Blueprint.java 96-112, Building.java 664-675). Keep: a cap per rank and removal of excess. Change: remove the newest and notify the owner.
4. Rotating Bonus Zone (ZoneManager.java 161-170, 255-268). Keep: one zone at a time, a level floor, no repeat in a cycle. Change: rotation on the server tick (row 23 zone population).
5. Race Scale Row (RaceType scale and run speed, Enum.java 126-258). Keep: scale and speed per race row. Change: our heroes' scale is data, limited for 375 wide.
6. Captain and Minions (GuardCaptain, GuardMinion, MinionType 2643-2714). Keep: leader-follower with a class mix (melee, archer, mage). Change: minions take the captain's target only in range.

## 8. Defect found (keep the idea, fix the defect)
- Call for help never starts (MobAI.java lines 554-557). Lines 554-555 set the stored time to now when it is zero. Line 557 returns when the stored time is less than now. So a new mob's first call returns at line 557 almost every time, and nothing is sent. Only a response sets the stored time forward (line 576, now plus 60000). While that time is in the future the message goes out each time AttackPlayer runs (line 99 calls MobCallForHelp); after it passes, line 557 returns forever, because nothing resets it. Fix: return only while the cooldown is running (now below the stored time), start the stored time at zero so the first call goes out, and set it to now plus 60 s when a response arrives. Keep the idea: one call per cooldown, same-type responders.
- Responders have no range check (MobAI.java line 567 loops over the whole zone set). Fix: add a radius and a line-of-sight check before setting the target.
- No null check on the zone (MobAI.java line 564, mobCamp = mob.getParentZone()). It is inside a try block, so a null zone is logged and the call fails silently. Fix: check the zone and return.
- Spire removal picks the first list item while its comment says random (Building.java lines 669-670). Fix: choose the rule on purpose (section 5 item 4).
- Unused siege phases: ERRANT and CEASEFIRE are defined (Enum.java 408-415) but not referenced in any file under src/engine except the enum. Fix: use them or drop them.
- Other reported defect (not re-read by me): the hot-zone roll bound in LootManager.java lines 266-286 can pass its cap at high level (AU028). Keep the hot-zone bonus; fix the bound (clamp min to max).

## 9. Briefs (short)
- Pack Call: a mob that is hit calls up to its zone pack of the same type. KEPT: same-type answer, one call per cooldown. CHANGED: radius check, our cooldown, a readable call icon.
- Siege Clock: one timestamp gives challenge, standoff and war. KEPT: derived phase. CHANGED: each phase has a rules table.
- Rank Cap Towers: a rank caps the towers a city may hold; demotion removes the newest. KEPT: cap and removal. CHANGED: owner notice.
- Rotating Bonus Zone: one bonus zone at a time, with a level floor. KEPT: single, floor, no repeat. CHANGED: server tick and row 23 population.
- Race Scale Row: each race has a size and a run speed. KEPT: row per race. CHANGED: our race rows for 375 wide.
- Captain and Minions: a captain with class-mixed followers. KEPT: leader-follower. CHANGED: in-range target rule.

## Cross-link to our topics
- loot: rows 18 (roll) and the drop ceremony; loot code per AU028 (not re-read).
- spawns: rate limit per zone (MobRespawnThread lines 36-58 per AU028, not re-read) and row 23 cap.
- AI: call for help (row 4), wimpy (row 2), aggro race filter (row 2 and 4, per AU028).
- zones: section 5 and the hot zone (row 23).
- siege: a zone event with phases; no parity row, a candidate for a new row only if Lead rules.

## Not read
- The ~800 other Java files (CombatManager.java, PowersManager.java, NPCManager.java beyond grep, DamageShield.java beyond listing, discord/).
- Database content (none in the box).
- Heraldry.java, Corpse.java beyond creation, RuneBase and CharacterRune, Guild and Realm, Nation.
- The client half and the data half (not in this donor).
- blinkdog-ShadowbaneCacheExporter and shoff-ShadowbaneCacheViewer (paired donors, not read).
