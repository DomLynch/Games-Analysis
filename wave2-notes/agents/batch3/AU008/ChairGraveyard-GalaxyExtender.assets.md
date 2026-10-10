# Asset audit: ChairGraveyard-GalaxyExtender

Donor tree: /mnt/frankendom-donors/ChairGraveyard-GalaxyExtender/ (VPS, read-only). Paths below are relative to that folder unless shown absolute. Receipts: receipts.tsv (verified). Machine-readable copy: ChairGraveyard-GalaxyExtender.assets.json.

**Best class: D**

## Code licence
GPL v3 for the repo (COPYING at repo root). Bundled LuaBridge headers state MIT licence (SWGCommandExtension/LuaBridge/detail/CFunctions.h) with copyright lines for Vinnie Falco (2012), Nathan Reed (2007) and Nigel Atkinson (2008) in other headers.

## Asset licence
None. The repo holds no art, audio, models, textures or maps. Non-code files are README.md, SWGCommandExtension/ReadMe.txt (unedited AppWizard text), two Lua scripts, a Visual C++ browse database and an empty Debug/pingme.txt.

## Rights-holder status
unknown. README says the project extends the Star Wars Galaxies client. The client-side headers declare engine class names (for example FreeChaseCamera and ClientProceduralTerrainAppearance) and carry no copyright line for those files. The repo does not say who owns the client code. Not marked restricted; no _RESTRICTED-NOTE.txt in this folder. Only class names and command ideas are used here.

## Asset groups

| kind | path | count/size | licence | class | note |
|---|---|---|---|---|---|
| art, audio, models, textures, maps | none in repo | 0 files | not applicable | D | Confirmed by file-extension count: no png, jpg, dds, wav, mp3, mesh or map files in the tree. |
| Lua scripts | assist.lua (507 bytes), client_lua.lua (223 bytes) | 2 files | none stated; repo is GPL v3 | D | Read in full. Small hook scripts that read the current look-at target and return health and action values as text. |
| Visual C++ browse database (binary) | SWGCommandExtension.VC.db (52 MB) | 1 file | none stated | D | Build artifact. Not opened. |
| precompiled header cache and build folders | ipch/, Debug/ | 2 folders | not applicable | D | Build output only. Debug/pingme.txt is empty. |
| client-derived engine declarations (C++ headers) | SWGCommandExtension/*.h (59 files, e.g. FreeChaseCamera.h, ClientProceduralTerrainAppearance.h, CuiWidget3dObjectListViewer.h) | 59 .h | none stated for these files; repo is GPL v3 | C | Code, not content. Class names read; bodies not opened. Provenance unclear, so C. |
| third-party LuaBridge headers (MIT) | SWGCommandExtension/LuaBridge/ (17 .h) | 17 .h | MIT (CFunctions.h line 7); copyright lines in detail/Namespace.h and detail/LuaRef.h | A | MIT text in the header. Code only; listed for licence picture. |
| text documentation | README.md (command list), SWGCommandExtension/ReadMe.txt | 2 files | none stated | D | README command list read in full. Not reproduced at length. |

## Inspiration (own words, recreate from scratch)

- Graphics quality presets as named tiers (default, low, medium, high, ultra) plus per-setting overrides. A clean options pattern: a one-tap default and power-user sliders underneath.
- Draw distance split into several named controls (terrain detail, flora, view distance) instead of one slider. Useful for tuning phone performance by layer.
- A detached orbit camera, toggled on and off, for inspecting a fight or a structure without moving the character. Recreate the toggle and the orbit, not the code.
- Slash-command grammar with a short and long name for each command (for example a short distance command and its long form), a help command listing all of them, and getter commands that read the current value back.
- A nearby-object list viewer with a 3D preview on each row. On phone, the same idea works as an icon list sorted by distance.
- A small script hook that reads the current target and returns a few values as text for a HUD line. A safe readout idea if it stays read-only and sandboxed.
- Caution, note only: the project injects code into a commercial client. We should not copy that approach; the useful part is the UI idea, not the mechanism.

## Inspiration briefs

### Preset ladder with overrides
- **Why it works:** One tap picks a sensible quality tier; sliders stay for players who want more control.
- **Traits worth keeping:** named quality tiers; per-setting override underneath; a short help line per tier
- **Traits to change:** tiers named by device class (phone, tablet, desktop); auto-pick on first run from device specs; show an estimated frame cost next to each tier
- **Reference:** README.md (command list line for /setall and /overrideall, read in full)

### Detached inspect camera
- **Why it works:** Lets a player look at a fight from outside without moving their character.
- **Traits worth keeping:** toggle on and off; orbit around a point; return to chase view
- **Traits to change:** one-thumb orbit on phone; auto-frame the target when the mode is entered; a time limit on inspect mode
- **Reference:** SWGCommandExtension/FreeChaseCamera.h (class line read: class FreeChaseCamera; body not opened)

### Short-alias command set
- **Why it works:** Short aliases make the console fast for players who know it, and menus cover everyone else.
- **Traits worth keeping:** short and long alias pairs; a help command that lists all; a getter for each setting
- **Traits to change:** menus as the main path, console optional; our own verb set; no command that changes the match state
- **Reference:** README.md (command list, read in full)

### Nearby list with preview
- **Why it works:** A scrollable list with a preview lets a player find a target or item quickly.
- **Traits worth keeping:** scrolling list; one row per object; preview on select
- **Traits to change:** 2D icon rows on phone, 3D preview only on demand; group by object type; sort by distance by default
- **Reference:** SWGCommandExtension/CuiWidget3dObjectListViewer.h (file name in listing only; not opened)

### Read-only text readout hook
- **Why it works:** A script can return a few short values to a HUD line without changing game state.
- **Traits worth keeping:** read the current target; return short string values; reloadable script
- **Traits to change:** sandboxed, no calls that act on the world; our HUD bars rather than text; no automatic action logic
- **Reference:** assist.lua and client_lua.lua (both read in full)

## Cross-link to our cell topics
Camera: FreeChaseCamera.h (class declaration only). Zones: terrain detail and flora distance controls (README). Spawns and loot: none. HUD-UI: quality presets, command list, nearby-object list viewer, text readout hook. VFX: none (no effect assets in the repo). Animation: none. Sound: none.

## Not read or not verified

- All 19 .cpp files (names only)
- Bodies of the .h files except the class declarations named above
- SWGCommandExtension.VC.db (binary, not opened)
- ipch/ and .vcxproj and .sln files
- LuaBridge template internals
