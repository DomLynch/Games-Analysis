# Anuken-Mindustry: asset audit (AU004)

Source: /mnt/frankendom-donors/Anuken-Mindustry (read-only, VPS). No PNG, OGG or MSAV file was opened.

## Licences (as the files say)
- Code: GNU GPL version 3 (LICENSE, full FSF text, no copyright line).
- Assets: no asset licence statement. A grep for licence, creative commons, CC0, public domain and copyright across core/assets, core/assets-raw, README and CONTRIBUTING found none. The only licence is the GPL-3.0 text.
- Rights: the in-game credits string reads "Created by [royal]Anuken[]" (core/assets/bundles/bundle.properties line 1). Contributor names are in core/assets/contributors (about 200 lines); not reproduced.

## Inventory (real paths)
- core/assets/sprites: 13 files (logo, fog, noise, rays, space, planets/serpulo.png, planets/erekir.png and others), about 1.7 MB.
- core/assets-raw/sprites: 2302 PNG across assets-raw. blocks 1665, units 290, ui 129, effects 52. Unit files come in families by name: base, leg, foot, joint-base, cell, heat.
- core/assets/music: 16 ogg tracks, about 28 MB (editor, menu, land, launch, game1-9, boss1-2, fine).
- core/assets/sounds: 205 ogg files, about 7.2 MB, in folders ui, block, movement, explosions, beams, charge, shoot, environment, loops.
- core/assets/fonts: 6 files (icon, logic, tech, font, font_jp, monospace), about 6.8 MB.
- core/assets-raw/fontgen/config.json: icon-font build. Sources named: custom_icons 53, fontawesome 46, typicons 27, zocial 3, entypo 2, elusive 2, iconic 2, and one each for brandico, mfglabs, modernpics. Their licences are not in the repo.
- core/assets/maps: 114 map files (97 serpulo and default, 17 erekir), about 8 MB, binary.
- core/assets/baseparts: 210 .msch schematic files.
- core/assets/shaders: 33 GLSL files, about 136 KB.
- core/assets/bundles: 36 locale files; bundle.properties about 3,500 key lines.

## Classes
- B: shaders (GPL-3.0 as source text; treated as code, no separate statement).
- C: all sprites, music, sounds, fonts, maps, schematics, localisation text, icon-font sources.
- Best class: C.

## Inspiration
- Armour reveal: unitarmor.frag multiplies alpha by a progress value (line 17) and by a sine band mask over the sprite height (line 18).
- Forcefield: shield.frag combines a sine texture wobble (line 19), a diagonal sparkle pattern from modulo arithmetic on screen coordinates (line 32), and an edge glow from the maximum of four neighbour samples (lines 24-28).
- Modular unit sprites: separate base, leg, foot, joint and heat-overlay files, so walk parts and glow animate separately (core/assets-raw/sprites/units/).
- Two planets with one atmosphere rig: planet.vert and atmosphere.vert plus separate planet sprites (core/assets/sprites/planets/).
- Icon set merged from many open sources; one build config (core/assets-raw/fontgen/config.json). Recreate with one style guide and our own glyphs.
- Sound folders by role (core/assets/sounds/).
- Other animated surfaces exist by name (slag, caustics, fog, mud, cryofluid shaders); not read.

## Briefs
1. Legged siege walker (own label): ref core/assets-raw/sprites/units/atrax.png, atrax-leg.png, atrax-foot.png. Art not opened.
2. Hex-field barrier (own label): ref core/assets/shaders/shield.frag.
3. Banded build-in reveal (own label): ref core/assets/shaders/unitarmor.frag.
4. Two-world planet pair (own label): ref core/assets/sprites/planets/serpulo.png and erekir.png.
5. Emissive heat overlay (own label): ref core/assets-raw/sprites/units/anthicus-blade-heat.png, obviate-heat.png.

## Cross-links to our cell topics
- vfx and shaders: shaders folder, effects sprites. Strongest match.
- hud-ui: icon font build and ui sprites.
- sound: sounds and music folders.
- zones and maps: maps folder (binary, not read).
- spawns: ui waveSpawn.ogg name only.
- loot and camera: none found.

## Not read
No image, audio or map was opened. Java code, tests and server were not reviewed. Music and sounds were not listened to.
