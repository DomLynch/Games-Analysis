# OpenBW-openbw (asset audit, cell AU037)

Donor: OpenBW, a StarCraft-style engine that runs on the original game's data. Tree: /mnt/frankendom-donors/OpenBW-openbw/ (400 files on the VPS, read-only).

Code licence: not stated in the box. No LICENSE file for the engine. README.md (3 lines) points to an external build guide and says nothing on licence. The only licence file is deps/asio/LICENSE_1_0.txt (Boost Software License 1.0) for vendored asio.
Asset licence: no game assets in the box. The engine reads the original game's archive and data-table files at runtime (data_loading.h:1038 archive reader; loaders at 1440, 1518, 1564, 1629). Those files are not in the box.
Rights-holder status: uses original game data, so proprietary per the rule. The box names the original game only in one code comment (bwgame.h:21334). No ownership or licence statement for the data.
Best class: C. The engine code has no stated licence and the only content it uses is proprietary and user-supplied. Nothing non-code is shipped.

Half read: engine (frame loop, unit update, RNG, sync scheduling, replay playback, loaders, all in part). UI or client: ui/native_sound.h and ui/CMakeLists.txt read in part; ui/sdl2.cpp not read. Data pack: absent from the box (extension count: hpp 317, ipp 51, h 25, cpp 3, txt 2, md 1, cmake 1). Paired donor in this batch: none.

## Asset groups
- Original game data: not in the box. Class C, user-supplied.
- Character-code table: korean.h, 1857 lines of 16-bit code points, table starts line 13. Class C, source not stated.
- Entity identifier enums: bwenums.h. Identifiers only; do not reuse the names. Class D.
- UI and sound interface: ui/native_sound.h (play takes channel, sound, volume and pan). No sound file. Class D.
- Vendored asio library: deps/asio, BSL 1.0. Code, not an asset. Class D.

## Inspiration
- Deterministic frame step: counter advance, frame processing, then triggers (bwgame.h:13191-13194). Fixed-step shape for row 18.
- Seeded random source with a counter per source (bwgame.h:13197-13201, 237). Give each system its own stream and count the draws so a desync can be traced.
- Staggered order processing: processing buckets 0 to 7 re-dealt every 150 frames (bwgame.h:12879-12887). Spreads AI decisions over frames; the per-tick NPC budget idea.
- Lockstep scheduling: actions stamped with an 8-bit frame tag and run when the sync frame matches (sync.h:191-195).
- Replay as recorded actions per frame; playing past the end is an error (replay.h:229-230). Matches row 19.
- Sound call shape: channel, volume, stereo pan per play (ui/native_sound.h:13). Pan per combat cue is the sound idea to borrow.
- Typed loaders per table for units, weapons, upgrades and flingy (data_loading.h:1440-1629). Catalogue-as-runtime-source, rows 20 and 21.

## Briefs (behaviour only; the box has no art)
- Lockstep ghost replay (own label): a fight watched again from an input log, with a camera path and a scrubber. Keep the per-frame log and the same-engine re-run. Change: our own ghost fighter, inputs-only log (replay.h:229-230; sync.h:195).
- Staggered-think fighters (own label): enemies decide on different frames to keep frame time flat. Keep the fixed buckets and the long re-deal timer. Change: buckets from zone and spawn ids, our own rhythm (bwgame.h:12879-12887).

Dom's rule applies to both: recreate as a clearly distinct original, never a copy.

## Not read
bwgame.h beyond the cited lines (about 22000 lines); ui/sdl2.cpp and other ui files; networking sync_server files; replay_saver.h; data_types.h; game_types.h; actions.h; util and container headers; data_loading.h table bodies; deps/asio beyond its licence.
