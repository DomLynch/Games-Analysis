# Chorizite-Chorizite: asset audit (AU009)

Scope: VPS tree /mnt/frankendom-donors/Chorizite-Chorizite/. Read-only. Not legal advice; this records what the files say.

## Licences (as the files say)
- Code: MIT. LICENSE.md line 1 reads "Copyright 2024 Chorizite". README line 47 states the MIT licence.
- AcClient helper subfolder: MIT, Copyright (c) 2024 Michael Cunningham (Chorizite.NativeClientBootstrapper/AcClient/LICENSE.md line 8). Its text says it is not meant to restrict usage.
- Installer plugin nsJSON: its own licence with attribution conditions (Installer/nsJSON-LICENSE.txt line 9: origin must not be misrepresented; altered versions marked; notice kept).
- Asset licence: none separate. Repo-wide MIT is the only statement for in-repo art.

## Rights-holder status (repo files only)
unknown. The project is described as an open-source plugin manager for Asheron's Call (README line 3). No game rights-holder notice is in the repo. acclient.map contains symbol names with Turbine-style types; the repo does not say where the map came from.

## Asset inventory
- Logo and icons: chorizite.png and Chorizite.Launcher/icon.png (identical md5, 81,748 bytes); Launcher/chorizite.ico (15,406 bytes). Not viewed.
- Placeholder texture: Chorizite.Core/Render/nulltexture.jpg (92,840 bytes JPEG). Not viewed.
- Shaders: Chorizite.NativeClientBootstrapper/Render/Shaders/Basic.fx (2.6 KB, world times projection, texture sampler _tex, vertex colour); Launcher/Render/Shaders/ (2 vert, 2 frag, under 0.4 KB each).
- Symbol map: Chorizite.Core/acclient.map (10,915 lines, 678 KB). Class C.
- Installer and native binaries: 6 DLLs in Installer/ and Launcher/ (24 KB to 1.3 MB). Not opened; nsJSON only is covered by its own licence.
- Audio, music, models, maps, fonts, dungeon or level data: none in the repo.
- Game data: none. The README and code say the framework reads DAT files via the DatReaderWriter package (Chorizite.Core/Dats/FSDatReader.cs line 1); the user's own AC install supplies them.

## Classes by group
- Logo, icons, placeholder texture, shaders: A (repo MIT; keep the notice).
- nsJSON plugin: A with conditions (listed above).
- acclient.map: C (no origin or licence line; symbol names look client-derived).
- Other binaries: C until read.
- Game data: D (not in repo).
- best_class: A.

## Inspiration (own words)
- A single plain textured-quad shader draws the whole overlay (Basic.fx). Recreate the same minimal shape for our HUD with our own shader and art.
- A loud fallback texture stands in for any missing image (nulltexture.jpg). Our version: a high-contrast check in our own colours, shown only when a load fails.
- Text layout is its own module, separate from draw calls (Chorizite.Core/Render/TextLayout.cs; Render/ACFont.cs). Measure and wrap first, then draw.
- Panels described as data (the README says "HTML/CSS-based UI design", line 3), so artists can restyle HUD panels without code.
- One icon for two places: the launcher and repo logo are the same PNG.
- Honest scope: no creatures, items, armour, zones or effects are in this repo. Its value for us is UI and rendering plumbing.

## Inspiration briefs
1. Missing-art checker tile. Why: a placeholder that cannot be mistaken for real art. Keep: high-contrast two-colour check; shown only on load failure. Change: our own colours; a broken-frame glyph; a slow pulse. Ref: Chorizite.Core/Render/nulltexture.jpg (not viewed).
2. Single-pass HUD quad shader. Why: one small shader keeps the overlay cheap. Keep: one vertex stage; one sampler; per-vertex colour. Change: atlas UV rectangles; palette tint lookup; soft panel-edge mask. Ref: Chorizite.NativeClientBootstrapper/Render/Shaders/Basic.fx.
3. Measure-then-draw text module. Why: crisp, self-sizing labels. Keep: layout separate from drawing. Change: our own bitmap face; different wrap rules for chat and labels. Ref: Chorizite.Core/Render/TextLayout.cs; Render/ACFont.cs.

## Cross-link
- hud-ui: panel-as-data idea and text layout module.
- vfx, sound, zones, spawns, loot, camera, animation: no non-code assets in the repo. AudioPlaybackEngine.cs exists as code only.

## Not read or not verified
- Images and binaries: sizes, hashes and magic checked only; not viewed or opened.
- acclient.map: only sampled lines; not read in full.
- Workflows, GitVersion.yml, Tests/, most AcClient/*.cs: not read.
- Full files behind the grep hits were not read.
