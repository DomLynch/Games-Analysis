# Asset audit: dereth-network-dereth

Class: **A** (own art, MIT by the repo-wide line; fonts under OFL). The launcher paintings are class C.

## Licences (as the files say)
- Code: MIT for everything outside `empyrean/` (`LICENSE` line 3; `README.md` line 215). `empyrean/` is AGPL-3.0-only (`empyrean/LICENSE` line 1).
- Assets: no separate asset licence file. The repo-wide MIT line covers the art outside `empyrean/`. Fonts: SIL OFL 1.1 (`dereth/launcher/assets/fonts/OFL-Cinzel.txt` line 3; `dereth/client/crates/classic-fonts/fonts/SOURCES.txt` line 1).
- Retail game data: not shipped (`README.md` line 15).

## Rights-holder status (repo files only)
- Independent project. `README.md` line 5 calls it a from-scratch reimplementation. Line 219 disclaims affiliation with Microsoft, Turbine or any current rights holder.
- Launcher paintings: no creator named in the files.

## Asset inventory
| Group | Path | Count / size | Class |
|---|---|---|---|
| Horizon HUD atlases and glyph pages | `dereth/client/crates/horizon/pieces/` | 9 PNG (2048 and 4096 px atlases, 2048 px glyph pages), manifest.json, fonts.json | A (own art, `horizon/README.md` line 13) |
| Launcher background paintings | `dereth/launcher/assets/background/` | 10 PNG, about 1867 x 842 px each | C (no creator; file names name AC locales and creatures) |
| Classic-portal pictures | `core/client-runtime/assets/classic-portal/` | 7 PNG at 32 x 32, 2 at 34 x 27, layer.dat, pack.tsv | A (`pack.tsv` line 1: "Dereth's own records") |
| Fonts | `dereth/launcher/assets/fonts/`, `dereth/client/crates/classic-fonts/fonts/` | Cinzel, EB Garamond (launcher); 5 Liberation TTF | A (OFL) |
| App icons | `dereth/client/assets/`, `empyrean/server/assets/` | 256 px PNG, .ico, icon bundles | A (client), B (empyrean, AGPL) |
| Recorded traffic fixtures | `fixtures/packet-captures/`, `fixtures/message-corpus/` | not counted | C (`fixtures/README.md` line 3: recorded between the retail client and a local ACE server) |
| Retail DAT data | not in repo | 0 | D |

Totals: 5101 files in the tree; 30 PNG; 1 `.dat`; no audio files and no 3D model files found.

## Inspiration (own words)
- Launcher look: a wide painted vista (about 2.2:1) behind dark glass panels with a thin gold rule, shown with pixelated scaling. (`dereth/launcher/README.md` lines 174 to 181.)
- Two-register UI: chunky pixel-grid buttons and a main action plate against plain serif type. (`dereth/launcher/README.md` line 176.)
- Window frame kit: corner, edge and fill pieces packed at 1x, 2x and 3x so frames stay crisp (`horizon/pieces/manifest.json`).
- Slot icons on one flat dark ground: any transparent pixel reads as the empty slot; a manifest tells the packer where each picture goes (`classic-portal/pack.tsv`).
- Lit and unlit pairs for a book icon (`journal.png`, `journal-lit.png`).
- Three-hue sigil set (`sigil-red.png`, `sigil-blue.png`, `sigil-yellow.png`) for categories at a glance.
- Nameplate colour key in the Horizon HUD (`horizon/README.md`, table of how game concepts are drawn).

## Briefs (originals, not copies)
1. **Three-hue sigil charm set** (own label). Why: 32 px badges in three hues; a lit and unlit pair shows state. Keep: small silhouette, one hue per category, lit pair. Change: our own emblem shape and palette. Ref: `core/client-runtime/assets/classic-portal/sigil-red.png`.
2. **Wide painted vista behind glass panels** (own label). Why: a calm wide painting lets panels sit over open space. Keep: letterbox painting, dark translucent panels, thin gold rule. Change: our own subject and palette; no locale names in file names. Ref: `dereth/launcher/assets/background/wilderness.png` (not viewed).
3. **Three-scale window frame kit** (own label). Keep: named corner, edge and fill pieces at 1x, 2x, 3x. Change: our bevel and ornament. Ref: `dereth/client/crates/horizon/pieces/manifest.json`.
4. **Three-hue nameplate key** (own label). Keep: three hues for three roles. Change: other hues plus a shape cue for colour-blind players. Ref: `dereth/client/crates/horizon/README.md`.

## Cross-links
- hud-ui: Horizon atlases, classic-portal icons, nameplate key.
- camera, zones, spawns, loot, vfx, animation, sound: no art or audio in this donor that bears on them.

## Not verified
- Rust sources (only layout and names checked).
- Binary PNG content: only sizes from headers; no image viewed.
- `empyrean/THIRD-PARTY-LICENSES.html`, EB Garamond OFL body, `fixtures` counts, `dereth/web`, `tools/`, `core/text`.
- No `_RESTRICTED-NOTE.txt` in this donor.
