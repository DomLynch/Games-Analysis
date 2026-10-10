# saveme712-CoHClient (City of Heroes client modification): assets (AU046)

Donor: /mnt/frankendom-donors/saveme712-CoHClient (read on the VPS, read-only)
Halves: the README, LICENSE, the vendored library headers and the file tree were read. The hook layer (CoHClient/*.cpp, coh.h, reverse.h; 8 files) was NOT read beyond file names and line counts, on purpose: it is a game-facing layer for a live commercial game (see Rights below), and nothing in it is a game-design idea we could use. The game client itself is not in the box. No server half for this game is in the box (the root listing has no coh, city or homecoming folder).

## Licences (as the files say)
- The tool's own code: LICENSE line 1: "This is free and unencumbered software released into the public domain." (The Unlicense text.)
- Vendored, keeps its own terms:
  - mh/ and include/MinHook.h: copyright block "Copyright (C) 2009-2017 Tsuda Kageyu." (mh/hook.c line 3) with a BSD-style redistribution clause.
  - mh/hde/: "Copyright (c) 2008-2009, Vyacheslav Patkov." (mh/hde/hde64.h line 3). Licence text not read.
  - ImGui/: imgui.cpp line 24: "See LICENSE.txt for copyright and licensing details (standard MIT License)." The LICENSE.txt it names is NOT in the box (a find for licence and txt files found no ImGui licence file).
  - glm/: no licence file found in the box (only glm/CMakeLists.txt matched the text-file search). Licence text not confirmed.

## Rights-holder status (repo files only)
- README line 2: "A modification that allows for various manipulations of the City of Heroes client." The README does not name the game's publisher or the owner of the game client.
- README line 8: "You _WILL_ get banned for using this in game, but hopefully after you cause some chaos."
- README line 14: "we patch out the hardware id tracking so that they cannot keep you banned across accounts."
- Recorded as the file says. This donor's game-facing code is a live-game modification that the README describes as getting accounts banned and patching an anti-abuse check. I did not use or summarise its method, and nothing from it should be taken into Frankendom.

## Asset inventory (paths and counts)
- Game content (textures, models, sounds, text tables, maps): NONE in the box. The game client is not in the box.
- Non-code files: LICENSE, README.md, .gitignore, .gitattributes and glm/CMakeLists.txt; no image, audio, font, model or data table.
- Code and headers: 278 .hpp and 138 .inl (glm), 28 .h, 14 .cpp, 5 .c (mh/hde and hook layer), plus project files (.sln, .vcxproj, .filters, .user).
- Vendored: ImGui (imgui*.cpp, imstb_*.h, headers), glm (headers), MinHook (mh/*.c, include/MinHook.h), hde (mh/hde/*.c, *.h).

## Asset classes per group
- Game content: none shipped. D.
- Tool's own code: no assets. Public domain dedication (LICENSE). Class A for code only.
- MinHook: BSD-style with notice retention. Class A with attribution (code, not assets).
- hde: class C (licence text not read).
- ImGui: class C (the MIT statement in the header points to a LICENSE.txt that is not in the box).
- glm: class C (no licence text found in the box).
- Best class for game-relevant assets: D.

## Data first (names and looks)
- None. There is no data table, string table or look data in the box. The game's names and looks are not present.

## Inspiration
- None usable from this donor's game side. Nothing in the box is a game design idea we could recreate; the only content is a live-game hook layer, which I did not mine for mechanics.
- Category-level only (not game design): the project vendors an immediate-mode GUI library (ImGui) for an in-client panel, which is a dev-tool pattern for our own test builds. Not read in the project's own files (CoHClient/render.cpp, 107 lines, not read).

## Briefs
None. Reason: no game content in the box, and the game-facing code is a live-game modification whose method I did not mine. Nothing here can be recreated as a clearly distinct original brief without copying that method. Rule for any future brief from another donor is unchanged.

## Cross-links
- Dev-tool overlay pattern: tools and build topics only; not a game-design topic.
- No camera, zones, spawns, loot, hud-ui, vfx, animation or sound assets exist in this box.

## Not read
- CoHClient/*.cpp, coh.h, reverse.h (hook layer), by choice.
- ImGui sources beyond the header comment; glm sources beyond the file list; hde sources beyond the copyright line; MinHook sources beyond the copyright block.
- Any licence text for hde, glm or ImGui (the LICENSE.txt named by ImGui is absent).
