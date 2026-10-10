# crashkonijn-GOAP: asset audit (AU011)

Root on VPS: /mnt/frankendom-donors/crashkonijn-GOAP/ (read-only, nothing copied).

## Licences (what the files say)
- Code licence: Apache License 2.0 (LICENSE line 2 "Version 2.0, January 2004"). The appendix at LICENSE line 189 still reads "Copyright {yyyy} {name of copyright owner}", so the file names no copyright holder. README links the GitHub repo crashkonijn/GOAP.
- Asset licence: no repo-wide asset licence. Named third-party items:
  - LiberationSans font: "Demo/Assets/TextMesh Pro/Fonts/LiberationSans - OFL.txt" line 6 says it is "licensed under the SIL Open Font License, Version 1.1" (only the header lines were read).
  - EmojiOne sample sprite: "EmojiOne Attribution.txt" line 3 says "review their licensing terms." and points to the vendor site; no licence name stated in the repo.
  - TextMesh Pro shaders, Unity assets, sprites and the demo sprite sheets: no licence line in repo.
- Rights-holder status: individual-author Unity library (GitHub crashkonijn). README line 40 says it is "Available on the [Unity Asset Store]" and line 58 mentions a paid "Support Edition". Sprite and demo-art origin is not stated.

## Asset inventory (Demo project and package)
Whole-repo extension counts: png 58, gif 7, asset 65, prefab 16, shader 13, mat 7, unity 5, anim 2, controller 3, pdf 2, ttf 1, cs 544 (code).

| Group | Path (under root) | Count / size (IHDR header only) | Licence | Class |
|---|---|---|---|---|
| Creature strips | Demo/Assets/CrashKonijn/GOAP/Demos/Sprites/00-, 01-, 02-creature-sheet-front.png and -back.png | 6 files, each 96x24 RGBA (colour type 6) | none stated | C |
| Other demo sheets | Demos/Sprites/hexagonObjects_sheet.png (1024x512 RGBA), sheet.png (980x490 RGBA), treeGreen_large.png (64x64 RGBA), dungeon_tilemap_packed.png (192x176 8-bit palette) | 4 files | none stated | C |
| Emoji sprite sheet | Demo/Assets/TextMesh Pro/Sprites/EmojiOne.png, EmojiOne.json, EmojiOne Attribution.txt | 3 files | vendor terms (not read) | C |
| Font | Demo/Assets/TextMesh Pro/Fonts/LiberationSans.ttf + LiberationSans - OFL.txt | 1 TTF + licence | SIL OFL 1.1 | B |
| Unity shaders and includes | Demo/Assets/TextMesh Pro/Shaders (.shader, .cginc), Resources line-break text files | about 20 files | none stated | C |
| Unity project data | Demo scenes (.unity), prefabs, materials, animation and controller files, .asset files under Demo/Assets | 5 scenes, 16 prefabs, 7 mats, 2 anim, 3 controller, 41 .asset | none stated | C |
| Demo docs | Demo/Assets/CrashKonijn/GOAP/README.pdf; Demo/Assets/TextMesh Pro/Documentation/TextMesh Pro User Guide 2016.pdf | 2 PDFs | none stated | C |
| Package doc images | Package/Documentation/images/*.png, *.gif (e.g. 2k_agents_short.gif, goap-viewer.png, v3_graph_viewer.gif) | about 50 PNG and 7 GIF | repo Apache only, origin not stated | C |
| Package doc text | Package/Documentation/**/*.md | about 37 markdown files (repo-wide md count) | repo Apache | A (text) |

Maps and levels: 5 .unity scene files under Demo/Assets; seen by name: Demo/Assets/EmptyScene.unity and Demos/TurnBased/TurnBased.unity. Not opened.
Audio: none found in the tree.

## Inspiration (own words)
- The creature strips come as a front and back pair per variant, each a single-row strip about 96 px wide. The technique: very small frame counts at tiny size, with a readable front and back, so a creature reads from both sides. Verify frame layout by eye; only the dimensions were read.
- Trees are a flat green canopy at 64 px, with fruit handled as its own material (AppleMaterial), so recolouring the fruit does not touch the tree. Copy the split for pickups.
- The dungeon tilemap is an indexed-palette sheet (8-bit palette, 192x176). A limited-colour dungeon look built from one tight palette.
- The hex sheet (1024x512 RGBA) is a modular hex tile set for the turn-based demo; the tile edges and seams are the thing to study.
- The complex demo (per doc image file names) has four job roles (woodcutter, miner, cleaner, smith) that share one tiny world. Role-based townsfolk with clear, readable jobs.
- The graph viewer (goap-viewer.png and v3_graph_viewer.gif) shows the decision graph as nodes; a debugger UI idea worth studying for our AI tools.
- The "2k agents" short GIF shows a crowd of very small agents; a mood reference for swarm scale.

## Inspiration briefs
1. Lumber pine (own label). Why it works: a simple, readable resource node. Keep: flat canopy silhouette; fruit as a separate pass. Change: taller two-tone trunk; asymmetric canopy; seasonal palette. Ref: Demo/Assets/CrashKonijn/GOAP/Demos/Sprites/treeGreen_large.png (64x64; not viewed).
2. Turnip walker (own label). Why it works: a tiny creature with a four-frame strip per facing. Keep: compact walk strip; front and back views; very low frame count. Change: different head and body shape; a visible tool or sack; our own palette. Ref: Demos/Sprites/00-creature-sheet-front.png (96x24; not viewed).
3. Hex hamlet tiles (own label). Why it works: a modular hex set that snaps together. Keep: one sheet of interchangeable hex pieces. Change: distinct seams and edges; a colour grade per biome. Ref: Demos/Sprites/hexagonObjects_sheet.png (1024x512; not viewed).
4. Low-colour crypt (own label). Why it works: a small fixed palette gives a strong, cheap mood. Keep: one tight palette; high contrast; a single sheet. Change: a different palette family; our own wall motifs. Ref: Demos/Sprites/dungeon_tilemap_packed.png (192x176, indexed; palette not read).

## Cross-link to our topics
- zones: the hex tile set and the job-based village are zone and layout references.
- spawns / loot: the pickup split (tree plus fruit material) is a loot-spawn idea.
- hud-ui: the graph viewer is a debugger UI reference.
- animation: the 4-frame creature strips are a cheap walk-cycle reference.
- sound: none in this donor.

## Not verified
- No image was viewed; all sprite notes come from PNG header bytes (size, colour type) and file names. Frame layout (4 cells) is inferred from the strip width, not checked.
- EmojiOne vendor terms were not followed (out of scope; not read).
- The OFL licence body was not read beyond line 6 and line 10.
- Unity scenes, prefabs and shaders were not opened.
- Doc images listed by name only.
