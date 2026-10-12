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

## 6. FINAL STATE 2026-10-12 night (supersedes the in-flight row in section 5)
Wave-4 quality batch is DONE: 78 notes (1 in 4 of HU IV QD ID VF RP) checked: 42 clean, 35 minor, 1 wrong (Wesnoth QD020, rewritten); all fixed, 8 fixers, sketches typechecked on the VPS. Error rate below the widen trigger, so no widening. Tokens for the batch about 2.4M (checkers about 1.6M, fixers about 0.8M). Backup: Mac = GitHub = VPS at 3a54998 (check git log -1), receipts only on Mac + VPS.
Everything asked is complete except: (a) wave-4 notes outside those six topics (AU DC OB AC AR and the feel topics, about 600 notes) are NOT quality-checked; (b) Dom answers the 19 rulings in docs/RULINGS-FOR-DOM-2026-10-12.md ('accept all' or changes); (c) the graphics test is with another dev (docs/ASSET-PIPELINE-HANDOVER-FOR-NEW-DEV-2026-10-12.md); (d) .json sidecars of some fixed notes carry old text.
No agents are running. Safe to clear.

## 7. Late-night update 2026-10-12 (read this first after a /clear; supersedes section 6 where it differs)
Everything is committed. Last commit before this section: bf93957. No agents are running. Dom said "I'm going to clear you now".
| Track | State |
|---|---|
| Build list | docs/BUILD-LIST-FROM-AUDIT-2026-10-12.md: 72 items. Ranked by Strategy + Lead. **HELD by Dom** ("hold off on the build lanes for now because I want to review it"). No slice packs written, nothing handed to build lanes until Dom lifts the hold. Order of record (Lead): B1 ‖ B2 -> B3 -> B4 -> B13; B8 -> B5 -> B6 -> B7 -> B10 -> B9; B72 anywhere. Strategy top 10: B1, B2, B4, B6, B8, B7, B9, B10, B72, B13; next B16, B11, B22. Layer tags are a guess and need correcting when ranking. |
| Top 50 | docs/TOP-50-LEARNINGS-FINAL-2026-10-12.md (reviewed by Strategy + Lead). Draft with donors: TOP-50-LEARNINGS-2026-10-12.md. |
| Top 70 | docs/TOP-70-LEARNINGS-2026-10-12.md (Strategy and Lead both said 70, not 100). Phone text first, then donors, licence tier, ease (15 easy / 39 medium / 16 hard). Phone text was pasted to Dom. Entry 48 (music) needs Dom's go because music is parked. "27 of top 50" = code-ports count (27 with a tier-A donor, 19 B/C only, 4 unclear), not an overall count. |
| Licence tiers (per part) | A permissive (MIT/Apache/BSD/CC0/Unlicense/zlib): code may be ported to TypeScript through our own row shape, own tests, notice kept. B copyleft (GPL/AGPL/LGPL/CC BY-SA): ideas only, clean-room. C (no licence, non-commercial, leaked, rips, CC BY-NC): ideas only. Art/data/code are tiered separately; unstated = C. |
| Asset rules (relayed by Strategy, Dom's words not heard directly) | L4 Tier C resemblance 30-40%. L5 name rule: no donor names/places/factions/spells/items/lore, even respelled (product rule, NOT legal advice; confirm with counsel). L6 recolour rule: gritty palette; ours/Tier A can be recoloured/resized/renamed; Tier B/C donor mesh is reference only, rebuild via FLUX -> TRELLIS -> Blender with zero shared geometry/textures. L6 depends on L3. |
| Rulings | docs/RULINGS-FOR-DOM-2026-10-12.md: 141 ruled by Strategy; 17 of Dom's 19 answered by Strategy + me under Dom's delegation. Pending Dom: B2 (kids/age: conservative default, pending legal review) and L3 (nvdiffrast: look-dev only). Superseded by Dom's older written rules (closed, Dom may reopen): U6, U38, U41, U42, S5 (no death penalty, no gear loss, no gain by use, barter-only trade). U1/U2/U12 dormant (market off). |
| Pending for Dom | Review top 70; ~~music go/no-go (entry 48)~~ DECIDED 2026-10-12 (L3 RULED by Dom 2026-10-12: keep using nvdiffrast now; his accounts/advisors said fine; if the game succeeds we redo affected assets with a clean route (Blender bake / permissive rasteriser) or license it; no counsel check, no NVIDIA inquiry now; every asset made with it is tagged "nvdiffrast" in its licence record so a redo is a list, not a hunt; Claude has not verified the advice, this is Dom's business call) (also: Dom says ignore entries 71 and 72 unless a need appears; Dom's reply on B2 kids/age was "18+", counsel still to confirm): Dom says music is important, entry 48 stays in the top 70 and music is unparked (originals or free-to-use only; no build until the hold lifts); confirm L4/L5/L6; counsel review (B2, name and resemblance rules); L3. Strategy was asked to send Dom a one-line note on music and superseded rulings; NOT confirmed sent. |
| Token rule | Strategy: Sonnet medium, max 8 agents per batch, one batch at a time, report tokens per batch. Never Opus. |
| Graphics | With another dev (docs/ASSET-PIPELINE-HANDOVER-FOR-NEW-DEV-2026-10-12.md). About $0.68 HF budget left. |
| Still open | About 600 wave-4 notes (AU DC OB AC AR, feel topics) not quality-checked; no notes on pathfinding internals, group tactics, closed-engine replay formats; parity checklist lacks quest/trade/chat rows; stale .json sidecars. |
Resume: say "pick up the donor-library handoff". Wait for Dom's review. Do not hand anything to build lanes or write slice packs until Dom lifts the hold.
