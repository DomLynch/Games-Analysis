# ClassicUO (catalogue, DC012)

Donor: /mnt/frankendom-donors/ClassicUO (VPS, read-only). Client for Ultima Online, C# / FNA.
Licence (as the files say): code is BSD 2-Clause (LICENSE.md line 1). README line 68 says "BSD 4 license", which conflicts with LICENSE.md; the licence text is the 2-Clause one. The README also says "This project does not distribute any copyrighted game assets" (README line 68), so the repo holds no game art or data.
Dom's rule for every idea below: recreate as a clearly distinct original, about 20-30 percent resemblance in mood only, never a copy. Not legal advice.

**Which half was read.** Client half only: src/ClassicUO.Client, src/ClassicUO.Renderer (shader), src/ClassicUO.Assets (loaders). The data half is not in this repo: the UO data files (MUL/UOP, Prof.txt and the rest) are loaded at run time and not shipped. The matching server half is ModernUO, which is in the box at /mnt/frankendom-donors/ModernUO. DC012 did not read it (outside my donor list); a reader that owns ModernUO should cover creatures, items and zones.

**Counts (honest).** Creatures 0, races 3, weapons 0, gear sets 0, zones 0 (the client has no map or creature data). Environment states listed in section 5 are code, not data.

## 1. Creatures and beasts

None in the repo. There is no creature table, no stat block and no art. Creature drawing goes through Mobile.cs and MobileAnimation.cs (not read). Top 8: none.

## 2. Classes, races and factions

- Races (src/ClassicUO.Client/Game/Data/RaceType.cs, lines 5-10): Human, Elf, Gargoyle. Role: origin only. Mechanic: none in the client beyond character creation and a race-change gump (RaceChangeGump.cs, not read). Progression: none.
- Professions: the list comes from Prof.txt at run time (src/ClassicUO.Assets/ProfessionLoader.cs line 65). The file is not in the repo, so the profession list is unknown (not read). A hard-coded fallback "Advanced" entry exists (line 98).
- Starting budget (ProfessionLoader.cs lines 19-20, 29): newer clients start skills at 30 and stats at 60 plus two 15s; older clients use 50 and 10. The shape is a fixed stat pool with a per-stat floor, not a class tree.
- Factions and guilds: PartyManager.cs exists (not read). No faction table in the repo.

## 3. Weapons

None in the repo. No weapon families, tiers or specials. Top 5: none.

## 4. Armour and gear

- Equipment slots: the Layer enum (src/ClassicUO.Client/Game/Data/Layers.cs, lines 5-36) names 29 slots from OneHanded to Bank, including Mount and three shop or bank pseudo-layers. These are slots, not sets.
- Tiers: none in the repo. Tier looks would come from the item tables, which are not shipped.
- Metallic and special item looks: LightColors.cs (496 lines, src/ClassicUO.Client/Game/Data/LightColors.cs) keeps a per-item light and hue table (GetHue, lines 16-27). The table body was not read.
- The one recolour system the client has is the hue strip in the shader (section 6). Top 5: none.

## 5. Zones, dungeons and environment

No map or zone data in the repo. Environment states found in code:
- Weather (src/ClassicUO.Client/Game/Weather.cs): four types plus two invalid codes. Rain, storm approach, snow, storm brewing (enum, line 16). Particle pool capped at 70 (line 26). Particle count scales with screen area against a 640 by 480 base (line 193). A weather state lasts 6 minutes (Constants.cs line 98).
- Seasons (src/ClassicUO.Client/Game/Managers/Season.cs, lines 7-11): Spring, Summer, Fall, Winter, Desolation.
- Desolation is ignored for a dead player (src/ClassicUO.Client/Network/PacketHandlers.cs line 4094). A dead player keeps the season they had.
- No hazards are defined in the client; hazard effects would come from server data (not read).

Top 5 striking (environment, judged on: readable at 375 wide, one signature behaviour, one signature effect):
1. Storm-approach streaks. The streak angle sways with a sine (Weather.cs line 396), so the gust reads as moving. Keep the sway; change the sprite and the wind curve.
2. Rain as short blue streaks (Weather.cs lines 345 and 421): fall speed set per drop from a scale ratio, streak offset capped at 5 px. Keep the cap (it keeps streaks readable); change colour and length to our palette.
3. Snow as small white squares with a sideways drift (Weather.cs snow branch, not read line by line). Keep the drift; change the flake shape.
4. Lightning flicker (LightningEffect.cs lines 10 and 31): ten frames at a 400 ms interval. Keep the short fixed frame count as a boss telegraph; change the bolt shape.
5. The dead-player season rule (PacketHandlers.cs line 4094): a state that the world ignores while the hero is down. Keep the idea of a state that pauses on death; change what we freeze.

## 6. Look and effect techniques worth recreating

- Spectral ghost mode. One shader, one mode number (src/ClassicUO.Renderer/shaders/IsometricWorld.fx: define at line 8, branch from line 151, alpha at line 153). Alpha comes from the red channel (alpha = 1 minus red times 1.5), and the colour is forced to black. Brighter red means more transparent, so a fully red pixel disappears. Our version: our own ghost tint, a scanline or noise dissolve, and an edge glow (not the stock blue).
- Shadow as a named mode (IsometricWorld.fx line 158): a separate branch with a fixed alpha. Our version: one shadow mode with our own falloff.
- Hue strip recolour (IsometricWorld.fx get_rgb at line 48; hue constants at lines 14-18): the sprite stores one grey base, and the shader samples a 1024-row by 16-column hue table (lines 16-17). Our version: our own palette strip per material family, with separate metal and cloth ramps.
- Circle of transparency (src/ClassicUO.Client/Game/Constants.cs line 72): a see-through hole around the hero with a radius cap of 200. Keep the cap; change the shape to a hard-edged band scaled for 375 wide.
- Death hold (Constants.cs line 86, GameScene.cs line 1232): the "You are dead" text is drawn for 1.5 s while the death timer runs. An option (OptionsGump.cs line 147 declares a black-and-white effect switch; its use was not read) exists alongside it. Keep the short hold; change the wording and the fade.
- Eight effect blend modes (src/ClassicUO.Client/Game/Data/GraphicEffectBlendMode.cs, lines 5-15): normal, multiply, two screen modes, a half-transparent normal, a blue shadow (line 13), and a red screen. Keep the small named set; our set is four modes.
- Custom drag effect type (GraphicEffectType.cs line 13): a slot marked "custom" in the source, separate from the UO effect kinds. Keep the idea of a named custom slot for our own effects.
- Pixel-art 2x upscaler (src/ClassicUO.Renderer/shaders/xBR.fx, line 5): colour-difference edge tests. Not read in full; see audit AU009.

## 7. Inspiration for Frankendom

1. Wraith dissolve (death and respawn, parity row 17). Keep: one mode, alpha from a channel, black silhouette. Change: our tint, a scanline dissolve, and an edge glow.
2. Tier ramp recolour (gear dressing, row 15). Keep: one grey base with a lookup strip per draw. Change: separate metal and cloth ramps with a normal-driven highlight, so a tier reads as sheen, not hue alone.
3. Storm streaks for zone weather (zones and ambience). Keep: a capped particle pool of 70 and a sine sway. Change: our sprite, our wind curve, a faster rain on storm approach.
4. Lightning telegraph (boss tell, row 13 specials). Keep: a ten-frame flicker at 400 ms. Change: our bolt shape and a sound cue on the first frame.
5. Death hold of 1.5 s (row 17). Keep: a short fixed hold with a message before the respawn choice. Change: our wording, plus a fade that is not text only.
6. See-through circle around the hero (camera, row 11). Keep: a radius cap (200 in this client's units). Change: a hard-edged band scaled for a 375 wide view.
7. Small named effect blend set (colour grade, row 16). Keep: a small set of named modes. Change: our four modes (normal, add, shadow, red tint).

## Licence note
Code: BSD 2-Clause (LICENSE.md line 1), with SPDX headers in source files. The README says BSD 4 (line 68). Art and data: none in repo. We adapt shapes and techniques only and keep the BSD notice if any code is ever copied; this catalogue copies none.

## Not read or not verified
- ModernUO (server half, /mnt/frankendom-donors/ModernUO): not read by DC012.
- Prof.txt and UO data files: not in repo.
- Mobile.cs, MobileAnimation.cs, PartyManager.cs, RaceChangeGump.cs, LightColors table body, AuraManager.cs body: not read.
- Snow and rain branches of Weather.cs read in part only (lines 343-421).
- IsometricWorld.fx circle-of-transparency block and xBR.fx body: not read in full.
- Sound: no audio files in repo; no cue lines read.
