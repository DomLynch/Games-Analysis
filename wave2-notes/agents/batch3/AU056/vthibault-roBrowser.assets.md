# vthibault-roBrowser (asset audit, AU056)

Donor: /mnt/frankendom-donors/vthibault-roBrowser/ (VPS only). Receipts: receipts.tsv in this folder. Machine-readable copy: vthibault-roBrowser.assets.json.

## Halves
- Read: client half (browser JavaScript under src/, remote-client files under client/, DB tables under src/DB/).
- Not in box: server half. README.md line 30 names an external websocket proxy.
- Paired donor in box: MrAntares-roBrowserLegacy (folder present, not read).

## Licence (as the files say)
- Code: GPL-3.0. LICENSE line 2 reads "Version 3, 29 June 2007".
- Vendored: src/Audio/mp3-player/license.txt says MPL 1.1. Other vendored libraries keep their own headers.
- Assets: none in the box. client/data, client/BGM and client/resources hold placeholders only. client/readme.md line 14 says to add your own GRF files.
- Rights holder: unknown. README.md line 3 calls it a web clone of Ragnarok Online that needs the user's own client files. No owner of the game content is named.

## Asset inventory
| Group | Where | Size | Class |
|---|---|---|---|
| Game client art, models, sprites, maps, audio | client/data, client/BGM, client/resources | 0 game files | D |
| Keyed name and description tables | src/DB/Items, Monsters, Skills, Effects | ItemTable 185k lines; SkillDescription 14,993; SkillInfo 11,858; EffectTable 2,446; MonsterTable about 2,270 keyed lines | C |
| Vendored libraries and MP3 player | src/Vendors, src/Audio/mp3-player | 6 libs | B |
| WebGL effect code | src/Renderer/Map/Water.js, Effects/Sky.js, LockOnTarget.js, Damage.js | code | B |
| Sky and cloud table by map | src/DB/Effects/WeatherEffect.js | about 12 entries read | B |
| App icons and converter images | applications/, tools/converter | 3 PNG, 1 GIF | C |

Note: the item and monster strings look like original game text. Structure only was read. Do not reuse strings.

## Inspiration (own words)
- Water is a flat plane pushed up and down by a sine of position plus a per-frame offset, with a texture strip cycling through frames (Water.js lines 97, 232, 235).
- Clouds are a fixed pool of about 150 sprites, each with a random life, born 2 s in the past so the sky starts full (Sky.js lines 30, 128, 129).
- The lock-on ring rotates each tick and steps its brightness in discrete levels with one tint uniform (LockOnTarget.js lines 102, 157, 260).
- Damage numbers take colour from the hit class and fade by life fraction (Damage.js line 363).
- Sky colour and cloud tint live in one table keyed by map file (WeatherEffect.js lines 22 to 23).
- Shadow size is a small table keyed by monster ID; zero means no shadow (ShadowTable.js).
- Catalogue IDs are kept apart from text, loaded by one DB manager (DBManager.js line 4).
- One effect name can resolve to a random file variant (EffectTable.js header comment, read, no receipt).

## Briefs (recreate as clearly distinct originals, never a copy)
1. **Ripple lake**. Keep: vertex sine and a looping caustic strip. Change: ripples radiate from impacts, our palette. Ref: src/Renderer/Map/Water.js lines 97, 232, 235.
2. **Cloud pool drift**. Keep: fixed pool, random life, pre-aged spawn. Change: fewer, larger shaped sprites; shadows instead of clouds. Ref: src/Renderer/Effects/Sky.js lines 30, 128, 129.
3. **Twenty-step lock ring**. Keep: flat rotating disc, discrete steps, one tint. Change: segmented runic ring with two colours and a spoke. Ref: src/Renderer/Effects/LockOnTarget.js lines 102, 157, 260.
4. **Fading hit number**. Keep: colour per hit class, fade by life. Change: punch-scale on spawn, arc path, our own glyphs. Ref: src/Renderer/Effects/Damage.js line 363.
5. **Zone sky pair table**. Keep: one keyed table per zone. Change: a gradient and horizon band as zone data fields. Ref: src/DB/Effects/WeatherEffect.js lines 22 to 23.

## Cross-link
- vfx: yes (Water, Sky, LockOn, Damage read).
- zones: yes (WeatherEffect table).
- loot: ItemTable is data; header only read.
- animation: src/Renderer/Entity/EntityAnimations.js exists, not read.
- sound: Sounds.js and EntitySound.js exist, not read. No audio files in box.
- camera and hud-ui: files exist or no art in box; not read.

## Not verified
- Server half and all client PHP beyond the readme.
- Most of src/Engine and src/Renderer/Entity.
- Full text of the DB tables (structure only).
- Vendor libraries beyond their headers.
