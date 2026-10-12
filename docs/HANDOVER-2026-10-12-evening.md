# HANDOVER 2026-10-12 evening (donor-library dev, session "VPS server storage inventory")
Resume phrase from Dom: "pick up the donor-library handoff". Read this, then docs/HANDOVER-2026-10-12-final.md for the earlier state, then docs/PASS2-SUMMARY-2026-10-12.md. Dom wants SHORT PLAIN ENGLISH, delivered-vs-pending tables.

## 1. State in one table
| Track | State |
|---|---|
| Donor reading | DONE 766/766 groups, PLUS 24 new groups this evening (pass 2 on TR DR PR SK MG CT; new topics QU AI NW DT). Method: docs/wave2-pipeline/TOPICS-FOCUS5.md + PASS2-ADDENDUM.md (Strategy's). |
| Quality loop | DONE for every new-topic note: 70 (features) + 61 + 11 (pass 2) + 130 (older) all checked by Sonnet-medium and fixed. Totals: ~275 notes; 4 wrong in pass 2 (Showdown sleep, Duelyst, AzerothCore chat flood gate, Hedgewars braid), 3 wrong in older (Veloren boss summon, Barony skill gain, lincity-ng music). All fixed. |
| Backup | Mac = GitHub = VPS at 0f9f1a9 (receipts only on Mac + VPS). |
| Rulings list for Dom | Agent compiling docs/RULINGS-FOR-DOM-2026-10-12.md (urgent first, Strategy's order). Check it exists; commit it. |
| L40S graphics test | Job 6accea25134c60eb02606f1d launched 2026-10-12 18:09 (Dubai clock), flavor l40sx1, 4 assets a04 a07 a08 a10 (the L4 failures), ceiling 18 min = worst case $0.54 of ~$0.68. Was still WAITING for hardware at 18:23. Results go to private repo Domlynch/frankendom-asset-test results/l40s4/. A background watcher (/private/tmp/p2/watchjob.py) prints JOB_END. After it ends: python3 cost.py 6accea25134c60eb02606f1d, download results, render with render_glb.py on the VPS, update R8 with real seconds and dollars per asset, tell Dom in 5 lines. |

## 2. Dom's rulings tonight
1. L40S job: GO (after Strategy said yes and I aligned). Warm-up: cannot keep a machine warm on HF Jobs; script overlaps the weight download with setup, saves the JIT/autotune cache to the private repo (cache/l40sx1/), preflight trimmed (PREFLIGHT_LITE). Kernel cache cannot be built on CPU.
2. Strategy's view on the other items (recorded in docs/RULINGS-FOR-DOM and R7): nvdiffrast = look-dev only until swapped (pending Dom); CC0 and Unlicense permitted like MIT; OpenBW (no licence) = ideas only; 12 of the 15 design-brief questions = accept recommendations in one yes; launch target 1,000 players (Dom confirms), kids/age rule (Dom, legal), test box = VPS in a spare window.
3. Models: readers Haiku high, everything else Sonnet medium, never Opus (unchanged).

## 3. Still open
- Pathfinding internals, group tactics, replay formats of closed engines: no notes.
- Parity checklist has no rows for quests, trade, chat/names (Lead to add).
- No note compared with the real Frankendom code; target files are proposals.
- Some .json sidecars next to fixed notes still carry old text (W08 fixer did not edit them).
- The first 10 clean notes of round one lack their 'missed' lines.
- Dom still owes: L40S result review, the rulings list, nvdiffrast, kids/age rule, launch target.

## 4. Lessons this session
- Checkers can be wrong too: fixers must re-verify against donor code (two checker claims were rejected).
- Count notes by file, not groups ('MG013' is a group of three notes).
- Do not claim 'still running' from a missing result.tsv; check file activity.
- rsync -a overwrites by size/mtime in either direction: use --update when syncing working folder to repo (script /private/tmp/p2/backup.sh is volatile; recipe is in HANDOVER-2026-10-12-final.md section 6).
- Context was 600k+: start a fresh session after the L40S result is in.
