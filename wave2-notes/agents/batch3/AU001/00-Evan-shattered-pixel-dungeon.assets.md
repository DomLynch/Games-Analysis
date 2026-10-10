# 00-Evan-shattered-pixel-dungeon: asset audit (AU001)

Read from the VPS tree only (read-only). Nothing was downloaded, run or viewed as an image. PNG sizes come from IHDR headers; sprite frame sizes come from the Java `TextureFilm` calls.

## Licences (as the files say)
- Code: GNU GPL v3. `LICENSE.txt` line 1-2 is the GPL v3 text. Source headers say "either version 3 of the License" (AboutScene.java, line 9-10). README says the code is based on Watabou's Pixel Dungeon source.
- Assets: no asset-specific licence file in the repo. No LICENSE/NOTICE/CREDITS file exists under `core/src/main/assets`. Art and music are credited by name in `AboutScene.java` only. The `docs/recommended-changes.md` line 39 says GPLv3 applies to edits of the credits scene, which is a code-side note.
- Sound samples from freesound.org: AboutScene.java lists some samples as "Creative Commons Attribution License" and some as "Creative Commons Zero License" (lines 230-240). Per-sample licence is what the credits say; the files themselves do not carry it.

## Rights-holder status (repo files only)
- Copyright lines: Evan Debenham (2014-2026) and Oleg Dolya (2012-2015) in source headers. README: "based on the source code of Pixel Dungeon, by Watabou". Status: derivative of a GPL codebase by its author, with art and music credited to named individuals. Commercial-game assets not claimed in the files. Unknown for the art and music ownership beyond the credits list.

## Asset inventory (counts from `find`)
- `core/src/main/assets/sprites/`: 78 PNG. Indexed-colour sheets (PNG colour type 3, 8-bit) for mobs, e.g. rat.png 256x64, yog.png 256x32, dm300.png 256x64, goo.png 256x16 at 4-bit, warrior.png 256x128. Frame sizes from Java: rat 16x15, yog 20x19, goo 20x14, DM-300 25x22.
- `sprites/items.png` 256x512 RGBA: item icon sheet.
- `environment/`: 28 PNG, tile sheets RGBA 256x256 (e.g. tiles_sewers.png, tiles_caves*.png, tiles_city.png, tiles_halls.png, tiles_prison.png), water0-4.png, wall_blocking.png, occlusion_shadows.png.
- `effects/`: 6 PNG (effects.png, fireball-short/tall.png, specks.png, spell_icons.png, text_icons.png).
- `interfaces/`: 21 files (banners.png 512x256 RGBA is the title banner).
- `splashes/`: 15 JPG/PNG, about 2.6 MB total (title/mid_mixed.png, city.jpg, caves.jpg, etc.).
- `music/`: 31 OGG (halls_1, halls_tense, halls_boss, prison_1-3, city_1, caves_2, caves_boss, caves_boss_finale, sewers_boss...). About 18 MB.
- `sounds/`: 67 MP3 sound effects (hit_*, atk_*, zap, lightning, death, levelup, etc.). About 0.6 MB.
- `fonts/`: pixel_font.ttf plus pixel_font.png.
- `messages/`: 207 `.properties` text files (item, monster, scene, plant text in several languages). About 17 MB. Not read beyond file names.
- `gdx/`: 5 files (textfield atlas and json).

## Class per group
- Sprites, tiles, UI, fonts, banners: class C (no asset licence in repo; credited to named artists). Inspiration only unless the artists' terms are checked by a human.
- Music (31 OGG, credit "Cube Code" in AboutScene.java): class C. Credit line gives no licence.
- Sound effects made by Celesti (credited in AboutScene.java 116-120): class C.
- Freesound samples (credits list CC-BY and CC0 samples): class B for the CC-BY entries (attribution), class A for the CC0 entries. The repo does not map each sample file to its entry, so a human must check which mp3 is which before reuse.
- Text (messages, 207 .properties): class C. Protected text, do not copy; the story and item text are summarised only.

## Inspiration (own words, no copied text)
- Creature sheets are indexed-palette PNGs with tiny frames (rat 16x15, goo 20x14, DM-300 25x22). A small palette with 3-4 tones and one bright accent is a cheap path to a readable mob; the same format would work for our originals.
- The Goo and DM-300 classes use particle emitters for spray and supercharge sparks (GooSprite.java, DM300Sprite.java). A short particle burst on a charge-up is a cheap way to telegraph attacks.
- Zones are split into named tile sheets by biome (sewers, caves, city, halls, prison, crystal caves, gnoll caves). Each zone gets its own palette and wall set, which gives a clear zone identity with one tile system.
- Effects use a single shared effects sheet with a speck layer and fireball variants (effects/), so VFX reuse one atlas.
- Music is per biome plus a tense variant and a boss variant per zone (music/). A three-state music set (calm, tense, boss) per zone is a clear design to copy in our own tracks.
- Title and splash art is a set of large JPG/PNG panoramas per biome (splashes/). Good for loading screens; need originals.
- Interface banners ship a separate glow layer (interfaces/banners.png per docs/recommended-changes.md). A glow layer over a base title is a cheap effect.

## Inspiration briefs
See `00-Evan-shattered-pixel-dungeon.assets.json` (`briefs`).

## Cross-link to our cell topics
- zones: tile sheets per biome (environment/tiles_*.png) and per-zone music.
- vfx: effects/ atlas and Goo/DM-300 emitter use.
- sound: sounds/ and music/ tree; freesound attribution list.
- hud-ui: interfaces/ and fonts/pixel_font.ttf.
- animation: TextureFilm frame sizes in sprites/*Sprite.java.
- loot and spawns: messages/ text not read.

## Not read
- No image was opened or viewed. Art judgements are from file names, formats and sizes only.
- messages/*.properties not opened beyond file names and counts.
- Each audio file not opened. The freesound-to-file mapping was not checked.
- The `splashes/` and `music/` contents not opened.
- Full AboutScene credits lines 240-252 not read beyond the licence headings.
