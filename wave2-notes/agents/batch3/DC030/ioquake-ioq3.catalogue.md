# ioquake-ioq3 (design catalogue, reader DC030)

Donor/Licence: code GPL-2 (COPYING.txt line 2 "Version 2, June 1991"; metainfo says GPL-2.0-or-later). Game data (pk3: maps, models, sounds, textures) is not in the box and the repo says it is commercial. Shape and idea only: clean-room, never a copy. Dom's rule applies: recreate as a clearly distinct original, about 20-30 percent resemblance in mood, name the trait KEPT and the trait CHANGED. I am not giving a legal opinion.

Halves read: SERVER/GAME logic (code/game: bg_misc.c item table and pickup gate, g_items.c respawn and pickup, g_bot.c bot skill) and CLIENT/CGAME (code/cgame: cg_players.c, cg_weapons.c, cg_effects.c, cg_view.c, cg_local.h). DATA PACK: not read; the baseq3 pk3 data is not in the box (AU027). No paired donor for the data pack exists in the box.

Counts are what the box holds. Item rows counted with grep on code/game/bg_misc.c: 51 rows, of which 35 sit before the MISSIONPACK guard (line 657) and 16 inside the guard (lines 657-917). Weapon rows: 13 (10 base, 3 mission-pack). There are no creature records, no zone records and no gear sets in the box.

## 1. Creatures / beasts
- Nothing to catalogue as creatures. The box has no monster entity table or monster families. The only "opponents" are bots, which are AI players, not beasts.
- Bot difficulty is a 1-5 skill ladder. The skill is clamped to 1-5 (g_bot.c line 778). For skill in [1,2) the bot gets a handicap value of 50 (line 671), in [2,3) 70, in [3,4) 90; skill 4 and 5 set no handicap in that block (g_bot.c lines 670-677). This is an analogue for difficulty, not a creature family.
- No boss or elite pattern in the box.

Top creatures: none honestly to rank. One analogue is in the JSON, labelled as analogue, not a creature.

## 2. Classes / races / factions
- No character classes, no races, no XP or class progression in the box. Player models are pk3 data (not read).
- Teams exist only as a team flag mode: red and blue team flag items (bg_misc.c team_CTF_redflag and team_CTF_blueflag rows, lines 627-660). Trails use the player's own colour (cg_weapons.c line 244, ci->color1), not a team palette.
- Game modes (bg_public.h lines 103-114): free-for-all, one-on-one tournament, single-player FFA, team deathmatch, capture the flag, and mission-pack modes (one-flag CTF, obelisk, harvester). Modes are not zones.

## 3. Weapons
Families (weapon rows in bg_misc.c):
- Melee: gauntlet (line 193).
- Hitscan: machinegun (225), shotgun (209), railgun (289), lightning gun (273).
- Projectile: grenade launcher (241), rocket launcher (257), plasma gun (305), BFG10K (321).
- Utility: grappling hook (337).
- Mission-pack only (inside the MISSIONPACK block, 657-917): nailgun (868), proximity launcher (884), chaingun (905).
The quantity on each weapon row is the ammo given on first pickup (railgun 10 at line 295, plasma gun 50 at line 311, BFG 20 at line 327). Ammo pickups carry their own quantities (shells 10, bullets 50, cells 30, rockets 5, slugs 10, BFG 15; ammo rows 357-474).
Tiers: none. Weapons are slots, not tiers. No elemental or set bonus.
Pickup rule (bg_misc.c line 1053 "weapons are always picked up"): a weapon is always taken; ammo is refused at 200 (BG_CanItemBeGrabbed).

Top 5 striking (readable at 375 wide, one signature behaviour, one signature sound or effect):
1. Railgun spiral trail (cg_weapons.c CG_RailTrail, lines 215-262). Rings of radius 4 with spacing 5 (defines at 223-225), in the firing player's team colour (line 244), fading over a fixed time. Read in full up to the no-old-rail branch. Keep: a spiral in the shooter's colour so a sniper is readable. Change: our beam is a thin ribbon with a colour per hero, not rings.
2. Lightning beam (cg_weapons.c CG_LightningBolt, function starts at line 1062). Read the muzzle setup only (lines 1062-1080). Keep: a constant beam from the muzzle to the first hit. Change: our beam gets its own hit spark and a steadier look.
3. Grappling hook (cg_weapons.c CG_GrappleTrail, line 556): header only, body not read. Keep: a tether that is itself a readable line. Change: our tether is a shader strip with its own tone.
4. Plasma trail (cg_weapons.c CG_PlasmaTrail, line 466): header read to the cg_oldPlasma check (lines 466-480); body not read.
5. BFG, rocket and grenade trails (CG_RocketTrail line 330, CG_GrenadeTrail line 594): headers only, not read.

## 4. Armour / gear and how tiers look
Tier rows (bg_misc.c lines 65-117 and 120-185):
- Armour: shard 5 (line 68, icon name iconr_shard, model shard.md3), combat armour 50 (line 85, icon iconr_yellow, model armor_yel.md3), heavy armour 100 (line 101, icon iconr_red, model armor_red.md3). The tier is shown by icon colour and model name.
- Health: 5 (small), 25, 50, mega 100 (lines 120-185). Mega health (and 5 health) can go over max up to twice max (BG_CanItemBeGrabbed, bg_misc.c line 1079 for armour: armour is capped at 2x max health).
- Respawn: armour 25 s, health 35 s, mega health 35 s (g_items.c RESPAWN_ARMOR/RESPAWN_HEALTH defines, lines 39-44). Team deathmatch uses a separate weapon respawn cvar (g_items.c line 272 returns g_weaponRespawn; the team branch returns g_weaponTeamRespawn just above).
- Gear sets: none. Materials (metal, gold, crystal) are in the MD3 models, which are pk3 data and not in the box. Not read.

Top 5 striking:
1. Hovering pickup: armour and power-up rows carry the "suspended" flag (bg_misc.c line 65 for armour, line 521 for power-ups). Keep: pickups hover so they read at 375 wide. Change: a ring of light, not a box.
2. Overcharge over max: armour and mega health can exceed max (bg_misc.c line 1079, g_items.c health branch). Keep: a visible overflow state. Change: a glow that fades back, shown on the thumb-zone HUD.
3. Tier by icon colour and model name (icon rows bg_misc.c lines 73, 89, 105; pickup names 74, 90, 106). Keep: three tiers by colour, readable on a phone. Change: our own palette with a rarity sound key.
4. Persistent power-up slot (mission pack, bg_misc.c 765-816: scout, guard, doubler, ammo regen) that can only be held one at a time (bg_misc.c line 1108 region, IT_PERSISTANT_POWERUP). Keep: one held buff at a time. Change: our slot is per hero.
5. Power-up stacking timer (see section 6). Keep: stacking, aligned to whole seconds.

## 5. Zones / dungeons
- No zone, dungeon or biome records in the box. Maps are pk3 data (not read).
- Hazards: none in the box as data. g_trigger.c, g_mover.c, g_target.c are present; not read.
- Top zone ideas: none ranked. Gametype arenas (g_arenas.c) present, not read.
- Honest gap: the box cannot tell us any zone archetypes.

## 6. Item and effect looks worth recreating
- Power-up glow (cg_players.c lines 1841-1870): the quad damage power adds a blue dynamic light with radius 200 plus a random 0-31 (line 1852). Keep: a coloured light that travels with the player. Change: a light on the hero's ground ring, not a full scene light (phone budget).
- Power-up body shader (cg_players.c 2150-2185): quad overlay (red-team variant), regeneration flicker (line 2177: a 100 ms slice of each second shows the overlay), battle-suit overlay. Keep: a flicker that tells you a buff is on. Change: our pulse uses our own rhythm, readable at 375 wide.
- Invisibility (cg_players.c line 2153, and no shadow when invisible at line 2016): swaps the body for a shader and drops the shadow. Keep: no shadow equals hidden. Change: a dithered body and no ground disc.
- Expiry warning (cg_view.c CG_PowerupTimerSounds, lines 702-720): a "wear off" sound plays on each blink window before the timer ends (line 716). Keep: a warning window before expiry, with a sound. Change: our window is a data field per buff. Note: POWERUP_BLINKS and POWERUP_BLINK_TIME are used at lines 712-715 but their definitions are not found under code/ (grep). The blink values are not stated here.
- Damage blob (cg_view.c CG_DamageBlendBlob, lines 559-612): a screen-space blood sprite with alpha that fades from 200 over DAMAGE_TIME (500 ms, cg_local.h line 41; alpha line 601). Keep: a short screen tint on hit. Change: our tint is a vignette, off on the low tier.
- Gibs (cg_effects.c CG_GibPlayer, lines 564-600; CG_LaunchGib line 529): a burst of gib parts with random horizontal velocity (250) and an upward jump (250) (cg_effects.c lines 562-563 defines, and 574). Keep: the burst direction is random but always up. Change: our gib count and a death sound.
- Blood sprite (cg_effects.c CG_Bleed, lines 496-527): a blood explosion sprite lasting 500 ms (line 507), rotation random, hidden in first person for the player's own blood (RF_THIRD_PERSON). Keep: own blood is not drawn in the player's own view. Change: our wound decal is a row 8 decal.
- Rival-pickup denial (g_items.c lines 69-113): when a power-up is taken, each other player who is within 192 units (line 96), in front of it (dot product 0.4 or more, line 102) and in line of sight (trace at line 107) gets the denied-reward player event (PLAYEREVENT_DENIEDREWARD, line 113). The client side that plays it was not read. Keep: the cue only reaches players who could have seen the pickup. Change: our cue is a distinct sound and a HUD ring.

## 7. Inspiration for Frankendom (originals, not copies)
1. Rival-grab denial cue: when a hero takes a power-up, nearby players who are in front and in sight get a denial cue. Keep: the three gates (range, facing, line of sight). Change: our cue is a HUD ring plus a sound; the gate is server-side (row 18).
2. Stacking timed buff aligned to the second: taking a second buff adds to the timer instead of resetting it, and timers start on whole seconds so two buffs stay in sync. Keep: stacking and whole-second alignment. Change: buffs are zone and hero data fields.
3. Expiry blink warning: a buff gives a warning window with a sound before it ends. Keep: the warning window. Change: the window length is per buff.
4. Spiral trail in the shooter's colour: a ranged shot draws rings in its owner's colour that fade. Keep: the owner colour and the fade. Change: our beam is a ribbon; the rings are off on the low tier.
5. Hover pickup with overflow glow: pickups hover; armour and health can overflow max and the overflow glow fades. Keep: hover and overflow. Change: ring of light, not a box; overflow shown on the thumb zone.
6. Death burst with an upward kick: a death throws parts up at random, from a fixed velocity. Keep: random horizontal, fixed upward kick. Change: our kick and parts list per creature (row 17).

## Cross-links to topics
- loot: pickup gate and the item table are the nearest references for row 18 and the drop ceremony; no drop roll code was read.
- hud-ui: the full and minimal HUD presets (ui/hud.txt, ui/hud2.txt) are menu loaders only; the menu files are not in the box.
- sound-music: pickup and wear-off sounds are referenced by path (bg_misc.c line 194 area; cg_view.c line 716). The sound files are not in the box.
- spawns: items are placed by pk3 map entities (not read); respawn times are in g_items.c (read).

## Not read
- Game data (pk3 maps, models, sounds, textures): not in the box.
- Shaders and icons (misc/*.png, icns, ico, svg): listed only.
- ui/menus.txt, ui/ingame.txt, ui/menudef.h: listed only.
- code/game/ai_chat.c, ai_dmq3.c: line counts only; bot chat is pk3 script text.
- CG_GrappleTrail, CG_PlasmaTrail, CG_RocketTrail, CG_GrenadeTrail, CG_BFG paths: header or start only.
- code/game/g_trigger.c, g_mover.c, g_target.c, g_arenas.c: not read.
- libs/pak/unzip.cpp: not in the box.
