# Danjb1-rsc-remastered: asset audit (AU013)

Source: /mnt/frankendom-donors/Danjb1-rsc-remastered (read-only, VPS). RESTRICTED donor. Inspiration is category-level only. No coordinates, constants, colour codes or code copied. Nothing extracted or decompressed.

## Restriction
_RESTRICTED-NOTE.txt line 1: "RESTRICTED: no licence; derived from RuneScape Classic client. Study shape/idea only; never copy code or constants." Treated as binding.

## Halves
- Client half: partly read. Class and file listings under rsc-client/src/client/**, plus class-level names in SoftwareRenderer.java (line 23), SpriteEntity.java (line 8) and game/ui/*.java.
- Data-pack half: listed by name and size only. Not opened: res/data/*.xml.gz (10 files), Sprites.zip, Landscape.zip, audio/*.wav (37 files).
- Server half: NOT READ. docs/ideas.md line 9 lists a single-player launcher with a built-in server as an idea. No server source was read.

## Licences (as the files state them)
- Code: none stated. No LICENSE or copyright line in the tree. A licence and copyright grep matched only the restricted note.
- Assets: none stated. The restricted note covers the repo, including res/data.
- Rights holder: unknown from the repo files. docs/about.md line 3 says the project aims to deobfuscate, refactor and modernise the RuneScape Classic client. README.md line 11 says the project was an attempt to refactor the RuneScape client source.

## Asset inventory
- Sound effects: rsc-client/res/data/audio/*.wav, 37 files. Names include click, door open and close, anvil, coins, cooking, eat, fish, mine, victory, death, under attack, spell ok and spell fail. Class C. Names only.
- Sprite sheets: rsc-client/res/data/Sprites.zip, 1.0 MB. Class C. Not opened.
- Landscape map data: rsc-client/res/data/Landscape.zip, 0.9 MB. Class C. Not opened.
- XML definitions (gzipped): rsc-client/res/data/*.xml.gz, 10 files from 0.1 to 44 KB. Items, NPCs, objects, spells, prayers, doors, animations, textures, tiles, elevation. Class C. Not opened.
- Images: res/data/icon.png (23 KB), docs/screenshot.png. Class C. Not opened.
- Jars: libs/joml, xpp3, xstream. Licences not in the repo. Not opened.
- Java source: rsc-client/src/client/** (78 files). Code, restricted.

## Data tables (data first)
- XML definition files above hold the names and stats. Their Java field mappings are in rsc-client/src/client/entityhandling/defs/*.java (12 files; class names read only).
- No content is reproduced here.

## Classes by group
- C for everything. Restricted: no licence, derived from the RuneScape Classic client.
- best_class: C.

## Inspiration (category-level, own words)
- Software-rendered overworld with sprite figures placed on the terrain (SoftwareRenderer.java; SpriteEntity.java). Category: sprite entities with position, size and layer, drawn over a rendered map.
- Tabbed side column with one panel per system: inventory, magic, friends, stats, map, settings (game/ui/*.java, 7 files). Category: many systems in one compact tabbed panel. On a 375-wide phone, make it a bottom sheet.
- One short cue per verb, with a success and a failure pair (res/data/audio/, names only). Category: failures sound different from successes.
- Content kept in data files that load at start (res/data/*.xml.gz, names only). Category: definitions as data, not code.
- View reset to north as an original feature (docs/ideas.md line 7). Category: a command that resets the view heading.
- A loading state before the world appears (loading/LoadingScreen.java, listed only).

## Briefs (category-level)
- Tabbed side column: keep the tab strip and one panel per tab; change to our own icons, colours and a bottom sheet on phones.
- Hill with figures: keep sprite entities on a rendered map; change to our own palette, lighting that follows the slope, and our own figure proportions.
- Cue per verb: keep a short cue per verb and a separate failure cue; change to our own synthesised cues in one instrument family.
- Every brief: recreate as a clearly distinct original, never a copy.

## Cross-link to our cells
- Camera: view-reset idea only.
- Zones: data-driven definitions only (no zone content read).
- Spawns and loot: names only in the XML definitions. Not reproduced.
- hud-ui: the tabbed side column.
- vfx: none read.
- animation: none read.
- sound: a cue-per-verb pattern; the audio itself is not used.

## Not read
Every archive, gzip, WAV and image body; both jars; Java bodies beyond class-level names; the server half; docs other than about.md, ideas.md and links.md (names only); build.bat and run.bat bodies beyond the build commands.
