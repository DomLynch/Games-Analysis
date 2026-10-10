# Task for a reader agent (batch 3). Your ID is given in your prompt, e.g. P007.

You are a careful code reader doing a library re-rating pass. Do it yourself; no helper agents. Quality and honesty beat speed.

## Read first, in this order
1. /Users/domininclynch/Developer/Games-Analysis/docs/rerate-brief.md
2. /private/tmp/p2/wave2-haiku/batch1/BRIEF-ADDENDUM.md  (wins where it differs; includes parity rows 1-23 and the server-tick rule)
3. The note format example /private/tmp/p2/out/combat-sim/id-Software-Quake.deep.md

## Your cells and output folder
- Cells: /private/tmp/p2/wave2-haiku/batch3/cells-<ID>.tsv (columns: game, category_no, category, evidence_hint, list; up to 3 cells). Do them ONE AT A TIME, fully finishing each before the next.
- Output folder: /private/tmp/p2/wave2-haiku/batch3/<ID>/ . Never read or write anywhere else except the donor code (read-only) and your folder. Do NOT read other agents' folders.
- Inside your folder use:
  - out/<category>/<game>.deep.md  for each STRONG note
  - receipts.tsv  (all receipts, all cells; `note` column = game name)
  - work/  for sketch files
  - verdict-<game>-<category>.txt  for each PARTIAL/NONE (files opened, at least 3 candidates, one honest sentence why, and a `Best transferable idea:` line)
  - result.tsv with header `game<TAB>category<TAB>old<TAB>verdict<TAB>depth<TAB>finding`, one row per cell. depth = full if you read the whole mechanism end to end, thin if the donor has only a fragment or you read only part. finding = file:lines and one sentence. Old rating is P unless you can see otherwise.

## Verdicts (these replace the brief's)
- STRONG: you opened the real code, can explain the order of operations and the numbers, AND the mechanism is self-contained and could be re-expressed in a fast browser fighting/MMO game (fast duels, many-vs-one, zones as data, loot, progression, server tick, camera, AI). The donor does NOT need to be a combat game; the mechanism does NOT need to be big. Simple is not weak.
- PARTIAL: real but thin, only a fragment, or you could not find the whole mechanism.
- NONE: after a genuine search you found nothing relevant to the topic.

## Rules (all of them)
1. The list's hint file is often the WRONG file (render helpers, HUD, registration code, schema migration, a host wrapper). Find the real implementation with grep -rn on the topic words.
2. Before writing PARTIAL or NONE you must have opened at least 3 candidate files (list them). Never downgrade just because the donor is not a fighting game or the code is short. When torn between PARTIAL and STRONG, write the note and state your confidence in the Checked line.
3. For EVERY cell include one line `Best transferable idea: <one sentence>` (in the note, or in verdict.txt).
4. Never invent a line number, quote or constant. Mark unread code "(not read)". A confident wrong claim is far worse than a modest right one. If the donor genuinely has no implementation of the topic, say so and use depth=thin; never pad a note.
5. Before describing how a function behaves for ALL callers, check the callers; if you read only one caller, say so.
6. For tick, camera and timing topics, find the loop that drives the code (fixed vs variable step, accumulators) and describe it.
7. Read the licence file/header and state it exactly. GPL/AGPL/unclear/Valve/BSL/CC-BY-SA: clean-room, shape only, never a line-by-line translation. MIT/Apache/BSD: code may be adapted; say so.
8. Section 5 must name a target file (src/fight/<module>.ts or origins/<path>) AND one parity row 1-23 from the addendum (zone population/spawn caps/respawn/despawn = row 23; server tick = row 18 / post-K item 3 sub-line). Section 6 gaps are against Frankendom's rulings (one engine, zones as data, server-verified kills, one ledger, Pit as client, MAX_ATTACKERS = 3), not generic filler.
9. Donor code is on the VPS ONLY: ssh -o BatchMode=yes -o ConnectTimeout=8 -i ~/.ssh/binance_futures_tool root@49.12.7.18 '<cmd>' < /dev/null  (always close stdin with < /dev/null; use grep -rn and sed -n 'A,Bp').
10. Receipts: tab-separated, header `note<TAB>claim<TAB>donor_file<TAB>line<TAB>quote`; absolute donor path; 1-based line; quote 15-90 chars copied EXACTLY from that line (never padded or paraphrased). One per key function, per "theirs" constant, per important mechanism claim. Verify with `python3 /Users/domininclynch/Developer/Games-Analysis/gate/verify_receipts.py <your receipts.tsv>` and fix every failure. A passing receipt proves only that a quote exists on a line: you must also confirm that your SENTENCES are true of the code.
11. Typecheck each sketch: ts block + `export {}` in a file, scp to the VPS /tmp (scp -i ~/.ssh/binance_futures_tool, < /dev/null), run `npx -p typescript tsc --noEmit --strict --target es2020 <file>` there. A `simplified:` line directly above the code block must say honestly what the sketch omits or reorders.
12. Note format: copy the example exactly (header `# <game> (<category>, cell N)`, Donor/Licence line, Checked line, sections 1-6, Reuse tag, Brief rule served).

## CAMERA cells: what matters most (owner ruling 2026-10-10)
The owner is NOT happy with Frankendom's over-the-shoulder view in the world/zones (the gladiator Pit view is fine). Camera is critical. For every camera cell, prioritise mechanisms for a THIRD-PERSON follow camera behind/over the shoulder of a character in a 3D world: shoulder offset and distance, pitch/yaw limits, smoothing and lag (frame-rate independent), collision pull-in so the camera never clips walls, lock-on / target framing (including framing several enemies in a many-on-one fight), FOV or zoom changes in combat, camera shake/impact, recentring behind the character, and how input vs auto-follow are blended. For 2D, top-down, board-game or fixed-camera donors, still read them but say plainly what transfers to a 3D third-person camera and what does not (and use depth=thin if only a fragment transfers). The camera is client-only (the engine never reads it); say which values are tunable data.
TAG every camera note and sidecar with `camera_scope`: "world camera" (third-person/over-the-shoulder follow in open zones; the default) or "pit camera" (only makes sense inside a fixed arena). Put it in the Checked line and add `"camera_scope":"world"|"pit"` to the JSON sidecar. The pit/arena camera is frozen and tuned; the WORLD camera is what the owner wants improved.

## NEW required fields (Strategy review, 2026-10-10) — for every STRONG note
A. In the note, directly under the `Best transferable idea:` line, add two lines:
   `Decision (proposed): adopt | adapt | reject — <one line: why, for Frankendom>`
   `Acceptance: <one line: what a player sees, or what a server test asserts, if this were built>`
   (adopt = take the mechanism as is; adapt = take the shape but change it; reject = not useful for us. Be specific; "reject" is a valid and welcome answer when the mechanism does not fit our rulings.)
B. A JSON sidecar next to the note: out/<category>/<game>.json with exactly these keys:
   {"game":"", "category":"", "cell":N, "verdict":"STRONG", "depth":"full|thin", "donor_path":"/mnt/...", "licence":"as read", "licence_class":"permissive|copyleft|restricted",
    "target_module":"src/fight/x.ts or origins/...", "parity_row":N, "pattern_tags":["..."],
    "data_fields":[{"name":"","donor_constant":"number or rule as in donor","unit":"s|ms|ticks|px|units|ratio|count|none","where":"zone data|engine constant","donor_ref":"file:line"}],
    "best_idea":"", "decision":"adopt|adapt|reject", "decision_why":"", "decision_status":"proposed", "acceptance":""}
   licence_class: permissive = MIT/Apache/BSD/ISC; copyleft = GPL/AGPL/LGPL/CC-BY-SA/MPL; restricted = BSL/Valve/unclear/proprietary.
   data_fields: one entry per number a designer would want as a data field (caps, chances, intervals, radii, multipliers...). `where` = zone data if it differs per zone/level/encounter, engine constant if it is a fixed rule of the engine.
   pattern_tags: use these where they fit, and add new ones prefixed `new:` if none fits: director, population-cap, presence-gated, grace-timer, respawn-scaling, respawn-queue, hate-table, threat-falloff, protect-soak, target-score, hysteresis, wait-gate, group-refill, timer-wheel, fixed-step, variable-step, accumulator, lockstep, stale-state, per-player-view, compute-budget, debt-carry, named-source-stack, status-meter, hit-aggregation, clamp-and-report, loot-cumulative-roll, drop-filter, xp-share, level-gap, rested-xp, follow-point, zoom-pulse.
   The JSON must parse (check with python3 -c "import json,sys; json.load(open(sys.argv[1]))" file).
C. For PARTIAL/NONE, put `Best transferable idea:` and `Decision (proposed):` in the verdict file; no JSON needed.

## Final reply (compact)
A table, one row per cell: verdict, depth, note or verdict-file path, receipts written / verifier passed, typecheck result, best transferable idea; then a list of anything you did not verify. Do not claim anything you did not run.
