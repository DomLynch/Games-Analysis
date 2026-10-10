# MrAntares-roBrowserLegacy (asset audit, AU035)

Donor tree: /mnt/frankendom-donors/MrAntares-roBrowserLegacy/ (VPS, read-only)
Which half I read: the CLIENT half (src/Engine/MapEngine, src/Engine/Replay, src/DB, src/UI/Components, applications/, docs/). The rAthena SERVER half is not in the box: rathena/ holds a placeholder file (DropYourRathenaHereDontOverride.txt) and tools/docker config files only. The remote asset server (roBrowserLegacy-RemoteClient-PHP/) is a placeholder too (DropYourRemoteClientHere.txt). No paired server donor exists in this box.

## Licence (what the files say)
- Code: GNU General Public License v3 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007"; package.json line 45 '"license": "GNU GPL V3",').
- Assets: no separate asset licence in the repo. The game's own art and data are NOT in the repo: README.md line 54 says the Remote Client "serves game assets to roBrowser via http by extracting them from their GRFs", and the user supplies their own client files (AGENTS.md line 282 lists "kRO Client Files: GRF assets + executable").
- docs/CONTRIBUTING.md line 14: "Do not bring copyrighted material into the project."
- Per-file tables in src/DB carry a ROBrowser file header (MonsterTable.js line 6) and author credits (MonsterNameTable.js line 8: "@author Vincent Thibault, Antares"). These are GPL repo files with no separate licence.
- Class for the game-derived index tables under src/DB: C (GPL file, provenance of the game names and ids not stated in the box).

## Rights-holder status (repo files only)
- Client code: ROBrowser authors (copyright holders not named in LICENSE beyond the GPL text; file headers name Vincent Thibault and Antares).
- Game (Ragnarok Online): the repo does not name the owner of the game or its data. Status: unknown. README.md line 75: "All credits to the original owners/creators and the new ones." (no names).
- Game data is loaded from the user's own client files, not shipped: treat as not in box.

## Asset inventory (counts from find; sizes not checked unless stated)
- Total by type in the repo: 21 PNG, 1 JPG, 1 GIF, 5 JSON, 5 TXT, 1 WASM, 167 HTML, 583 JS, 142 CSS.
- src/DB (JavaScript game-data tables; the data half in this box):
  - Monsters/: MonsterTable.js (3749 lines), MonsterNameTable.js (2457 lines), ShadowTable.js (363 lines; per-id shadow scale, e.g. id 111 is 0.0 and id 1004 is 0.5), AttackEffectTable.js (258 lines; per-job projectile effect table, PROJECTILE at line 10).
  - Items/: ItemTable.js (8412 lines), WeaponTrailTable.js (46 lines; trail effect name keyed by weapon type, e.g. line 16 SHORTSWORD, line 26 BOW), WeaponHitSoundTable.js (48 lines), WeaponSoundTable.js, HatTable.js, RobeTable.js, ShieldTable.js, ItemRandomOptionTable.js, plus type and effect enum files.
  - Skills/: SkillInfo.js (13642 lines), SkillConst.js (1842), SkillEffect.js (1830), SkillAction.js (639), SkillUnit.js (130), SkillTreeView.js (1821), SkillTreeMerge.js (80).
  - Status/: StatusInfo.js, StatusProperty.js, StatusConst.js, StatusState.js. Jobs/, Map/, Pets/, Effects/ folders.
  - MonsterTable.js header says "Monster Table ID" (line 4), but the first entries I read are job and class names (line 4 onwards), so the file name and header do not match what the entries are. Not resolved; I read only the head.
- src/Engine/Replay: ReplayParser.js (1174 lines), ReplayPlayer.js (597), ReplaySocket.js (61), ReplayTypes.js (260). The format is named as Ragnarok Online Replay Format (.rrf), and ReplayTypes.js line 5 says the specification is "derived from adsonpleal/rrfparser reference implementation". That reference's licence is not in the box: unknown.
- UI images (class C, no per-file licence): src/UI/Components/GrfViewer/Icons (11 PNG and load.gif), src/UI/Components/Error/error.png, src/UI/Components/Intro/images/background.jpg, applications/electron/icon.png, applications/pwa/icon.png, applications/browser-examples/icon.png, docs/img (6 PNG).
- src/Vendors/liblua5.1.wasm (1 file; name says Lua 5.1 compiled to WASM; licence not in box; not read).
- Text: src/UI/Components/MobileUI/robrowser_mobileui.txt, and 5 TXT and 5 JSON files elsewhere (names not listed). Not read.
- Game art, sprites, maps and sound: NOT in the box (AGENTS.md line 57 lists the loaders for the sprite, action, ground, altitude, world and effect-string files; the data is read from the user's GRF at run time). Class D (absent).

## What the client code shows (category level, my own words)
- Attack timing follows the server. In the client (src/Engine/MapEngine/Entity.js lines 629-642), the server sends an attack time. The client divides it by an average attack time to get a factor (line 630), uses it to scale a motion speed (line 638 has an open comment asking where the factor really comes from), and sets the animation speed so the base motion lasts the server's time (line 642). The server owns the timing; the client only stretches the clip.
- Bow lead time is added to the packet's attack time (lines 645-647): the arrow effect starts after a lead computed from the motion, and the packet field is changed in place (line 647). The arrow effect is started with the new time (line 652). Defect for us: changing a received packet in place can mislead any later reader that expects the server value; keep the lead as a separate field. Fix: store the lead separately.
- Non-player projectiles are chosen by a table lookup on the job (line 657 and AttackEffectTable.js line 10).
- Attack speed statistic (src/Engine/MapEngine/Main.js line 120): the stats panel shows the summed base and bonus attack-speed values divided by four. Whether the division is a display scale or a bug is not stated in the file (not verified).
- Replay (src/Engine/Replay): the parser reads tagged numeric fields by id (ReplayParser.js line 488 reads id 1036 for attack speed; plus-speed is id 1039 at line 504); the player falls back to a default attack speed (ReplayPlayer.js line 221). Idea: a fight record of tagged fields that a later version can extend.

## Inspiration notes (category level, my own words; GPL code, so shape only, no code copied)
- Server-timed animation: the client plays the clip at the speed the server's attack time implies, so the server owns the timing and the client only stretches. For row 6 (hero actor) and row 7 (creature actor). File: src/Engine/MapEngine/Entity.js lines 629-642.
- Lead-time projectile: a bow shot starts its effect after a lead computed from the motion, so the arrow leaves with the swing. For row 13 (specials) and row 10 (hit impact). Keep the lead as a separate value, not an edit of the packet. File: Entity.js lines 645-656.
- Weapon trail per weapon class: a table maps weapon class to a trail effect (WeaponTrailTable.js lines 16-26). For row 15 (gear dressing) and row 10: one trail look per weapon class, with our own palette. Trail names are not copied.
- Shadow scale per creature: a small per-id table sets each creature's shadow scale (ShadowTable.js lines 12-14; the first entries are 0.0 and 0.5, so zero is used for some ids; meaning not confirmed). For readability at 375 wide: shadow size by creature footprint, with flying creatures at zero.
- Projectile effect per job: a lookup keyed by creature job chooses the projectile effect (AttackEffectTable.js line 10; Entity.js line 657). For row 13 and row 7: a projectile look chosen from the creature id.
- Replay as tagged fields: each field has an id and the parser reads known ids and skips the rest (ReplayParser.js lines 487-506). For row 19 (fight record and replay): a fight record of tagged fields with a version field, so old replays still load.

## Inspiration briefs (category level and own labels)
See the .assets.json "briefs" key. Each brief names the trait kept and the trait changed.

## Cross-link to our cell topics
- animation and actor timing: Entity.js 629-642 (primary).
- projectiles and specials: Entity.js 645-657; AttackEffectTable.js 10.
- gear dressing and weapon look: WeaponTrailTable.js; WeaponHitSoundTable.js (names only).
- replay and fight record: src/Engine/Replay (primary for row 19).
- HUD and UI: src/UI/Components (GrfViewer, ChatBox, Equipment, Inventory) read by name only.
- loot, spawns, zones: ItemTable.js and MapTable.js present as tables, not read beyond line counts; spawn data is in the server half (absent).

## Not read
- rAthena server (absent from the box).
- ItemTable.js, SkillInfo.js, MonsterNameTable.js and MonsterTable.js bodies (heads or line counts only).
- Any image, GIF, JPG or WASM file (names and counts only).
- The 5 JSON and 5 TXT files (names and counts only), the MobileUI text.
- src/Engine/Replay/ReplayParser.js beyond lines 487-506; ReplayPlayer.js beyond line 221.
- Entity.js outside lines 629-657 and the rest of src/Engine/MapEngine.
- docs/*.md beyond the lines cited.
