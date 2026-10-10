# runelite-runelite (asset audit, AU045)

Donor: /mnt/frankendom-donors/runelite-runelite (VPS, read-only). Receipts: receipts.tsv (verified, 13 rows for this donor).

Code licence: BSD 2-Clause. LICENSE line 1 "BSD 2-Clause License" (copyright Adam, 2016-2017). README.md line 21: "RuneLite is licensed under the BSD 2-clause license. See the license header in the respective file to be sure."
Asset licence: no asset licence file in the repo. Per-file headers only:
- GLSL: hsl_to_rgb, frag, vert, fragui, vertui carry Adam 2018 BSD-style text (line 2 copyright, line 8 redistribution text).
- gpu/scale/bicubic.glsl line 8: BSD-style redistribution text (logarrhythmic, 2019).
- gpu/scale/xbr_lv2_common, frag and vert: Hyllian copyright (line 4) and "Permission is hereby granted, free of charge" text (line 6).
- gpu/colorblind.glsl: no licence line.
- No licence line found (grep for licen or copyright over src/main/resources) for runescape*.ttf, skill_icons/, interfacestyles/, item_variations.json or overrides.jsonc.
- notification.txt names an external repository for the notification sound (line 2) and gives no licence.

Rights-holder status: code copyright lines name Adam and contributors. Game art, fonts and item data: owner not stated. README line 4 calls it a free, open source OldSchool RuneScape client. The game cache is read at runtime through cache/ and is not in the repo.

Best class: A (shaders, with the attribution text kept). Art, fonts and item data are class C.

## Halves read
- Client: runelite-client (plugin folder names, 130 plugins; bosstimer and implings headers; resources listed; shader headers read).
- Server: not in the repo (game server is Jagex's).
- Data half: the game cache via cache/ (187 .java, names only). Not in the repo.
- Paired other half in the box: RuneStar-client is a second client-side OSRS donor. No server half in the box.

## Asset groups
- GLSL shaders (11 files): gpu/ and gpu/scale/. Class A for the BSD and permission-text files; colorblind.glsl class C (no licence line).
- Fonts: ui/runescape.ttf, runescape_small.ttf, runescape_bold.ttf. No licence in repo. Class C.
- Skill icons and interface skins: skill_icons/, skill_icons_small/, plugins/interfacestyles/ (2005, 2010, rs3; 307 files). 673 .png under src/main/resources in total. Class C.
- Notification sound: notification.wav (one file), source named in notification.txt line 2, no licence. Class C.
- Data tables: item_variations.json (about 2,301 item-variant entries by grep count; line 14 is "cannon barrels"; item names are game content, so class C); plugins/roofremoval/overrides.jsonc (region-keyed rectangles, class C); plugins/gpu/regions/regions.txt (465 lines; BSD-style text in its header, class A for that header); plugins/skybox/skybox.txt (copyright lines, licence block not checked, class C until read).
- Code (130 plugin folders, runelite-api, cache): BSD 2-Clause. Listed only.

## Inspiration (own words; class C content, so category level)
- Rare roaming creature with a spawn set: implings/ImplingSpawn.java (enum at line 36) defines the spawn types; ImplingType.java sits beside it (not opened). Recreate a rare critter with our own silhouette and spawn rule.
- Respawn countdown that outlives the boss: bosstimer/RespawnTimer.java (line 32) and Boss.java line 75 say the timer keeps showing after despawn. Recreate as a minimap ring that stays after a foe leaves.
- Colour-blind intensity: gpu/colorblind.glsl line 10 comment and line 11 uniform blend original and corrected colour by an intensity value. Recreate as a 0 to 1 dial on our grade, with our own correction maths (the algorithm in the file is cited to a paper; not copied).
- Era skin families: interfacestyles/2005, 2010, rs3 are three full skin folders. Recreate switchable HUD skin families with our own art.
- Region-keyed visibility: roofremoval/overrides.jsonc lists rectangles and height limits per region id. Recreate zone visibility as a per-zone override table.
- Separate UI and world shaders: gpu/vertui.glsl and fragui.glsl are a pair apart from the world shader. Recreate a UI pass that is independent from the world grade.
- Edge-aware upscalers for sprites: gpu/scale/xbr_lv2_*.glsl and bicubic.glsl. Recreate two or three filters for low-res sprites at 375 wide.

## Briefs (5b; Dom's rule: recreate as a clearly distinct original, never a copy)
In runelite-runelite.assets.json under "briefs" (4): rare roaming critter marker; boss respawn ring; colour-blind intensity dial; era skin family. Each names the kept and changed traits, with file paths.

## Cross-link
- Spawns and encounters: implings and bosstimer (above). Walk-density data not read.
- HUD and hud-ui: interfacestyles skins; the colour-blind dial is an accessibility item; roofremoval overrides for visibility.
- Sound-music: notification.wav is the only sound file in the resources; no music in the box.
- VFX and camera: gpu/ shaders (above); camera and roof logic in plugins/ not opened.
- Loot: item_variations.json is a data table of item variants (names not quoted).
- Progression, death and respawn presentation: not located in the files read.

## Not read / unexpected
- Not read: PNG, TTF and WAV bodies (names and counts only); plugin Java bodies beyond bosstimer and implings headers; cache/ bodies; regions.txt and skybox.txt bodies; item_variations.json body; hybrid, frag and vert shader bodies; README beyond line 25.
- Unexpected: the colour-blind shader has no licence line, unlike its neighbours.
- Unexpected: game art and fonts sit in a BSD repo with no statement of their owner.
