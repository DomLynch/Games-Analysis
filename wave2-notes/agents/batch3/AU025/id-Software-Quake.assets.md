# id-Software-Quake (asset audit, AU025)

Donor: /mnt/frankendom-donors/id-Software-Quake (626 files). Four source trees: WinQuake/ (single-player engine, DOS/Windows era), QW/ (QuakeWorld client, server and QuakeC progs source), qw-qc/ (QuakeWorld QuakeC source and compiled progs), plus top-level readme.txt and gnu.txt.

Halves: the client and server halves are both in the box for QuakeWorld (QW/client with 193 top-level entries and QW/server with 37) with the game logic as QuakeC (qw-qc/*.qc and QW/progs/*.qc, 17 files each). WinQuake/ is the merged single-player engine (not opened file by file). The data pack (PAK files with models, maps, sounds, textures) is absent: no .pak, .bsp, .mdl, .wav, .lmp, .spr file exists in the box (narrow find over the whole donor). The paired donor for the data pack is not in the box (id-Software-Quake-2 is a different game and not a pair).

## Licences (as the files say)
- Code: GPL. readme.txt line 16: "The code is all licensed under the terms of the GPL (gnu public license)." gnu.txt is GPL version 2 text (line 2 "Version 2, June 1991"). Per-file headers such as WinQuake/screen.c line 5 cite the GNU General Public License.
- Data: not in box. readme.txt lines 38-39: the Quake data files "remain copyrighted and licensed under the original terms"; the data cannot be redistributed. readme.txt line 47: demo data has redistribution restrictions.
- Shareware and registered EULA summaries in WinQuake/data/: LICINFO.TXT line 17 bars commercial exploitation of the shareware version; line 38 bars commercial exploitation of "any id copyrighted and/or trademarked" property. RLICNSE.TXT line 2 is titled "LIMITED USE SOFTWARE LICENSE AGREEMENT". These are read in part only (headers and summary lines).
- Logos and icons: WinQuake/quake.gif, WinQuake/quake.ico, WinQuake/qe3.ico, QW/quakeworld.bmp, QW/quake.gif, QW/client/qwcl2.ico. No separate licence in the tree; brand marks; LICINFO line 38 applies to id trademarks.

## Asset inventory
- Art, models, maps, sound: absent (data pack not in box).
- Documentation text: WinQuake/data/ MANUAL.TXT (44 KB), COMEXP.TXT (25 KB), README.TXT (18 KB), RLICNSE.TXT (11 KB), HELP.TXT (5 KB), LICINFO.TXT (4 KB), ORDER.TXT (4 KB). Game documentation under the EULA; only LICINFO and RLICNSE headers were read.
- Logos and icons (listed above): 6 images, sizes not read.
- QuakeC source: 17 files in qw-qc/*.qc and 17 in QW/progs/*.qc (weapons, combat, items, doors, plats, triggers, buttons, world, player, client, server, spectate, models, sprites, subs, misc, defs).
- Compiled QuakeC data: qw-qc/qwprogs.dat (197,684 bytes) and qw-qc/files.dat (5,764 bytes). Binary; not opened.
- Binary third-party and tooling: WinQuake/kit/GLQUAKE.EXE, WinQuake/kit/OPENGL32.DLL, WinQuake/cwsdpmi.exe, .lib files under scitech/ and dxsdk/ (not opened, not run, not licence-checked).
- Asset-name tables inside QuakeC: precache_sound lists (weapons.qc line 38-40; world.qc, doors.qc, items.qc, misc.qc, triggers.qc hold many more) and precache_model lists (items.qc 40 hits, world.qc 26, misc.qc 10). These are string tables of asset paths; their content not reproduced.

## Classes per group
- Engine and QuakeC source: C (GPL code; the rule for GPL is clean-room, shape only).
- Compiled progs .dat files: C (compiled from GPL source, binary, not read).
- Documentation text (WinQuake/data): C (EULA; do not reproduce).
- Logos and icons: C (brand, id trademarks named in LICINFO).
- Game data pack: D (absent).
- Third-party SDK and binaries: C (not read; licence unknown).
- best_class overall: D for game art and audio, C for the code and text. The GPL code is the most useful piece.

## Rights-holder status (repo files only)
Original company: id Software. readme.txt is signed by John Carmack, Id Software, and names Dave "Zoid" Kirsh and Robert Duffy for the release. Not a clean-room project and not a fan project. Engine only: the box has no game data. No leak markers were seen (do not look for mirrors).

## Inspiration (category level only; GPL code and absent art)
- Damage batching per attack: one attack gathers pending damage per target and applies it once at the end. The code keeps one pending target and flushes it when the target changes (weapons.qc lines 202-224; line 216 flushes, line 221 sums). Defect: alternating hits on A, B, A split into three applications, so per-hit rules (armour, death, sounds) fire more than once. Fix: collect per target in a small list and flush once per attack. Keep the idea.
- Blood as a short, visible-only effect event: a one-count blood temp-entity message sent to clients that can see the spot (weapons.qc lines 151-155). Keep the event-to-visible-clients idea; change the effect to sparks or embers on armour.
- Melee as a short forward trace from body height (weapons.qc lines 62-69). Readable reach test; keep the trace idea, change the swing to an arc.
- Area-damage visibility: a trace to the target centre plus four offset points decides whether splash reaches (combat.qc lines 47-72). Keep the multi-point test, use our own sample pattern.
- Named sound channels: a weapon sound is played on a weapon channel (weapons.qc line 449). Keep the channel-per-role idea for the sound-music cell.
- Invincibility cue throttled with a timestamp (combat.qc line 212). Keep the throttle for repeat cues.
- Precache lists as literal path tables per entity file (weapons.qc line 40). Idea: a per-zone asset manifest for preloading.

## Briefs
Art is absent, so briefs describe the mechanism's look and sound, and the category of item or effect. Every brief: recreate as a clearly distinct original, never a copy.

## Cross-link to our cell topics
- combat/fight: multi-damage batching (weapons.qc 194-224) and area-damage visibility (combat.qc 47-72). Relevant to rows 3, 4 and 18.
- vfx / blood: SpawnBlood (weapons.qc 151-155). Relevant to row 8.
- sound-music: weapon channel and invincibility throttle. Relevant to row 12.
- Not read: camera, HUD, zones, spawns, loot tables (items.qc), animation frames (player.qc, sprites.qc).

## Not read
- Game data (absent).
- Documentation text except LICINFO and RLICNSE headers.
- qwprogs.dat and files.dat (binary).
- Executables and .lib/.dll files (not opened, not run).
- QuakeC bodies beyond the excerpts above (weapons.qc 38-40, 62-69, 151-160, 185-224, 449; combat.qc 47-72, 194-224, 212).
- WinQuake/ engine .c files (only screen.c line 5 read).
