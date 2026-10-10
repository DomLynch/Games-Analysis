# cvet-fonline: asset audit (AU012)

Source tree: /mnt/frankendom-donors/cvet-fonline/ (read-only on VPS). Half read: content half (Resources/, Examples/ContentShowcase, Examples/NativeExtensionSample assets, sample project text, Docs). The C++ engine under Source/ and ThirdParty/ was not read. Related names in the box (not read): alexbatalov-fallout1-ce and alexbatalov-fallout2-ce.

## Licences (as the files say)
- Code: MIT. LICENSE line 5 grants permission; line 3 names "Anton Tsvetinskiy aka cvet". README line 155: "License: MIT".
- ContentShowcase assets: ASSET_LICENSE.md line 3 says the files listed in assets/provenance.json are "project-original deterministic outputs or authored source files dedicated under CC0 1.0". provenance.json has 13 entries, all "license": "CC0-1.0" and "source": "project-original".
- Engine Resources/Core art, bitmap fonts, Docs images: no separate asset licence line found.
- Fonts: Resources/Core/Fonts/CourierNewSmall.bmfc line 5 names "fontName=Courier New". Settings.bmfc names DejaVu Sans Mono. Docs/en/reference/font-format/index.md line 54 lists "font licensing, redistribution rights, and language-specific glyph acceptance" as a matter to settle.
- README line 57 says the engine imports Fallout FRM and Arcanum ART. No .frm or .art files are in the tree.

## Asset inventory (data first)
- Descriptor and data files (primary): ContentShowcase ShowcaseAssets/Showcase/Sprites/Beacon.fofrm (6-frame list, fps 8, root motion NextX/NextY), Particles/Showcase.spark (capacity 32), Effects/ShowcaseParticle.fofx (additive effect), Maps/ShowcaseMap.fomap, Content/ShowcaseContent.fopro, Resources/Core/Fonts/*.fofnt (per-glyph tables).
- Generated art: 9 TGA in ShowcaseAssets (Beacon_0 to _5, ShowcasePanel, ShowcaseFloor, ShowcaseSpark), 1 WAV chime. Produced by generate_assets.py and pinned by SHA-256.
- Engine stubs: Resources/Core/ MiniArrowUp.png, MiniArrowDown.png, CritterStub.png, ItemStub.png; Resources/Radiation.png and .ico.
- Bitmap fonts: 22 files in Resources/Core/Fonts (atlas PNG plus .fnt, .fofnt, .bmfc); 2 in Resources/Embedded/Fonts.
- Docs images: Docs/assets/diagrams (6), Docs/assets/screenshots (2); ContentShowcase captures (3 PNG).
- No commercial game content in the tree.

## Classes
- ContentShowcase sprites, sound, descriptors: A (CC0-1.0 declared).
- Engine stubs, Core fonts, Docs and capture images: C (no licence line; fonts unresolved).
- Rights holder: engine code named (cvet). Showcase files declared project-original.

## Inspiration (own words)
- Beacon: a six-frame loop at 8 fps with an anchor offset and root-motion table, so the sprite moves as it cycles (Beacon.fofrm lines 1 to 5 and the NextX/NextY lines).
- Spark burst: additive particles with a fixed cap of 32 and lifetime 0.9 to 1.4 s (Showcase.spark line 5 and the lifetime attribute).
- Procedural art: generate_assets.py draws each TGA frame from a pixel function (beacon_frame at line 83, spark at line 108). Placeholder art can be deterministic and checked.
- Bitmap font: one atlas plus a glyph table per character (x, y, width, height, advance). Fallout.fofnt uses 7 by 9 glyph cells (Letter entries).
- Stub sprites make missing content visibly unfinished.
- Effect files are text with the blend mode declared at the top and shader sections below (ShowcaseParticle.fofx).

## Briefs (A-class source, so recreation is still required to be distinct)
1. Pulsing waypoint lamp. Keep: six-frame loop, bright core with halo, anchor offset. Change: lamp on a pole, our hue, different frame count. Ref: Examples/ContentShowcase/ShowcaseAssets/Showcase/Sprites/Beacon.fofrm.
2. Ember burst. Keep: fixed particle cap, short life, additive blend. Change: streak particles, our colour ramp. Ref: Showcase.spark and ShowcaseSpark.tga.
3. Missing-content placeholder. Keep: obviously unfinished look, one per object type. Change: labelled template, loud colour, distinct silhouette per type. Ref: Resources/Core/ItemStub.png and CritterStub.png.
4. Pixel-cell retro font. Keep: one atlas with per-glyph metadata, small fixed cell. Change: hand-drawn letterforms, our cell size. Ref: Resources/Core/Fonts/Fallout.fofnt.
Rule for every brief: recreate as a clearly distinct original, never a copy.

## Cross-link
Camera and animation: Beacon.fofrm root motion is worth a look. VFX: spark and additive effect. HUD-UI: bitmap font and panel texture. Zones and spawns: the ShowcaseMap.fomap placement format. Sound: one chime only.

## Not read
See not_read in cvet-fonline.assets.json (pixel contents, the chime audio, font licence terms, ThirdParty and BuildTools).
