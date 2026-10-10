# knervous-eqsage (design catalogue, DC032)

Donor: /mnt/frankendom-donors/knervous-eqsage/ (VPS, read-only)
Class: C (EverQuest-derived data, licence and rights not stated in the box; audit AU029). Inspiration stays category-level. No instance-level looks, no copied names, no copied lore.
Dom's rule: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.
Not legal advice; the licence reading below is what the files say.

## Halves read
- Read: the client tool and its bundled static data. Zone table (public/static/zoneData.json), item-name table (public/static/items.json), the model-code table (sage/lib/model/constants.js), the exporter lineup and animation tables (src/components/exporter/constants.js), the material and glow code (src/components/builder/drawers/material-dialog.jsx, src/viewer/controllers/ZoneBuilderController.js), and the spawn-group editor (src/components/spire/nav-bar/spawn-nav/add-edit-spawn-dialog.jsx).
- Server half (zone, NPC and spawn database edited through Spire): NOT read. The README (line 5) names Spire as the target. The box also holds EQEmu (/mnt/frankendom-donors/EQEmu), which is the likely server half for these tables. I did not open it, so the pairing is unverified.
- Data pack (S3D and EQG archives): not in the box. The tool expects a local EverQuest install (about-dialog line 60).

## Counts (verified in the box)
- Creatures: 216 model-code entries (sage/lib/model/constants.js lines 531-749). These are visual model names only. No stats, no behaviour, no spawn tables.
- Classes: 15 class figure placements plus one default (src/components/exporter/constants.js lines 5-22). These are figure positions in one model file, not class mechanics.
- Weapons: 0 structured. items.json holds names only, with no type field.
- Gear sets: 0 structured. Armour tier words appear only inside item names.
- Zones: 610 records (public/static/zoneData.json).
- Items: 436 item-type keys, 5,487 item ids, 103,849 name strings (items.json). A name string is not one item; the same id can carry several strings.

## 1. Creatures and model families
Model-code table, grouped by keyword in the display name. First keyword match wins, so the buckets are approximate.
- Humanoid races: 47 codes.
- Beasts: 14 codes.
- Elementals: 12 codes.
- Undead: 15 codes.
- Dragon-kin: 10 codes.
- Insect and arachnid: 8 codes.
- Construct or plant: 6 codes.
- Aquatic: 4 codes.
- Fae or spirit: 3 codes.
- Unclassified by keyword: 97 codes.
- Robed variants: a model code with a 01 suffix. The robe list in the exporter (constants.js lines 82-98) names 12 codes. 13 model entries end in 01, which I did not reconcile.

No family has behaviour data in the box. Creature escalation by level, boss patterns and signature abilities are NOT in this half.

## 2. Classes, races, factions
- 15 class figures sit in one model file (load2.glb) at fixed offsets, plus a default body. Grouping by name only: melee-leaning, caster-leaning, and one bard-type. Mechanics per class are not in the box.
- Progression shape: none in the box. The exporter only places figures.

## 3. Weapons
- No weapon families in data. The closest is the attack-animation slot table (constants.js lines 35-79, 44 slots). Weapon-type attack slots include one-hand pierce, two-hand slash, two-hand blunt, one-hand slash, off-hand slash, bash, hand-to-hand, and archery (c02 to c09).
- Use the slot list as a weapon-family to animation mapping, with our own family names.

## 4. Armour and gear
- The viewer shows seven gear slots: Helm, Chest, Arms, Wrists, Hands, Legs, Feet (src/components/exporter/pc/pc-config.jsx lines 237-249).
- Material ladder, as name-string hits in items.json (not unique items): armour weight words Cloth 610, Leather 2,282, Chain 2,907, Plate 3,395. Metals: Bronze 244, Iron 493, Steel 1,035, Silver 816, Gold 905, Platinum 665, Velium 674, Mithril 320, Adamantite 82. Crystal and gem words: Crystal 962, Diamond 202, Pearl 198, Sunstone 7, Blue Diamond 19. Glow words: Glowing 309, Shimmering 176. Dark words: Shadow 1,083, Ebon 126, Dragon 562, Lava 105.
- How tiers are shown: not in this half. The shader and glow code (section 6) shows what a material can carry.

Top 5 striking (gear):
1. Weight ladder: cloth, leather, chain, plate. Keep the weight order. Change: our palette and silhouette per weight, readable at 375 wide.
2. Metal ladder from bronze up to adamantite. Keep the ascending order. Change: our metals are not the donor's metal names.
3. Glow and shimmer as name prefixes (309 and 176 strings). Keep: a prefix that marks a glowing item. Change: our glow is an emissive pass with a colour per rarity, not a name tag.
4. Dark-set words (Shadow, Ebon, Lava). Keep: a dark material family. Change: our dark sets get their own forms and signature mark.
5. Gem as the top tier (Crystal, Diamond, Pearl, Sunstone). Keep: gem as the apex material. Change: ours is faceted crystal with a fresnel rim, not a flat tint.

## 5. Zones and dungeons
Zone table (610 records). Field counts, verified:
- Sky mode: 309 zones at 0, 278 at 1, 21 at 2, 2 at 255.
- Zone-type field: 401 at 255, 157 at 0, 52 at 1. Meaning not read.
- Time-type field: values 0 to 5 (225 at 2, 181 at 0, 176 at 1, 15 at 5, 9 at 3, 4 at 4).
- Weather: rain chance is set in some stage of 203 zones; snow in 76 zones. Each zone has four rain stages and four snow stages with chance and duration.
- Four fog stages per zone (fog colour, near and far clip, per stage). Fog density is 0.33 on 508 zones.
- Walk speed is 0.4 on all 610 zones and gravity is 0.4 on all 610. Treat as a constant or unused field (not verified).
- Aggro radius: 600 on 604 zones; 750, 800 and 1000 on the rest.
- Experience multiplier: 1 on 263, 1.5 on 96, 0 on 41, 1.33 on 30, 2 on 25, 3 on 22.
- Safe point and graveyard id on every record (safe_x line 8, graveyard_id).
- Lava damage fields are set on all 610 records. Meaning not read.

Biome archetypes: not in this half. Only three zones carry a map file name.

Top 5 striking (zones):
1. Four-stage timed fog per zone, keyed by a time-type field. Keep: fog as a data stage per zone. Change: one shared dusk clock and a threat tint that stays readable.
2. Weather as zone data (rain on 203 zones, snow on 76). Keep: weather chance and duration as fields. Change: rain only cuts sight range in our build; no hidden damage.
3. Safe point on every zone record. Keep: a safe point and a graveyard as data. Change: our safe point is a shrine with a visible light.
4. Experience multiplier as data (values from 0 to 3). Keep: a per-zone reward multiplier. Change: shown as a zone badge, not hidden.
5. Aggro radius per zone (600 on most). Keep: a per-zone aggro radius. Change: drawn as a ground ring when the player is near the edge.

## 6. Looks worth recreating
- Glow layer toggle: the viewer adds glow meshes to an include list, with blur kernel 10 and intensity 0.7. Setting intensity to 0 turns it off (ZoneBuilderController.js 147-151 and 627-631). Use for targets and NPC highlight.
- Water material: a water shader with a normal map and an environment map as a pair, fresnel bias 0.11 and power 8 (material-dialog.jsx 110-116). Waterfall slides use four slide values (export-dialog.jsx 55-56).
- Glow material: shininess 50 on a glow-texture shader (material-dialog.jsx 85).
- Skybox: six small JPG faces (public/static/skybox_nx.jpg through skybox_pz.jpg).
- Animated class icons: 15 looping GIF files (public/static/eqassets/animated).
- Spawn marker: a sphere level-of-detail swap at a set distance, with the marker added to the glow include list (src/viewer/models/BabylonModel.js around lines 240-256).

## 7. Inspiration for Frankendom
1. Four-stage zone fog: each zone holds four timed fog stages as data. KEEP: fog as a data stage per zone. CHANGE: one shared clock, and fog never hides a telegraph.
2. Zone weather chances: rain and snow chance and duration per stage, as zone fields. KEEP: the data shape. CHANGE: weather only changes sight range, never damage.
3. Glow include list for targets: meshes join a glow pass only when they matter. KEEP: the include list. CHANGE: glow colour follows threat level, and the glow never hides a silhouette.
4. Weighted spawn group that must total 100: the editor blocks save until the chances add to 100. KEEP: the total check at edit time. CHANGE: spawn weights feed the spawn director (row 23) at runtime, not only the editor.
5. One model file, many figures placed by offsets: KEEP the placement by offsets. CHANGE: each figure gets its own silhouette and idle loop.
6. Robe-swap variant: one body with a garment variant code. KEEP: one body, one swap. CHANGE: our variant swaps a silhouette (hood, sash), not a texture.
7. Animated class icon loop: a short looping icon per class. KEEP: the loop. CHANGE: the loop shows the class's threat or role state.
8. Weapon-type attack slot table: each weapon family maps to its own attack animation slot. KEEP: the slot per family. CHANGE: our families and our animation names.

Rulings used: row 23 (zone population: cap, respawn, grace), row 14 (HUD), row 11 (fight camera), row 16 (colour grade), row 4 (fight loop), row 15 (gear dressing).

## 8. Licence
- sage/ sub-package: MIT (sage/package.json line 30).
- Root package.json: no licence field (zero matches). No LICENSE file in the box root.
- Asset licence: not stated anywhere in the box.
- Rights: data is EverQuest-derived. The tool says it works with a local EverQuest install (about-dialog line 60). No rights line in the box.
- Class C. Use shape only. No asset file is to be copied.

## Not read
- Server half (Spire-driven zone, NPC and spawn database). EQEmu in the box was not opened.
- Quest editor (src/components/spire/dialogs/quest-dialog), NPC dialog and most of the spawn editor beyond the chance check.
- The model files (public/static/clz.glb, load2.glb) and all sprite and icon artwork beyond the animated icon count.
- Sound files and the soundfont stub.
- The meaning of zone-type and lava fields, and the walk-speed constant.
- Item type fields (none in items.json).
