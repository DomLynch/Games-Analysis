# boardgameio-boardgame.io: asset audit (AU007)

- Code licence: MIT (LICENSE: MIT License, copyright (c) 2017 The boardgame.io Authors; package.json license field MIT)
- Asset licence: LICENSE covers the project; no separate statement for logos, docs text or images. Chess piece art (examples/react-web/src/chess/pieces) is credited in CREDITS as from a Wikipedia page and 'made available by its authors under BSD license'; the BSD text and author names are not in the repo.
- Rights-holder status (from repo files only): project copyright: The boardgame.io Authors (LICENSE); AUTHORS file lists contributors. Owners of the logos and of the chess art are not stated beyond the CREDITS line.
- Best class: C

## Asset groups

| kind | path | count hint | licence | class | note |
|---|---|---|---|---|---|
| chess piece art | examples/react-web/src/chess/pieces/ (pawn, rook, knight, bishop, queen, king .js files, drawn as SVG paths) | 6 pieces, 2 colours each | BSD per CREDITS; BSD text and variant not in repo | C | credit names a web page as source and gives no licence text, so treated as unclear; path data not reproduced |
| logos | docs/logo.svg, docs/logo-optimized.svg, docs/favicon.png | 3 files | not stated (SVG has no licence metadata) | C | project brand marks; not opened beyond SVG header |
| app icons and splash | examples/react-native/logo.png, examples/react-native/assets/icon.png, examples/react-native/assets/splash.png | 3 PNG files | not stated | C | not opened |
| stylesheets | examples/react-web/src/*.css, tic-tac-toe/board.css, redacted-move/board.css, secret-state/board.css, simulator.css, lobby.css, threejs/main.css, docs/index.css, docs/documentation/theme.css | CSS files (listing; not counted) | MIT header in files read | A | plain layout CSS; no images or fonts referenced in the files read |
| docs text | docs/documentation/*.md (listing), roadmap.md, CHANGELOG.md, README.md | 45 files under docs/documentation incl. snippets (listing) | not stated separately | C | text documentation; read only the README and the project tour names |
| generated doc bundles | docs/documentation/snippets/*.js and *.css (hashed names) | 17 bundle files (listing) | not stated separately | C | build output of the docs site; not read |
| code and examples | src/, packages/, examples/, python/, integration/ | source files (not counted) | MIT | A | code only; no audio, models or fonts in the repo |

## Inspiration (own words)

- Two-tone pieces with an inlay: each chess piece is one filled silhouette with a second, inset detail shape in the opposite colour, and no outlines. Recreate with flat two-colour fills so pieces read at small sizes.
- Board drawn from data: the board is built from row and column counts with lettered columns and numbered rows, two cell tones, and a highlight map. Recreate: coordinate labels and highlight overlays on our own tactical grid.
- Glide between cells: a moving piece blends from its origin to its target with a cubic ease-in-out over a fixed duration. Recreate with our own easing and an optional small arc lift.
- Hidden information as a plain panel: the secret-state example shows hidden data in a flat grey box with padding and no detail. Recreate as a fog panel that signals hidden information without showing it.
- Time travel over history: the project describes logs that let a player step back to earlier board states. Recreate as a turn scrubber in our combat replay; the doc pages were not read.
- Minimal three-dimensional board: nine cubes on a white background as a three.js demo. Low visual value, but a clean way to test a grid in 3D.

## Inspiration briefs

1. **Inlay piece set**
   - why it works: flat two-colour shapes with an inverse inlay read clearly on a warm board
   - traits worth keeping: silhouette first; inverse inlay detail; flat fills with no outline
   - traits to change: our own ornaments (faceted crest or rune-like glyph); a slate and bone palette; different head and limb proportions
   - reference: /mnt/frankendom-donors/boardgameio-boardgame.io/examples/react-web/src/chess/pieces/knight.js (line 18 shows the two-colour logic; path data not reproduced)
2. **Eased glide token**
   - why it works: a blend with an ease curve makes a move feel physical rather than a jump
   - traits worth keeping: cubic ease-in-out over a fixed duration; interpolation from origin to target
   - traits to change: add a small arc lift and a ground shadow; our own duration and curve
   - reference: /mnt/frankendom-donors/boardgameio-boardgame.io/examples/react-web/src/chess/token.js (lines 222 to 234)
3. **Fog panel**
   - why it works: hidden information shown as a neutral panel says hidden without giving it away
   - traits worth keeping: flat neutral tile for hidden data; padding and plain labels
   - traits to change: card backs or hatching in our art style; a small lock glyph
   - reference: /mnt/frankendom-donors/boardgameio-boardgame.io/examples/react-web/src/redacted-move/board.css (line 13)
4. **Lettered board frame**
   - why it works: lettered columns and numbered rows make a board easy to call out in chat or on a radio
   - traits worth keeping: letter and number labels around the grid
   - traits to change: our zone or sector labels instead of chess coordinates
   - reference: /mnt/frankendom-donors/boardgameio-boardgame.io/examples/react-web/src/chess/checkerboard.js (props comment, line 25 area)

## Not read or not verified

- Docs pages under docs/documentation (names only; the tour and undo pages were not opened)
- Generated bundles under docs/documentation/snippets
- Logos and app icons (sized by listing only; SVG header read for logo.svg)
- Chess piece paths other than the knight fill logic
- Tests and python bindings (listed, not read)
- Only four briefs: the donor has no creature, armour or zone art, so the set is about board and piece design
