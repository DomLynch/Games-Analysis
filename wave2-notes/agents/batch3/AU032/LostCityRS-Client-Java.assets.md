# LostCityRS-Client-Java (asset audit, AU032)

Donor/Licence: no licence file in the folder. Code licence: none stated. Asset licence: none (no assets in the repo). Best class: D.

Half read: client half (this folder), read in part. The server half, LostCityRS-Engine-TS, is in the box and was read in part (World.ts, Npc.ts, Loc.ts). The data pack (the Content repository of .npc, .obj, .loc and similar files) is NOT in the box, and the client's name and look tables come from a runtime cache that is also not in the box.

## 1. Licence files

- No LICENSE, COPYING, NOTICE or CREDITS file in the folder (directory listing). build.gradle and settings.gradle carry no licence line.
- Grep for licence and copyright text across the 74 .java files found no licence or copyright header. The only hits were the word "jagex" in code.
- Absence checks are by listing and grep, so they carry no receipt.

## 2. Asset inventory

- Game art, models, audio, maps and text: none in the repo. The client fetches them at runtime. The cache file is opened in `src/main/java/sign/signlink.java` (line 111, `new RandomAccessFile(var1 + "main_file_cache.dat", "rw");`), and archives come from the on-demand server (`jagex2/io/OnDemand.java`).
- Word-filter lists are read at runtime (`jagex2/wordfilter/WordFilter.java`). `WordPack.java` holds a character table and a nibble unpacker, not the lists.
- Build tooling only: gradle-wrapper.jar, gradlew, gradlew.bat. Not game content.
- Sizes: 74 .java files, about 32,000 lines. Largest: Client.java (323 KB), ClientBuild.java (39 KB), Model.java (59 KB), World.java (73 KB), Pix3D.java (65 KB).

## 3. Rights-holder status (from the files only)

Decompiled proprietary client, inferred from the files:

- Classes carry `@ObfuscatedName` annotations (receipt: `WordPack.java:6`, `@ObfuscatedName("zb")`). Those annotations are what an obfuscated build leaves behind after decompilation.
- The window title is "Jagex" (`ViewBox.java:15`), and the code checks the host for jagex.com and runescape.com (`Client.java:5100`).
- The sibling Engine-TS README says this client is "a research project to decompile and understand the original code" (`LostCityRS-Engine-TS/README.md:39`).

No owner is named in this folder. Treat as restricted.

## 4. Class per group

| Group | Path | Licence per file | Class |
|---|---|---|---|
| Runtime game cache | sign/signlink.java:111 | not in box | D |
| Word-filter lists | jagex2/wordfilter/ | not in box | D |
| Build tooling | gradle/, gradlew | not stated | D |

Best class for the donor: D (no non-code content in the box). The inspiration below is category-level only, because the rights status is restricted.

## 5. Inspiration (own words; the code is read, the look is not copied)

- Recolour as data. A spot animation is a record with a model id, an animation sequence, six source-to-destination colour pairs, a resize, and ambient and contrast values (`jagex2/config/SpotType.java`, recolour arrays at lines 31 and 34). One mesh makes many tinted variants with no new art. Frankendom: one burst or spark mesh, six palette swaps per element or rarity.
- Modular kits. Identity kits are body-part records with their own recolour pairs and a head-slot array (`jagex2/config/IdkType.java`, line 30). Cheap variety from few parts. Relevant to gear dressing (parity row 15).
- Recipe sound effects. A Tone is a set of envelopes (frequency, amplitude, modulation rate and range, attack, release) plus five harmonics, each with volume, a semitone offset and a delay, and a reverb delay and volume (`jagex2/sound/Tone.java`, lines 10 to 46 and 321 to 326). JagFX writes a 22050 Hz wave from up to ten tones (`jagex2/sound/JagFX.java`, `getWave` at line 100, sample rate at line 110). A whole bank of cues is parameter data with no sample files. Relevant to combat cues (parity row 12).
- Projectile as a kinematic step. `move()` advances position by velocity times elapsed ticks, adds a vertical acceleration term (`ClientProj.java:121`), sets facing from atan2 of velocity, and steps a spot-animation frame on delay counts (`jagex2/dash3d/ClientProj.java`, lines 117 to 124). A bolt or arrow arc can use the same shape.
- Low-resolution software texturing. The rasteriser builds a 128 by 128 texture table (`jagex2/graphics/Pix3D.java`, loops at lines 245 to 246). The flat, palette-limited look is the reference; do not copy the rasteriser.
- Bitmap font as data. PixFont holds per-character mask, size, offsets and advance (`jagex2/graphics/PixFont.java`; field list seen by grep, not receipted). Relevant to readable text at 375 px.

Best transferable idea: recipe-based sound cues and a recolour-as-data effect record give many distinct cues and effects from parameter data alone.

## 6. Briefs (rule: recreate as a clearly distinct original, never a copy; the test is a readable silhouette at 375 px, one signature behaviour, one signature sound or effect, and about 20 to 30 percent resemblance at most)

1. **Spark burst (recolour family)**. Why: one tiny burst mesh re-tinted six ways reads at once and costs one asset. Keep: one shared shape, colour pairs as data, a per-element palette swap. Change: our own star or ring silhouette, our palettes, a fast-attack and longer-tail curve. Ref: `jagex2/config/SpotType.java` lines 31 to 34.
2. **Tonal hit ping (recipe sound)**. Why: a short pitch sweep with a few harmonics is a clear hit cue with no sample file. Keep: envelope-driven pitch, three stacked harmonics with semitone offsets and small delays. Change: our envelope shape, our harmonic ratios, a short noise transient on top. Ref: `jagex2/sound/Tone.java` lines 10 and 322; `JagFX.java` line 100.
3. **Bolt arc with gravity**. Why: a kinematic arc with a gravity term reads as a threat on its way in. Keep: velocity integrated per elapsed tick, a vertical acceleration term, facing from velocity. Change: our arc height and curve, a trail in place of spot-animation frames, a launch cue per weapon. Ref: `jagex2/dash3d/ClientProj.java` lines 117 to 124.
4. **Modular armour kit**. Why: part slots with their own recolour pairs give many dressed looks from few parts. Keep: part slots, a per-part recolour list, a head-slot mask. Change: our slot names and set (pauldron, greave, gauntlet), our ornament style, our own slot numbering. Ref: `jagex2/config/IdkType.java` lines 18 to 33.

## 7. Cross-link to our cell topics

- camera: none in this folder beyond client render code (not read in full).
- zones and spawns: not in this folder. The zone and spawn mechanics are in LostCityRS-Engine-TS (see that note).
- loot and hud-ui: the word-filter and font structures above are the only UI-adjacent data.
- vfx: spot animations (SpotType) and projectiles (ClientProj) as above.
- animation: sequence records are referenced (SeqType) but the Java sequence code was not read.
- sound: JagFX and Tone as above (recipe sounds).

## 8. Not read

- Pix3D rasteriser internals (only the loop bounds).
- OnDemand protocol and cache layout (skimmed).
- Client.java and ClientBuild.java gameplay code (grep only).
- Runtime cache and word lists (not in the box).
- gradle-wrapper.jar (binary, not opened).
- Data pack (Content repository): absent from the box.
