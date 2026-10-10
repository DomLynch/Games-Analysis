# ClassicUO: asset audit (AU009)

Scope: VPS tree /mnt/frankendom-donors/ClassicUO/. Read-only. Not legal advice; this records what the files say.

## Licences (as the files say)
- Code: BSD 2-Clause. LICENSE.md line 1 "BSD 2-Clause License"; line 3 "Copyright (c) 2025, andreakarasho".
- Conflict: README line 68 says "This work is released under the BSD 4 license." LICENSE.md is the licence text; the README wording differs. Source files carry SPDX BSD-2-Clause headers (src/ClassicUO.Renderer/Batcher2D.cs line 1).
- Assets: no separate licence. README line 68 says "This project does not distribute any copyrighted game assets." No per-folder licence file. Images and shaders fall under the repo-wide LICENSE by default; the xBR.fx and IsometricWorld.fx headers carry no licence or author line.

## Rights-holder status (repo files only)
Fan and community open-source client. README says it needs a legally obtained Ultima Online Classic Client. Copyright holder named in LICENSE.md: andreakarasho. Origin of the bitmap fonts and resource tables is not stated.

## Asset inventory
- Logo and icons: src/ClassicUO.Client/cuologo.png (194,589 bytes); cuoicon.ico (167,022 bytes; copies in ClassicUO.Bootstrap). Not viewed.
- Background: src/ClassicUO.Client/game-background.png (1,555 bytes; header reads 50 by 50, 8-bit palette). Not viewed.
- Bitmap fonts: src/ClassicUO.Renderer/fonts/ (regular, bold, map1 to map6; 8 compiled .xnb files, 13 to 21 KB each). Embedded by Fonts.cs.
- Shaders: src/ClassicUO.Renderer/shaders/IsometricWorld.fx (4.2 KB) and xBR.fx (5.2 KB), plus compiled .fxc copies.
- Resource tables: src/ClassicUO.Client/Resources/ResGumps.resx (519 entries), ResGeneral.resx (135), ResErrorMessages.resx (35). String and binary-object tables. Values not read.
- Native libraries: external/x64 (SDL3, FAudio, FNA3D, libtheorafile, zlib), external/lib64, external/osx (dylibs), external/cuoapi, external/vulkan. Not opened.
- Code: 455 .cs files; tools/ws (small Node proxy); tools/monokickstart (config files).
- Audio, models, sprites, maps, game data: none in repo (no .mul, .uop, .mp3 or .wav in the extension counts).

## Classes by group
- Logo, icons, background: A (repo-wide BSD 2-Clause by default; no per-file licence; keep the notice). Treat as C if certainty is needed.
- Bitmap fonts: C (origin not stated).
- Shaders: C (no per-file licence line; code, not art).
- Resource tables: C (origin not stated).
- Native libraries: C (not read).
- Game data: D (not in repo).
- best_class: A (the logo and icons under the repo licence); the rest C.

## Inspiration (own words)
- Recolour by lookup: sprites store one grey base, and a 1024-row hue table (16 columns) in IsometricWorld.fx supplies colour (lines 16 to 18). Our version: our own palette-swap sheet.
- One shader, many draw modes: a mode number switches one shader among plain, hued, partial hue, land, spectral, shadow, lights, effect hue and gump (lines 1 to 12). Our version: our own mode set, one pipeline for world, UI and effects.
- Shadows and lights as modes, not sprites: shadow and light glow are separate modes (lines 9 and 10).
- One light direction for the iso world: a single fixed vector (line 14). Our version: one key-light vector for the whole scene.
- Ghost look as a named mode: the SPECTRAL mode (line 8; branch at line 151) gives translucent spirits. Our version: our own ghost tint and dissolve edge, not the stock blue.
- Pixel-art upscaling in the shader: an edge-aware 2x scaler (xBR.fx line 5; XBREffect.cs line 8). Our version: our own edge rules, palette-aware, optional sharpen.
- Fonts by role: regular, bold and six map-label faces (Fonts.cs line 10). Our version: few faces, one role each, our own pixel face.
- Windows as resource tables: each window's images and strings live in a resource table (ResGumps.resx, names only). Our version: a data table per window with art references.

## Inspiration briefs
1. Hue-swap sprite recolour. Why: one grey base plus a lookup strip gives many variants. Keep: palette-strip lookup by hue index; per-draw hue value; mode-dependent sample path. Change: our strip layout; separate metal and cloth ramps; normal-driven shading. Ref: src/ClassicUO.Renderer/shaders/IsometricWorld.fx lines 14 and 16; ShaderHueTranslator.cs line 17.
2. Spectral ghost mode. Why: a named mode reads as a ghost at a glance. Keep: dedicated mode; translucency; own shader branch. Change: our ghost tint; scanline or noise dissolve; faint edge glow. Ref: IsometricWorld.fx lines 8 and 151.
3. Pixel-art 2x upscaler. Why: edge-aware 2x keeps pixel art crisp. Keep: colour-difference edge tests; fixed 2x factor; per-pixel blend. Change: our own edge rules (not a copy of any published set); palette-aware edges; optional sharpen. Ref: src/ClassicUO.Renderer/shaders/xBR.fx line 5; src/ClassicUO.Renderer/Effects/XBREffect.cs line 8.
4. Font set by role. Why: separate faces keep small UI readable. Keep: few faces; bold for titles only. Change: our own pixel face; different size ladder. Ref: src/ClassicUO.Renderer/Fonts.cs line 10.

## Cross-link
- hud-ui: resource-table windows and the bitmap font set.
- vfx: spectral, shadow and lights modes in IsometricWorld.fx.
- zones and land: LAND modes in IsometricWorld.fx.
- camera: Camera.cs exists as code only.
- sound: no audio files in the repo.
- loot, spawns: no assets beyond code.

## Not read or not verified
- Font .xnb files and native libraries: not opened.
- PNG and ICO images: sizes and the PNG header only; not viewed.
- xBR.fx and IsometricWorld.fx: quoted lines only, not read in full.
- Resource values in the .resx files: names and counts only, deliberately not read.
- tests/, tools/monokickstart, .github workflows: not read.
