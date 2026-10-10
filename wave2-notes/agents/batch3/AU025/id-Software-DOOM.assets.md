# id-Software-DOOM (asset audit, AU025)

Donor: /mnt/frankendom-donors/id-Software-DOOM (linuxdoom-1.10 engine source, plus ipx/ and sersrc/ network drivers and sndserv/ sound server). The box holds engine source only. No game data pack is included.

Half read: engine (linuxdoom-1.10 data tables: info.c, info.h, sounds.c, sounds.h; header and README files). The data pack (WAD with sprites, sounds, maps, textures) is absent from the box. README.TXT line 3 says the code needs "real DOOM data". The paired donor for the data pack is not in the box, so no pairing is possible here.

## Licences (as the files say; they conflict)
- LICENSE.TXT (root) is the GNU GPL version 2 text, line 1 "GNU GENERAL PUBLIC LICENSE".
- README.TXT line 2-3: "The DOOM source code is released for your non-profit use." The file does not name a licence.
- Source headers (g_game.h line 9, and other files) say the source is "available for distribution and/or modification only under the terms of the DOOM Source Code License". That licence text is not in the tree.
- README.TXT line 80: "Copyright (c) ZeniMax Media Inc."; am_map.c line 6: "Copyright (C) 1993-1996 by id Software, Inc."
- Verdict: the code licence is conflicting or unclear (GPL-2 file, a named DOOM Source Code License that is absent, and a non-profit wording). Per the brief, class C: clean-room, shape only.
- Asset licence: none. No art, audio, map or texture file is in the box, so no asset licence applies.

## Asset inventory
- Art (sprites, textures, patches, HUD graphics): none in the box (checked: find for *.wad, *.lmp, *.pcx, *.png, *.dmx, *.wav, *.mid returned nothing).
- Audio: none. sounds.c holds the sound table only (sfxinfo entries); the audio itself is in the absent data pack.
- Maps and levels: none.
- Data tables inside C source (non-code content in practice):
  - info.c line 40: sprite-name table sprnames[NUMSPRITES] of 4-letter family prefixes (for example TROO, SHTG, PUNG, PISG).
  - info.c line 135: state table states[NUMSTATES], one line per animation state (sprite, frame, tics, action, next state).
  - info.c line 1106: object table mobjinfo[NUMMOBJTYPES] (per object type: spawn state, health, see state, and death-related states such as xdeathstate). info.h holds about 137 MT_ object-type names.
  - sounds.c line 114: sound table S_sfx[], 176 entries (name, a flag, numeric fields).
  - d_englsh.h: 286 #define lines (counted only, content not read); dstrings.h: 5 #define lines.
- Text: message strings are in d_englsh.h (see count above). Not read for content.
- Network and sound sources (code): ipx/, sersrc/, sndserv/ (sndserv/wadread.c (name only; not read)).

## Classes per group
- Sprite art, sounds, maps: D (not in the box).
- sprnames, states, mobjinfo, S_sfx tables: C (inside source files whose licence is unclear).
- Engine code: C (licence unclear; clean-room, shape only).

## Rights-holder status (repo files only)
Original company: id Software copyright lines in source; README closing line names ZeniMax Media Inc. Engine only; needs the original proprietary data pack (not in box). Not clean-room, not a fan project, and the box has no leak marker (do not look for mirrors).

## Inspiration (category level only, class C/D)
- A grunt-type trooper uses a short look loop, a quick flinch, a death chain, and a separate heavy-death chain for big hits (info.c states around lines 310-330). Recreate the timing pattern with our own timings and silhouette.
- Effects are objects with their own tiny state chains: a dust puff at wall hits (full-bright on spawn), a blood object for flesh hits (info.c lines 226-229). Recreate the idea with our own effects (sparks on armour, ember puffs), not the same sprites.
- The player has an extreme-death chain as a separate state path (info.c line 301). The death presentation picks a branch by hit size.
- Weapons are four-state chains: ready, lower, raise, fire (the punch chain at info.c lines 135-140 shows the pattern). Readable at 375 wide because each weapon is one sprite family prefix.
- Each sound entry has a name, a flag and numeric fields (sounds.c line 119). The idea to keep is a priority number per cue so that loud cues win when many play at once.
- A family-prefix naming scheme (sprnames, info.c line 41) keeps the asset vocabulary small: one prefix per object family.

## Briefs
Sprite art is not in the box, so briefs describe state chains and tables only. Dom's rule: recreate as clearly distinct originals; the KEPT and CHANGED traits are in the JSON.

## Cross-link to our cell topics
- vfx: blood and puff state chains (info.c 226-229). Relevant to row 8 blood and decals.
- animation / creature actor: idle, pain, death chains (info.c 310-330). Relevant to row 7.
- sound-music: S_sfx priority idea (sounds.c 114-119). Relevant to row 12.
- hud-ui, camera, zones, spawns, loot: not read in this pass (st_stuff.c, hu_stuff.c, r_*.c, p_mobj.c, d_items.c are on the donor but unread).

## Not read
- Sprite art, WAD, sounds, maps (not in the box).
- d_englsh.h and dstrings contents (only counts).
- info.c beyond the excerpts (lines 40-41, 135-140, 226-229, 301, 310-325, 1106-1112).
- sounds.c beyond lines 114-119 and the entry count.
- sndserv/, ipx/, sersrc/ sources.
- p_enemy.c, p_pspr.c, st_stuff.c, hu_stuff.c, r_*.c (the view and HUD code).
- The DOOM Source Code License text (not in the box).
