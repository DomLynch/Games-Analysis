# knervous-eqsage (asset audit, AU029)

Donor: knervous-eqsage ("EQ Sage"), a browser and Electron tool that decodes EverQuest S3D and EQG files and renders them. Half read: CLIENT-SIDE TOOL and its bundled static data. The server-side zone database editor (Spire) is named in README line 5 but is not in the box.
Code licence: MIT for the sage/ sub-package only (sage/package.json line 30). Root package.json has no licence field and there is no root LICENSE file in the box, so root code licence is not stated.
Asset licence: not stated anywhere in the box.
Rights-holder status (from files): unknown. The tool is described as working with a local EverQuest install (about-dialog.jsx line 60). The bundled UI, item and zone data is EverQuest-derived. No rights line.
Best class: C overall (EverQuest-derived bundle, licence not stated). One group is D (soundfont is an LFS pointer stub with no real file).
Checked: root and sub-package licence fields, README, about dialog, public/static tree and counts, items.json and zoneData.json structure (head and grep), atlas.json head, soundfont stub head, export-dialog water lines, exporter constants.

## 1. Licences
- sage/package.json line 30: "license": "MIT".
- Root package.json: name, author and description only (line 11 description). No licence field.
- No LICENSE, COPYING or NOTICE file found in the box.

## 2. Asset inventory
- EverQuest UI: public/static/eqassets/images (656 png), animated (15 gif), atlas.json (about 205 KB). Class C.
- Loose UI: public/ui (148 png/jpg). Class C.
- Font: src/components/eq-ui/styles/Menuetto.ttf. Class C.
- Item names: public/static/items.json, 3.7 MB, 436 IT keys. Class C. Names not reproduced.
- Zones: public/static/zoneData.json, 1.6 MB, 610 zone records. Class C.
- Models: public/static/clz.glb (1.9 MB) and load2.glb (19 MB). Class C.
- Water and sky: water_n/water_e (png and dds), ra_watertest pair, six skybox jpg faces (about 84 KB). Class C.
- MIDI: qeynos2_0.mid (7 KB), regal_rpg_sea_shanty.mid (483 B). Class C.
- Soundfont: Nokia_30.sf2, 132 bytes, git-LFS pointer. Class D (stub; the real file is not in the box).
- EverQuest source archives (.s3d, .eqg, .wld): none in the tree. Class D.

## 3. Rights-holder status
Unknown from the files. The EverQuest name and EverQuest-derived data are everywhere. No copyright or rights-holder line was found in README, package files or the about dialog.

## 4. Inspiration (my own words)
- Armour tier ladder: each armour family has six tier variants with tier words in the name (items.json, armour entries near line 19033). Recreate the ladder with our own words and a colour ramp, not the donor's names.
- Water as two maps: normal and environment textures are loaded as one pair (export-dialog.jsx lines 235 and 240). Recreate with two small procedural maps.
- Cheap sky: six small JPG faces; the top face is the smallest. Keep the cheap cube; put detail on the horizon.
- Zone as one row: each zone record has a short id, a map file and a safe point (zoneData.json lines 8-9). Keep the safe point on every zone; add a walk-density field.
- Named atlas with four-state tiles: atlas.json maps names to rectangles; achievement tiles have locked, unlocked, hover and selected states. Keep the four states; give the locked state a shape cue.
- Animated class icons: 15 looping gif, one per class. Recreate as a short sprite loop.
- One figure file, several figures: several class figures in load2.glb placed by offsets (exporter/constants.js lines 6-11). Keep the lineup; give each figure its own silhouette.

## 5. Briefs
Four briefs in the json: six-tier armour ladder, two-map water sheet, hub sky cube, preview lineup. Each names the kept and changed trait. Recreate as clearly distinct originals, not copies.

## 6. Cross-link
- camera: the model viewer and the preview lineup need a camera framing for each figure.
- hud-ui: atlas-driven UI and four-state achievement tiles (progression fold-in).
- loot: the six-tier ladder is a rarity-by-name idea.
- vfx: water and sky maps.
- sound: MIDI zone themes need a soundfont that is not in the box.
- animation: class icon loops; model rigs not read.
- spawns: zone safe points and walk-density idea.
