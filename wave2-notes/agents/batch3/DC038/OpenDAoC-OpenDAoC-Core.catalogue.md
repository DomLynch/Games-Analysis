# OpenDAoC-OpenDAoC-Core (design catalogue, cell DC038)

Donor root: /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core (VPS, read-only). C# server emulator. Class C overall: no sprites, models, textures, music, sound or fonts in the box. Data tables and creature scripts are class C (origin not stated).
Rule for every idea below: recreate as a clearly distinct original, never a copy. Inspiration is category-level (for example "a plated beetle boss"), never an exact look, name or script copied. Titles are used only to find files.

## Which half was read
- Server half: GameServer, read in part. Read: scripts/mobs (SplitMob, ShiveringPresence, Strangler, TimeDependentSpawnNpc, the custom HPMob), scripts/namedmobs (Krackenschtein, Evern, OlcasgeanAndPrimals, FallingIce, Organic-EnergyMechanism, in part), styles (StyleProcessor, in part), ECS-Effects (ShadeECSEffect, ECSPulseEffect), Enums (eCharacterClass, eRealm, eDamageType, eWeaponDamageType, eObjectType, eMaterial, eArmorSlot, eWaterBreath), playerclasses/base (ClassFighter line 30, and the class headers of the other base classes), behaviour (folder names only).
- Data half: scripts/dbupdater/insert (Zones.xml, Regions.xml, StartupLocation.xml), read in full as tables and aggregated; language/EN (key and line counts only).
- Client half (DAoC game files): not in the box. The companion database (OpenDAoC-Database v1.65, named in README.md) is also not in the box. The XML seed rows are what ship with the server.
- Paired donor in this batch: none.

## Counts (verified this read)
- Creature scripts: 62 files under scripts/mobs (AlbionMobs 21, HiberniaMobs 17, MidgardMobs 9, custom 5, top level 10). Named-mob folder: 199 files; a grep finds 199 class declarations deriving from GameEpicBoss in 167 files.
- Named-mob folders (files): TuscarianGlacier 16, Galladoria 12, CaerSidi 12, HallOfTheCorrupt 12, IarnvidiurLair 11, Krondon 11, DarknessFalls 10, Dodens 10, TurSuil 5, Trollheim 5, MarfachCaverns 6, AvalonCity 6 (one of them a crystal-cave sub-folder), SummonersHall 4, Fomor 4, Dragons 3; three realm folders with 2 files each; ten loose files.
- Player classes: 62 class files (base 15; advanced by realm: albion 16, hibernia 16, midgard 15). eCharacterClass has 63 entries including Unknown.
- Realms: 3 player realms (eRealm.cs: albion 1, midgard 2, hibernia 3).
- Weapon object types: 27 (eObjectType.cs weapon range). Armour object types: 7 (cloth, leather, studded, chain, plate, reinforced, scale). Armour materials: 5. Armour slots: 6 plus not-set.
- Damage types: physical (crush, slash, thrust, plus natural) and six elemental (body, cold, energy, heat, matter, spirit) (eDamageType.cs; eWeaponDamageType.cs).
- Zones: 473 rows (Zones.xml). Regions: 344 rows (Regions.xml). Startup locations: 136 rows.
- Realm abilities: 157 files. Spells: 198 files. Styles: 2 files (Style.cs 284 lines, StyleProcessor.cs 902 lines). Effects: 28 files plus 48 ECS effect files.
- Locale: 7 locale folders (CZ, DE, EN, ES, FR, IT, NL). EN has 75 text files, 5,929 lines, about 4,938 key lines (a regex count, so approximate). Zones.txt holds about 632 key lines, Ability.txt about 162, Spells.txt about 120, PlayerClasses.txt about 85, RealmAbilities.txt about 79, Effects.txt about 21. Nothing quoted.

## 1. Creatures and beasts

### Families (category-level, from folder and file names plus what was read)
Names are my grouping. Only the boss scripts and a few hazards were read in code, so the families are a reading of names, not of stats.
- Ice giants and icelords (TuscarianGlacier, 16 files; several council bosses that share one encounter; a falling-ice hazard).
- Undead and spectral courts (CaerSidi, 12 files; crypt, lich and spectral-named bosses).
- Dark princes and high lords (DarknessFalls, 10 files; a rank hierarchy of princes and high lords).
- Spirit masters and rune-casters (Dodens, 10 files; a state-machine brain in AI/ArosBrain with idle, aggro and return-to-spawn states).
- Primal elementals and machines (Galladoria, 12 files; four primal adds, an earthmender pair, a stationary machine boss, a spider broodmother, a fungal cluster, an eye-type floater).
- Guard officers (HallOfTheCorrupt, 12 files; captains, lieutenants, sergeants, and a lord and lady).
- Paired bosses (about 12 file names carry "X and Y" in one file, for example TorstAndHurika and OrylleAndOrshom). Pairing is by file name; the encounter code was not read for most.
- Wolf-named bosses (IarnvidiurLair, 11 files, two of them named after wolves). Trollheim (5 files) is a folder whose names I did not classify.
- Summoners (SummonersHall, 4 files; a summoner cabal).
- Fomor giants (Fomor, 4 files), dragons (Dragons, 3 files).
- Realm regular mobs: Albion (21 files), Hibernia (17 files; includes koalinth-named castellans and elders, a rock golem, fey-named types), Midgard (9 files). Families here are guesses from file names only; only a few were opened, and the code for them was not read.

### How bosses escalate (what the code shows)
- Boss gating: the Fomor-line boss takes no damage from a player or pet standing more than 300 units away (Krackenschtein.cs:48). The ring is the gate.
- Adds: several bosses spawn adds on fixed coordinates (Olcasgean: four primal adds plus two earthmender healers, OlcasgeanAndPrimals.cs:138 to 192). Adds that belong to a boss are set to respawn never (RespawnInterval = -1, Anurigunda and SplitMob).
- Reset: when the player leaves the boss's proximity, the boss heals to full and clears its adds (Evern.cs:174 and 184).
- Respawn: a per-boss property read from the server settings in minutes (Krackenschtein.cs:83), so a server operator sets the pace.
- Splitting: a splitting brute splits at half health until it reaches a minimum level and size (SplitMob.cs listed below).

### Top 8 most striking (silhouette at 375 wide, one signature behaviour, one sound or effect, could be ours at 20 to 30 percent resemblance; no sound files are in the box, so the sound axis is not verifiable here)

1. Ring-gated colossus. Krackenschtein (GameServer/scripts/namedmobs/Fomor/Krackenschtein.cs). Why: hits from outside a 300-unit ring do nothing (line 48) and the resist depends on damage type (line 21). Keep: the ring rule and the damage-type split. Change: pillars that block the line of hit instead of a ring clamp; a serpent-coil body; an ash and rust palette.
2. Splitting brute. SplitMob (GameServer/scripts/mobs/custom/SplitMob.cs). Why: at 50 percent health it tears in two (line 48, 81), each split costs two levels and five size points with floors of 45 level and 20 size (lines 10 to 14, 54, 79 to 81). Keep: the half-health fork and the shrinking copy. Change: the fork takes a different damage style; the parent does not refill to full (line 80 refills it, which makes each split a free heal). See defects.
3. Four-warden council. OlcasgeanAndPrimals (GameServer/scripts/namedmobs/Galladoria/OlcasgeanAndPrimals.cs, lines 138 to 192). Why: four elemental adds spawn at fixed anchors, each bound to the boss, plus two healers. Keep: one anchor per element and the healers. Change: adds come in staggered rounds, and each element sets a different ground hazard.
4. Fairy-warden reset. Evern (GameServer/scripts/namedmobs/Evern.cs). Why: fairy adds spawn on a random 10 to 20 second timer while the boss is below full health (line 199), and a reset heals the boss and clears the fairies (174, 184). Keep: adds that appear only while hurt, and a clean reset. Change: adds spawn only in view; the reset is shown as a visible beat.
5. Pale shiver aura. ShiveringPresence (GameServer/scripts/mobs/ShiveringPresence.cs). Why: one visual pulse (effect 152) goes to every player in range on a gap of 6 to 20 seconds, jittered (lines 58, 61). Keep: the single broadcast and the jitter. Change: a rising hum and a violet frost ring; the pulse tied to the creature's stance.
6. Dusk and tide rosters. TimeDependentSpawnNpc (GameServer/scripts/mobs/TimeDependentSpawnNpc.cs). Why: a day roster and a night roster share one brain and show or hide on the region's night flag (lines 33 and 43). Keep: one brain, two rosters, one zone clock. Change: the clock is tide or weather, and the two rosters have different silhouettes.
7. Stationary type-dial machine. Organic-Energy Mechanism (GameServer/scripts/namedmobs/Galladoria/Organic-EnergyMechanism.cs). Why: it never walks (StartAttack override), resists physical damage by 40 percent and everything else by 70 (lines 29 to 32), and a comment caps absorb at 85 percent (line 45). Keep: a stationary boss with a split resist table. Change: a readable damage-type dial in the HUD, and a set of visible vents instead of a plain bar.
8. Ambient idle creature. Strangler (GameServer/scripts/mobs/Strangler.cs). Why: its brain is an ambient-effect brain with one fixed effect id (5206, line 26), so a plain creature has a constant idle effect. Keep: a constant idle effect as the creature's identity. Change: our own looping haze with a colour and a rhythm.

## 2. Classes, races and factions
- Three realms (eRealm.cs): albion, midgard and hibernia.
- Base classes (15, in playerclasses/base): acolyte, albion rogue, disciple, elementalist, fighter, forester, guardian, mage, magician, midgard rogue, mystic, naturalist, seer, stalker, viking. Grouped by file name only: caster (mage, magician, elementalist, seer), melee (fighter, guardian, viking), stealth (both rogues, stalker), support and nature (acolyte, disciple, mystic, forester, naturalist).
- Advanced classes (47, one folder per realm: albion 16, hibernia 16, midgard 15). A base class unlocks an advanced class (HasAdvancedFromBaseClass, for example ClassFighter.cs:35 to 37).
- Progression shape: class titles depend on level and on whether the advanced class is held (GetTitle in the base files). Specialisation multiplier is 10 in the five base files sampled (ClassFighter.cs:30 and four others).
- Factions: realm membership is the faction axis (realm and startup rows in StartupLocation.xml with race and class fields).
- Not read in detail: the per-class signature mechanics (only the specialisation line and the title rule were read in two files).

## 3. Weapons and combat styles
- Weapon families: 27 weapon object types (eObjectType.cs). Physical: crushing, slashing, thrusting, two-handed, polearm, staff, sword, hammer, axe, spear, blades, blunt, piercing, large weapons, celtic spear, scythe, flexible, hand-to-hand, fist wraps, mauler staff, left axe (off-hand), thrown. Ranged: fired, longbow, crossbow, composite bow, recurved bow.
- Damage types: four physical (crush, slash, thrust, natural) and six elemental (body, cold, energy, heat, matter, spirit). The weapon damage enum also has an elemental value (eWeaponDamageType.cs:27).
- Styles are the real weapon system here (styles/StyleProcessor.cs):
  - Opener types: offensive (the previous style on the chain must match, lines 46 to 64), defensive (reacts to the target's last result: block, evade, parry, miss, hit or style, lines 65 to 80), and positional (front window 315 to 45 degrees, side, back window 150 to 210, lines 81 to 115).
  - Stealth-gated openers (backstab I and II, perforate artery) use fixed growth formulas (lines 323 to 349). Backstab I is the minimum of 5 and a tenth of spec plus spec times 14/3 (line 329).
  - Non-stealth styles scale with spec, attack speed and a growth rate (lines 360 to 364), with a floor of 1 damage (line 368), and a barrier that reduces damage by the target's absorb percent (lines 376 to 386).
  - Procs on a chance roll per style (line 417) and an endurance cost (lines 464 to 498).
- Top five striking (mechanics, not art):
  1. Positional chain: a front, side or back window, plus an offensive opener that needs the previous style.
  2. Counter-style: a defensive opener that fires only after the target blocks, evades or parries.
  3. Backstab from stealth with its own damage formula, uncapped.
  4. Barrier absorb as a percent of style damage.
  5. Style floor of one damage so low-level styles still do something.
- Visual tiers: not in the box (weapon rows are in the companion database).

## 4. Armour and gear
- Materials (eMaterial.cs:27 to 31): cloth, leather, leather-and-metal, metal, wood.
- Armour object types (eObjectType.cs:32 to 38): cloth 32, leather 33, studded 34, chain 35, plate 36, reinforced 37, scale 38. The enum order is not a weight order.
- Armour slots (eArmorSlot.cs): head, hands, feet, torso, legs, arms.
- Tier order and how the game shows it: not in the box (item rows are in the companion database). The material enum is the only visual hook in the code read.
- Five striking ideas (category-level): (1) a material ladder from cloth to metal shown on the model; (2) a wood tier for a different silhouette; (3) a leather-and-metal mix as a middle tier; (4) a reinforced tier between chain and plate; (5) a scale tier for a light heavy-looking armour.

## 5. Zones and dungeons
- Zone rows (Zones.xml, 473 rows): every row has an 8 by 8 grid; seven rows are lava (IsLava true; first at line 710). Realm, water level, experience, realm points, bounty points and coin are 0 in every row. Those fields are placeholders in this seed.
- Region rows (Regions.xml, 344 rows): 27 diving-enabled (DivingEnabled, first at line 12), 17 with a non-zero water level (for example line 139 with 7970), 3 housing-enabled (line 25), 1 frontier. Expansion tags run 0 to 4 (tag 3: 229 rows; tag 0: 48; tag 2: 32; tag 4: 19; tag 1: 16).
- Startup locations: 136 rows with region, race and class fields.
- Named-boss zones (by folder, read as archetypes): glacier (TuscarianGlacier), halls of the corrupt, summoner's hall, lairs (IarnvidiurLair), caverns (MarfachCaverns), crypts (CaerSidi), a dark realm (DarknessFalls), a primal plane (Galladoria), city-side crystal cave (AvalonCity/CrystalCave), ruins (Dodens).
- Hazards in code: lava (7 zone rows); falling ice (FallingIce.cs: a cold burst of 400 damage with a 450-unit radius, lines 138 to 146; scheduled through two timers of 200 ms and 500 ms, lines 106 and 114; the comment at line 114 says every 30 to 50 seconds); drowning as an enum state (Enums/eWaterBreath.cs:3 to 7: none, holding, drowning); sieges (scripts/siege, 4 files; siege object types 80 to 84 for balista, catapult, cauldron, ram and trebuchet); keeps (47 files); relics (5) and minotaur relics (4); housing (8 files, housing object types 49 to 71).
- Five striking zone ideas: (1) a glacier with a timed falling-ice burst; (2) a lava strip as a fixed hazard row; (3) a diving region with a water line; (4) a crypt zone of crypt and spectral bosses; (5) a dark-realm hierarchy of princes and high lords.

## 6. Item and effect looks worth recreating
- Pulse aura, effect 152 to every player in view (ShiveringPresence.cs:58). Technique: one broadcast on a jittered timer, so the pulse reads as a heartbeat, not a clock.
- Ambient idle effect, fixed id 5206 (Strangler.cs:26). Technique: a constant idle effect that marks a creature without any action.
- Pulse spells (ECS-Effects/ECSPulseEffect.cs:20 sets the next tick; one active pulse per spell type, line 26). Technique: a repeating effect that clears when the owner stops it.
- Shade model swap (ECS-Effects/ShadeECSEffect.cs:26, the player's model is replaced by a shade model). Technique: a model swap as a state, not a new actor.
- Falling-ice timed burst (FallingIce.cs:106 and 114: a delayed burst scheduled by timers). Technique: a visible tell before a timed area burst; the tell itself is not in the code read.
- Style animation id (styles/StyleProcessor.cs:288 onward: each style can return an animation id). Technique: a per-style animation hook.
- Material enum as a visual hook (Enums/eMaterial.cs:27 to 31). Technique: a material tag per armour for a shader or texture choice.
- Sound: none in the box. Glow, aura colour, metallic and shader data: none in the box beyond the effect ids above.

## Inspiration for Frankendom
1. Ring-reach colossus (keep the ring rule and the damage-type split; change the ring to pillars that block the line of hit). Based on Krackenschtein.cs:48 and :21.
2. Shard-split brute (keep the half-health fork and the shrinking copy; change the fork to a different damage style and a partial refill). Based on SplitMob.cs:48 to 81.
3. Four-warden council (keep one anchor per element and the healers; change to staggered rounds and an element hazard per warden). Based on OlcasgeanAndPrimals.cs:138 to 192.
4. Fairy-warden reset (keep adds that appear only while hurt and a clean reset; change the adds to spawn only in view). Based on Evern.cs:174, :184, :199.
5. Pale shiver aura (keep one broadcast on a jittered gap; change to a rising hum and a violet frost ring). Based on ShiveringPresence.cs:58 and :61.
6. Dusk and tide rosters (keep one brain, two rosters, one clock; change the clock to tide and the rosters to different silhouettes). Based on TimeDependentSpawnNpc.cs:33 and :43.
7. Stationary type-dial machine (keep the split resist table; change to a readable dial and visible vents). Based on Organic-EnergyMechanism.cs:29 to 32.
8. Positional chain strike (keep the front, side and back windows and the counter-style after a block; change the window angles per weapon family and the chain timing). Based on StyleProcessor.cs:81 to 115.

## Defects found while reading (keep the idea, fix the defect)
- SplitMob: the parent refills to full health on every split (SplitMob.cs:80), so a split is also a heal. Fix: refill only part of the way, or not at all, and decide which in the design.
- Evern: the loop over nearby NPCs stops at the first null entry (Evern.cs:180, a break inside the loop). Fix: use continue, so one null does not skip the rest.
- StyleProcessor: the growth rate divides by unstyledDamageCap (StyleProcessor.cs:362), passed from ECS-Components/AttackComponent.cs:1009. A zero cap would divide by zero; the guard was not seen in the lines read. Fix: guard the divisor before use.
- Zone rows carry realm, water, experience and reward fields that are 0 in all 473 rows (Zones.xml). The water-level idea in the earlier audit depends on region rows, not zone rows. Fix: fill the zone fields or read the water line from the region row.

## Licence note
Code: GNU GPL v3 per LICENSE and README.md:41. Conflict in the files: the root gpl.txt is GPL v2 text (gpl.txt:2), and the standard source header says "version 2 or any later version" (gplheader.txt:6). The files do not settle which applies. Data files (XML, locale, scripts): no separate licence; they inherit the repo licence by default. Rights-holder status of the DAoC game data: unknown; the README says the project emulates DAoC servers and was once a fork of DOLSharp (README.md:6). Do not reproduce data rows; use the mechanisms only.

## Not read
- Client half and the companion database (not in the box).
- Named-mob scripts: about 10 read in part (Krackenschtein, Evern, OlcasgeanAndPrimals, FallingIce, Organic-EnergyMechanism, Dodens ArosBrain names); about 190 not opened.
- scripts/mobs: SplitMob, ShiveringPresence, Strangler, TimeDependentSpawnNpc, HPMob read; the other 58 not opened.
- Player classes: per-class mechanics not read beyond the specialisation line and the title rule.
- realmabilities (157 files), spells (198 files), most of the ECS effects (two read), behaviour framework (folder names only: 22 actions, 26 requirements, 10 triggers, from the directory listing), ai/brain (names only).
- Zone and region rows beyond the aggregated fields; StartupLocation counted, not read row by row.
- Locale: key and line counts only; nothing quoted.
- Binary and other files: realmabilities_atlasOF xlsx (3), Pathing/Detour zone078.nav, swagger bundles, icon.ico.
- Siege, keeps, housing and relics: named and counted only.
- Death and respawn presentation, boss intro and finisher staging, readability at 375 wide: not read.

## Corrections to the asset audit AU038
- Zones.xml: the audit says zone rows carry a grid box, water level and realm fields used as data. The rows carry the fields, but in this seed the values are placeholders (8 by 8 grid, zero water, zero realm). Non-zero water lines live in Regions.xml.
- Krackenschtein respawn: the audit is right that it reads a server property (line 83).
- Named-mob count: the audit says 199 files. Correct; the grep finds 199 class declarations in 167 files.
- Leash and aura receipts: the audit's receipts check out (Krackenschtein.cs:21, :48, :83; ShiveringPresence.cs:58, :61; TimeDependentSpawnNpc.cs:33, :43).
