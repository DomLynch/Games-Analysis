# Asset audit: Elem8100-MapleNecrocer (AU018)

- Code licence: MIT (LICENSE line 1 "The MIT License (MIT)", Copyright 2023 Elem8100).
- Asset licence: no game art or game data in the repo. The repo MIT LICENSE is the only licence file. Small UI icons, one .ico, a WzComparerR2-credited shader and 20 third-party DLLs have no per-file licence in the repo (see groups below).
- Rights-holder status: fan / unofficial C# viewer for MapleStory client data (README). No WZ data in the repo. Game data owner not named in the repo files.
- Best class: D (nothing usable from the game content; small tool icons are C at most).

## Asset inventory (paths on VPS: /mnt/frankendom-donors/Elem8100-MapleNecrocer/)
- Game data: none. The code reads WZ nodes (e.g. UI/UIToolTip.img) that the user must supply. Class D.
- UI PNG icons: MapleNecrocer/Resources/*.png, 4 files under 5 KB. Class C (origin unstated; one name looks game-derived).
- App icon: MapleNecrocer/MapleStoryGM_Icon.ico, 38 KB. Class C.
- Shader: WzComparerR2.Common/Rendering/Effect/PngEffect.fx plus Macros.fxh and compiled .mgfxo. Class C (credit-only provenance).
- Third-party DLLs: Reference/*.dll, 20 files (spine-monogame, MonoGame, SharpDX, DevComponents, CharaSimResource, etc.). Class C, not opened.
- No audio, no music, no fonts, no maps, no 3D models found.

## Inspiration
- One small viewer per content family (mob, NPC, pet, mount, effect ring, soul effect, damage skin, cash effect), which is a clean pattern for our asset browser.
- Map scenery uses a skeleton runtime and a particle emitter. Recreate the idea with our own rig and motes.
- The particle emitter randomises colour, size, spin, position and angle inside variance ranges (MapleNecrocer/Client/Particle/ParticleEmitter.cs). A good data layout to copy with our numbers.
- Floating damage numbers are swapped by named style packs (MapleNecrocer/DamageSkinForm.cs). Recreate as skinnable number styles.
- Tooltip panels are built from corner and edge pieces (MapleNecrocer/Client/ToolTip.cs, nw/ne/n/s/sw/se), a nine-slice frame to rebuild with our own ornament.

## Briefs
1. Segmented panel frame: keep separate corner and edge pieces; change ornament, palette and corner caps. Ref: ToolTip.cs.
2. Drifting ambient motes: keep colour and size variance with slow fall; change motion curve and colours per zone. Ref: Client/Particle/ParticleEmitter.cs.
3. Skinnable hit numbers: keep named style packs swapped at runtime; change typography and crit/miss shapes. Ref: DamageSkinForm.cs.

## Cross-link
- Cell topics: hud-ui (tooltip frame, damage numbers) and vfx (particles, effect viewers) have ideas here. Sound, camera, spawns, loot: nothing in this repo.

## Not read
See the not_read list in Elem8100-MapleNecrocer.assets.json. Briefs for the viewer forms are name-based only.
