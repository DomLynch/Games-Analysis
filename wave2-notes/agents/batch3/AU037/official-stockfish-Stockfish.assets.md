# official-stockfish-Stockfish (asset audit, cell AU037)

Donor: Stockfish, a UCI chess engine. Tree: /mnt/frankendom-donors/official-stockfish-Stockfish/ (about 120 files on the VPS, read-only).

Code licence: GNU General Public License v3 (Copying.txt line 1; README line 110).
Asset licence: no game assets are in the box. The neural network is named in src/evaluate.h:36 and fetched by scripts/net.sh; README lines 59-60 say it is a separate file, embedded in binary builds. README lines 125-126 say the network is trained on Leela Chess Zero data under the Open Database License. The network file's own licence is not stated in the box. Not downloaded, not opened.
Rights-holder status: original open-source project. The source header names The Stockfish developers (src/uci.cpp:3). AUTHORS not read.
Best class: D. Nothing non-code is usable from the box. The network, if ever obtained, would be class C.

Half read: engine (movepick, timeman, engine option, evaluate.h, net fetch script) in part. Data pack: the network is not in the box. Client or UI: none, the engine speaks UCI. Paired donor in this batch: none.

## Asset groups
- Documentation: README, CONTRIBUTING, CITATION, AUTHORS, Copying. Class D.
- Credits list: Top CPU Contributors.txt. Class D, not reused.
- CI matrices: .github (20 files). Class D, not read.
- Network weights: not in the box. Class C if obtained.
- Images, audio, fonts, maps, models: none. Extension search for png, svg, wav, ogg, ttf, bin and nnue returned nothing.

## Inspiration (AI and budget logic; no visual content)
- Staged move picking: hash move, then captures, then quiets sorted by history with a good-quiet cut-off (movepick.cpp:282-296). For a fight AI: last working combo first, then highest value, then the rest.
- Two-tier time budget: soft target from remaining time times a scale (timeman.cpp:159), hard ceiling of 0.8097 of remaining time minus overhead (timeman.cpp:161). Maps to a per-decision AI budget and the per-tick NPC budget in row 18.
- Swappable evaluation data: an EvalFile option with a default name (engine.cpp:136; evaluate.h:36) and a hash check that deletes a bad file (net.sh:18-31). For a learned brain: version weights by hash, fall back when missing.
- Budget top-up: 25 percent of the soft budget is added in one branch (timeman.cpp:165). The branch condition was not read.
- Testing culture: the README says improvements need very many test games. For balance: run many headless simulated fights before a tuning change ships. Not receipted.

## Briefs
None. The donor has no creature, item, armour, zone or effect. Nothing here is class A or B.

## Not read
Search, evaluate, tt, nnue sources, syzygy, universal, tune, most of timeman and movepick, tests, CONTRIBUTING, AUTHORS, .github workflows, net.sh beyond its first functions.
