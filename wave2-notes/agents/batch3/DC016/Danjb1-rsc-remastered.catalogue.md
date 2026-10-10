# Danjb1-rsc-remastered (design catalogue, DC016)

Donor: /mnt/frankendom-donors/Danjb1-rsc-remastered (read-only, VPS). RESTRICTED donor.
_RESTRICTED-NOTE.txt line 1: "RESTRICTED: no licence; derived from RuneScape Classic client." The note says study shape and idea only, never copy code or constants. Treated as binding.
Licence (as the files state): none. No LICENSE or copyright line in the tree. Assets carry no licence either. Rights holder unknown from the repo files.

Scope of this catalogue: category-level only. No creature, item or zone content is extracted, decompressed or named. The game data is in gzipped XML that I did not open (Dom's restriction: nothing extracted or decompressed).

Counts: not read. The content counts (creatures, items, zones) sit in the gzipped XML, which I did not open, so every count is null rather than a guess.

Halves:
- Client half: partly read. I listed the directory tree and read class-level names only (game/ui, game/render, game/world, game/scene, loading, res: 7, 12, 4, 5, 2 and 6 files), plus the class declarations at rsc-client/src/client/game/render/SoftwareRenderer.java line 23 and rsc-client/src/client/game/scene/SpriteEntity.java line 8. Java is 78 files in total.
- Data-pack half: listed by name and size only. Not opened: res/data/*.xml.gz (10 files), Sprites.zip, Landscape.zip, audio/*.wav (37 files). The data-pack half is in the box.
- Server half: not in the box. I checked the top level (build.bat, docs, README.md, rsc-client, run.bat). docs/TODO.md has a server section and docs/ideas.md mentions a single-player launcher with a built-in server, but no server source is in the tree.

## 1. Creatures / beasts
Not read at content level (see restriction). The entity definitions are in res/data XML files and in rsc-client/src/client/entityhandling/defs/*.java (12 files; class names only read: animation, door, elevation, entity, game object, item, item drop, NPC, prayer, spell, texture, tile). Category-level only: definitions live as data, not code.

## 2. Classes / races / factions
Not read. Nothing extracted.

## 3. Weapons
Not read. Item definitions in the gzipped XML only.

## 4. Armour / gear
Not read.

## 5. Zones / dungeons
Category-level only. A TODO line about hiding roofs and upper storeys when the player is indoors (docs/TODO.md line 18). Zone content is not read.

## 6. Item and effect looks worth recreating (category level)
- Sprite figures placed over a rendered terrain (SoftwareRenderer.java line 23; SpriteEntity.java line 8). Category: sprite entities with position, size and layer, drawn over a rendered map.
- Indoor occlusion: hide upper storeys and roofs when the player is inside (docs/TODO.md line 18). Category: a rule that hides geometry by the player's state.
- Loading layer as its own screen before the world appears (loading/, 2 files; not read further).
- Sound pairs (names only): 37 short cues, several with a success and a failure pair. Category: failures sound different from successes. Audio is not used.

## 7. Inspiration for Frankendom (category level, our originals)
1. Tabbed side panel to a bottom sheet. Keep: one tab strip, one panel per system (the game/ui folder has six panels plus a base menu class). Change: a bottom sheet on phones, our own icons and colours.
2. Success and failure cue pair per verb. Keep: a short success cue and a separate failure cue. Change: our own synthesised cues in one instrument family.
3. Indoor roof hide. Keep: hide upper storeys when the player is inside. Change: our own geometry rule and our own camera.
4. View reset to north as one command (docs/ideas.md line 7). Keep: a single command resets the heading. Change: our own camera reset.

Brief rule: recreate as a clearly distinct original, never a copy. Trait kept and trait changed are named on each item above.

## Not read
- Every archive, gzip, WAV and image body; both jars (libs/joml, xpp3, xstream; licences not in the repo).
- Java bodies beyond class-level names.
- The server half (not in the box).
- Docs other than about.md, ideas.md and TODO.md (names only).
- build.bat and run.bat bodies beyond the build commands.
