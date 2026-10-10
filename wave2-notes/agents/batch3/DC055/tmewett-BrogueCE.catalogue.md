# tmewett-BrogueCE (design catalogue, DC055)

Donor: /mnt/frankendom-donors/tmewett-BrogueCE (VPS). Community fork of a single-player roguelike, in C.
Licence (as the files say): LICENSE.txt is GNU AGPL v3 (line 1). Source headers also read "All rights reserved" (src/brogue/Light.c line 6, per the audit): conflicting, so AGPL shape-only. Tile art bin/assets/tiles.png is CC BY-SA 4.0 (bin/assets/LICENSE.txt line 5): NOT used. icon.png and tiles.bin: no licence line, NOT used.
Halves: there is no server. Code half (src/brogue, src/variants) READ: the data tables sit inside the code (monster, horde, blueprint, tile, light, item tables). Asset half (bin/assets) NOT opened. Paired donor: none named in the audit, not checked further.
Checked: data tables for creatures, families, hordes, machines, tiles, lights, items; the spawn timer, the awareness and noticing rules, the turn scheduler, the sneak and jelly code, summon throttle, flee hysteresis, weapon roll. Confidence high on the quoted code. Stat numbers are withheld on purpose (no stat blocks).

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Mood resemblance only (about 20-30 percent). Each idea names the trait KEPT and the trait CHANGED. Class B (AGPL code): clean-room, shape only, own names.

## 1. Creatures / beasts

Count: 67 monster kinds plus the player row (68 rows in monsterCatalog, src/brogue/Globals.c lines 1025-1166). Each row is one flat record: glyph, colour, HP, defence, accuracy, damage range, regen, move and attack speed, blood type, light, large flag, drop chance and type, bolts, behaviour flags, ability flags (row 21 field list).

Families (src/brogue/Globals.c line 1416 onward, monsterClassCatalog: 15 families, frequency 5 or 10). A creature can sit in several families (for example the revenant is in both the undead and infernal families). Max depth as written; -1 means no cap in the table.
- abomination (10, -1): bog monster, underworm, kraken, tentacle horror.
- dar (10, 22): three caster and blade types.
- animal (10, 10): rat, monkey, jackal, eel, toad, vampire bat, centipede, spider.
- goblin (10, 10): goblin family (line cut in my read, not counted in full).
- ogre (10, 16): ogre, shaman, totem.
- dragon (10, -1): dragon.
- undead (10, -1): zombie, wraith, vampire, phantom, lich, revenant.
- jelly (10, 15): pink, black, acidic.
- turret (5, 18): arrow, spark, dart, flame.
- infernal (10, -1): flamedancer, imp, revenant, fury, phantom, ifrit.
- mage (10, -1): casters across families (line cut in my read).
- waterborne (10, 17): eel, naga, kraken.
- airborne (10, 15): vampire bat, will-o-the-wisp, pixie, phantom, fury, ifrit, phoenix.
- fireborne (10, 12): will-o-the-wisp, salamander, flamedancer, phoenix.
- troll (10, 15): troll.

Escalation by depth: hordes carry min and max depth (src/variants/GlobalsBrogue.c, hordeCatalog_Brogue, lines 744 onward). Examples as written: a single rat 1-5, kobold 1-6, jackal 1-3, a jackal pack 3-7, goblin and conjurer 3-10, eel 2-17 (deep water only), bloat 2-13 then a bloat pair 14-26, explosive bloat 10-26. So a creature's tier is set by WHERE in depth it can spawn, not by a stat ladder.

Horde shape: 175 horde rows. 119 carry at least one flag. Of the rows: 56 use a captive leader with guards; 22 are never out of depth; 10 are summoned; 7 never spawn periodically; 13 kennel, 12 vampire fodder, 10 sacrifice target, 10 machine captive, 8 statue, 7 goblin warren, 4 turret, 4 water monster, 4 boss, 4 legendary ally, 2 thief, 2 mud, 4 allied-with-player (src/variants/GlobalsBrogue.c lines 744-1048; flag enum src/brogue/Rogue.h lines 2026-2046).

Boss pattern: a boss machine (GlobalsBrogue.c line 549, "Boss -- key is held by a boss atop a pile of bones in a secret room") and 4 boss-flagged hordes. Boss-tier monsters are grouped under a "bosses" comment in Globals.c (line 1126), just after the dragon row: a summoner that keeps its distance with escort, an invulnerable end-game guardian, and a vampire with transference and a flee-near-death rule.

Top 8 most striking (own labels; refs are donor files):
1. Splitting Ooze. Why: one hit makes two bodies that read as a growing cluster at 375 wide. Keep: split on hit, halving HP, the clone does not inherit learned abilities. Change: exact HP conservation (see defect D3) and our own silhouette and splitting sound. Ref: src/brogue/Globals.c line 1049 (pink jelly), 1092 (acidic), 1129 (black); split at src/brogue/Combat.c line 273; clone copy at src/brogue/Monsters.c line 564.
2. Gas Bladder. Why: slow kamikaze that drifts erratically, then bursts into a hazard when it dies or reaches you. Keep: erratic drift, death-burst feature. Change: the burst is a server-verified zone hazard, not a local effect. Ref: src/brogue/Globals.c line 1037 (bloat), 1084 (explosive bloat).
3. Reed Lurker. Why: lives only in water, submerges, bursts up to strike; a classic lurking read. Keep: liquid-only restriction and submerge-then-strike. Change: a surface ripple as a 0.5 s tell before the strike (375-wide readability). Ref: src/brogue/Globals.c line 1033.
4. Pilfering Imp. Why: hits to steal, then flees with the item; recovers the item when killed. Keep: steal-on-hit then flee, drop on death. Change: steals a consumable from a fight pool, never from the one character ledger. Ref: src/brogue/Globals.c lines 1035 (monkey), 1114 (imp); flee branch at src/brogue/Monsters.c line 1791.
5. Waking Guardian. Why: a near-indestructible guardian that moves only when the player acts. Keep: turn-on-activation (guardian moves when the player moves). Change: "activation" is a zone-data trigger on the server step count; our own glyph silhouette. Ref: src/brogue/Globals.c line 1141.
6. Soul Vessel Lich. Why: the lich's life is held in a separate vessel that must be found and destroyed. Keep: second body that must die, placed by the zone. Change: a destructible shrine object placed by zone data, one server-verified kill rule. Ref: src/brogue/Globals.c lines 1104 (lich), 1106 (vessel).
7. Warlord Chanter. Why: a boss that keeps distance, summons escort, and attacks with penetrating reach. Keep: distance keeping plus summon. Change: summon count capped by a many-on-one rule (see the throttle in section 7). Ref: src/brogue/Globals.c line 1127; summon throttle at src/brogue/Monsters.c lines 2440-2455.
8. Dread Wyrm. Why: apex creature with a ranged breath, an all-adjacent sweep, and a guaranteed drop. Keep: ranged breath plus sweep plus guaranteed drop. Change: breath as a telegraphed cone, readable at 375 wide. Ref: src/brogue/Globals.c line 1123.

Other traits seen (for the parity rows): a 25 percent roll (or a never-sleeps flag) starts a creature in tracking state, the rest start asleep (src/brogue/Monsters.c lines 111-112); flee-near-death enters at or under a quarter HP and leaves at three quarters HP (see section 7, hysteresis).

## 2. Classes / races / factions
- Player classes or races: none in the files read (the player is one row). Count 0.
- Factions: the 15 families above, used as tags. Their use is as weapon-slaying targets and affinity tags, not as allegiance.
- Progression shape: depth only (no character levels read). Depth constants per variant (src/variants/GlobalsBrogue.c lines 43-44: amulet at 26, deepest 40; GlobalsBulletBrogue.c lines 42-43: 3 and 5; GlobalsRapidBrogue.c lines 43-44: 6 and 10). Same tables, compressed depth for short variants: a useful zones-as-data idea.
- Best transferable idea: one data table per family with a depth cap and a membership list, so "slaying" and affinity rules can read a tag instead of a hard-coded list.

## 3. Weapons
Count: 15 weapon kinds (src/brogue/Globals.c lines 1582-1603, weaponTable). Families by role (my grouping, not in the code): light blades (dagger, sword, broadsword, rapier, whip), heavy blunt (mace, war hammer, flail), reach (spear, war pike), sweep (axe, war axe), thrown (dart, incendiary dart, javelin).
Special properties per kind: dagger sneak bonus; mace and hammer stagger; whip extends; rapier quick and lunge; flail passes attacks; spear and pike penetrate; axes hit all adjacent (flags set at src/brogue/Items.c lines 207-236).
Runics: 10 weapon runics (src/brogue/Globals.c lines 1614-1626): 8 good, 2 bad (split at src/brogue/Rogue.h line 843). Good runics include speed, quietus, paralysis, multiplicity, slowing, confusion, force, slaying. Bad ones: mercy and plenty.
Roll (src/brogue/Items.c lines 238-262): 40 percent chance of an enchant roll of 1-3; half of those are cursed (negative, flagged), a third of cursed items get a bad runic; the good runic chance is gated by base damage (a rand 3-10 scaled by stagger, quick and extend flags must exceed the lower damage bound), so heavy weapons almost never get a good runic.
Visual tiers: no material tiers. Tiers show by name and enchant number only (no visual change read).

Top 5 striking:
1. Lunge rapier. Keep: quick attacks plus lunge flag as a distinct gap-closer. Change: our own lunge telegraph. Ref: src/brogue/Items.c lines 220-221.
2. Axe sweep. Keep: hits every adjacent foe at once. Change: a clear arc on screen for many-on-one fights (ties to MAX_ATTACKERS). Ref: src/brogue/Items.c line 232 (ITEM_ATTACKS_ALL_ADJACENT case).
3. Stagger hammer. Keep: mace and hammer stagger the target on hit. Change: a knock-back read at 375 wide. Ref: src/brogue/Items.c lines 213-215.
4. Slaying runic with a chosen family. Keep: a weapon chooses one monster class to be vorpal against. Change: our family tags from section 1. Ref: src/brogue/Items.c line 257 (vorpal enemy pick), src/brogue/Globals.c line 1416.
5. Dagger sneak bonus. Keep: five times damage on sneak; three times for other sneak hits (defect-free). Change: our sneak hit cue. Ref: src/brogue/Combat.c lines 1115-1117.

## 4. Armour / gear
Sets and material tiers: armour bases 6 in ascending order (leather, scale, chain, banded, splint, plate; src/brogue/Globals.c lines 1605-1612). Each base carries a strength rule and an armour value. No material colour; tiers read by base name.
Armour runics: 11 (src/brogue/Globals.c lines 1627-1640): 8 good, 3 bad (split at src/brogue/Rogue.h line 868).
Other gear kinds (counts): staffs 12 (Globals.c lines 1641-1655), rings 8 (lines 1656-1664), charms 12 (src/variants/GlobalsBrogue.c line 713), wands 9 (line 701), scrolls 14 (line 684), potions 16 (line 665).
Unknown appearance: flavour names are shuffled each game (src/brogue/Items.c line 7963, shuffleFlavors) and unidentified titles are built from a phoneme table (src/brogue/Globals.c line 1455; title build at src/brogue/Items.c line 8037). Items look like nonsense until used.
Lumenstone distribution by depth (14 entries, src/variants/GlobalsBrogue.c line 105): a late-game collectible with a depth-banded count.

Top 5 striking:
1. Pedestal of a guaranteed good permanent item (src/variants/GlobalsBrogue.c line 206, reward room). Keep: one guaranteed runic piece on a glowing pedestal. Change: our glowing reward plinth.
2. Unknown-appearance shuffle. Keep: per-run shuffle of names and looks, so the player learns by use. Change: our look-alike set. Ref: Items.c line 7963.
3. Charm recharge timers. Keep: each charm row carries a base duration, an increment and recharge fields (structure only read). Change: our own charm list. Ref: src/variants/GlobalsBrogue.c lines 713-744.
4. Armour base ladder. Keep: six bases with rising strength and value. Change: our own bases and looks. Ref: Globals.c lines 1605-1612.
5. Lumenstone by depth. Keep: a late-game collectible with a depth-banded count. Change: our own late-game item. Ref: GlobalsBrogue.c line 105.

## 5. Zones / dungeons
Count: 71 blueprints (machine, room and area recipes), src/variants/GlobalsBrogue.c lines 173-664. Each recipe has depth range, room size range, a frequency (raffle tickets), a list of features with instance counts, item and monster kinds, horde flags, and feature flags. 36 of the 71 descriptions mention a key (in most, the key is the reward and taking it triggers the room).

Biome and dungeon archetypes (own grouping):
- Reward rooms (lines 183-238): item libraries (take one item, the others lock; swap back allowed), treasure rooms, pedestal rooms, altars that trade items.
- Ally rooms (lines 239-264): chained allies, kennels of caged allies, a vampire lair with a cage key, a legendary-ally altar with a portal.
- Goblin warren and sentinel sanctuary (lines 264-275).
- Key-on-altar challenges (lines 289-595): statues that burst, flood rooms with eels, fire traps, pit rooms, levitation and lava moats, gas vents, zombie crypts, haunted rooms, worm tunnels, turret gauntlets, mud pits, sacrifice altars.
- Obstacle doors (lines 322-420): throwing puzzles, pressure plates, beckoning totems, guardian doors.
- Flavour areas (lines 566-595): idyll (ponds, grass), swamp (mud, shallow water), camp, remnant, dismal, shrine, bloodwort.
- Bridges (line 595): a lake walk and a chasm catwalk under turret fire.
Hazards as tiles: caustic and confusion and paralysis vents, net and alarm and trap-door plates, flame and flood traps (src/brogue/Globals.c tileCatalog lines 315-579, 214 tile types).

Top 5 striking:
1. Sentinel sanctuary (GlobalsBrogue.c line 275; sentinel row Globals.c line 1098). Keep: support turrets that heal and shock their neighbours. Change: our own support totem set. Readable at 375 wide: one support type per room.
2. Statuary (GlobalsBrogue.c lines 289 and 460). Keep: statues crack and burst into monsters when the key is taken or the player comes near. Change: our statue shape and our reveal cue.
3. Flood room with eel pools (GlobalsBrogue.c line 377). Keep: taking the key floods the room so the eels can reach you. Change: our water rise, one trigger.
4. Haunted house (GlobalsBrogue.c line 531). Keep: the room darkens, ectoplasm covers everything, phantoms appear. Change: our darkness grade and phantom reveal.
5. Chasm catwalk and lake walk (GlobalsBrogue.c line 595). Keep: a narrow bridge under turret fire. Change: our own bridge and turret placement rule.

Spawn cadence (pairs with parity row 23): one periodic wandering horde every 125 to 175 environment updates (src/brogue/Time.c lines 2081-2084 and 2405; environment update every 100 ticks at line 2400). The horde is picked with captive, summoned, no-periodic and machine-only hordes excluded (src/brogue/Monsters.c lines 1115-1135). See section 7 for the scheduler.

## 6. Item / effect looks worth recreating
- Creature light per monster (lightCatalog, src/brogue/Globals.c lines 955-1022; each creature row has a light column). Keep: each creature carries a light radius with a fade percent. Change: our palette. Row 16 colour grade and row 7 creature actor.
- Item event flares (src/brogue/Globals.c lines 980-992): a short flash on scroll of enchanting, potion of strength, quietus or slaying activation, and an explosion. Keep: a flash keyed to the item event with its own radius. Change: our flash tint and length. Row 9 finishers and row 13 specials.
- Glowing terrain (lines 993-1019): torches, lava, luminous fungus, algae, embers, fire, brimstone, confusion gas. Keep: each terrain element has a light. Change: our palette, no copy.
- Glyph dim and bright (src/brogue/Globals.c lines 1016-1017): the same element at two intensities for two states. Keep: two intensities as a state read. Change: our two states.
- Death blood per creature (the blood column in the monster rows, src/brogue/Globals.c lines 1025-1166; blood kinds red, green, purple, acid, ash, ectoplasm, rubble, worm, ember). Keep: per-creature death colour and a decal. Change: our decal set. Row 8 blood and decals and row 17 death.
- Flitting motion (MONST_FLITS flag on eels, bats, bloats, pixies, phantoms, wisps; src/brogue/Globals.c monster rows). Keep: an erratic move set as the idle read. Change: our idle motion.
- Graded attack verbs (src/brogue/Combat.c lines 788-804 and 1198-1199): the verb scales with the damage percentile (monster text table at Globals.c line 1167). Keep: the verb escalates with damage. Change: our own verb set. Row 10 hit impact.
- Off-screen fight cue (src/brogue/Combat.c lines 1204 and 1264): "combat in the distance" when the fight is unseen. Keep: one line, once per turn. Change: a sound cue instead of a text line. Row 12 combat sound.
- Sneak hit cue (src/brogue/Combat.c lines 1066 and 1115-1117). Keep: a big multiplier on a sneak hit. Change: our hit-stop and flash. Row 10.

## 7. Mechanisms to reuse (rows 2, 4, 18, 23)
- Turn scheduler (src/brogue/Time.c lines 2386-2405): every creature holds a ticks-until-turn value; the loop steps by the soonest event (creature turn, player turn, or environment update) and subtracts it from everyone. Keep: event-skip stepping. Change: our fixed server tick with an NPC budget per tick (row 18 sub-line).
- Awareness (src/brogue/Monsters.c lines 1621-1681). Perceived distance is the scent age on the monster's tile, or the direct distance if the player is in view, whichever is less; capped at 1000. Awareness is twice the stealth range. A hunting monster loses track only when outside awareness (3 percent a turn, line 1668) and at 3 times awareness it drops off completely (line 1662). An unaware monster inside awareness and in view notices at 25 percent a turn (line 1678). Keep: two-sense aggro, a probabilistic notice, and hysteresis on loss. Change: scent replaced by a zone trail on the server.
- Stealth range (src/brogue/Time.c lines 686-712): base 14; halved in darkness, halved again in shadow, plus an armour adjustment, halved (rounded up) after resting, plus aggravation, and 1 while invisible. Keep: stacking modifiers on one number. Change: our modifier list.
- Flee hysteresis (src/brogue/Monsters.c lines 1775-1783 and 1807): enters flee at or under a quarter HP, leaves at three quarters HP. Keep: the band. Change: our thresholds and a rally cue.
- Summon throttle (src/brogue/Monsters.c lines 2442-2450): chance per turn is one over (3n squared plus 2), where n is the live minion count (the roll itself is on line 2451). Allies stop summoning at five minions (line 2450); the always-summon flag caps at 50 (line 2442). Keep: the falling chance with count. Change: MAX_ATTACKERS-style hard cap plus the falling chance.
- Entering summons at one in eight (src/brogue/Monsters.c lines 2445-2446, the enter-summons branch).
- Periodic spawn fuse (src/brogue/Time.c lines 2081-2084): decremented once per environment update; when it hits zero a horde spawns and the fuse resets to a random 125-175. Keep: a random reset window. Change: spawn caps per zone with a grace timer before despawn (row 23).

Defects found (keep the idea, fix the defect):
- D3 Jelly split adds HP. Each split sets both halves to the rounded-up half (src/brogue/Combat.c line 273), and cloneMonster copies the whole record (src/brogue/Monsters.c line 564). So a jelly left with 3 HP after a hit becomes two 2 HP jellies (4 HP total). Fix: the clone gets the rounded-down half and the original keeps the rounded-up half, so the total HP is conserved.

## Inspiration for Frankendom (originals, clearly distinct, never copies)
1. Splitting Ooze (parity rows 2 and 4). Keep: split on hit with shared HP. Change: exact HP conservation (fix D3) and a cap on engaged pieces at three, as MAX_ATTACKERS requires.
2. Wandering Warband (row 23). Keep: random fuse reset of 125-175 environment updates and the exclusion filter (no captive, summoned or machine-only hordes). Change: spawn cap per zone, grace timer before despawn, and flat-ground siting from Harper's ring search (see the other catalogue).
3. Two-Sense Aggro (rows 2 and 4). Keep: noticing by sight at 25 percent a turn, losing track at 3 percent a turn outside awareness, hard drop at three times awareness. Change: no scent map; a server trail of the last seen position per zone.
4. Captive Guard Camp (rows 4 and 23). Keep: a captive leader with guards around it. Change: a rescued captive joins as an ally after one engage state change; no per-guard reward.
5. Key Altar Trap Room (rows 20 and 23). Keep: the key is the reward and the taking springs a room trap (flood, gas, statues, crypt). Change: the trigger is one server-verified event, and our trap set is ours.
6. One-Pick Cage Library (row 18). Keep: take one reward, the rest lock; swap back allowed. Change: the choice is server-side after a Pit win, swap-back has a cooldown.
7. Flee-to-Regroup (rows 2 and 4). Keep: flee at or under a quarter HP, return at three quarters. Change: a rally banner and a sound cue on return.
8. Turn-on-Step Guardian (rows 4 and 23). Keep: moves only when the player acts. Change: the trigger is the server step count of the player's zone tile; glyph silhouette is ours.
9. Splitting event light flare (row 9 and 13). Keep: one short flash keyed to an item event. Change: our tint and length.

## Where seen (addendum topics)
- Idle and ambient: erratic flitting (section 6); a 25 percent roll starts a creature in tracking state, the rest asleep (Monsters.c lines 111-112).
- Death and respawn: per-creature blood colour and a death burst (section 6). Respawn: periodic spawn (section 5).
- Boss intro and finisher staging: boss machine behind a secret room and a fungus glow (GlobalsBrogue.c line 549); the legendary-ally portal (line 260).
- Readability at 375 wide: glyph and colour per creature (glyph column in the monster rows); max-enemy count per horde is small (1 to a few members); the sentinel and statue rooms carry one support type each.
- Hud-ui: none here beyond the glyph map (no minimap or world map in the files read).
- Sound-music: off-screen fight cue (section 6); no music, stingers or ambience beds shipped (audit: no audio files).
- Progression: depth-banded lumenstone counts and variant depth caps (section 2 and 4). Death penalty and achievements: not read.
- Loot: drop chance and type per creature row; reward room choice (section 5).
- Spawns and encounters: periodic wandering hordes (section 7). Walk density (what appears in 20 seconds of walking) not measured: the spawn fuse counts environment updates, not seconds.

## Not read
- Pixel content of bin/assets/tiles.png and icon.png; tiles.bin format (audit: not opened).
- Full text of monsterText (flavour and verbs) beyond structure; Monsters.c beyond the awareness, state, spawn and summon code; Movement.c; Dijkstra.c; Architect.c room placement; PowerTables.c; Light.c body; Recordings.c (audit only: 36-byte header, input log).
- Items.c beyond the weapon roll and flavour functions; IO.c; Wizard.c; MainMenu.c.
- Monster rows beyond the fields named above; the goblin and mage family lines (cut in my read); dungeon feature catalog (Globals.c line 603 onward).
- src/variants/GlobalsBulletBrogue.c and GlobalsRapidBrogue.c: depth constants read only.
- changes/ folder: 13 entries listed, not read.
- platform/ folder, BUILD.md, CHANGELOG.md.
