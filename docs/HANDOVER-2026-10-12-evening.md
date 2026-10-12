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

## 5. UPDATE late evening 2026-10-12 (read this first after a /clear)
Everything below is committed; Mac = GitHub = VPS at 5c6e23c (check `git log -1`).
| Track | State |
|---|---|
| Reading | 790 groups done. |
| Quality loop (Sonnet-medium checkers + fixers) | Done and fixed for every note of the 26 first-loop topics + QU AI NW DT + pass 2 (about 275 notes; 7 wrong notes, all fixed). Waves 2-3 were checked in earlier sessions. |
| Gap-check vs real Frankendom code (docs/gap-check/) | DONE for every topic: 51 files (26 earlier + 25 new: QU AI NW DT ET ZW PG Q QC HU IV ID VF RP OB AC AR AU DC CG HF WE WF SE EN). Frankendom checkout read-only at ~/Developer/frankendom-lead-catalogue commit 517b32248. Biggest findings: nothing runs a zone (spawn director, respawn, travel); metal currency designed but not wired; no music/ambience at all; world camera is 10 inline lines and the repo says camera is frozen; duels use rollback + replay verifier (no live server intake, so input-queue and lag-comp rulings apply only to a future live intake). |
| Rulings | docs/RULINGS-FOR-DOM-2026-10-12.md: 158 decisions; 139 marked 'ruled by Strategy 2026-10-12'; 19 are Dom's (listed at the top, recommendation beside each: say 'accept all'). |
| Graphics test | CANCELLED (L40S never got a machine in 19 min, $0). Handed over: docs/ASSET-PIPELINE-HANDOVER-FOR-NEW-DEV-2026-10-12.md. |
| IN FLIGHT when this was saved | WAVE-4 QUALITY BATCH: 8 Sonnet-medium checkers V01-V08 on 78 notes (1 in 4 of HU IV QD ID VF RP notes that have no checker block). Samples: /private/tmp/p2/checker/V0x/sample.tsv, reports: /private/tmp/p2/checker/V0x/report.tsv (volatile /private/tmp). |

### If the session was cleared before the batch returned
1. `ls /private/tmp/p2/checker/V0*/report.tsv`. Reports that exist are valid; relaunch only the missing ones (same prompt: 'Your id is V0N. Read /private/tmp/p2/checker/CHECKER-PROMPT.md and follow it exactly. Your sample file is .../V0N/sample.tsv. Write .../V0N/report.tsv. Donor code read-only over ssh. Do not edit notes.'). If /private/tmp/p2 was wiped, rebuild samples: every 4th note without a 'Checker findings' block in wave2-notes/agents/batch3/{HU,IV,QD,ID,VF,RP}*/out/*/*.deep.md; CHECKER-PROMPT.md is docs/wave2-pipeline/tools/CHECKER-PROMPT.md.
2. Tally verdicts from the report files (column 2). If more than half are MINOR or worse, widen to all remaining notes of those topics; else run fixers (Sonnet medium, one per report, re-verify against donor code, append the 'Checker findings' block and a 'Fixed' line, edit repo notes directly) and back up.
3. Back up: sync with rsync --update (never plain -a), run the leak check (`git diff --cached --name-only | grep -iE 'receipt|__pycache__|\.tmp$'` must print nothing), commit with the Co-Authored-By line, push, VPS `git pull --ff-only`, rsync receipts to the VPS.

### Standing rules added tonight
- Strategy's token-burn rule: Sonnet medium, at most 8 agents per batch, no second batch before the first returns, report tokens per batch. (Tonight I broke it with batches of 13/13/9/20; approximate tokens: older-note checkers 3.0M, their fixers 1.6M, gap-check about 3.5M.)
- Dom wants: all of it done properly; check with Strategy; tell him if Strategy disagrees. Strategy had no objection (message 18:4x).
- Still open: wave-4 notes outside the 6 topics (AU DC OB AC AR feel topics) unchecked; pathfinding internals, group tactics, closed-engine replay formats have no notes; parity checklist lacks quest/trade/chat rows; some .json sidecars carry old text.
