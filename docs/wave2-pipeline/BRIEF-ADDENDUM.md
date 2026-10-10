# Addendum to rerate-brief.md (read BOTH; this addendum wins where they differ)

## Why this addendum exists
Earlier test runs of this pass were accurate but too STRICT: they filed real, transferable mechanisms as PARTIAL because the donor "is not a combat game" or "has no enemy". That is the wrong test. Frankendom's goal is to learn from games of EVERY genre (tycoon, strategy, rhythm, board game, city builder, RPG, MMO), because a good mechanism in an unrelated genre is the whole point. Judge the IDEA, not the genre.

## Verdict definitions (replace the brief's)
- STRONG: you opened the real code, you can explain the order of operations and the numbers, AND the mechanism is self-contained and could be re-expressed in a fast browser fighting/MMO game (fast duels, many-vs-one, zones as data, loot, progression, server tick, camera, AI). The donor does NOT need to be a combat game, and the mechanism does NOT need to be big. Simple is not weak: a 40-line spawn director, a timer wheel, a stat-modifier stack, a per-tick compute budget, a threat-scales-with-protection rule are all STRONG if they are real and you read them.
- PARTIAL: real but thin, or only a fragment, or you could not find the whole mechanism. Still do the rule below.
- NONE: after a genuine search you found nothing relevant to the topic.

## Anti-strictness rules (follow all)
1. Before you write PARTIAL or NONE you must have opened at least 3 candidate files (list them in verdict.txt). The list's hint file is often the WRONG file (render helpers, registration code, a host wrapper). Search the donor for the topic words with grep -rn (and optionally semble on the VPS) and find the real implementation.
2. Never downgrade because the donor is not a fighting game, the code is short, or the mechanism is an idea you could write yourself. Ask only: "is there a real, specific, checkable mechanism here that a fast browser fighting/MMO game could use the shape of?" If yes and you read it, it is STRONG.
3. When torn between PARTIAL and STRONG, write the note (STRONG) and say in the Checked line how confident you are and what you could not read.
4. For EVERY cell, STRONG or not, include one line: `Best transferable idea: <one sentence>` (in the note, or in verdict.txt for PARTIAL/NONE).
5. Honesty still beats everything: never invent a line number, quote or constant; mark unread code "(not read)". A confident wrong claim is far worse than a modest right one.
6. Be exact about the licence (read the file). GPL/AGPL/unclear/Valve: clean-room, shape only. MIT/Apache/BSD: code may be adapted; say which.

## Frankendom context for sections 5 and 6
Rulings: one engine (src/fight is the whole fight; the Pit and zones are clients), engage is a state change, kills are server-verified, zones are data on one runtime, many-on-one logic (hate list, target selection) lives in the engine, MAX_ATTACKERS = 3, one character/one ledger, the camera/HUD/sound are client-only. Parity checklist rows 1-22: 1 duel step/sim; 2 AI brain; 3 guard/parry/stamina; 4 fight loop (aggro, chase, leash); 5 controls/input; 6 hero actor/animation; 7 creature actor/clips; 8 blood/wounds/decals; 9 finishers; 10 hit impact/hitstop; 11 fight camera; 12 combat sound cues; 13 specials; 14 HUD; 15 gear dressing; 16 colour grade/quality; 17 death/respawn; 18 loot roll and XP award; 19 fight record/replay; 20 catalogue as runtime source; 21 catalogue fields; 22 Pit-only; 23 (NEW, Lead ruling 2026-10-10) zone population: spawn caps, respawn, despawn on empty with a grace timer (engine logic in origins/server/world-spawns.ts, numbers as zone data fields: cap, spawn chance, respawn s, grace s, coverage). Spawn caps/respawn/despawn findings cite row 23. The server tick has NO row of its own: cite row 18 / post-K item 3 and name the sub-line "server tick: fixed step, input intake, per-tick NPC budget". Section 5 must name a target file (src/fight/<module>.ts) and ONE row 1-22 (net-tick/server tick is row 18 / post-K item 3; intake is row 5). Section 6 gaps are against these rulings, not generic filler.

## Working rules
- Donor code is on the VPS only: ssh -o BatchMode=yes -o ConnectTimeout=8 -i ~/.ssh/binance_futures_tool root@49.12.7.18 '<cmd>' < /dev/null  (always close stdin; use grep -rn and sed -n 'A,Bp').
- Do your cells ONE AT A TIME, finishing each completely (note, receipts verified, sketch typechecked) before starting the next.
- Receipts: tab-separated header `note<TAB>claim<TAB>donor_file<TAB>line<TAB>quote`; absolute donor path; 1-based line; quote 15-90 chars copied EXACTLY from that line. One per key function, per "theirs" constant, per important mechanism claim. Verify with `python3 /Users/domininclynch/Developer/Games-Analysis/gate/verify_receipts.py <receipts file>` and fix failures. A passing receipt only proves a quote exists on that line: you must ALSO confirm that your sentences are true of the code (order of operations, what a function actually does).
- Typecheck each sketch: ts block + `export {}` in a file, scp to the VPS /tmp, `npx -p typescript tsc --noEmit --strict --target es2020 <file>` there. A `simplified:` line must sit directly above the code block saying honestly what the sketch omits or reorders.
- Note format: copy /private/tmp/p2/out/combat-sim/id-Software-Quake.deep.md exactly (header `# <game> (<category>, cell N)`, Donor/Licence line, Checked line, sections 1-6, Reuse tag, Brief rule served).
- Output only under your assigned folder (given in your task). Never touch other folders.
