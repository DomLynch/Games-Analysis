# maddogg221-SWGVulkanClient (design catalogue, DC034)

Donor: /mnt/frankendom-donors/maddogg221-SWGVulkanClient/ (VPS, read-only). RESTRICTED: class C for the ported terrain and skeleton code. Category-level inspiration only.
Licence (as the files say): LICENSE.md is a custom personal, non-commercial licence (sections 1-2). Section 5 says it does not copy GPL or third-party source. README.md line 28 says not licensed for commercial use. No asset licence because the repo ships no game art, models, textures or audio (README.md line 26; HOWTO.md line 9). Rights holders named in LICENSE.md section 2: Sony Online Entertainment, Daybreak, Lucasfilm, Disney, SWGEmu.
Rights conflict in the files (flagged, not resolved): README.md line 20 and LICENSE.md say clean-room. Two code comments say the ported code came from a leaked SOE source drop: libs/terrain/include/terrain/MultiFractal.h lines 8-9 and libs/animation/include/animation/SkeletalPose.h lines 119-120 (per AU033). We do not reuse any of it. Inspiration below stays at category level.
Half read: CLIENT half in part (renderer shaders, terrain generator and affector headers, portal visibility, creature animation state headers, swgproto message headers). DATA half: the two text lists in libs/assets/data (object template path list of 10,682 lines and terrain grading map of 496 lines), read as counts and columns only. SERVER half (Core3, README.md line 9) is not in the box; the paired in-box servers are swgemu-Core3 and ProjectSWGCore-Holocore (named, not read). Creature and class tables live on the server side.
Checked: about 25 files opened by sed or grep; path lists counted by category. Confidence high on counts (path-level, not instance-level) and on the terrain and portal mechanisms; the look reads are shape-level only.
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

## 1. Creatures / beasts

Families and tiers: the client half holds creature template PATHS, not stats. Creature stats, tiers, escalation and abilities are server-side (Core3, not in the box). So: tiers and escalation = not in box.
Count (path-level, object_template_candidates.txt): 154 lair species folders under object/tangible/lair (excluding the base and structure folders); 84 static creature templates under object/static/creature (planet-prefixed names); 156 intangible pet templates under object/intangible/pet. Lair base 261 paths and lair structure 30 paths (not creatures). 112 template paths contain "_hue" in the name, which marks colour variants (creature, pet and other templates; not split further).
Creatures = 154 (lair species folders, path-level).
Signature behaviour: not visible from path lists. What the client half shows: a 34-bit creature state word (creatureanim/include/creatureanim/CreatureState.h lines 21-56) with stances, crowd-control states and damage-over-time states; a posture and locomotion to animation-state map (AnimationStateSelection.h); emote and flourish messages (swgproto Emote.h, Flourish.h).
Boss or elite pattern: none visible in the client half.
Idle and ambient vocabulary (what creatures do with nothing to do): the flourish message is a short entertainer gesture during a performance (swgproto/include/swgproto/Flourish.h line 14); emote is a targeted gesture (Emote.h header). No idle-when-bored loop is in the client half.

Top creatures (category-level only; no instance looks read):
- Label: Nest-lair set pieces (home markers). Why striking: 261 base and 30 structure lair templates, with light and dark variants of nest props (for example an antpile and a bramble pair); a monster's home that reads at a glance. Keep: home props with light and dark variants. Change: our own nest silhouettes and a danger colour. Ref: /mnt/frankendom-donors/maddogg221-SWGVulkanClient/libs/assets/data/object_template_candidates.txt line 5592 (object/tangible/lair/base/antpile_dark.iff).
- Label: Colour-variant beasts (hue set). Why striking: 112 template paths with a hue suffix; the same shape in several colours, so one shape reads as several threats. Keep: a small set of colour variants per beast. Change: a runtime tint on one mesh instead of separate templates. Ref: /mnt/frankendom-donors/maddogg221-SWGVulkanClient/libs/assets/data/object_template_candidates.txt (paths with _hue; example object/intangible/pet/zucca_boar_hue.iff, one line of the pet block).
- Label: Planet wildlife set (static creatures, 84 templates). Why striking: small planet-tagged wildlife placed as scenery; a density source for the walk-through feel. Keep: scenery creatures that are not targets. Change: our own scenery critters with a tag per zone. Ref: object_template_candidates.txt, object/static/creature block (84 paths).
Note: the top-8 with stat-level fields (tiers, abilities) is not possible from this half. Not read: the server.

## 2. Classes / races / factions

Client half: no class or profession table. swgproto has skill-modifier and profession-adjacent messages (SkillModEntry.h), but the skill trees and profession lists are server-side. Count: classes = null.
Factions: the client half has no faction table. Faction-themed armour sets appear in the path list (see section 4).
Progression shape: not in box.

## 3. Weapons

Families (path-level, object_template_candidates.txt):
- Melee 260 paths: sword 115, two-handed sword 85, polearm 38, knife 9, baton 5, axe 3, unarmed 2, special 2, base 1.
- Ranged 103 paths: pistol 25, rifle 21, creature-mounted 16, carbine 14, grenade 11, heavy 6, turret 5, droid 3, vehicle 1, base 1.
Count: weapons = 363 paths (260 melee, 103 ranged). Not objects; the list has no instance data.
Special properties (elemental, set bonus): not in box (server side).
Visual tier distinction: not verified. The path list shows family names only; tier suffixes were not read.
Top 5 striking (readability at 375 wide first, category level):
1. Two-handed sword (85 paths): a long single blade that reads from far away.
2. Polearm (38 paths): long reach silhouette.
3. Grenade (11 paths): a thrown-object shape that reads as an effect cue.
4. Carbine and rifle (14 and 21 paths): long gun silhouettes against the sky.
5. Creature-mounted ranged (16 paths): weapons that belong to a monster, not a hand.

## 4. Armour / gear

Sets: 21 armour set folders under object/tangible/wearables/armor (186 armour paths; 803 wearable paths overall). Count: gear_sets = 21.
Set names (category words, not instance look): soft padded layer; organic plate sets (bone, chitin); layered composite; a heavy alloy-type set (ubese); a plate set; faction sets (stormtrooper, mandalorian, bounty hunter, marauder).
Piece slots in the armour paths (counts): chest 25, plate 20, leggings 18, helmet 17, boots 16.
Materials: the client's only model shader (libs/renderer/shaders/Mesh.hlsl) is a textured half-lambert with a flat colour multiply (lines 54-55). No metal, gold or glow term in this half. Tiers are not shown by a shader here.
How the game shows tiers: not visible in the client half (path names only).
Top 5 striking (category level):
1. Padded soft layer as the base tier (keep: a cloth-like base that the others sit over).
2. Organic plate (bone, chitin) sets (keep: plates with a natural edge; change: our own plate shapes).
3. Composite layered set (keep: layered plates for a "built, not forged" look).
4. Heavy alloy-type set (keep: a heavy top tier; change: a visible gold trim on the top tier only).
5. Faction set with a visible silhouette (keep: a faction silhouette; change: our own crest, not a copied one).
Ref: /mnt/frankendom-donors/maddogg221-SWGVulkanClient/libs/assets/data/object_template_candidates.txt, object/tangible/wearables/armor block (line 9512 is one example path).

## 5. Zones / dungeons

Zones (planet folders, path-level): building templates grouped by planet folder: tatooine 55, naboo 46, corellia 44, endor 18, yavin 6, lok 3, dathomir 2. Terrain files (.trn) are not in the box. Count: zones = 7 planet folders (path-level; not zones in the game sense).
Building classes (path-level): base 29, general 130, poi 467, player 246, faction perk 51, military 50, plus planet sets.
Terrain grading map: 496 building templates each mapped to one terrain layout class: poi_medium 216, poi_large 135, poi_small 131, tatooine flora large 11, starport circle 1 (libs/assets/data/real_terrain_grading_map.txt, second column). Player housing gets no grading (README.md line 39 area; PROGRESS.md lines 88-96).
Terrain generator (libs/terrain/include/terrain/Family.h, Filter.h, Boundary.h, Affector.cpp):
- Six family groups (shader, flora, radial, environment, fractal, bitmap) under one generator form (Family.h line 12).
- Six filter tags (height range, fractal-noise range, bitmap luminance, slope, facing direction, shader match); Filter.h line 10.
- Four live boundary shapes (circle, rectangle, polygon, polyline); Boundary.h line 14. Two tags are dead.
- Fifteen affector kinds (Affector.cpp; grep count of parse functions = 15), including height constant, height fractal, height terrace (Affector.cpp line 129), colour ramps, flora, road, river, passable, exclude.
Dungeon archetypes (path-level): corellian corvette interiors (27 dungeon paths) and a death-watch bunker (13) under object/tangible/dungeon; 55 dungeon paths total.
Hazards: not in box.
Top 5 striking (category level):
1. Flattened outpost pad by footprint class (small, medium, large pads; poi_* in the grading map).
2. Terraced plateau (height terrace affector: a step fraction and step height).
3. River and road as affector-painted lanes (Affector.cpp, road and river kinds).
4. Ridged skyline from stacked noise octaves (MultiFractal.h combines octaves; category only, restricted code).
5. Crashed-ship interior dungeon (corvette interiors, 27 paths).

## 6. Item and effect looks worth recreating

- Half-lambert shade with one fixed light (libs/renderer/shaders/Mesh.hlsl lines 54-55): shade = 0.5 + 0.5 x saturate(N dot L), times the texture; untextured parts use a white fallback (Mesh.hlsl lines 4-5 comment).
- Portal visibility by breadth-first walk (libs/worldmodel/src/PortalVisibility.cpp lines 80-83): start cell is visible; each portal is tested as a bounding sphere (centroid plus farthest vertex, comment at PortalVisibility.cpp line 18); the adjacent cell becomes visible on a pass; depth capped at 8 by default (PortalVisibility.h line 49).
- Status tint and icon groups from the creature state word (CreatureState.h lines 21-56): stances (cover, combat, peace, aiming, alert, berserk), crowd control (stunned, blinded, dizzy, intimidated, immobilized, frozen), damage over time (poisoned, bleeding, diseased, on fire). 34 bits in all.
- Floating status text with a category tag above the target: swgproto/include/swgproto/ShowFlyText.h line 12 (hit-location feedback or NPC reaction).
- Short idle gesture from a performance (Flourish.h line 14).
- Pose-sheet capture idea (tools/dummyclient/ScreenshotCapture.cpp; name only, not read): fixed-camera stills per pose, rest pose first.
- Bind-pose debug switch: a switch to show the rest pose and isolate rig errors from clip data (SkeletalPose.h, class C comment; idea only).
- Animation-state selection from posture and locomotion (AnimationStateSelection.h): one function maps context to a state name; hard cuts between states accepted; a weapon-specific idle is a known gap.

## 7. Inspiration for Frankendom (originals, never copies)

1. Name: Portal-room visibility. Idea: rooms of a dungeon are cells with doorway portals; walk the doorways breadth-first and show only rooms whose doorway is in view, capped at a small depth. Keep: breadth-first walk, sphere test on the doorway, depth cap of 8. Change: ring-arena rooms with our own doorways; the doorway sphere uses our hit radius.
2. Name: Three-group status tints. Idea: stance, crowd control and damage-over-time each get a tint family and icon family. Keep: the three groups. Change: our palette and icons; crowd control gets a pulsing ring.
3. Name: Footprint pad classes. Idea: each placed prop or building declares a footprint class (small, medium, large) that sets the flattened pad under it; a flag can turn the pad off for player-built pieces. Keep: three classes and the per-piece flag. Change: our own pad sizes for the 375-wide frame.
4. Name: Terrace step. Idea: height snaps to steps given a fraction and a step height. Keep: the two parameters. Change: our own step curve for arena tiers.
5. Name: Filter-stack zone rules. Idea: a zone is an ordered list of rules; each rule has a filter (height band, noise band, slope, facing), a shape (circle, rectangle, polygon, polyline) and an affector (height, colour, flora, road, river). Keep: ordered rules, filters and shapes. Change: our own noise and our own shape set; this is zones as data on one runtime.
6. Name: Cancellable idle flourish. Idea: a short gesture plays when nothing else is happening. Keep: the short gesture in the idle loop. Change: it cancels on any input and never plays during a live fight.
7. Name: Runtime colour variant. Idea: one creature with a set of colour variants (instead of 112 separate hue templates). Keep: a few colour variants per beast. Change: a runtime tint on one mesh with our own hue ramp.
8. Name: Category floating tag. Idea: a short text tag above the target, with a category (hit location, NPC reaction). Keep: the category tag and short lifetime. Change: our own text and colours at 375 wide.

## 8. Notes on what was NOT found

- No creature stats, tiers, escalation, abilities or boss data in the client half.
- No class, profession or skill tables in the client half.
- No weapon special properties (elemental or set bonus) in the client half.
- No zone list in the form of .trn files; no hazard data.
- No binary art, models, textures or audio in the repo (README and HOWTO).

## Not read / unverified
- Binary art, models, audio: none in the repo.
- libs/assets parsers, libs/swgproto message bodies (headers only), libs/soe, libs/worldmodel beyond PortalVisibility, libs/clientcommon, libs/creatureanim bodies (headers only), libs/terrain sources other than Affector.cpp (headers only), libs/renderer sources beyond Mesh.hlsl lines 1-58.
- tools/dummyclient, tools/swg_blender_toolkit and tools/pcapdecoder: names only.
- The text lists read as counts and columns only.
- Restricted code (MultiFractal, SkeletalPose, the ported terrain): category-level only; no parameters, permutation tables or constants copied.
