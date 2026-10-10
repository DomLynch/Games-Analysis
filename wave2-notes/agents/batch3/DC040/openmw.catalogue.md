# openmw (design catalogue, DC040)

Donor: /mnt/frankendom-donors/openmw
Licence: GPLv3 for the code (README.md:9; LICENSE is the GPL v3 text). Assets are mixed: the DejaVu font is a custom licence, DemonicLetters and MysticCards are SIL OFL with a Reserved Font Name (per AU039; the licence texts ship in files/data/fonts/). Asset class B per AU039. Code is GPL, so we take shape only, clean-room.
Half read: the script, UI and asset half (files/data/scripts, files/data-mw/scripts, files/data/openmw_aux, the combat interface, files/data/mygui inventory, fonts, shader names, textures count, l10n strings). The Morrowind data half (.esm, .esp, .bsa, .nif, records and cells) is NOT in the box: AU039 and my narrow listing of files/ found none. No paired data donor exists for it in this batch: OpenGothic is a different game (Gothic 2) and also lacks its data.
Not a source of exact creature, class, item or zone data. Everything below is mechanism and shape, plus UI and sound-adjacent patterns.

Dom's rule for every idea here: recreate as a clearly distinct original, never a copy. Keep the mood, change the names, numbers and look.

## 1. Creatures / beasts
- Creature records: 0 in box (Morrowind records are not in the box).
- Animation clip library: files/data/animations holds only animation-config.yaml (one file), so no clips in box.
- Code-level creature hooks: the combat interface has unarmed-creature handling and an armour-damage option for unarmed creatures (OMWCombat/en.yaml:6-7, "Unarmed creature attacks damage armor").
- Families and tiers: none in box.
- Top creature-like patterns (no instances, so these are patterns):
  1. Unarmed attacks that still damage gear: a creature's bite can wear armour when a setting says so (en.yaml:6-7). Keep the idea that natural weapons touch gear; our own rule per creature type.
  2. Hit handler chain for on-hit reactions (see section 3): a creature can react to a hit through the same chain as the player, so the reaction is data, not special code.

## 2. Classes / races / factions
- Class, race and faction records: 0 in box (Morrowind records).
- Not read: the record readers under components/ and combat code under apps/.
- Progression, skill and death-penalty rules: not in box.

## 3. Weapons and combat mechanics
- Families (code taxonomy, no records): attack types Chop, Slash, Thrust (interface_local.lua:163-165, enum at :162); attack sources Magic, Melee, Ranged, Unspecified (interface_local.lua:154-157).
- Attack record: a damage map by stat (health, fatigue, magicka), strength 0 to 1, wind-up fraction or -1, success flag, optional hit position for blood, and flags to ignore armour, difficulty, stagger or sound (interface_local.lua:24-37).
- Hit chain: on-hit handlers run in order; a handler that returns false skips the rest (interface_local.lua:61-63; the Combat onHit entry at :142).
- Projectile chain: per projectile type, handlers run in order and a false return stops the chain (projectiles.lua:33-35 and the doc at :45-46). Only the Magic type has handlers so far (projectiles.lua:13).
- Stagger: knockdown or hit recovery depends on agility, unmodified damage and a random roll (interface_local.lua:94-99).
- Top 5 striking (mechanics):
  1. On-hit handler chain with early stop (interface_local.lua:61-63, 142). Keep: ordered handlers that can stop the chain. Change: our stat names (health and stamina only) and no Lua API.
  2. One attack record shape for every hit (interface_local.lua:24-37). Keep: one record, many readers. Change: our fields.
  3. Stagger roll from agility, unmodified damage and a random roll (interface_local.lua:94-99). Keep: stagger as its own roll, not a damage side effect. Change: our formula.
  4. Projectile handlers keyed by type (projectiles.lua:53-57). Keep: one table per projectile type. Change: our types.
  5. Attack-type enum for chop, slash and thrust (interface_local.lua:162-165). Keep: three readable attack shapes for weapons. Change: our shapes and timing.

## 4. Armour / gear
- Gear sets: 0 in box (Morrowind records).
- Armour rating is computed from skill and condition (interface_local.lua:127-132, doc for getEffectiveArmorRating; the armour slot is picked at random when hit, lines 144-149).
- Shield hits: when no shield is worn, hits aimed at the shield slot are redistributed to the left pauldron or cuirass (OMWCombat/en.yaml:12; described as the Morrowind Code Patch fix).
- Top 5 striking: (a) random armour slot on hit (interface_local.lua:144-149); (b) redistribution of a missing shield's hits (en.yaml:12); (c) effective rating adjusted by condition (interface_local.lua:127-132); (d) gear damage for unarmed creatures (en.yaml:6-7); (e) blood spawn toggle for player and actor (en.yaml:14-16).
- Material tiers and looks: not in box.

## 5. Zones / dungeons
- Zone and cell records: not in box (Morrowind ESM).
- Zone-level mood cues: none read beyond music settings.
- Top 5 striking: not available from code in box; the one zone-adjacent item is the combat music toggle (OMWMusic/en.yaml:6) which is a setting, not a zone.

## 6. Item and effect looks worth recreating
- Head bob on walking: cosine arc with a 30-degree half-arc, a speed limiter, first-person only (head_bobbing.lua:28-30, 35, 37).
- Water ripples: normal-map texture on a plane (files/data/textures/omw/water_nm.png, 24 KB; name and presence checked, contents not opened).
- Post effects as one file each: adjustments, bloomlinear, debug, internal_distortion (files/data/shaders/*.omwfx; names only, shader bodies not read).
- Display fonts: one demonic-letter face and one card-style face (files/data/fonts/DemonicLetters.ttf, MysticCards.ttf). Titles and item names only; licence texts ship with each.
- Controller glyphs: two families as image widgets per button (files/data/mygui/openmw_controllerbuttons.layout, 13.7 KB; per AU039, not opened in full by me).
- Layout and skin split: MyGUI layouts for structure, skin XML for look (88 MyGUI files in total; skin names such as openmw_box.skin.xml, openmw_button.skin.xml).

## 7. Inspiration for Frankendom
1. Marsh ripple water
   - Idea: a flat water plane with a scrolling normal map and sun glint, calmer in fight zones.
   - Keep: flat plane, moving normal, glint.
   - Change: our own normal map, depth-based shore tint, our palette.
   - Ref: files/data/textures/omw/water_nm.png (name only).
2. Gentle exploration bob
   - Idea: a low-amplitude head bob with a speed limiter, on in exploration and off in the fight camera.
   - Keep: cosine arc, speed limiter, first-person gate.
   - Change: our amplitude and period; zero in the fight camera (camera row 11).
   - Ref: files/data/scripts/omw/camera/head_bobbing.lua:28-30, 35, 37.
3. On-hit handler chain
   - Idea: ordered on-hit handlers, a false return stops the rest, one attack record for all hits.
   - Keep: ordered handlers with early stop; one record.
   - Change: our fields and names; no Lua API.
   - Ref: files/data/scripts/omw/combat/interface_local.lua:24-37, 61-63, 142.
4. Combat music on target-set change
   - Idea: compute the target list each tick, emit only when it changes, skip the work when idle.
   - Keep: emit-on-change and idle early-out.
   - Change: our cue names tied to zone data, and a boss-intro stinger.
   - Ref: files/data/scripts/omw/music/actor.lua:27, 31, 46.
5. Title-only display face
   - Idea: one display face for titles, one card-style face for item names, never for body text.
   - Keep: the split.
   - Change: our own free face with its licence file kept with it; no reserved name on a modified copy.
   - Ref: files/data/fonts/DemonicLetters.ttf, MysticCards.ttf.
6. One post-effect file per grade
   - Idea: each colour effect is its own named file, so a zone can pick a grade.
   - Keep: one file per effect.
   - Change: our palette per zone.
   - Ref: files/data/shaders/adjustments.omwfx and siblings (names only).
7. Shield-slot redistribution
   - Idea: when a slot is empty, hits meant for it go to a neighbouring slot, so armour still takes the blow.
   - Keep: the redistribution rule.
   - Change: our slot names and the neighbour choice.
   - Ref: files/data/l10n/OMWCombat/en.yaml:12.

## Defects to fix when we adapt
- None verified in the files read. The combat interface is documentation plus a hook table; the logic was not read (apps/ and components/ not read).

## Licence and clean-room note
GPLv3 code: shape only, no code copied. Fonts: use our own free face with its licence file, never a reserved-name modified copy. Textures and layouts: no own licence, treat as GPL-covered and do not copy; recreate the idea.

## Not read
- Morrowind data (absent from the box).
- components/ (record readers) and apps/ (combat implementation).
- files/lang and files/data/l10n beyond OMWCombat, OMWMusic and OMWEngine headers (OMWEngine en.yaml is 260 lines, not read in full).
- Shader bodies (4 omwfx names only).
- Texture contents (37 DDS, 1 PNG under files/data/textures counted; AU039 counts 14 PNG across files/).
- Lua scripts other than head_bobbing.lua, music/actor.lua, combat/interface_local.lua and projectiles.lua. My count of Lua files in the three script folders is 64; AU039 says 65. Not reconciled.
- MyGUI layout bodies and skin XML bodies.
- Launcher and openmw-cs.
