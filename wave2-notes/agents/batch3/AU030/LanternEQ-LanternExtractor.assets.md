# LanternEQ-LanternExtractor (asset audit, AU030)

Donor: LanternEQ-LanternExtractor (/mnt/frankendom-donors/LanternEQ-LanternExtractor/)
Half read: tool side (reads the user's own EverQuest archives). Paired donor LanternEQ-LanternUnityTools is in this box and has its own file.

## Licence (as the files say)
- Code: MIT. LICENSE line 1 'MIT License'; line 3 'Copyright (c) 2024 LanternEQ'.
- Assets: none in the repo. README line 51: 'This repository contains source code only.' Users supply their own game.
- Data file ClientData/animationsources.txt: no separate licence line. Treated as unclear, class C.

## Rights-holder status
Community tool (README: community-driven, open source, educational). README line 52: EverQuest is a Daybreak Game Company trademark and the project is not affiliated. Game-file owner is not named beyond that.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| C# tool source | LanternExtractor/ (EQ/, Infrastructure/, *.cs) | 144 .cs | D (code) |
| Animation source map | LanternExtractor/ClientData/animationsources.txt | 249 lines, ~100 two-code rows, 74 headers | C |
| Config | LanternExtractor/settings.txt | 78 lines | D |
| Retail game files | not in repo (user's install) | n/a | C, do not use |

Best class: D. Nothing non-code is shipped and usable.

## Inspiration (own words)
- Family-level rig sharing: one table row pairs a creature family with a shared rig code, so several creatures ride one animation set.
- One humanoid rig, many bodies: male and female codes share a rig, so body variants differ in mesh only.
- Sound and music instances placed as zone data (README lines 17-22); emission types EMIT and LOOP (SoundConstants.cs lines 5-6).
- Binary, fixed-length sound bank (EffSounds.cs line 10; size check at line 47): a flat indexed bank loads fast on phones.
- Vertex-colour lighting baked into zone meshes (README line 17): cheap lit look for 375 px.
- Collision separate from visuals, hidden boundaries as data (settings.txt lines 25-27).
- Region-split zone meshes (settings.txt lines 17-19): stream or cull by region.

## Briefs (recreate as clearly distinct originals, never a copy)
- Carapace crawler (shared spider-type rig): keep the low wide shell and quick scuttle; change shell to a spiked ridge, add legs, add a burrow-up attack. Ref animationsources.txt lines 50-51.
- Winged stone guardian: keep the winged humanoid and still idle; change to two jagged wings and an ember chest core. Ref lines 59-60.
- Horned brute: keep the horned bull head and heavy stride; change horns to an antler spread, add a chain belt, stomp with a dust ring. Ref lines 80-81.
- Dragon family on one body: keep one rig for several variants; change wing shapes and head crowns, not just palette. Ref lines 225, 237, 243, 246, 249.

## Cross-link
- Animation: rig-family table (yes, worth a look).
- Sound: instance types and sound bank format (yes).
- Zones: zone data format and region split (yes).
- Camera, HUD, loot, spawns: nothing in this donor.

## Not read
EQ/Wld/*, EQ/Archive/*, most of EQ/Sound/*, Infrastructure/*, .sln and .csproj, settings.txt lines 31-78, the external wiki. No binary files exist in the repo.
