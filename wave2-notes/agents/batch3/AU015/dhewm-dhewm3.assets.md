# Asset audit: dhewm-dhewm3

Class: **C**. Source-only release: no game data, no creatures, levels, textures or sounds. Only UI and GUI-layout material to learn from.

## Licences (as the files say)
- Code: GNU GPL (`COPYING.txt` line 1), plus the Doom 3 GPL Source Code additional terms (`README.md` line 225) and an EXCLUDED CODE clause (`README.md` line 227).
- Dear ImGui and other third-party parts keep their own licences (`README.md` line 231 onward; the Dear ImGui section is MIT).
- Game data: "This source release does not contain any game data" (`README.md` line 48). The user patches from their own copy.
- Non-code files: no licence line of their own found (docs/img, neo/tools/Help, neo/sys/win32/rc/res, installer image).
- Installer folder: a Doom 3 limited use EULA (`neo/sys/linux/setup/image/License.txt` line 1). It is third-party text, not dhewm3's own licence.

## Rights-holder status (repo files only)
- Derived from id Software's Doom 3 GPL source release (`README.md` line 3).
- Game data is proprietary under its EULA (`README.md` line 48). The EULA names Id Software and Activision.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Game data | not in repo; `base/` holds 3 .cfg files | 0 game assets | D |
| GUI layout diagrams | `docs/img/` | 20 PNG and SVG | C |
| Editor help | `neo/tools/Help/` | 30 files including .htm pages and PNG icons | C |
| Windows icons and bitmaps | `neo/sys/win32/rc/res/` | 25 .ico, 17 .bmp, 12 .BMP | C |
| Installer art and EULA | `neo/sys/linux/setup/image/` | doom3.png, License.txt | C |
| ImGui fonts | `neo/libs/imgui/misc/fonts/` | 6 TTF | C (not checked per font) |

## Inspiration (own words)
- Doom 3 GUI scripting: menus, the PDA, HUD and in-world screens are written in a small script language, so layouts change without a rebuild (`docs/GUIs.md` line 3).
- Anchor sets per screen shape: windows pinned top-left, top, centre or side, with variants for 4:3, wide, high and letterbox (`docs/img/d3gui-cst-tl-wide.png`, `d3gui-cst-top-43.png`, `d3gui-example-16_9-letterbox.png`).
- Vector source for the same layouts (`docs/img/*.svg`).
- On and off icon pairs that differ in fill (`neo/sys/win32/rc/res/me_on_icon.ico`, `me_off_icon.ico`).
- View-mode strip: diffuse, specular, skeleton, triangles and similar (`neo/tools/Help/images/diffuse.png`, `specular.png`, `showbones.png`, `showtris.png`).
- Depth-fail stencil shadows, restored in dhewm3 1.5.1 (`README.md` lines 204 to 210). This is an effect technique, not art.

## Briefs (originals, not copies)
No creature, item or armour is in this release, so the briefs are UI and effect briefs.
1. **Anchored HUD layout kit** (own label). Keep: anchor set, one variant per screen shape, a letterbox test. Change: our grid and anchors (for example bottom-anchored panels). Ref: `docs/img/d3gui-cst-tl-wide.png`.
2. **On and off toolbar icon pair** (own label). Keep: two-state pairs at one size. Change: our metaphors; a colour or badge cue instead of fill alone. Ref: `neo/sys/win32/rc/res/me_on_icon.ico`.
3. **Artist view-mode strip** (own label). Keep: one icon per pass. Change: our pass names and icons; add a normals pass. Ref: `neo/tools/Help/images/showbones.png`.

## Cross-links
- hud-ui: anchored layouts and GUI scripting.
- vfx: the stencil shadow technique (code only).
- camera, zones, spawns, loot, animation, sound: no assets in this release.

## Not verified
- Image contents: names and counts only.
- The full Doom 3 EULA text (first line only).
- `neo/tools/Help` pages (titles only).
- Per-font ImGui licences.
- No `_RESTRICTED-NOTE.txt` in this donor.
