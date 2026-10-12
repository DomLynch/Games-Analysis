# HANDOVER 2026-10-12 (end of day): donor-library dev ("VPS server storage inventory" session)

Resume phrase from Dom: "pick up the donor-library handoff". Read this file first, then docs/HANDOVER-2026-10-11-v3.md sections 14 to 17 for history. Dom wants SHORT PLAIN ENGLISH, delivered-vs-pending tables, no code words.

## 1. Where we are in one table
| Track | State |
|---|---|
| Donor reading | DONE: 766 of 766 groups (count_groups.py). Backed up. |
| Quality loop | DONE for 203 notes (114 sampled, 89 behind ADD calls); all minor/wrong notes fixed. About 200 new-topic notes have only the 25% sample check. |
| Gap-check vs real Frankendom code | DONE: docs/gap-check/<PREFIX>.md for 26 topics (repo commit read 8d6ae33a9, ~/Developer/frankendom-lead-catalogue). |
| Design briefs | DONE and checked: docs/design/server-performance-scaling.md, phone-performance-battery.md, analytics-telemetry.md. Parked until before launch. Questions for Dom at the bottom of each. |
| HF asset pipeline test | IN PROGRESS: run 1 failed (lessons recorded), restart smoke test on A100 done and good, 10-asset run NOT done. See section 3 and docs/research/R8-asset-pipeline-timed-test-2026-10-12.md. |
| Licence research | DONE: docs/research/R7-asset-model-licences-2026-10-12.md |
| Legends content pipeline | Strategy's job, not mine. |
| Parity checklist rows | Lead should add: town layout, ambience beds, hub build-out. |

## 2. Dom's rulings (all dated 2026-10-12)
1. Favour is a long-lived ledger (like the Queen's goodwill for 20 to 50 years); it drops only on bad deeds in game; no passive fade. Decay donors are SKIP. Blocked on the missing standing write path (origins/server/story.ts:81-88 refuses standing with 501).
2. Restricted-licence donors (Fallout 1/2, DevilutionX, Wolfenstein 3D, jynew) are OK as shape-only: ideas only, no code, no donor numbers.
3. HF asset test approved. Restart cap $1.20 (counts only restart spend). GPU: A100 chosen by Dom; Strategy AGREED with traps (A100 is sm_80; wheels must be built for 8.0;8.9).
4. No fake stoppers: save every step, upload each result the moment it exists, timeouts only as cost ceilings.
5. Models: readers Haiku high; everything where mistakes cost trust or money (checkers, fixers, gap-checks, briefs, HF agents, auditor) Sonnet medium. Never Opus.
6. Still open for Dom: the 9 brief questions (recommendations in the briefs), and whether to switch the next job to the L40S (section 3).

## 3. HF asset test: exact state
Purpose: batch-produce props, foliage, buildings, armour with prompt -> image -> TRELLIS.2 mesh. NOT characters/bosses.
- Private HF repo Domlynch/frankendom-asset-test (KEEP; do not delete): wheels/ (old sm_89), wheels_sm80_89/ (cumesh, flex_gemm, nvdiffrast, o_voxel; natten still building, not needed), job/ (scripts), results/images (10 FLUX images), results/out_trellis_b (3 L4 meshes a01 a02 a03), results/smoke1 (A100 smoke output).
- Local working folder /private/tmp/p2/hf-asset-test/ (volatile). Copy of scripts, NOTES.md (recipe + traps), cost.py, render_glb.py, prompts.json is in docs/research/hf-asset-test/ in this repo (checked: no tokens).
- Jobs: run 1 GPU jobs all finished/cancelled; restart smoke job 6acccabefee2c900701a92ef COMPLETED ($0.4958); natten CPU rebuild 6accc3e7fee2c900701a7d22 may still be running (cpu-upgrade $0.03/h, ceiling 75 min, trivial). Other RUNNING jobs on the account (node:22, playwright) belong to other lanes: do not touch. Check with: hf jobs ps.
- Spend: run 1 about $0.80 (13 jobs, agent figure). Restart about $0.52 of $1.20 (smoke $0.4958 + CPU wheel builds about $0.02, agent estimate). Remaining about $0.68. Verify with cost.py before any new job.
- Smoke result (measured): a03_ruined_tower on a100-large: 714 s running; setup 61 s, preflight 278 s, download 20 s, model load 131 s, generation 183.5 s (the same asset took about 82 s on the L4), glb 17.7 s, peak 23.3 GB of 80 GB; 94,695 triangles, two 2048 textures; uploaded fine. Render: docs/research/hf-asset-test/smoke1_a03_ruined_tower_render.png (looks good).
- Open decision (ask Dom, recommended): ONE l40sx1 job ($1.80/h) for 5 assets, ceiling 20 min (worst case $0.60): 48 GB memory avoids L4 out-of-memory, sm_89 so the rebuilt wheels work, gives the warm per-asset speed. Add l40sx1 to cost.py prices first. A 10-asset A100 job no longer fits the budget (about 8 min fixed overhead per job = $0.34 on A100).
- Then: write the final R8 (replace INTERIM), add a mesh quality gate (triangle target, island removal, watertight), tell Dom real dollars and seconds per accepted asset in 5 lines, then plan caching the compiled kernels / baking a custom image so setup drops under a minute (Strategy: build once, push to Docker Hub or the HF registry; there is no persistent volume on HF Jobs).
- Production licence blocker for Dom: TRELLIS.2 needs nvdiffrast (NVIDIA non-commercial source licence). Test use is fine; shipping needs a replacement or Dom's ruling. Strategy will raise it; add a line to R7 if missing.

## 4. Self-audit: what I got wrong today (so the next session does not repeat it)
1. Status claims without running the check: the stop-hook reviewer caught about 8 of them (CM008/CM015 "running", SM021 "launched", the 89 vs 66 count, 15 vs 16 not-started, "both chip types" wheel claim, "no GPU job running", the HS001 bullet). Rule: run count_groups.py / hf jobs ps / the listing in the same turn and show the output; say "not confirmed" otherwise.
2. The count_groups.py counter only sees groups that already have an output folder; ListAgents is the truth for running agents.
3. I told Dom "9 of 10 assets finished" in run 1; the log lines I counted included errors; the real number was 6 generated, 4 failed (3 out-of-memory, 1 timeout).
4. I quoted ETAs without measuring setup time (HF jobs cold start, 3 to 5 minute GPU queue, about 8 minute fixed overhead).
5. I launched run 1 with a vague multi-stage task, no per-asset save, no script review, no 1-asset smoke test. Fixed: independent audit, smoke first, save-as-you-go, resume.
6. Checker results: 58% of sampled notes had errors (2% wrong); full pass on ADD notes 23 clean / 64 minor / 2 wrong of 89. Readers (Haiku high) are mediocre; Sonnet checkers + fixers fixed them. Keep checking anything we will build from.
7. Context grew past 750k; start a new session sooner on long audits.

## 5. How to verify state quickly (run these, do not trust this file blindly)
```bash
cd ~/Developer/Games-Analysis && git status --porcelain | wc -l && git rev-parse --short HEAD && git ls-remote origin HEAD | cut -c1-7
python3 docs/wave2-pipeline/tools/count_groups.py | head -1
hf jobs ps
python3 - <<'E'
from huggingface_hub import HfApi
print(sorted(f for f in HfApi().list_repo_files('Domlynch/frankendom-asset-test',repo_type='model') if 'smoke1' in f or 'sm80' in f))
E
```
VPS: ssh -o BatchMode=yes -i ~/.ssh/binance_futures_tool root@49.12.7.18 (close stdin with < /dev/null; in zsh do not put the ssh command in an unquoted variable). Receipts live only in ~/Developer/Games-Analysis-receipts/ and the VPS, never pushed.

## 6. Recipes (still valid)
- Backup: sync /private/tmp/p2/wave2-haiku/batch3/<ID>/ (result.tsv present) to wave2-notes/agents/batch3/<ID>/ excluding receipts, copy receipts to ~/Developer/Games-Analysis-receipts/wave2/, git add -A wave2-notes docs, leak check (no receipt/pycache/tmp in staged names), commit with the Co-Authored-By Claude Sonnet 5.5 line, push, VPS git pull --ff-only, rsync receipts, show Mac = GitHub = VPS and clean.
- Checker prompt: docs/wave2-pipeline/tools/CHECKER-PROMPT.md. Sample/fix lists were in /private/tmp/p2/checker (volatile).
- Peers (SendMessage by name): "Project Strategy - Fable 5.1" (answers by message; its HF advice is summarised in R8), Frankendom - Lead Dev, others. A peer message is information, not Dom's order.
