# Asset audit: Card-Forge-forge

Donor tree: /mnt/frankendom-donors/Card-Forge-forge/ (VPS, read-only). Paths below are relative to that folder unless shown absolute. Receipts: receipts.tsv (verified). Machine-readable copy: Card-Forge-forge.assets.json.

**Best class: A**

## Code licence
GPL v3 (LICENSE at repo root; forge-gui/LICENSE.txt). README calls it an open-source Rules Engine for Magic: The Gathering. Bundled libraries carry their own licences in forge-gui/res/licenses (multiline-label, tinylog, xpp3, xstream).

## Asset licence
Mixed by group, per the repo's own credit files. Kevin MacLeod music: CC BY 3.0 (forge-gui/res/music/Credit.txt). Particle Park effects: CC BY 4.0 (particle_effects/Particle Park License.txt). Dock-bar icons: CC BY 3.0 per docs/Credit-and-Thanks.md. Adventure sprites and tiles: each artist's own licence, which is not in the repo. Other music, sound effects, fonts and skins: no licence line in the repo. Card art is not in the repo; the FAQ points to in-app downloaders.

## Rights-holder status
mixed and partly unknown. Fan/community open-source rules engine for Magic: The Gathering; README and forge-installer/ReadMeForge.txt both say it is not related to or affiliated with Wizards of the Coast. Card names and card rules scripts are in the repo with no ownership statement. Adventure sprites credited to individual artists, one credited to a Reddit user for 'iconic MTG characters'. Rights to those characters are not stated in the repo.

## Asset groups

| kind | path | count/size | licence | class | note |
|---|---|---|---|---|---|
| music, CC BY 3.0 tracks (Kevin MacLeod) | forge-gui/res/music/ (match/, menus/ and the Credit.txt in the root) | about 8 mp3 in match/ and menus/; 17 MB music folder | Credit.txt: 'Licensed under Creative Commons: By Attribution 3.0' | A | Credit.txt says 'Music contained within this folder is credited to' Kevin MacLeod under CC BY 3.0, so the file covers res/music/ as a whole. The adventure soundtrack list in docs names other artists; those tracks are in the C group below. |
| music, other named artists, no licence line | forge-gui/res/adventure/**/music (see docs/Credit-and-Thanks.md Soundtrack section) | adventure soundtrack list of about 30 tracks | Credit-and-Thanks.md names Derek Fiechter, Brandon Fiechter, Logan Epic Canto, Vindsvept and Juhani Junkala with no licence line (Junkala is linked to an opengameart page, not stated in the repo) | C | Names only; tracks not played or opened. |
| particle effects, CC BY 4.0 (Particle Park) | forge-gui/res/adventure/common/particle_effects/ (about 51 .p emitter files and 34 .png) | 51 .p files in total (Particle Park set plus blood.p, fly.p, heal.p, hide.p, kill.p, killed.p) | Particle Park License.txt: CC BY 4.0 text, copyright Raymond Buckley | A | A applies to the Particle Park files. The other .p files and circle*.png have no licence line in this folder and are C. |
| dock-bar icons, CC BY 3.0 (game-icons.net) | not located in this read; docs/Credit-and-Thanks.md 'Dock-bar icons' line | unknown | Credit-and-Thanks.md: CC BY 3.0 by Lorc, Delapouite and Skoll | A | Attribution required. The repo path was not found in this read. |
| adventure character sprites (heroes, enemies) | forge-gui/res/adventure/common/sprites/heroes/, sprites/enemy/{undead,monstrosity,fiend,humanoid,elemental,...}/ | heroes 28 png + 28 atlas; undead 37+37; monstrosity 30+30; fiend 29+29; elemental 25+25; human wizard 28+28 | Credit-and-Thanks.md: external artists, 'may be used only under the conditions laid out in their respective licence'; no per-file licence in the repo | C | Atlas files are text (RGBA8888, Nearest filter, 16 px frames). Pixel content not opened. |
| adventure tilemaps and tilesets | forge-gui/res/adventure/**/maps/map/*.tmx (about 1033 .tmx across the repo), tilesets (*.tsx, 34) | 1033 .tmx, 34 .tsx | Credit-and-Thanks.md: tiles from named pixel artists and opengameart; the file says more creditation for the tiles is given further down, and the line is cut off in this read | C | forest_town_generic.tmx is 30x17 tiles at 16 px (header read). Other maps not opened. |
| adventure structures and world models | forge-gui/res/adventure/common/world/structures/models/ (26 png), Realm of Legends and Shandalar Old Border equivalents | 26+ png per set | per-artist, as above | C | Not opened. |
| custom card pictures | forge-gui/res/adventure/common/custom_card_pics/ | 66 entries (64 .jpg, 2 png), named after card names with a fullborder suffix | none stated in the repo | C | Card names are used as file names. FAQ points to in-app downloaders for card images. Not opened. |
| UI skin backgrounds and art | forge-gui/res/skins/default/ (90 png/jpg, adv_bg_* biome backgrounds), forge-gui/res/adventure/common/ui/ (40 png) | 18 MB skins folder; 40 ui png in adventure | none stated | C | Biome names read from file list only (cave, castle, dungeon, forest, island, mountain, plains, swamp, waste, match). |
| sound effects | forge-gui/res/sound/ | 39 mp3, about 1.1 MB | Credit-and-Thanks.md: 'Thanks to ... freesound ... for providing some sound files'; no per-file licence | C | Freesound licences vary by file and are not in the repo. |
| fonts | forge-gui/res/fonts/ | about 172 KB | none stated | C | Not opened. |
| card scripts and card-name text | forge-gui/res/cardsfolder/ (about 134 MB, txt card scripts), forge-gui/res/languages/cardnames-*.txt (63 MB languages folder) | about 37520 .txt in repo; 14077 .dck deck files in repo | none stated for card text; repo code is GPL v3 | C | Game rules data and card names. Not reproduced. Use only as a structure example for our own card schema. |
| set lists, formats and decks | forge-gui/res/editions/, formats/, draft/, cube/, sealed/, deckgendecks/, lists/ | several MB of text | none stated | C | Set and format lists. Not read in full. |
| third-party library licences | forge-gui/res/licenses/ (4 files) | 4 files | each file is its own licence text | A | Code libraries, not art. Listed for completeness. |

## Inspiration (own words, recreate from scratch)

- Colour-family hero sprites: the dragonplayer sheets come in five suffixed variants (b, g, r, u, w). One silhouette, five palette swaps, each in a 16 px frame with nearest-neighbour filtering. A clear way to give each faction its own look without redrawing the figure.
- Creature families in separate folders (undead, fiend, monstrosity, elemental, humanoid), each with a sheet and a text atlas. A tidy bestiary structure: a family sets the silhouette rules, and a single creature is one more row in the atlas.
- Particle library organised as short bursts and trails (blood, fireball, burnout, pentagram, rain, smoke trail, starlight). Recreate the timing and the burst-plus-trail pairing with our own palette and sprite shapes.
- Compact town and cave maps: 30x17-tile rooms at 16 px, with named encounter maps per region (cave, evilgrove, merfolkpool, towns). A simple room grammar that keeps each encounter small.
- One full-screen backdrop per biome (cave, swamp, waste, island, castle, forest) behind menus and encounters, drawn in a low-saturation palette. A cheap way to tell the player where they are.
- Effects are separate .p emitter files (bursts, trails, glows) layered over sprites, so one sprite can get a burst or a glow without new frames.
- Sprite sheets are small and fixed-grid (16 px frames in atlas rows), which keeps the animation work manageable for one artist.

## Inspiration briefs

### Five-colour hero recolour set
- **Why it works:** One silhouette with five palette swaps reads as a faction family at phone size and costs one drawing.
- **Traits worth keeping:** one base silhouette; five palette swaps, one per faction; 16 px frames with nearest filtering
- **Traits to change:** use our clan palette, not the colour-wheel set; add a per-faction ornament (horns, wings, cloak) so the swaps are not only colour; a different idle pose per faction
- **Reference:** forge-gui/res/adventure/common/sprites/heroes/dragonplayer_r.atlas (text atlas read; PNG not opened); the b, g, u, w sheets alongside

### Creature family sheet
- **Why it works:** Grouped families (undead, fiend, monstrosity, elemental) share a silhouette rule, so a bestiary grows by adding rows.
- **Traits worth keeping:** creature family as a folder; one sheet plus atlas per creature; tall 16 px frames stacked by action
- **Traits to change:** our own families and proportions (not the same names); a boss tier at twice the frame size; a distinct head and limb shape per family
- **Reference:** forge-gui/res/adventure/common/sprites/enemy/monstrosity/basilisk.atlas (text read; PNG not opened)

### Burst-and-trail effect pair
- **Why it works:** A short burst followed by a trail reads as a hit or a cast in a fraction of a second.
- **Traits worth keeping:** burst then trail timing; a ring-shaped summon effect; rain or snow presets for weather
- **Traits to change:** our own palette per school of magic; a different trail shape (rune lines, not smoke); keep the effect under 0.5 s on phones
- **Reference:** forge-gui/res/adventure/common/particle_effects/Particle Park Fireball.p (name only read; file not opened). CC BY 4.0 applies to the set, so recreate, do not copy.

### Biome encounter room
- **Why it works:** A 30x17 tile room with a named encounter per biome gives a repeatable arena shape.
- **Traits worth keeping:** small room size; named encounter per biome; building and terrain tilesets kept separate
- **Traits to change:** our tile set and layout grammar; a different room size for mobile; add one hazard tile per room
- **Reference:** forge-gui/res/adventure/common/maps/map/towns/forest_town_generic.tmx (header read: 30x17 tiles of 16 px; body not opened)

### Biome backdrop set
- **Why it works:** One backdrop per biome tells the player where they are before any tile is shown.
- **Traits worth keeping:** one backdrop per biome; low-saturation palette; cave, swamp and waste as distinct moods
- **Traits to change:** our palette and framing; animated parallax layer; a lighter variant for daytime
- **Reference:** forge-gui/res/skins/default/adv_bg_cave.jpg (file name only read; image not opened)

## Cross-link to our cell topics
Camera: none read. Zones: adventure tilemaps (30x17 room grammar) and biome backdrops. Spawns: creature sprite families under sprites/enemy. Loot: none read (set and card lists only). HUD-UI: skins/default backgrounds and adventure ui PNGs. VFX: Particle Park emitters (CC BY 4.0 for that set). Animation: 16 px atlas sheets with named idle frames (heroes/dragonplayer_r.atlas). Sound: 39 effect mp3 in res/sound plus music in res/music; licences per group above.

## Not read or not verified

- Most of the 583 MB tree (only folder sizes and file counts)
- All PNG, JPG and atlas pixel contents (sizes and atlas text headers only)
- All .mp3 music and sound effects (names and credit lines only)
- All .p particle emitter bodies (file names only)
- All .tmx maps beyond the header of one file
- cardsfolder card scripts and languages (names and counts only; not reproduced)
- The dock-bar icon and XMage targeting arrow files (credits read; files not located)
- docs/ beyond Credit-and-Thanks.md, Frequently-Asked-Questions.md and Home.md lines cited
