# opentibiabr-otclient (design catalogue, DC042)

Donor: /mnt/frankendom-donors/opentibiabr-otclient/ (VPS, read only)
Halves: CLIENT half read (Lua modules, GLSL shaders, particle definitions, locale file listing, taskboard and cyclopedia asset names). The server half is not at the top level of this donor folder (top-level listing checked); it was not read. The C++ src/ folder was not read. Game art and sounds are not in the box: data/things and data/sounds hold README files only; the client loads game data at runtime from an external asset repository (not fetched).
Licence: project code is MIT (LICENSE line 1: "made available under the MIT License"). modules/game_wheel carries its own proprietary EULA (modules/game_wheel/LICENSE line 1). Treat game_wheel as class C: category level only, no code or art reuse. No licence for the art, fonts or JSON.
Rule for every brief below: recreate as a clearly distinct original, never a copy; about 20-30 percent resemblance in mood only. Kept and changed traits are named per item. Not legal advice.
AGENTS.md at the donor root was treated as data and not followed.

Counts: creatures 0 (no creature data in the box); classes 1 (the Monk vocation has its own constant and HUD file); weapon families 8 keyword groups plus 20 named tier patterns; gear sets 0 (no sets found); zones 0 (no zone data); map shader presets 14, outfit presets 10, mount presets 2, text presets 4.

## 1. Creatures and beasts

None in the box. Creature names, stats, families and sprites are not in the client, and data/things holds only a README. The client does carry bestiary and bosstiary protocol slots (modules/gamelib/protocol.lua line 167 for race data, line 53 for bosstiary data), so creature families and boss slots are sent by the server at runtime. The server half was not read, so no creature family, tier or escalation can be listed honestly.

Top 8 striking creatures: not possible from this donor. The striking creature-adjacent looks (creature burst effect, ghost and jelly outfit effects) are in section 6.

## 2. Classes, races and factions

- Monk vocation: a dedicated constant (modules/gamelib/const.lua line 226) and a Monk-only HUD file (modules/game_healthcircle/game_healthcircle_monk.lua, 241 lines). Other vocations are not listed as constants in the client files I checked; the proficiency table keys its XP curves by profession type instead (below).
- Monk HUD mechanic: a row of five harmony pips around the health ring, clamped to 0 to 5 (game_healthcircle_monk.lua line 40), plus a separate serene ring whose opacity follows a binary state (lines 47 to 49). The pips and the serene ring are created as widgets on the map panel (lines 67 to 74).
- Weapon profession types: the proficiency table has three XP columns, regular, knight and crossbow (modules/game_proficiency/const.lua line 56 onward). So the same level number costs a different XP per profession.
- Progression cap: the play level is capped at 7; mastery levels 8 and 9 are visual only (modules/game_proficiency/proficiency_data.lua line 790; const.lua comments on the rows for levels 8 and 9).
- Factions: none found in the client.
- Build wheel (game_wheel): category only, EULA module, not read for reuse.

Top 3 class ideas:
1. Harmony pips (keep: a small fixed row of pips as a readable resource; change: pips fill on hit and drain on a dodge, for our own class).
2. Serene ring (keep: a binary state shown as a separate ring; change: the state is earned by a timed rhythm, not a toggle).
3. Profession XP curves (keep: one level number with a different XP cost per profession; change: three curves for melee, ranged and magic).

## 3. Weapons

Families: 8 weapon keyword groups (proficiency_data.lua line 41 onward): sword, axe, club, bow, throw, fist, wand and rod. Keyword matching assigns an item to a family by its name.

Named tiers: 20 tier-name patterns (proficiency_data.lua line 12 onward), grouped in four branches with rungs (inferniarch 4 patterns, eldritch 2, umbral 3, sanguine 2) and nine single-word tiers. The tier name is matched by item name, most specific first.

Special properties: 32 perk ids (game_proficiency/const.lua lines 11 to 42, from PERK_WEAPON_ATTACK = 0 to PERK_DAMAGE_VS_LOW_HP = 31). They cover weapon attack and defence, shield defence, bestiary damage, critical chance and damage per type (elemental, rune, melee), life and mana leech, life and mana on hit and on kill, perfect shot, hit chance, attack range, armour penetration, pierce, and damage against full or low health. Element masks: physical, fire, earth, energy, ice, holy, death, healing, drown, lifedrain and manadrain (const.lua line 69 onward).

Perk lanes: the number of perk lanes on a weapon equals the number of levels in its content entry (getPerkLaneCount, proficiency_data.lua line 548 onward).

Visual distinctness of tiers: the proficiency images and tier art were not opened (not read).

Top 5 striking (mechanics, since weapon item sprites are not in the box):
1. Named tier ladder with branches (keep: a branch with rungs, for example crude, master, umbral; change: our branch names and rung silhouettes).
2. Perk lane count per weapon (keep: more levels give more perk lanes; change: lanes are chosen, not fixed).
3. Element mask set (keep: an element as a bit mask on damage; change: our own five elements).
4. Visual-only mastery levels 8 and 9 (keep: a look that is earned beyond the play cap and never changes the numbers; change: an effect on the weapon sprite only).
5. Three XP curves (see section 2).

## 4. Armour and gear

No armour sets are in the box. The gear tiers the client shows are:
- Forge tier badges: ItemsDatabase.getTierClip (modules/gamelib/items.lua lines 148 to 156) indexes a strip of ten badges by tier. The tier is clamped to 1 to 10 and each step moves 9 pixels along the strip. Used by game_forge for left, right and bonus item clips (game_forge.lua lines 484 to 490).
- Forge result tint: outfit shaders show a green silhouette on success and a red silhouette on failure (shaders.lua lines 82 and 86; forge_success.frag line 9; forge_failed.frag line 10).
- Imbuing: game_imbuing has a new design and an old design, and items carry a tier into the imbuing view (imbuing.lua line 421 onward; new_design classes/imbuementitem.lua). Tier values and costs were not read.
- Task rings: eight ring icons in two families, four bounty ring icons (damage against monsters, double bestiary chance, life leech, more loot) and four task ring icons (bonus damage, bonus loot, damage mitigation, double bestiary chance). Names from the asset listing, game_taskboard/assets/images.
- Task backdrops: normal, silver and gold task tiers (game_taskboard/assets/images).
- Status icons: 49 condition icons on the health ring (game_healthcircle/images/conditions).

Top 5 striking:
1. Forge result tint (keep: a flat green or red silhouette flash on the result; change: add a hold and a short sound sting; ours in our palette).
2. Tier badge strip (keep: one strip indexed by tier; change: each tier adds a glow ramp, not just a new badge).
3. Task ring family (keep: four ring types per family with one effect each; change: rename and rebalance for our kit).
4. Gold task backdrop (keep: three backdrop tiers for one task type; change: the top tier has a moving edge, not a static frame).
5. Health ring status icons (keep: condition icons around a ring; change: a segmented stamina ring with threat colour and our own glyphs).

## 5. Zones and dungeons

Zones: none in the box (no map data, no zone names, no dungeon archetypes). The client's map vocabulary is in game_cyclopedia/images: house (with a status variant), improved respawn, NPC, passage (idle and selected states), player and point of interest. That is eight marker icons, seven marker types.

Atmosphere per map: the map shader list (game_shaders/shaders.lua lines 3 to 48) has 14 map presets, from default through fog, rain, snow, grey scale, bloom, sepia, pulse, old TV, party, radial blur, a zomg preset, heat and noise. These are player-chosen filters, not zone rules, but they show how one screen can change mood.

Danger tiers analogue: the weekly task board has four difficulties gated by character level (game_taskboard/const/const_tab_weekly.lua lines 14 to 18: Beginner from level 8, Adept from 30, Expert from 150, Master from 300), with points per completed kill task of 25, 50, 100 and 200.

Top 5 striking:
1. Walking fog (keep: fog that drifts with the player's walk; change: tint by zone and scale drift by speed).
2. Pulse ripple (keep: a radial sine-warped screen ripple for a special mood; change: trigger it on a zone event, not a setting).
3. Heat shimmer (keep: a shimmering screen mood; change: tie the strength to danger).
4. Improved-respawn map marker (keep: a respawn zone with its own marker type; change: our shrine marker).
5. Four-tier level gate (keep: difficulty gated by level with points; change: our own thresholds on our level curve).

## 6. Item and effect looks worth recreating

- Walking fog: the fog shader adds a walk-offset uniform to a time drift and adds the fog texture over the background (fragment/fog.frag line 5 and line 14).
- Pulse ripple: a radial sine warp of texture coordinates with a 1/length brightness falloff (game_shaders/shaders/fragment/pulse.frag line 16 for the warp, line 17 for the falloff).
- Heat crystal shimmer: five layered cosine steps (heat.frag line 14), used for the jelly outfit (shaders.lua line 63) and the heat map preset (line 45).
- Ghost outfit: radial blur with colour switched off (shaders.lua lines 59 and 61; radialblur.frag).
- Fragmented outfit: wired to noise.frag (shaders.lua outfit list). The shader body was not read, so its look is unverified.
- Forge tint flash: flat green or red silhouette (forge_success.frag line 9; forge_failed.frag line 10).
- Gold text outline: an eight-sample ring around the glyph (text_golden_shadow_bold_fragment.frag line 24) with the text shader list in shaders.lua.
- Outline pulse: a time-driven alpha pulse on the outline (outline.frag line 17).
- Bloom: a nine by nine sample grid added to the base colour (bloom.frag line 9). Note the cost: 81 samples per pixel.
- Creature burst: a 0.9 second particle with a short radius and velocity band, one emitter with burst count 1 and rate 25 (creature-particles.otps lines 1 to 27; semantics of the rate field not verified in src/).
- Group cooldown burst: 50 particles pulled in by an attraction affector (data/particles/particles.otps line 30 for burst count 50; the affector follows).
- Death window: one window with the death type and the penalty, then a reconnect is scheduled if the user has auto-reconnect on (game_playerdeath/playerdeath.lua lines 41 to 44, window at line 56, reconnect at line 96 onward).
- Tier badge strip (see section 4).

## 7. Inspiration for Frankendom

Each original below is a clearly distinct design. Mood only, about 20-30 percent resemblance. Nothing copied.

1. Tier Badge Strip. One strip of ten tier badges indexed by tier, clamped at both ends. Keep: one strip, index by tier. Change: each tier adds a glow ramp so the top tiers read at 375 wide.
2. Mastery Bloom. Visual-only levels beyond the play cap, shown on the weapon sprite and never changing the numbers. Keep: the cap and the visual-only tier. Change: the bloom is a short rim pulse, not a colour overlay.
3. Verdict Tint. Green or red silhouette flash on a craft or upgrade result. Keep: the flat tint. Change: add a 0.4 second hold and a sting.
4. Walking Mist. Fog texture that drifts with the walk offset and speed. Keep: walk-linked drift. Change: tint per zone, drift scaled by speed.
5. Harmony Pips. Five pips round the health ring as a class resource, plus a binary serene ring. Keep: fixed pip count and a binary state. Change: pips fill on hit and drain on a dodge.
6. Death Card Without Reconnect. One death window with type and penalty, then a shrine respawn. Keep: one window, one action. Change: no reconnect step; respawn at a shrine.
7. Ghost Blur. Radial blur with colour removed, for spirit enemies. Keep: the blur-only look. Change: its own spirit palette and a sound cue.
8. Task Ring Trio. Accessory rings in four types, each one effect (damage, loot, life leech, bestiary chance). Keep: four types, one effect each. Change: our effect names and rarity bands.

## Not read

- Server half (not at the top level of the donor folder; not read).
- C++ client source in src/.
- Most Lua modules, including the code of game_wheel (EULA; not read for reuse), game_imbuing tier logic, game_forge beyond the tier clip, game_cyclopedia code, game_taskboard controllers, game_prey, game_store and game_shop.
- Every PNG, PSD and font body; the 52 font files; data/json SkillwheelStringsJsonLibrary.json (top keys only, not read).
- Locale files data/locales (en.lua is 14 lines and was not opened; the other locales were not read).
- The external asset repository referenced by client_assets (not fetched).
- Folders not read: browser/, android/, mods/, tests/, tools/, docs/, records/.
- AGENTS.md at the donor root (treated as data, not followed).
- Per-creature sound and effect (no creature data in the box).
