# Blizzard-s2client-api: asset audit (AU007)

- Code licence: MIT (LICENSE: copyright (c) 2017 Blizzard Entertainment, full MIT text). CREDITS lists third-party libraries (Civetweb, Protobuf, SDL 2.0, Dirent); their folders are empty in this copy and their licences were not read.
- Asset licence: No licence stated for the five .SC2Map files or docs/doxygen/SC2-Logo.png. README says the repo has only a few test maps and that more maps and replays are downloaded separately (link not followed).
- Rights-holder status (from repo files only): partly stated: code copyright line names Blizzard Entertainment. Map and logo ownership not stated in repo. The game client that the API drives is not in the repo.
- Best class: C

## Asset groups

| kind | path | count hint | licence | class | note |
|---|---|---|---|---|---|
| test maps | maps/Test/Empty.SC2Map (23792 bytes), maps/Test/EmptyLong.SC2Map (14751 bytes), maps/Test/EmptyTall.SC2Map (14799 bytes) | 3 files | not stated (README: maps for testing) | C | binary map files; blank arenas; not opened |
| example map | maps/Example/MarineMicro.SC2Map (26239 bytes) | 1 file | not stated | C | binary; small micro scenario; not opened |
| ladder map | maps/Ladder/(2)Bel'ShirVestigeLE (Void).SC2Map (10070032 bytes) | 1 file, about 10 MB | not stated | C | binary; full ladder map; file name is a proper noun, not reproduced; not opened |
| logo image | docs/doxygen/SC2-Logo.png (24634 bytes) | 1 file | not stated | C | logo image; not opened |
| docs text | docs/doxygen/mainpage.md, docs/*.md (building, getting_started, tutorial1-3) | 7 text files (listing) | repo MIT notice only; docs not separately licensed in files read | C | only mainpage.md head and README were read |
| code and examples | examples/*.cc, examples/common, src/, include/, tests/, project/ | source files (not counted) | MIT | D | no art or audio; code only |
| empty submodules | protocol/, contrib/civetweb, contrib/protobuf, contrib/SDL-mirror, contrib/ipv6-parse | 0 files in this copy | not checked | D | submodule folders present but empty |

## Inspiration (own words)

- Framing trio: three blank test arenas (square, long, tall) let a team see camera framing problems at different aspect ratios. Recreate as our own empty test rooms in our proportions, with a grid overlay, for camera checks.
- Micro drill arena: one small fight used to test one mechanic in isolation. Idea: a per-mechanic training room in our game for tuning combat without loading a full zone.
- Asset weight reference: the one real ladder map is about 10 MB while the test maps are 15 to 24 KB. Real play maps dominate asset weight, so our zone size budget should plan for that gap.
- Onboarding by a tiny first program: the README teaches with one short sample that prints and reacts to game state. Idea: our modding docs open with a ten-line example before any theory.
- No visual content of note: this donor has no creature, armour, item, sprite, audio or texture content in the files read, so visual inspiration is limited to test-level design.

## Inspiration briefs

1. **Framing trio (empty test arenas)**
   - why it works: three blank rooms of different shape make camera framing faults obvious at a glance
   - traits worth keeping: square, long and tall trio; empty interior so only the camera is tested
   - traits to change: our own room sizes; a labelled grid overlay; spawn markers instead of pure blanks
   - reference: /mnt/frankendom-donors/Blizzard-s2client-api/maps/Test/EmptyLong.SC2Map and EmptyTall.SC2Map (binary, not opened)
2. **Micro drill room**
   - why it works: a small enclosed fight where one mechanic is the whole test keeps tuning fast
   - traits worth keeping: single-mechanic arena with fixed start positions and a repeatable setup
   - traits to change: our own layout, mechanic set and start geometry; a timer and score overlay
   - reference: /mnt/frankendom-donors/Blizzard-s2client-api/maps/Example/MarineMicro.SC2Map (binary, not opened)

## Not read or not verified

- All .SC2Map files (binary; sized from ls only, not opened)
- docs/doxygen/SC2-Logo.png (sized from ls only; not opened)
- Protocol definitions (protocol/ is an empty submodule here)
- Third-party contrib folders (empty here)
- README link to additional maps and replays (not followed)
- Only two briefs: this donor has no creature, armour or zone art in its files, so no others were possible
