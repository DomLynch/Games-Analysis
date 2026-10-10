# realratchet-Lineage2JS (design catalogue, DC046)

Donor: /mnt/frankendom-donors/realratchet-Lineage2JS (VPS, read only).
Class C (restricted): no LICENSE file; package.json line 12 has "license": "ISC" (the only licence statement). README.md line 6 names the publisher of the game; line 13 says the work is reverse-engineered from binaries; line 27 doubts the legality of providing assets. Inspiration here stays CATEGORY-LEVEL only: no names, colour codes, constants, coordinates or instance-level looks from this donor. Recreate as a clearly distinct original, never a copy. Not legal advice.

Halves read: CLIENT (src/ renderer and asset decoder), read by grep and by the specific files listed below. DATA PACK: not in the box (the audit records that the user supplies the client install, and no data tables are present). SERVER HALF: not in the box (README.md line 21 calls networking with the server future work).
Paired donor in the box: none.

Checked: list of files read and grep counts is below. Receipts for every cited line are in receipts.tsv (verified). The numbers "0" and "null" below mean "not in the box", not "the game has none".

## 1. Creatures and beasts
Not in the box. No creature data table, no monster list, no boss scripts. Counts are null. The client loads its data from the user's install at runtime, so nothing can be counted here.

## 2. Classes, races and factions
Not in the box as a list. src/ uses a runtime ClassId in 24 files (grep count), but no class table was read. Counts are null.

## 3. Weapons
- Eight weapon-type families in an enum: hand, one-handed sword, two-handed sword, dual, pole, bow, throw, dual-fist (src/assets/unreal/un-pawn.ts lines 7-15, receipts ok). Count: 8 families (families, not items).
- The family drives the animation set: skill animation reads a current weapon-type property (src/skills/skill-animation.ts line 15; src/objects/components/animation-component.ts around line 236).
- Equipment is a component with per-item script properties; materials are disposed when an item is removed (src/objects/components/pawn-equipment-component.ts line 8 for the item class; the disposeMaterials helper at about lines 12-22 of the same file).

Top 5 striking (category level):
1. Eight-family weapon stance table. Keep: one family key drives the stance and animation set. Change: our own families and count.
2. Paired-weapon and bow families as distinct stance sets (from the enum names only; the animation files were not read in full).
3. Equipment swap that disposes old materials (pawn-equipment-component.ts line 8). Keep the cleanup rule; it avoids leaking GPU memory on swap.
4. Per-item script properties on the equipped object (same file). Keep the idea of a small property bag on each equipped item.
5. Weapon family read at skill time (skill-animation.ts line 15). Keep: the skill picks its pose from the equipped family.

## 4. Armour and gear
Not in the box as data. Client-side gear dressing exists in pawn-equipment-component.ts (one equipped item per slot in the component fields read); tiers and material names are not read. Counts are null.

## 5. Zones and dungeons
Not in the box as data. Runtime zone object class exists (src/objects/zone-object.ts, not read in full). Night sky, underwater and water-contact pieces exist (src/rendering/sky-renderer.ts, under-water-effect.ts, water-hit-effect.ts). No zone list. Counts are null.

Top 5 striking (rendering pieces, category level):
1. Contact splash sized from the body (src/rendering/water-hit-effect.ts line 9: a fixed size scale). The audit also recorded a speed-driven spawn rate and a facing rule; those lines were not re-read in this pass.
2. Night-sky celestial glow as an additive, two-sided, depth-write-off body (src/rendering/sky-renderer.ts lines 1, 32, 34).
3. Under-water pass (src/rendering/under-water-effect.ts; file name only, not read).
4. Water and terrain decoration (src/objects/terrain-decoration.ts; name only, not read).
5. Swaying object class (src/objects/swaying-object.ts; name only, not read).

## 6. Item and effect looks worth recreating
1. Ability as an ordered table of phases. src/assets/unreal/skills/native-skill-recipes.ts: a map of about 77 entries; each entry lists effect groups and a sound list per phase (phases begin with casting and shot; at least one more phase is in the file and was not read in full). Keep: each ability is a phase list with one effect and one sound per phase. This is the strongest transferable idea here.
2. Per-vertex baked glow mixed into the lighting term (src/objects/lit-actor.ts line 119 field; line 194 uses a sample of the light term with a half-factor pre-scale). Keep the idea of a baked glow channel. Change: our own tint ramp in our own shader; do not copy the blend domain or factor.
3. Damped bone chain for a cape or hair (src/objects/dynamic-hair-simulation.ts lines 17 and 23 name a stiffness and a collision limit; values not copied). Keep: a short chain with a collision limit. Change: fewer segments, wind-driven sway.
4. Additive two-sided sky sprite with depth write off (src/rendering/sky-renderer.ts lines 32-34). Keep the blend idea; change the disc and the halo colour.
5. Splash scale from collider (src/rendering/water-hit-effect.ts line 9). Keep: size tied to the body's collider.

Glow, shader and sound values: not copied. Art and audio are not in the box.

## 7. Inspiration for Frankendom (originals, category level only)
1. Phase-table ability: each ability is cast, release, impact, with one effect and one sound per phase. Keep the phase list; change every name, effect and sound. Ref: src/assets/unreal/skills/native-skill-recipes.ts lines 3-5.
2. Eight-family stance table: one weapon family key selects the pose and animation set. Keep the key-to-stance rule; change families and poses. Ref: src/assets/unreal/un-pawn.ts lines 7-15; src/skills/skill-animation.ts line 15.
3. Contact splash sized from the body: size from the collider, a flat burst in our shapes and palette, faced away from the wake. Ref: src/rendering/water-hit-effect.ts line 9.
4. Dusk moon glow: additive, two-sided sprite with depth write off, our own disc and halo. Ref: src/rendering/sky-renderer.ts lines 32-34.
5. Cape sway: short damped chain with a collision limit, wind-driven. Ref: src/objects/dynamic-hair-simulation.ts lines 17, 23 (names only).

## Reuse tag
Category-level only (class C). Reuse the phase-table idea and the family-key idea; everything else is ours to design.

## Brief rule served
Recreate as a clearly distinct original, never a copy. Kept: the phase-table and family-key shapes. Changed: names, effects, sounds, colours and every constant.

## Not read
- Most of src/ (419 .ts files): only the lines and files named above.
- src/assets decoders, env-info.ts, l2-env.ts beyond names, skill-viewer, physics, ue-script VM.
- docs/*.jpg and reference/* images (sizes only in the audit), html/skybox.png, style/*.scss.
- Data pack and server half: not in the box.
