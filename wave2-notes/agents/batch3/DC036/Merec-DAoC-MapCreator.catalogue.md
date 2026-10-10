# Merec-DAoC-MapCreator (design catalogue, DC036)

Donor: Merec-DAoC-MapCreator (VPS: /mnt/frankendom-donors/Merec-DAoC-MapCreator/)
Donor/Licence: map-generation tool (WinForms), GPL-2.0 (/mnt/frankendom-donors/Merec-DAoC-MapCreator/LICENSE line 2 "Version 2, June 1991"; source headers name the author, e.g. MapCreator/Classes/Constants.cs line 3). No separate asset licence. The README (line 2) says the tool generates maps of a commercial game world using the game client, so the game's own art and data are not in the box. Treat all image and place-name data as class C: category-level inspiration only.
Dom's rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

Halves read:
- Tool half (the only half in the box): read. MapCreator/data/Zones.xml, MapCreator/fixtures.xml, MapCreator/Classes/Constants.cs (enum), README line 2. Source files by name and listing only.
- Data pack: prerendered images, textures and the schemas were listed, not opened (image content not read).
- Game-client half: not in the box. The tool needs the client. A DAoC client-library folder appears by name in the box listing (for example dol-leodagan-DaocClientLib, Dawn-of-Light-DOLSharp). Not read. Not one of this reader's donors. Named only as a pairing candidate.

Counts (grep or ls counts; none estimated):
- creatures: 0. No creature data in the box.
- classes: 0. No character classes or races.
- weapons: 0. No weapon data.
- gear_sets: 0. No armour or gear data.
- zones: 240 zone entries in MapCreator/data/Zones.xml (not dungeon archetypes; the zone types are below).

## 1. Creatures and beasts

None in the box. The tool's data is map art (trees and landmark renders) and a fixture table. No monsters, bosses or spawn data.

Closest data (not creatures): the prerendered trees folder (44 PNG files, including dead and gnarled trees and a web-draped pine) and the prerendered objects folder (11 PNG files, including three relic-temple variants). Not read in pixels. Refs: MapCreator/data/prerendered/trees/, MapCreator/data/prerendered/objects/.

## 2. Classes, races, factions

None. The only faction-like data is the three relic-temple variants (objects folder), which are map landmarks, not factions.

## 3. Weapons

None.

## 4. Armour and gear

None.

## 5. Zones and dungeons

Zone types (Zones.xml header, line 6): Frontiers, Battlegrounds, Capitol, Outdoor, Indoor, Dungeons, Instances.
Counts by the type attribute on each entry (Zones.xml line 13 shows the attribute form):
- Outdoor 124, Dungeons 49, Indoor 27, Instances 26, Battlegrounds 11, Capitol 3. Total 240.
- Frontiers is listed in the header but no entry uses it. It appears only as an expansion name (two expansion blocks). Checked by grep.
- Hazards: none as data. Rivers have types (see section 6).

Top 5 striking (criteria applied, but few items qualify for a combat game):
1. Dungeons zone type (49 entries). Keep: a dungeon as a tagged zone type on one map table. Change: our dungeon archetypes and a tier per dungeon. Ref: MapCreator/data/Zones.xml line 6 and the type attribute lines.
2. Instances zone type (26 entries). Keep: an instanced zone as its own type, separate from open ground. Change: a lobby-and-gate entry and a timer. Ref: Zones.xml.
3. Battlegrounds zone type (11 entries). Keep: a small set of contested zones tagged as one type. Change: our own contest rule. Ref: Zones.xml.
4. Capitol zone type (3 entries). Keep: a hub zone as a separate type with few entries. Change: our hub layout. Ref: Zones.xml.
5. Indoor zone type (27 entries). Keep: indoor areas as a separate type for rendering and rules. Change: a roof-off camera rule. Ref: Zones.xml.

## 6. Item and effect looks worth recreating

The tool's art is map rendering, not in-game effects. Techniques read from the fixture table and enum (not the pixels):
- Fixture render modes: a table of categories, each with a renderer (none, shaded, flat, or image), a light ramp by direction, a colour, a transparency, and a shadow record (offset, size, transparency). Ref: MapCreator/fixtures.xml line 3 (renderer comment), line 38 (prerendered category uses the image renderer). Eight categories in all.
- Shadow record per category: the shadow is a separate offset and transparency setting on each category. Keep the idea; change the values.
- River types: river, lake, swamp, lava as one enum. Lava is its own class, not a water colour. Ref: MapCreator/Classes/Constants.cs line 40 (enum RiverTypes), lava member near line 47.
- Foliage: a leaf-mask texture (textures/tree_leaves.png with leaves_mask.png) and per-map tree transparency. Not read in pixels. Ref: MapCreator/data/textures/ (file names; see the audit AU034 for sizes).
- Landmark faction variants: three relic-temple renders with the same footprint and different ornament. Not read in pixels. Ref: MapCreator/data/prerendered/objects/ (file names).

## 7. Inspiration for Frankendom (originals, 5 to 6)

1. Terrain-first world map (hud-ui). Idea: a minimap and world map drawn from the terrain height and water pass, not from hand-placed shapes. Keep: the map comes from terrain data. Change: our own colour key and a fog-of-war edge. Caveat: the terrain-and-water claim is the one AU034 reports from the changelog; it was not re-checked here. Refs: changelog (listed only); the README line 2 (for the client dependency only).
2. Landmark style table (hud-ui and zones). Idea: one small table gives every map landmark a render mode, a light ramp and a shadow. Keep: one table styles every landmark category. Change: our own categories (keep, shrine, gate, camp) with our own shadow. Ref: MapCreator/fixtures.xml line 38 (renderer), line 3 (renderer list).
3. Lava band (zones and hazards). Idea: lava is a river class of its own, so it reads as a hazard and not as water. Keep: a distinct hazard class in the river enum. Change: a slow glowing band with a crust and an audio tick, our own texture. Ref: MapCreator/Classes/Constants.cs line 40.
4. Faction keep landmark (zones). Idea: one landmark silhouette, with the faction shown by ornament and tint, not by a new shape. Keep: one tall, centred silhouette across variants. Change: our own roof and arch; faction colour by tint only. Ref: MapCreator/data/prerendered/objects/ (names only; pixels not read).
5. Leaf-mask canopy (zones). Idea: one mask texture gates a flat canopy card, cheap at scale and readable at distance. Keep: the mask-on-a-card method. Change: our own leaf shape and a sway rule. Ref: MapCreator/data/textures/tree_leaves.png (file name only).

## Not read
- Image content of every PNG and DDS file (listed only).
- The .dll and .exe binaries under libs/ and tools/.
- Most .cs source files (listed by name; the README and the enum were read).
- NifUtil/ source (listed only).
- The changelog (listed only; AU034 reports its content, not re-checked here).
- CLAUDE.md and AGENTS.md: not present in this donor.
