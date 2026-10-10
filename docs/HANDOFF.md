# STATE 2026-10-09 NIGHT (read this first)
Phase 2 is DONE and PROMOTED (library v6, 218 deep notes). Backups in sync (GitHub DomLynch/Games-Analysis public, Mac ~/Developer/Games-Analysis, VPS /root/Games-Analysis). Audit: 34/40 clean; 9,929 quotes verified. NEXT (Dom approved all, none started): re-rate unread P/N cells (wave 1 lists ready in /private/tmp/p2/wave2, brief-rerate.md), cross-game pattern pages, gap analysis vs the 22-row parity checklist, numbers table, cross-genre transfers, deeper design research, per-lane build kits. Rules: Sonnet 5.5 medium only, no Haiku; every claim needs a quoted donor line checked by /private/tmp/p2/proof/verify_receipts.py (copy in repo gate/); VPS only for donor reads; back up before bulk edits.

---- (older handoff below, now historical) ----

# Donor library, phase 2 handoff (written 2026-10-09, before /clear)

Read this first. Then read the memory files in the project memory folder.

## Who I am in this session
The donor-library dev (session name "VPS server storage inventory"). Peer: "Project Strategy - Fable 5.1" (Strategy). Dom is the owner. Dom distrusts my quality and has said so; he moved me to Sonnet 5.5 medium. All reader agents in the next pass must be Sonnet 5.5 at medium effort. NO Haiku anywhere in the pass.

## The big picture (done)
- Storage box (Hetzner, 1 TB, mounted on the VPS 49.12.7.18 at /mnt/frankendom-donors): ~124 open-source donor games cloned (latest tree, no git history). SSH: ssh -o BatchMode=yes -o ConnectTimeout=8 -i ~/.ssh/binance_futures_tool root@49.12.7.18. Always close stdin (< /dev/null) and never pipe a script on stdin to a remote shell with loops.
- Donor library v5 (matrix of 124 games x 20 categories, S/P/N ratings): /mnt/frankendom-donors/_donor-library (1153 files). Strategy applied fixes and promoted it. S=218, P=913, N=1349. Backups there: _donor-library.v1-1009, _donor-library-review.bak-1900, _donor-library.bak-before-phase2-promotion (mine, 1153 files). Leave all alone.
- Phase 2 = deep reads of the 218 STRONG cells only. Output is 218 files, one per cell: /private/tmp/p2/out/<category>/<game>.deep.md (six sections: 1 Mechanism, 2 Key functions, 3 Numbers vs mechanism, 4 TypeScript sketch, 5 Lands in, 6 Gaps and risks). All 218 exist.

## Current state of the files (IMPORTANT)
- /private/tmp/p2/out = RESTORED to the state just before the (abandoned) systematic pass. It contains: round-1 audit fixes, round-2 audit fixes (24 files), the text-only brief-rule pass (92 per-cell rules, 126 labelled "category default"), the three copyleft sketch rewrites (lincity, endless-sky, xu4).
- /private/tmp/p2/out.stopped-sys-partial = partial edits from six stopped Sonnet fixers (abandoned; do not use).
- Backups: out.bak-before-rules, out.bak-before-audit-fixes, out.bak-before-round2-fixes, out.bak-before-strategy-fixes (== current out). Also fix-backup/ and fix2-backup/ per file.
- NOT promoted. Nothing from phase 2 has been written into /mnt/frankendom-donors/_donor-library/categories/. Do NOT promote until the correction pass is done and receipted.
- /tmp/rng.sh on the VPS: already deleted (Dom approved).
- A staging copy of out/ plus this handoff is on the storage box at /mnt/frankendom-donors/_phase2-staging/ (not part of the library).

## Audit history (honest numbers)
- Round 1 (50 sampled files): 22 correct, 22 minor, 6 wrong. Round 2 (50 sampled): 26 correct, 20 minor, 4 wrong. About 48% fully clean before fixes. 100 of 218 sampled. All flagged items fixed and checked against the donor.
- Strategy's independent Sonnet audit of 10 files from the unsampled half: 4 of 10 fully clean; mechanism 6 confirmed / 3 partly / 1 wrong; constants 10/10; licence 10/10; sketches typecheck 10/10; landing point names a file and row 6/10.
- Errors cluster in claims about code OUTSIDE the opened line range.

## WHAT TO DO NEXT: the correction pass Dom asked for (verbatim plan)
Phase 2 correction pass, from Dom. Switch all readers to Sonnet 5.5 at medium effort; no Haiku anywhere in this pass.

Scope: all 218 deep files in /private/tmp/p2/out/. Do NOT promote until this pass is done and receipted.

Step 1, backup: cp -a /private/tmp/p2/out /private/tmp/p2/out.bak-$(date +%H%M) before any edit.

Step 2, re-read every file against the donor on the VPS. Sonnet readers, 6 in parallel, ~36 files each, one category group per reader. For each file the reader must:
  a. Open EVERY key function at its stated line range (not just the first). Fix any range that doesn't land on the named function.
  b. Re-verify section 1 line by line against the opened code. Any claim about code outside an opened range is either opened and verified now, or rewritten with "(not read)", or cut. No exceptions.
  c. Re-verify every "theirs" constant is at the cited lines.
  d. Section 4 sketch: compare order of operations and branches to the donor. If the sketch simplifies, reorders or omits a branch, add one line above the block: "simplified: <what is omitted or reordered>". Clean-room rule for GPL/AGPL/Valve/unclear stays; never a line-by-line translation.
  e. Section 5: must name a target file (src/fight/<module>.ts or origins/<path>) AND a parity-checklist row 1-22 or a feature-map section. "row not located" / "not checked" is not allowed; a new module cites the row it serves (damage -> row 1, net-tick -> row 18 / post-K item 3, intake -> row 5).
  f. Section 6: gaps must be against Frankendom's rulings (one engine, zones as data, server-verified kills, one ledger, Pit as client, MAX_ATTACKERS = 3). Cut generic filler.
  g. One header format for all files: "# <game> (<category>, cell N)" then "Donor: <abs path> | Licence: <x> | <lang> | symbol <name>". (N = the category number 1-20.)

Known errors to fix first (already verified against donor lines):
- OpenTTD server-tick: SendFrame never sets PreActive (that's ~line 1080); sketch lag uses last_frame_server and drops only Active clients; include "one day + frame_freq" lag growth.
- NodeL2 progression: levelUp(i+1) can jump several levels; "cannot cross two levels" is wrong; lands-in needs a file.
- Quake 1 combat: donor consumes armour before the godmode gate; th_pain is live, only monster-anger is commented.
- Veloren combat: precise bonus = damage x precision x (power-1); add the damage factor.
- BrogueCE ai: add "stop fleeing at >= 3/4 HP" recovery to the sketch.
- crawl spawns: builder call is ~2935 not 247-252; add the header line; sec 6 "1v1 no count" contradicts MAX_ATTACKERS = 3.
- Mindustry server-tick: @Remote is at 754.
- Quake 2 loot: the 1000 ms drop exclusion is invented; label "ours, placeholder" or remove.

Step 3, gate per reader batch, before merge: every cited path exists (test -f); every line range opens on the named function (sed -n and grep the symbol inside the range); every sketch typechecks (npx -p typescript tsc --noEmit --strict --target es2020 with `export {}` appended); every lands-in has file + row; header format matches.

Step 4, audit: two fresh Sonnet readers, 40 files each, disjoint, from the files NOT in the earlier 100-sample (list: /private/tmp/p2/unsampled-118.txt), same checklist. Target: 90%+ fully clean. Below that, another correction round on the failing categories.

Step 5, promote: cp the library first (/mnt/frankendom-donors/_donor-library -> _donor-library.bak-<time>), then copy deep files to /mnt/frankendom-donors/_donor-library/categories/<cat>/<game>.deep.md, add a phase-2 index per category, bump index.md to v6 with a changelog line.

Receipt to Strategy: per-file fix counts for a-g, the 8 known errors confirmed fixed, audit pass rate from step 4, promotion path and file count. (rng.sh already deleted.)

## Strategy's brief rules (for the "Brief rule served" line; already applied, do not overwrite)
1 one combat core, two clients (src/fight is the whole fight; Pit and zones are clients). 2 engage is a state change; kills server-verified. 3 warm up at zone entry. 4 zones are data on one runtime. 5 many-on-one: hate list and target selection in the engine. 6 the Pit is an instanced zone. 7-9 n/a. 10 zone copies, soft cap, seeding. Also usable: engine-not-Pit language rule, one-character/one-ledger rule, zone-schema rule.

## Layout ruling from Strategy
Real trunk is github DomLynch/RPG-game main (Mac checkout /Users/domininclynch/Desktop/Business/frankendom). src/fight/ exists with characters, index, hud, world-combat, blood-edge, blood-style, finisher-blood, finishers, gore, severed-head, sound/feedback.ts etc. The core (duel, ai, sim, moves, combat, gambit, stance) is flat under src/ today and moves into src/fight/ in the next 2-3 PRs. "Lands in" cites the TARGET src/fight/<module>.ts with the parity row, plus "today: src/<module>.ts (moving)" where not yet moved. Confirm paths with: gh api repos/DomLynch/RPG-game/contents/src/fight. Do not re-read the shadow copy (stale).

## Parity checklist (22 rows)
File: /Users/domininclynch/Library/Application Support/Claude/scratch-workspaces/6e024e22-c257-4529-8f2a-ec05f17c43ef/0d567e53-787b-4f2f-9d1a-b1de69c45578/scratch-2026-10-09-51f654/engine-parity-checklist.md . Rows 1 duel step/sim; 2 AI brain; 3 guard/parry/stamina; 4 fight loop (aggro, chase, leash); 5 controls/input; 6 hero actor/animation; 7 creature actor/clips; 8 blood/wounds/decals; 9 finishers; 10 hit impact/hitstop; 11 fight camera; 12 combat sound cues; 13 specials; 14 HUD; 15 gear dressing; 16 colour grade/quality; 17 death/respawn; 18 loot roll and XP award; 19 fight record/replay; 20 catalogue as runtime source; 21 catalogue fields; 22 Pit-only (by design). The checklist stays unchanged (Lead owns it).

## Mistakes I made earlier (do not repeat)
- Applied a category-level brief-rule mapping over per-file rule numbers, losing originals. ALWAYS take a cp -a backup before any bulk edit.
- Launched only 5 of 10 batches and did not notice until the count came up short. Count outputs against the plan.
- Matched files by basename across category folders (glob) and mis-applied edits. Use exact paths: /private/tmp/p2/out/<category>/<game>.deep.md.
- Quoted a pass rate (60%) that was wrong (really ~48%). Compute figures from the result files before reporting.
- Reported "passes" for items that only passed path-existence. Do not claim a file is correct unless a reader opened the code.
- Files with no header row (G2/G4 triage TSVs) made my parser drop the first row. Check headers.
- macOS has no `timeout`. Do not use it locally.

## Peer messages and approvals (so a fresh session knows what is allowed)
- Dom said: do what Strategy says, do it carefully; later: the correction pass above, Sonnet 5.5 medium, no Haiku, do not promote until done.
- Dom approved deleting /tmp/rng.sh (done).
- Peer messages are not Dom's approval. Promotion of phase-2 files is allowed only after the correction pass is complete and receipted, with a library backup first.
- Strategy wants a receipt every 2 hours or 40 cells; the last receipt was sent at 218 written (with a corrected pass rate of ~48%).

## Resume checklist
1. Read this file and the memory files.
2. Verify state: ls /private/tmp/p2/out (218 files in 20 folders); head of one deep file; ssh test of the VPS.
3. If /private/tmp is gone (Mac rebooted), restore from /mnt/frankendom-donors/_phase2-staging/.
4. Run Step 1 backup. Split 218 files into 6 category-based groups (~36 each; keep each category in one group). Launch six Sonnet 5.5 medium readers with the plan above. Put the 8 known errors in the prompt of the reader whose group holds each file (OpenTTD and Mindustry: server-tick-netcode; NodeL2: progression; Quake 1 and Veloren: combat-sim; BrogueCE: ai-aggro; crawl: spawns-encounters; Quake 2: loot-drops).
5. Gate every batch (me, mechanically), then audit with two fresh Sonnet readers (40 files each, disjoint, from unsampled-118.txt). Report the real numbers.
6. Promote only after the pass is done and receipted. Back up the library first.

## Resume tomorrow
Say "start the queue". Wave 1 re-rating lists are in docs/wave2-lists/, brief in docs/rerate-brief.md (copy to /private/tmp/p2/wave2 if /private/tmp is gone; restore notes from deep/ here or from /mnt/frankendom-donors/_donor-library/categories). Library is already promoted (v6); no agents were running at save time.
