# Asset audit: Doddler-RagnarokRebuildTcp (AU016)

Path on VPS (read-only): /mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/

## Licence (what the files say)
- Code licence: a custom licence file, license.txt (not a named standard licence). Line 1 says anyone may do what they want with the code and forks, "as long as anything based on this code is not used for commercial purposes". Line 1 defines commercial use to include running a server or service that asks for donations or payments, or sells in-game rewards. Line 5 asks for credit to the RagnarokRebuild project, but says it is not required ("you don't have to").
- Third-party: license.txt:3 says third-party assets (it names lidgren and unity-websocket-webgl) "may be subject to their own licenses", and that the licence does not cover intellectual property (names, logos) "related to Ragnarok Online and Gravity Entertainment".
- Per-package licences found: 3rdParty/LeanTween/License.txt is MIT (Russell Savage - Dented Pixel, 2017); 3rdParty/Color picker/LICENSE is MIT (Max Maletin, 2019). Other 3rdParty packages (TextMesh Pro, Lidgren, Websocket, BakeManager, UVPreview and others) were not checked.
- Asset licence: none stated for the project's own art. README.md:5 says "This repository contains no game assets from Ragnarok Online. You will need to provide those yourself." README.md:43 says contributed code and assets are "implicitly giving permission to use it perpetually as part of the project". README.md:47 asks that AI-generated art not be committed.

## Asset inventory (RebuildClient/Assets, about 260 MB before meta files)
- Textures/ (206 MB, 750 files incl. .meta): PNG, PSD, TGA, BMP, JPG. Sub-folders include Guilds, CustomIcons (Item, Skills, Collection), Explosion (frame strip named frame_NN_delay-0.1s.png), Resources, cursor (cursor_001 to cursor_010 variants), Minimap, Import, Particles (particle1-7 PNG), LoginBG, UI (many PSD/PNG window frame, button, arrow, chat bubble pieces, e.g. basewin_bg2-transparent-nobottom.png). Loose materials CastCircle.mat, Casting.mat, Firefly.mat.
- Models/fbx/ (30 files): guild flag and empelium FBX (guildflag90_1.fbx, empelium90_0.fbx; 5 FBX files repo-wide) plus PNG/PSD/BMP textures.
- Effects/ (3.1 MB, 305 files): Custom folder with 2 OGG (puff.ogg, puff2.ogg) and Smoke, Textures, PNG effect sprites (angel.png).
- Prefabs/ (93 prefab files), Scenes/ (7 .unity scene files), Scripts/ (C# code, 7.2 MB), Shaders/ (920 KB), Materials/ (148 KB). Scene and prefab files are Unity YAML.
- Data/ (296 KB): cardillustrations.txt (450 lines, card-to-art list), jobexpchart.txt (70 lines), SharedItemIcons.txt (932 lines, item name-to-icon mapping; RO-style identifiers such as Lucky_Candy_Cane, Assets/Data/SharedItemIcons.txt:4), LoginBG.txt, FlyingText/, Misc/, CursorConfig.asset.
- Audio: only 2 OGG files found repo-wide (Effects/Custom/puff.ogg and puff2.ogg). No WAV or MP3. Music/, Sounds/ and Sprites/ are .meta folders only (no contents in tree).
- Fonts: 6 TTF files (TextMesh Pro fonts under 3rdParty; not checked for licence).
- Maps: no map data files in the tree. README.md:18-24 says maps and scenes are imported from the user's own data.grf and baked locally.
- Server side: RoRebuildServer/ (RoServerScript: 3 files, GameConfig, ServerData, DataToClientUtility). ServerData/Db/Monsters.csv holds monster definitions (README.md:35). Other/RoWikiGenerator holds a Blazor wiki generator with Pages/*.razor and wwwroot.
- Other/: LuckTest.xlsx, RoStatProcessing.xlsx (spreadsheets, not read).

| group | path | count_hint | licence | class | note |
|---|---|---|---|---|---|
| Project UI, textures, icons (provenance not stated) | RebuildClient/Assets/Textures, UI/, CustomIcons/ | about 750 files incl. meta | none stated; README.md:43 contributor grant | C | Provenance not stated in repo. Several icon names look like RO skill/item names (CustomIcons/Skills/al_teleport2.bmp; Item/koko_*.bmp). Human check needed |
| Models (guild flag, empelium) | RebuildClient/Assets/Models/fbx | 30 files | none stated | C | Provenance not stated |
| Effects (puff OGG, smoke, sprites) | RebuildClient/Assets/Effects | 305 files | none stated | C | Provenance not stated |
| Item and card data text | RebuildClient/Assets/Data/*.txt | 3 text files, about 1450 lines | none stated | C | RO-style item identifiers; text only |
| Third-party MIT packages | 3rdParty/LeanTween, 3rdParty/Color picker | 2 packages | MIT (per package licence file) | code (A-style notice) | Code; keep notice |
| Other third-party (TextMesh Pro fonts, etc.) | RebuildClient/Assets/3rdParty | about 37 MB | not checked | C | Not read |
| Unity scenes, prefabs, materials | Scenes, Prefabs, Materials | 7 scenes, 93 prefabs, 148 KB materials | none stated | C | Unity YAML; depends on Textures |

## Rights-holder status (repo files only)
- Fan project for a Ragnarok Online-like server and client. README.md:3 says "Server and client for a Ragnarok Online-like game".
- Uses original game data from the user's own copy: README.md:18 says the user sets the path to files "extracted from data.grf from an original client". This is original game data (proprietary-origin, class C).
- license.txt:3 names Ragnarok Online and Gravity Entertainment as parties whose IP is not covered. The current rights owner is not named in these files beyond that.
- Project's own textures and icons: origin not stated, so unknown.

## best_class
C. The code licence is custom and non-commercial. The MIT third-party packages are code, not art. No group has a clear class A or B asset licence. Art and icon provenance is unclear, so C per the rule.

## INSPIRATION (own words)
- Frame-strip effects with per-frame timing in the file name: Explosion frames are named with the frame number and a delay (Textures/Explosion/frame_01_delay-0.1s.png). This makes timing visible in the asset itself. Recreate with our own burst frames and the same naming idea.
- Skill effect atlas: effects are packed into one atlas and imported by a menu command (README.md:30). A good pattern for many small effects.
- Casting circle with rising motes: a casting material and a firefly material (Textures/CastCircle.mat, Casting.mat, Firefly.mat). Recreate as a rune ring with motes that lift while a spell channels, in our own rune language.
- Modular window frame kit: UI pieces include transparent and no-bottom variants of the base window, corner and bottom handles (Textures/UI/basewin_bg2-transparent-nobottom.png, corner_handle.psd, bottom_handle.psd). A good kit shape for our own windows.
- Flying damage numbers: a FlyingText data folder and a DamageIndicator folder (RebuildClient/Assets/DamageIndicator, RebuildClient/Assets/Data/FlyingText). Use our own font, arc and colour grade.
- Card illustration list: Data/cardillustrations.txt maps items or cards to art, which lets art be swapped without code changes. A data-first pattern.
- Custom content ID band: custom monsters use IDs from 6000 upward in ServerData/Db/Monsters.csv (README.md:35). A clean way to keep our own content apart from imported content.
- Generated minimaps after lighting bake (README.md:24). Automate minimap output as part of the scene build step.

## Briefs
- label: Ember rune ring (own label)
  why: a casting circle with motes rising reads as channelling without a long animation
  keep: ring that brightens over the cast; motes lifting from it
  change: our own rune language (no RO-style circle); a cooler colour; motes that orbit before they rise
  ref: Textures/CastCircle.mat, Textures/Casting.mat, Textures/Firefly.mat
- label: Frame-strip burst with timing in name (own label)
  why: a short burst that stays readable at small size, with timing visible to artists
  keep: per-frame delay in the file name; short strip
  change: our own burst shape (shard fan, not radial); two-tone palette
  ref: Textures/Explosion/frame_01_delay-0.1s.png
- label: Modular window frame kit (own label)
  why: corners, bottoms and transparent variants let one frame style cover many windows
  keep: transparent variant plus no-bottom variant; corner and bottom handles
  change: our own bevel and rivet ornament; different corner radius; our own palette
  ref: Textures/UI/basewin_bg2-transparent-nobottom.png; Textures/UI/corner_handle.psd
- label: Rising damage number (own label)
  why: numbers that arc up and fade read clearly in combat
  keep: short arc and fade; colour by damage type
  change: our own font and arc shape; weight change on crits
  ref: RebuildClient/Assets/Data/FlyingText (folder)
- label: Placeholder-free custom creature slot (own label)
  why: a creature with no sprite should still read; a deliberate placeholder avoids the default-sprite trap described in README.md:35
  keep: reserved ID band for custom content
  change: our own placeholder silhouette per creature type instead of a default sprite
  ref: README.md:35

## Cross-link to our cell topics
- vfx: effect atlas, frame-strip timing, casting circle (Textures/Explosion, CastCircle.mat).
- hud-ui: window frame kit and login background (Textures/UI, Data/LoginBG.txt).
- loot and items: item icon mapping text (Data/SharedItemIcons.txt) and card art list (Data/cardillustrations.txt).
- animation and models: guild flag FBX (Models/fbx) only; no character rigs read.
- camera: Cinemachine scene (Scenes/Cinemachine.unity) not read.
- sound: 2 OGG files only (Effects/Custom/puff.ogg, puff2.ogg).
