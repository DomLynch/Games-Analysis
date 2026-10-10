# crawl-crawl (Dungeon Crawl Stone Soup): asset audit (AU011)

Root on VPS: /mnt/frankendom-donors/crawl-crawl/crawl-ref/ (read-only, nothing copied).

## Licences (what the files say)
- Code licence: GPL version 2 or later. LICENSE line 1-8 is the GPL notice; README line 96 says "Crawl is licensed as GPLv2+."
- Asset licence: mixed, and the repo says so.
  - LICENSE line 14: "Public Domain|CC0: most of tiles, perlin.cc, perlin.h".
  - LICENSE line 24: "The majority of Crawl's tiles and artwork are released under the CC0 license".
  - LICENSE line 27: "may be complex, especially for older pieces."
  - LICENSE line 28 points to an external page for tile licences (https://github.com/crawl/tiles). Not followed.
  - rltiles/license.txt line 1-2: the graphic tiles are partly from the public domain RLTiles tileset, and "Some of the tiles have been modified."
  - Fonts (webserver/static/fonts DejaVuSans and DejaVuSansMono, .woff and .woff2): no licence text found in the repo by grep. Not stated.
  - Text under dat/ (descriptions, monster and vault definitions): no separate licence; covered only by the general GPLv2+ statement.
  - No audio files (mp3, ogg, wav, mid, flac) in the tree.
- Rights-holder status: community open-source roguelike. LICENSE line 2 names "Linley Henzell, the dev team, and the contributors". README line 98: "Crawl is a descendant of Linley's Dungeon Crawl." Per-tile author list is not in the repo.

## Asset inventory
| Group | Path (under crawl-ref/source/) | Count / size | Licence | Class |
|---|---|---|---|---|
| Monster tiles | rltiles/mon/ | 1,600 PNG; 397 of 400 sampled are 32x32, 3 are 26x26; subfolders dragons (25), draco (17+), unique (136: 102 at 32x32, 30 at 32x48) | CC0 majority / RLTiles PD (LICENSE 24, rltiles/license.txt) | A (per-tile check) |
| Player tiles | rltiles/player/ | 1,220 PNG; 399 of 400 sampled 32x32 | as above | A |
| Dungeon tiles | rltiles/dngn/ | 2,311 PNG; 399 of 400 sampled 32x32 (also 136 in dngn/vaults) | as above | A |
| Item tiles | rltiles/item/ | 1,133 PNG, all 400 sampled 32x32; armour subfolder has 80 files | as above | A |
| GUI tiles | rltiles/gui/ | 1,025 PNG; 395 of 400 sampled 32x32 | as above | A |
| Effect tiles | rltiles/effect/ | 511 PNG, all 511 at 32x32; 8-frame sets (arrow0-7, blood_arrow0-7) | as above | A |
| Misc tiles | rltiles/misc/ | 347 PNG | as above | A |
| Unused tiles | rltiles/UNUSED/ | 595 PNG; folder named UNUSED | as above, not in active use | C |
| Title art | dat/tiles/title_*.png | 41 PNG; filenames carry contributor names; no licence in repo | none stated | C |
| Logos and icons | dat/tiles/logo*.png, stone_soup_icon* (.png/.ico/.icns/.svg) | about 10 seen in listing | none stated | C |
| Fonts | webserver/static/fonts/DejaVuSans*.woff, .woff2 | 4 files | no licence text in repo | C |
| Vault maps | dat/des/ (ASCII map text) | 147 files; about 200k lines across subfolders | GPLv2+ (general statement) | B |
| Item and monster descriptions | dat/descript/ | 280 text files, about 25,700 lines | GPLv2+ (general statement) | B |
| Monster and species data | dat/mons/ (yaml), dat/species/ | about 13,000 lines of monster yaml | GPLv2+ (general statement) | B |
| Licence texts | docs/license/ (cc0.txt, lgpl.txt, libpng, lua, pcre, worley) | 6 text files | the licence texts themselves | A (text) |
| Audio | none in tree | 0 | n/a | D |

Sampling: IHDR bytes only, about 400 PNG per folder (colour types: 8-bit palette, type 3, and 8-bit RGBA, type 6). Pixel content not viewed.

## Inspiration (own words)
- One base grid: 32x32 tiles are the standard, and the tile-making guide says so (docs/develop/tiles_creation.txt line 88). Bosses get taller 32x48 frames (mon/unique) so they read as bigger. Keep the grid and allow a larger size for uniques only.
- Modular draconian bodies: a set of base skin colours (ten base files) crossed with job overlays (six job files). Many distinct looks from a palette plus overlay approach. Ref rltiles/mon/draco/.
- Elemental dragons: about 25 dragon, drake, wyvern and hydra sprites, each named for an element, with a distinct hue and wing or body shape. Ref rltiles/mon/dragons/. Also three "wyrmhole" frames for a portal feel.
- Eight-direction projectiles: arrows and blood arrows come in 8 directional frames at 32x32 (rltiles/effect/arrow0-7, blood_arrow0-7). Projectiles that face their travel direction without rotation tricks.
- Armour art pairs: many armour pieces have a plain and an "art" variant (for example acid_dragon_armour.png and acid_dragon_armour_art.png in rltiles/item/armour/). Plain for play, ornate for display.
- Vault maps as ASCII stamps: symmetric arrival rooms built from a glyph grid (walls, doors, floor and other glyphs), per dat/des/arrival/simple.des. Layout by stamp is a zone-design reference.
- Title portraits (41 files in dat/tiles) show a splash-art pattern for characters and monsters. Not viewed; treat style as an open question.

## Inspiration briefs
1. Lizard knight kit (own label). Why it works: many looks from one body plus a job overlay. Keep: base body with a job overlay; shared proportions. Change: different limb and crest shapes; clan palettes; our own job names. Ref: rltiles/mon/draco/draco-job-knight.png (not viewed).
2. Element drakes (own label). Why it works: one silhouette per element reads at a glance. Keep: one wing or body shape per element; element hue plus a glow or trail. Change: our own element names and wing counts; different heads; no copied shapes. Ref: rltiles/mon/dragons/ice_dragon.png, fire_dragon.png (not viewed).
3. Red-fletched bolt (own label). Why it works: 8 directional frames keep projectiles readable in top-down play. Keep: 8 frames; a clear tip and fletching. Change: our fletching and trail colour; add a spark. Ref: rltiles/effect/blood_arrow0.png through blood_arrow7.png (not viewed).
4. Plated barding with crest (own label). Why it works: a plain and an ornate version of one armour piece. Keep: plain plus ornate pair. Change: our own crest and trim; metal ramp in our palette. Ref: rltiles/item/armour/acid_dragon_armour_art.png (not viewed).
5. Tall unique knight (own label). Why it works: a taller frame makes a boss read as a boss. Keep: 32x48 boss frame. Change: different shoulders and helm; our silhouette. Ref: rltiles/mon/unique/ (30 files at 32x48; not viewed).

## Cross-link to our topics
- camera and hud-ui: the GUI tile set (1,025 files) and the 32x32 grid are relevant to the HUD.
- zones and spawns: the ASCII vault stamps are a zone-layout reference.
- loot: the armour plain and art pairs and item folders (amulet, armour, potion, wand, staff and more) are loot-look references.
- vfx: the 8-frame projectile and effect sets are a direct vfx reference.
- animation: the monster and player sprite sets give frame-count references at 32x32.
- sound: no audio in this donor.

## Not verified
- No tile pixels were viewed; sizes and colour types come from PNG headers on a sample of about 400 files per folder.
- Licence of the 41 title images, the icons, and the DejaVu fonts: not stated in repo; class C.
- The per-tile authorship of CC0 and PD tiles is not in the repo.
- docs/license/cc0.txt and the other licence texts were not read beyond listing.
- dat/des, dat/descript, dat/mons: counted only; not read beyond headers.
- rltiles/tool (C++ tile tool) and webserver code: not read.
- Count of yaml files in dat/mons was not taken; the 13,000 figure is a line count.
