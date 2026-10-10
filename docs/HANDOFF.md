# STATE 2026-10-10 EVENING (READ THIS FIRST)
**Done:** ALL reader groups finished (Q001-Q075, QC001-QC025, U001-U009 Ultima Online full pass, V001-V014 MMO servers/clients, D001-D004 DAoC RvR + RustDAoC client). ~400 cells, ~89% STRONG. Independent Sonnet checks: 183 notes (80 sample + 103 legend-game pass): 76 clean, 107 minor, 0 wrong; all minor errors corrected and re-typechecked (checker findings appended at the bottom of each note; reports in wave2-notes/checker/). Receipts are NEVER in the repo (private: ~/Developer/Games-Analysis-receipts, VPS /root/Games-Analysis-receipts). Quality gate = .quality-gate.json.
**New rule (Dom):** keep the idea, fix the donor defect; never reject a mechanism for a legacy bug (docs/wave2-pipeline/BRIEF-ADDENDUM.md + memory feedback-fix-donor-bugs-keep-idea).
**Donors added to the box** (/mnt/frankendom-donors): UO (ModernUO, ClassicUO), RuneScape clients, roBrowser+Ragnarok clients, WoW clients/servers, EQ OpenEQ/LanternEQ, SWGEmu Core3, SWG leaked source (restricted, shape only; client-tools/src/dsrc cloning), ACE, OpenAC/dereth, AAEmu, DAoC (RustDAoC, daoc-web), many more; clone logs /tmp/clone5-8.out on the VPS. Restricted donors have _RESTRICTED-NOTE.txt. Tibia server leak (fusion32/tibia-game) is DMCA'd: do NOT hunt for mirrors.
**Research reports** (R1-R5): docs/research/. They list more clients to clone and read (camera cells not yet made for: dereth, Iris2, EQ clients willeq/eq-client/eqoxide/eqsage, l2-unity, Lineage2JS, opensro, RagnarokRebuildTcp, MU clients, Maple clients, SWG client-tools, AOReloaded, WoWdot, WowUnreal, DynamicCam, RoR-Interface, AC2D, Shadowbane viewers).
**In flight at save time:** Sonnet-medium brainstorm agent on the WORLD CAMERA (Opus run was stopped: wrong model) (output /private/tmp/p2/brainstorm/camera-brainstorm.md; digest builder used sidecars: best_idea, decision, gaps, checker). Plan: same brainstorm per topic (spawns, aggro, combat, loot, progression, tick, parties).
**Drafts:** docs/patterns/spawns-row23-DRAFT.md (row 23: only SWGEmu Core3 has despawn-on-empty with a re-checking grace timer). Camera pattern page not yet written (needs brainstorm output). Lead must add a WORLD camera parity row and a capture-point (RvR) row.
**NEXT:** 1) read the camera brainstorm, write the camera pattern page + 3-5 switchable presets for Dom's phone; 2) camera/combat reads on the newly cloned clients (make cells QC026+); 3) brainstorm per other topic; 4) rewrite 'reject'-for-defect decisions as idea+fix; 5) pattern pages to Lead (spawns, camera); 6) ask Dom before the other 13 topics (~2,000 cells); 7) commit, push (git add wave2-notes docs), VPS git pull --ff-only, receipts rsync.
**Licences to rule (shape-only until then):** Sustainable Use License, NetHack NGPL, OpenBW, Doom (mixed), restricted leaks.
**Agents:** Haiku 5.5 high = readers; Sonnet 5.5 medium = checkers/fixers/research; Sonnet 5.5 medium also does brainstorm/synthesis. NEVER use Opus or any other model (Dom ruling 2026-10-10: only Haiku high or Sonnet medium). Cap 20 concurrent agents. Local verify_receipts.py must run from the Mac (it ssh's to the VPS).

# STATE 2026-10-10 DAY (READ THIS FIRST; older blocks below are history)

**UPDATE 2026-10-10 11:30:** history SCRUBBED with git filter-repo (receipts*.tsv removed from every commit) and force-pushed; main is now cc2702f on GitHub, Mac and VPS (old SHAs changed). Pre-scrub bundle: ~/Developer/Games-Analysis-pre-scrub.bundle (contains the receipts; keep private). 15 Haiku agents relaunched: Q001 Q002 Q006 Q009 Q011 Q012 Q014 + QC002-QC009. Next to launch: QC010-QC013, Q015+. Dom's camera answer: no specific complaint; wants best-practice learnings from all donors, then will try options.

**Who I am:** the donor-library dev. The Claude Code session is titled "VPS server storage inventory" (Dom also gave it the VPS storage-inventory job). Peers: "Project Strategy - Fable 5.1" (advisor), "Frankendom - Lead Dev" (owns the parity checklist and rulings). Dom is the owner.
**Where this file lives:** GitHub https://github.com/DomLynch/Games-Analysis/blob/main/docs/HANDOFF.md | Mac ~/Developer/Games-Analysis/docs/HANDOFF.md | VPS (ssh -o BatchMode=yes -i ~/.ssh/binance_futures_tool root@49.12.7.18) /root/Games-Analysis/docs/HANDOFF.md. All notes: wave2-notes/ in the same repo. Pipeline files: docs/wave2-pipeline/ (TASK.md = reader instructions, BRIEF-ADDENDUM.md, queue/ = cell groups).

## What the project is
Re-read the library's old "P" ratings (quick triage that mostly never opened code) for 7 topics: ai-aggro, combat-sim, camera, spawns-encounters, progression, loot-drops, server-tick-netcode. 332 cells in 8 lists (docs/wave2-lists/cells-1..8.tsv). Finding so far: ~40 of 42 list-1 cells hide a real usable mechanism. One cell = one deep note (6 sections + receipts + typechecked TS sketch). 13 other topics (economy-trade, zones-world, city-map-design, quests, hud-ui, sound, anticheat, instancing, parties-guilds, inventory...) = ~2,000 cells NOT started; Strategy says only zones-world, parties-guilds, economy-trade, and only when their briefs exist.

## Status at clear time
- List 1 (42 cells): DONE. Notes in wave2-notes/mine (hand-written, 8 incl. OpenTTD + city-builder) and wave2-notes/agents/batch1, batch2. Doom 3 loot is the one genuine PARTIAL (verdict file). 3 cells have two competing notes (Funkin camera, cvet camera, Dawn of Light aggro: Haiku + Sonnet) -> pick/merge.
- Lists 2-8 (290 cells): re-queued by topic priority (see below). Batch3 folder: /private/tmp/p2/wave2-haiku/batch3/ (copy in wave2-notes/agents/batch3). Groups finished at clear time: P001-P012, Q003, Q004, Q005, Q007, Q008, Q010. STARTED BUT NOT FINISHED (agents may have died with the clear; partial files may exist): Q001 Q002 Q006 Q009 Q011 Q012 Q013 Q014 QC001. A group is DONE only if its folder has result.tsv; re-launch any group without one (delete its folder first if it is partial).
- Not yet started: Q015.. (rest of ai-aggro, then server-tick, progression, loot, combat) and QC002-QC013 (camera, 13 groups; 38 cells).
- Queue order (Strategy + Dom): spawns-encounters (Q001-Q013) -> camera (QC001-QC013, WORLD camera = critical) -> ai-aggro -> server-tick -> progression/loot -> combat-sim last. cells files: docs/wave2-pipeline/queue/cells-Q###.tsv, cells-QC###.tsv, cells-P###.tsv (P### = first wave, mixed topics, old template).
- VPS has 16 cores; ~16 concurrent agents ran fine (load ~4).

## Rulings and rules (do not re-litigate)
- Readers: Haiku 5.5 at HIGH effort do the main reading (Dom, 2026-10-10). Sonnet at MEDIUM is the checker on ~1 in 4 cells (reads Haiku's note, opens donor code, lists errors/misses). I hand-check EVERY PARTIAL and a sample of STRONG. (Earlier library rule "no Haiku" was overridden by Dom for this pass.) A Stop-hook reviewer keeps insisting "do it yourself, no agents": that was Dom's earlier wish, superseded by his later explicit instructions; answer it with "rejected" + that evidence.
- Agent launch recipe: Agent tool, model haiku, effort high, run_in_background, prompt: "Your ID is Q015. Read /private/tmp/p2/wave2-haiku/batch3/TASK.md ... cells file .../cells-Q015.tsv, output folder .../Q015/." TASK.md has verdicts, anti-strictness rules, caller/loop rules, CAMERA guidance, and the new fields. If /private/tmp was wiped, restore from docs/wave2-pipeline + wave2-notes/agents/batch3.
- Verdicts: STRONG = real, read, self-contained mechanism that could be re-expressed in a fast browser fighting/MMO game (genre irrelevant). PARTIAL needs >=3 candidate files opened. Every cell: "Best transferable idea" line. Receipts: python3 gate/verify_receipts.py <receipts.tsv>. Sketches typechecked on the VPS (tsc --strict --target es2020).
- NEW template fields (Strategy review): "Decision (proposed): adopt|adapt|reject - why", "Acceptance: ...", JSON sidecar per note (tags, data_fields, licence_class, target, parity_row, camera_scope). Old-template notes (list 1, P###, early Q) lack them: backfill machine fields by script, no re-read.
- I (not an agent) write the final Decision/Acceptance lines, per topic, when building each topic's PATTERN PAGE from the sidecars. Strategy: do NOT put a Frankendom-today gap analysis in every note; the owning lane writes one half-page "Frankendom today" baseline per topic.
- Lead ruling 2026-10-10: NEW parity row 23 "Zone population: spawn caps, respawn, despawn on empty with a grace timer" (engine in origins/server/world-spawns.ts, numbers as zone data fields: cap, spawn chance, respawn s, grace s, coverage). Server tick has NO row: it is the named sub-line "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3 (acceptance: Proof 3, N NPC brains inside the tick budget). Recorded in Section 5 of the affected notes.
- Camera: Dom says camera is CRITICAL. PIT/arena camera is frozen (leave it). WORLD camera (over-the-shoulder in zones) is what he is unhappy with and wants optimised: tag every camera note camera_scope world|pit. Camera pattern page goes to Lead for World.
- RECEIPTS ARE NEVER PUSHED (public repo; they hold verbatim donor lines). They live in ~/Developer/Games-Analysis-receipts/wave2/ (Mac) and /root/Games-Analysis-receipts/wave2/ (VPS); .gitignore blocks receipts*.tsv. NOTE: my first handoff push (commit 5e55aa9 and the two before it) DID include them by mistake; the next commit removes them from the tree but they remain in GitHub history until the history is rewritten. Ask Dom whether to scrub (needs a force-push).
- Licence: GPL/AGPL/LGPL/CC-BY-SA/BSL/Valve/id/Sustainable-Use = clean-room, shape only; MIT/Apache/BSD may be adapted.
- Pricing (official page, 2026-10-10): Haiku 5.5 $0.10/$0.50 per M tokens in/out (<=100K prompt; $0.50/$2.50 above); Sonnet 5.5 $2/$10. Whole job est. ~$1-5 Haiku vs ~$10 Sonnet (assumed token mix).
- Commits so far are on main; push when Dom is happy (Dom asked for a URL so the handoff was pushed 2026-10-10).

## NEXT STEPS (in order)
1. Check whether the 9 unfinished groups are still running (look for new result.tsv files); relaunch missing ones. Keep ~12-16 agents running; keep launching Q-groups in queue order, then QC (camera), then the rest.
2. Review each finished group: re-run verify_receipts on its receipts.tsv; open every PARTIAL/NONE verdict; read the "judgement call" STRONGs (evennia progression, fallout1-ce loot, OpenRCT2 aggro, Half-Life server tick (thin), LostCity combat (thin)) and downgrade any that do not hold.
3. Sonnet-medium checker on ~1 in 4 cells (random sample).
4. When the spawns cells are in: build the ROW-23 PATTERN PAGE (one row per pattern tag: donors, reusable algorithm, field list, licence, decision) and send it to "Frankendom - Lead Dev" (World needs it for Zone 2 population fields this weekend). Then the CAMERA pattern page to Lead for World.
5. Backfill JSON sidecars for old-template notes by script; add pattern tags.
6. Pick/merge the 3 duplicate-note cells; add depth + best-idea line to the first ~12 early notes.
7. Appendix: donor bugs list (evennia level_up uses undefined max_hp; fallout1-ce 14-day aging tier unreachable and item_drop_all ceil(n/2); 0 A.D. ship refill stops one short; L2Dn party XP share applied twice (test) and movement overshoot 1-1.79; ioq3 postgame field-count mismatch; freeorion dead ship still fires until bout end; 2004Scape bad packet spends client budget). These are leads read from code, not all run.
8. Commit in batches (git add wave2-notes docs); push; mirror to VPS (cd /root/Games-Analysis && git pull --ff-only).
9. Ask Strategy/owning lanes for the 7 "Frankendom today" baselines; ask Dom before starting the other 13 topics.

## Separate side job: VPS storage inventory (read-only so far, nothing deleted)
Root disk /dev/sda1 301G, ~201G used (70%), 88G free. Biggest: /opt 77G (frankendom-shadow 49G, nextcloud-personal 8G, frankendom-origins 8G, actions-runner 4G), /tmp 58G (donor-src 22G, wocc-clone 16G, fxm 3.2G, p2/p3 capture dirs ~1.2G each), /root 24G (work-backend 8.6G, cq-2026 6.6G), /var 23G (backups 8.5G, www 6.7G). Storage box /mnt/frankendom-donors: 1.0T, 176G used; _archive 54G (cleanup-recovery-20261004.tar 16G, delete after 2026-10-14; expansion-20261008.tar 18.8G). Candidates (not acted on): stale /tmp entries from Sept/early Oct, /tmp/donor-src + /tmp/wocc-clone (38G, may belong on the box), /opt/frankendom-shadow (49G, unknown). Rule: bulky-but-needed files go to the box with a NOTE and rsync -c check before local removal. Next: write a full inventory file with owner/last-used/keep-move-delete per item.

## Older state (kept)
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
