# coding-horror-basic-computer-games: asset audit (AU010)

Root on VPS: /mnt/frankendom-donors/coding-horror-basic-computer-games/ (read-only, not copied)

## Licences (as the files say)
- Repo: The Unlicense. Root LICENSE line 1: "This is free and unencumbered software released into the public domain."
- No other licence file found by name search (only LICENSE).
- The original BASIC source has no licence stated in the repo. README line 14 says it was moved from vintage-basic.net, where Lyle Kopnicky normalised it.
- Per-game READMEs cite the 1978 book and say "Downloaded from Vintage Basic" (01_Acey_Ducey/README.md line 15; 19_Bunny/README.md line 7). The book's rights holder is not stated.

## Rights-holder status
Mixed. Original programs are credited to named authors: Bill Palmby for Acey Ducey (01_Acey_Ducey/README.md line 7); bunny.bas line 4 credits the book by Ahl. The book is linked (README line 5). The repo's own ports and wrapper text are maintained by the repo owner.

## Asset inventory
- No images, audio, fonts or models in the repo (0 PNG, JPG, GIF, SVG, WAV, MP3, OGG, TTF, ICO).
- Original BASIC source: 213 .bas files. Class C.
- Per-game README.md: 99 game folders plus the root README. Mixed: maintainer notes (class A under the Unlicense) and book-derived descriptions (class C). Not checked line by line.
- index.html (7.8 KB) and HOW_TO_RUN_THE_GAMES.md (5.4 KB). Class A (repo licence).
- Ports in many languages (cs, java, rs, py, js, rb, go and others): code, not counted as assets. Repo licence applies as the file states.

## Best class
A for the repo's own ports and wrapper text (Unlicense). C for the original BASIC source and book-derived prose.

## Inspiration (own words)
- Part-by-part creature reveal with dependencies (16_Bug/README.md line 5).
- Shy hidden creature on a small grid with hints (51_Hurkle/README.md lines 3, 5).
- A guesser that learns a new question after a miss (03_Animal/README.md line 3).
- A yearly ledger as a compact status screen (43_Hammurabi/README.md line 3).
- Centred title and publisher line on the title card (19_Bunny/bunny.bas lines 1-2).
- Known Bugs and Porting Notes sections as a content-doc template (Acey Ducey README only checked).

## Briefs (see .assets.json for full fields)
- Part-by-part beast (16_Bug).
- Hidden grid beast (51_Hurkle).
- Learning riddle spirit (03_Animal).
- Yearly ledger screen (43_Hammurabi).

## Cross-link to our cell topics
- vfx and animation: the part-by-part reveal can inform a creature build-up effect.
- spawns and zones: the hidden-creature grid is a small side-quest pattern.
- hud-ui: the yearly ledger screen and the centred title card are text-first UI references.
- camera, loot, sound: nothing in the repo; no audio at all.

## Receipts
Receipts: receipts.tsv in this folder (rows for BASIC; all verified with verify_receipts.py).

## Not verified
Listed in coding-horror-basic-computer-games.assets.json under not_read. In short: most READMEs and all but the first lines of the BASIC source were not read; the Super Star Trek game was not read beyond its history line; the book was not opened.
