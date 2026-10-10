# bearlikelion-WoWdot: asset audit (AU005)

Path: /mnt/frankendom-donors/bearlikelion-WoWdot (VPS, read-only). 1395 files, 43M.

## Licence (as the files say)
- Code: MIT. LICENSE line 3: "Copyright (c) 2026 Mark Arneman and WoWdot contributors".
- Vendored third-party code keeps its own licence per NOTICE.md: WoWee MIT, godot-cpp MIT, StormLib MIT and public domain, zlib, bzip2, GLM MIT, nlohmann/json MIT, GDDocs MIT.
- Logo: NOTICE.md line 19 lists "CC BY 4.0, by Andrea Calabro" for the Godot logo adapted into wowdot_logo.png and website/.
- WoWee original music: reserved by its own licence (NOTICE.md lines 21-22; extension/wowee/LICENSE line 25). Not included in WoWdot.

## Rights-holder status (from repo files only)
- Fan and community Godot clients for classic WoW servers. README and NOTICE say the project ships no Blizzard code, archives or extracted assets, and players supply their own licensed client data.
- docs/legal-and-provenance.md marks some Blizzard-derived files as OPEN (see below). The file says "Not legal advice".
- Not affiliated with Blizzard, per the repo's own notices.

## Asset inventory
- Logos (A for wowdot_logo.png with CC BY attribution; others unknown): wowdot_logo.png, website/logo.png, website/favicon.png, website/extension.png, extension/wowdot_extension_logo.png.
- Client icons (C): clients/wowgd/wowgd_icon.png (OPEN in provenance doc line 35), clients/wrathgd/wrathgd_icon.png, website/wowgd.png, website/wrathgd.png.
- Game screenshots (C, origin not stated): website/benchmark/*.jpg (16), website/wowgd/*.jpg (4), website/wrathgd/wrathgd-login.jpg. File names name game locations.
- Blizzard-derived UI scenes (C, OPEN): 285 .tscn under clients, 8 under ui/wow (chat_line, chat_bubble, message_line, wow_model_frame). Frame layout JSON in clients/*/tools/framexml/frames.json. The provenance doc says they are generated from Blizzard FrameXML (layout, coordinates, texture paths, sound names).
- Sound name tables (C): clients/wowgd/data/classic/ui_sounds.json (85.7K), clients/wrathgd/data/wotlk/ui_sounds.json (135K). No audio files ship.
- Protocol and format tables (A per provenance for the WoWee-listed ones; others C): opcodes, update_fields, dbc_layouts, spell and equip failure tables, vehicle_skins.json.
- Localisation CSVs (C): 7 files, translations/wowgd/*.csv, 59,015 keys each, text column empty per translations/handoff.md. Keys name game strings.
- Audio, fonts, models, maps: none in the repo. Game fonts load from the player's MPQs (provenance doc line 36). Class D.
- Shaders and resources (code under MIT, not read): 11 gdshader, 11 tres.

## Best class
C overall. Logo is A with attribution (CC BY 4.0). The Blizzard-derived layouts, sound names, icons and screenshots are C until the provenance items are decided.

## Inspiration
1. Chat and HUD are built as small scene units (chat line, bubble, message line, model frame). Copy the component split in our own HUD.
2. Frames are authored as layout data and converted to scenes by a script. Keep our layout as data and generate HUD scenes with our own coordinates and art.
3. A benchmark page compares two builds on login, world load and idle CPU. Template for a perf table.
4. Translation keys stay separate from text, with English fallback for missing lines. Copy for our localisation.
5. Login and character screens are shown as a few screenshots per client. Showcase pattern only; the images have no origin statement here.
6. Shaders and resources are split from scenes (gdshader and tres). Good split for our material and rim work.

## Inspiration briefs (4)
- Chat speech bubble: small social cue over a head. Ref clients/wowgd/ui/wow/chat_bubble.tscn (open item; reference for look only, not reuse).
- Model frame portrait: framed 3D portrait beside chat. Ref clients/wowgd/ui/wow/wow_model_frame.tscn.
- Benchmark strip: two builds side by side on login, load and idle. Ref website/benchmark.html and website/benchmark/results.json.
- Chat log line: one scene per message, channel colour. Ref clients/wowgd/ui/wow/chat_line.tscn.
Briefs for the two ui/wow scenes are inferred from file names; the scene contents were not opened.

## Cross-link to our cell topics
- hud-ui: chat and model frame components (scene units).
- camera and vfx: none in the assets (code only).
- sound: ui_sounds.json names only; no audio in repo.
- animation: none in the assets.

## Not read
The 285 tscn contents (8 named only), frames.json and ui_sounds.json contents (sizes and paths only), all screenshot jpgs (names and counts), icon PNGs (names), translations beyond the header, extension/api/extension_api.json (6.9 MB), WoWee C++ and gdshader files.
