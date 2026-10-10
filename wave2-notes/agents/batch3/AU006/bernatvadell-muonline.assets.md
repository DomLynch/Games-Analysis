# bernatvadell-muonline (asset audit, AU006)

Donor root (VPS, read-only): /mnt/frankendom-donors/bernatvadell-muonline/
Scope: .NET 10 / MonoGame client for a Season 6 MU protocol. 1257 files in the tree.

## Licences (as the files say)
- Code: no LICENSE file in the repo. README.md:577 says "This project is created for **educational and research purposes only**." The badge at README.md:7 reads "License-Educational".
- Assets: none shipped. README.md:120 says the client "requires **Season 20 (1.20.61)** client data files for assets (models, textures, maps)" and tells the user to download them separately.
- CLAUDE.md:8 says "Educational/research focus; do not commit proprietary game data." AGENTS.md says the same.
- Fonts, icons and shader files have no licence text of their own in the repo.

## Rights-holder status (repo files only)
- unknown. No copyright line in the repo. README says the Season 6 protocol is "based on publicly available information and reverse engineering for educational purposes."
- The game data is not in the repo. The files do not name who owns the Season 20 data.

## Asset inventory (counts from find, no binaries opened)
- Shaders: Client.Main/MGContent/*.fx, 7 files (AlphaRGB, DynamicLighting, FXAA, GammaCorrection, ItemMaterial 462 lines, MonsterMaterial 212 lines, Shadow). Licence: none stated.
- Fonts: Client.Main/MGContent/Fonts/arial.ttf and NotoSansKR-Regular.ttf (about 1.0 MB and 6.2 MB). No licence file in repo. Class C.
- 2D images in repo: 18 png, 1 jpg, 1 bmp, 1 webp in total. Examples: Client.Main/MGContent/Background.jpg, Bubbles.png, WaterSplashParticle.webp, Client.Main/Icon.bmp, MuIos/Default.png, MuAndroid/Resources/mipmap-*/ic_launcher*.png. Sizes and palettes not read.
- Game data (3D models, textures, maps, sound): none in the repo. Only the format readers in Client.Data (BMD, ATT, CAP, CWS, LANG, MAP, OBJS, OZB, OZG, Texture folders) and a BMD loader in Client.Main/Content/BMDLoader.cs (names only, not read).
- Music and sound: none in the repo.
- Text: no quest or lore text in the repo. Language readers exist in Client.Data/LANG (code only).

## Class per group
| group | path | class | note |
|---|---|---|---|
| shaders (.fx) | Client.Main/MGContent/*.fx | C | code, no licence line |
| fonts | Client.Main/MGContent/Fonts/ | C | font licence not in repo |
| images | Client.Main/MGContent, MuIos, MuAndroid | C | no licence line |
| game data (external) | Season 20 Data folder, not in repo | C | proprietary per CLAUDE.md; not included |
| format readers | Client.Data/* | C | code, reverse-engineered formats, no licence line |

best_class: C (inspiration only). Nothing in the repo is clearly usable as is.

## Inspiration (own words, no copied text)
- Excellent-item glow stacks cheap layers: a Fresnel edge term with a steep exponent, three diagonal sweep beams with sharp falloff, and a hue that cycles over time and UV (ItemMaterial.fx, lines near 371-405). Recreate with our own palette and keep the sharp-falloff beams.
- Echo or ghost copies: the item and monster shaders sample the same sprite 4 to 6 times at small time-driven UV offsets and add the copies with falling weights (ItemMaterial.fx echo block; MonsterMaterial.fx:175 for the first offset). This is a cheap aura, not a motion blur.
- Elite monster gold: a tint multiplied into the lit colour, a 2x metallic gain (MonsterMaterial.fx:170), plus a shimmer from time and the normal. Recreate for elite creatures with our own tint ramp.
- Shadow sampling: a 2048 shadow map with a small averaged tap pattern (MonsterMaterial.fx:56, SampleShadow). Good reference for soft contact shadows on creatures.
- Light floor: one fixed directional light with a minimum of 0.1 on N dot L so back faces never go black. A simple term to copy in spirit.
- Packed item options: one integer carries item level in the low bits and an excellent flag above them (ItemMaterial.fx MainPS). This is a way to drive VFX tiers from one number.
- Cut-out sprites: alpha below 0.1 is discarded in both shaders. Plain and cheap.

## Inspiration briefs
See the JSON "briefs" key (4 briefs).

## Cross-link to our cell topics
- vfx: the item and monster shaders are the useful reference (glow, echo, shimmer).
- hud-ui: the two fonts are a usage pattern only; their licence is not in the repo.
- camera, zones, spawns, loot, sound: no usable content in the repo. Zone and map data are external only.
- animation: Client.Main/Content/PlayerIdlePoseProvider.cs (name only, not read).

## Not read
- Client.Data format readers (BMD, OZB, OZG, MAP) beyond their file names.
- ItemMaterial.fx and MonsterMaterial.fx only in the lines quoted above. The rest of both files (about 460 and 210 lines) was not read.
- Season 20 data: not downloaded, not inspected, not in the repo.
- Client.Main/MGContent/Content.mgcb content (names only).
- MuIos and MuAndroid icon images (names only).
