# LanternEQ-LanternUnityTools (asset audit, AU030)

Donor: /mnt/frankendom-donors/LanternEQ-LanternUnityTools/
Half read: Unity consumer side plus the data and StreamingAssets that ship in the repo. Paired tool side: LanternEQ-LanternExtractor (own file). No EverQuest archives are in this repo.

## Licence (as the files say)
- Code: MIT. LICENSE line 1 'MIT License'; line 3 'Copyright (c) 2024 LanternEQ'.
- Third-party code: DryWetMidi, MIT, line 3 'Copyright (c) 2018 Maxim Dobroselsky'. MeltySynth LICENSE.txt, MIT per line 1, with a C# Synth notice (line 3) and a TinySoundFont notice (line 6); the rest not read.
- Assets: README line 40 says source code only. But the repo ships EverQuest-derived data (RaceSounds.csv, music and zone lists), a soundfont, and a 76 MB SQLite database, with no licence line for any of them. Treated as unclear, class C.

## Rights-holder status
Community project (README line 38). README line 41: EverQuest is a Daybreak trademark; not affiliated. Owner and origin of the database, soundfont and EverQuest-derived data are not stated in the repo: unknown.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Unity importer and tools (C#) | Assets/Scripts/Lantern/EQ/, Assets/Scripts/Infrastructure/EQ/ | 189 .cs | A (code, MIT notice) |
| EQ shaders (lit, unlit, invisible, sky) | Assets/Content/Shaders/EQ/ | 17 .shader, 6 .hlsl (+4 .cginc in repo) | A (code) |
| Trigger prefabs | Assets/Content/Features/Game/ | 3 prefabs | A (project structure) |
| Race sound table | Assets/StreamingAssets/ClientData/RaceSounds.csv | 227 lines | C |
| Music list and zone lists | StreamingAssets/ClientData/Music/music_tracks.txt; Assets/Content/ClientData/ (7 zonelist files, 271 lines) | 83-line track list | C (names only) |
| Soundfont | Assets/StreamingAssets/Soundfont/synthusr_samplefix.sf2 | 1,546,202 bytes | C |
| SQLite database | Assets/StreamingAssets/Database/lantern_server.db | 76,374,016 bytes | C (header only read) |
| EmojiOne sample | Assets/TextMesh Pro/Sprites/ | 1 png, 1 json, attribution .txt | C |
| Native plugins and PDFs | Assets/Plugins/EQ/sqlite3, SerializableDictionary.pdf | 3 dll, 2 so, 2 pdf | C until checked |

Best class: A (only for the MIT shaders and prefabs, which are code-like). Everything EQ-derived is C.

## Inspiration (own words)
- Trigger spheres own the audio: enter starts a cue, exit stops it (MusicTrigger.cs lines 34-41). Gap: a hard cut. Our fix: fade and overlap.
- Ambient beds scoped to a radius: 3D source max distance = trigger radius times one world-scale constant (SoundTrigger3d.cs line 42).
- Variant rows that copy a base row (RaceSounds.csv line 5, 'Copied from 0'): sound sets inherited and overridden row by row.
- Shader family: lit, unlit and invisible (collision with no visible mesh). Worth reading for the look and the invisible-wall trick.
- Sky shader with its fog pragma commented out (EQSky.shader line 50): a note that fog was planned and then disabled.

## Briefs (recreate as clearly distinct originals, never a copy)
- Zone ambience sphere: keep loop-only-inside and one radius for trigger and range; change to a border crossfade, a biome bed per zone, and a per-zone falloff. Ref SoundTrigger3d.cs lines 16, 24-34, 42.
- Music layer on enter and exit: keep the trigger-owned cue; change to a 2-3 s fade and a priority table (dungeon over hub over zone). Ref MusicTrigger.cs lines 34-41.
- Race sound set with variant rows: keep base plus copied variants and gender as a key; change to our own sound design and a per-family pool that avoids repeats. Ref RaceSounds.csv lines 1, 3, 5.

## Cross-link
- Sound and music: strong (triggers, variant rows, soundfont). Read as a sound-music input.
- Zones: zone list names by expansion (names only).
- Animation and look: shader family (vertex-colour lit path), not read in body.
- Camera, HUD, loot, spawns: nothing read.

## Not read
Most of the 189 .cs files; shader and HLSL bodies; lantern_server.db contents; the soundfont contents; the plugin binaries and PDFs; prefab bodies beyond names; EmojiOne website terms (external, not fetched).
